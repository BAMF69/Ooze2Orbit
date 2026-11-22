// Purpose: Seed refresh (CREATURE_LEVELGEN.md §7a): a cleared Water level gets a fresh, valid map on demand; the other
//          levels keep exactly their maps (seed 0 keeps its authored ones); visited rooms survive the id shift;
//          the save validator accepts the refresh counts and rejects bad ones; uncleared levels cannot refresh.
import { describe, it, expect } from "vitest";
import { generateWaterV2, worldProblemsV2, remapVisited, roomNode } from "../src/game/creature/levelgen/world";
import { freshExpedition, validExpedition, canRefreshLevel, refreshLevel } from "../src/game/creature/expedition";
import { newGarden, type Garden } from "../src/game/creature/generations";

const levelOf = (w: ReturnType<typeof generateWaterV2>, tier: string) => w.graph.levels.find(l => l.tier === tier)!;
const shape = (w: ReturnType<typeof generateWaterV2>, tier: string) => JSON.stringify(levelOf(w, tier).nodes.map(n => [n.id, n.role, n.cells ?? 1]));

describe("Seed refresh", () => {
  it("gives a refreshed level a new valid map and leaves the other levels untouched", () => {
    let changed = 0;
    for (const seed of [0, 1, 7, 42, 255]) {
      const before = generateWaterV2(seed), after = generateWaterV2(seed, ["roar"], { medium: 1 });
      expect(worldProblemsV2(after), `seed ${seed}`).toEqual([]); expect(after.fallback).toBe(false);
      expect(shape(after, "easy")).toBe(shape(before, "easy")); expect(shape(after, "hard")).toBe(shape(before, "hard"));
      const roomsOf = (w: typeof before, t: string) => JSON.stringify(w.rooms.filter(r => r.tier === t).map(r => [r.name, r.spec!.stitched ?? r.spec!.puzzle, r.food]));
      if (roomsOf(after, "medium") !== roomsOf(before, "medium")) changed++;
      expect(roomsOf(after, "hard")).toBe(roomsOf(before, "hard"));
      expect(generateWaterV2(seed, ["roar"], { medium: 1 })).toEqual(after); // deterministic
      expect(generateWaterV2(seed, ["roar"], { medium: 2 })).not.toEqual(after); // each refresh is new
    }
    expect(changed).toBe(5);
  });
  it("keeps seed 0's authored levels authored when another level is refreshed", () => {
    const w = generateWaterV2(0, ["roar"], { hard: 1 });
    expect(levelOf(w, "easy").authored).toBe(true); expect(levelOf(w, "medium").authored).toBe(true); expect(levelOf(w, "hard").authored).toBeUndefined();
  });
  it("remaps visited rooms of the other levels by graph node and forgets the refreshed level's", () => {
    const before = generateWaterV2(7), after = generateWaterV2(7, ["roar"], { medium: 1 });
    const visited = before.rooms.map(r => r.id), kept = remapVisited(before, after, visited, "medium");
    expect(kept.map(id => after.rooms.find(r => r.id === id)!.tier)).not.toContain("medium");
    expect(kept.length).toBe(before.rooms.filter(r => r.tier !== "medium").length);
    for (const id of kept) expect(roomNode(after, id)!.id).toMatch(/^(easy|hard):/);
  });
  it("refreshes only cleared levels, counts each refresh, and keeps completion", () => {
    let g: Garden = { ...newGarden(), expedition: freshExpedition(9) };
    expect(canRefreshLevel(g.expedition!, "easy")).toBe(false); expect(refreshLevel(g, "easy")).toBe(g);
    g = { ...g, expedition: { ...g.expedition!, completed: ["easy"] } };
    g = refreshLevel(refreshLevel(g, "easy"), "easy");
    expect(g.expedition!.rerolls).toEqual({ easy: 2 }); expect(g.expedition!.completed).toEqual(["easy"]);
    expect(canRefreshLevel({ ...freshExpedition(9, 1), completed: ["easy"] }, "easy")).toBe(false); // v1 worlds stay frozen
  });
  it("validates refresh counts in saves", () => {
    const e = freshExpedition(3);
    expect(validExpedition({ ...e, rerolls: { medium: 2 } })).toBe(true); expect(validExpedition(e)).toBe(true);
    expect(validExpedition({ ...e, rerolls: { medium: -1 } })).toBe(false); expect(validExpedition({ ...e, rerolls: { jungle: 1 } })).toBe(false);
    expect(validExpedition({ ...e, rerolls: { hard: 1.5 } })).toBe(false);
  });
});
