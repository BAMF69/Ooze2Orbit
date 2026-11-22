// Purpose: The segment stitcher (levelgen/stitch.ts) builds rooms whose edges meet, whose declared links connect
//          entrance, lever and exit both ways (a channel: hatch to hatch), and which respect the plan (a torrent
//          crossing in current rooms, nothing past the exit wall). Each stitching rule has a deliberately broken
//          input rejected by it. Whole stitched rooms are search-proved in tests/creatureSearch.test.ts.
import { describe, it, expect } from "vitest";
import { pickSegments, connected, assemble, type StitchPlan } from "../src/game/creature/levelgen/stitch";
import { SEGMENTS, variants, profile, clearFloor, slotColumns, type Segment } from "../src/game/creature/levelgen/segments";
import { makeRng } from "../src/game/creature/levelgen/rng";
import { generateWaterV2 } from "../src/game/creature/levelgen/world";
import { chainScreens } from "../src/game/creature/levelgen/graph";
import { ladderTier } from "../src/game/creature/levelgen/ladder";

const seg = (id: string): Segment => variants().find(s => s.id === id)!;
const gallery = (cells: number, extra: Partial<StitchPlan> = {}): StitchPlan => ({ kind: "gallery", cells, ratings: [2, 4], control: true, guard: true, cache: false, ...extra });

describe("Stitcher", () => {
  it("builds galleries whose edges meet, with a clear entrance and exit and every link connected", () => {
    let built = 0;
    for (let seed = 0; seed < 200; seed++) for (const cells of [2, 3, 4, 5]) {
      const s = pickSegments(gallery(cells), makeRng(seed * 7 + cells)); if (!s) continue; built++;
      expect(s).toHaveLength(cells);
      for (let i = 1; i < s.length; i++) expect(profile(s[i - 1], "R"), `${s.map(x => x.id)}`).toBe(profile(s[i], "L"));
      expect(clearFloor(s[0], 0, 5)).toBe(true); expect(clearFloor(s[cells - 1], 32, 39)).toBe(true);
      expect(s.filter(x => x.control)).toHaveLength(1); expect(connected(s, "gallery")).toBe(true);
      expect(slotColumns(s[cells - 1]).every(x => x < 34)).toBe(true);
      expect(s[0].enemies ?? []).toEqual([]); // no guard post at the entrance
    }
    expect(built).toBeGreaterThan(750);
  });
  it("puts a torrent crossing in every current room", () => {
    for (let seed = 0; seed < 100; seed++) {
      const s = pickSegments(gallery(2 + seed % 3, { current: true, cache: seed % 2 === 0 }), makeRng(seed));
      expect(s, `seed ${seed}`).not.toBeNull(); expect(s!.some(x => x.tags.includes("torrent"))).toBe(true);
    }
  });
  it("builds channels with the fixed climbs at both ends and a connected passage", () => {
    for (let seed = 0; seed < 100; seed++) {
      const s = pickSegments({ kind: "channel", cells: 3 + seed % 8, ratings: [1, 4], control: false, guard: false, cache: false }, makeRng(seed))!;
      expect(s[0].id).toBe("channel-near"); expect(s.at(-1)!.id).toBe("channel-far"); expect(connected(s, "channel")).toBe(true);
      expect(s.slice(1, -1).every(x => x.tags.includes("channel"))).toBe(true);
    }
  });
  it("is deterministic and assembles merged water, absolute slots and at least four food", () => {
    const a = pickSegments(gallery(3), makeRng(42)), b = pickSegments(gallery(3), makeRng(42));
    expect(a!.map(s => s.id)).toEqual(b!.map(s => s.id));
    // Water that meets at a segment edge becomes one region; water that stops short of it stays separate.
    const { room, spec } = assemble([seg("airpocket"), seg("airpocket~"), seg("pool")], { name: "t", current: false, puzzle: "lever", hint: "" });
    expect(spec.geometry!.cols).toBe(120);
    expect(spec.geometry!.water).toEqual([{ x0: 0, x1: 1280, low: 288, raised: 224 }, { x0: 1376, x1: 1824, low: 288, raised: 224 }]);
    expect(room.food.length).toBeGreaterThanOrEqual(4); expect(spec.stitched).toEqual(["airpocket", "airpocket~", "pool"]);
  });
  // Broken inputs, one per rule.
  it("rejects a dead-end path (a segment whose links never cross it)", () => {
    const dead = { ...seg("floor"), id: "dead", links: [] };
    expect(connected([seg("steps"), dead, seg("floor")], "gallery")).toBe(false);
  });
  it("rejects edges that do not meet: the stitcher never joins mismatched profiles", () => {
    expect(profile(seg("merge"), "R")).not.toBe(profile(seg("floor"), "L"));
    const lib = [seg("steps"), seg("merge")]; // merge's right edge has two lanes; nothing in this library matches it
    expect(pickSegments(gallery(2, { guard: false }), makeRng(1), lib)?.map(s => s.id) ?? []).not.toEqual(["steps", "merge"]);
  });
  it("rejects a lever the path cannot reach", () => {
    const sealedLever = { ...seg("steps"), id: "sealed", links: [{ from: "L0", to: "R0" }, { from: "R0", to: "L0" }] };
    expect(connected([sealedLever, seg("floor")], "gallery")).toBe(false);
  });
  it("rejects a channel with no way out at the far hatch", () => {
    const noFar = { ...SEGMENTS.find(s => s.id === "channel-far")!, links: [{ from: "L0", to: "H" }] };
    expect(connected([SEGMENTS.find(s => s.id === "channel-near")!, seg("pool"), noFar], "channel")).toBe(false);
  });
  it("rejects a current room with no torrent crossing", () => {
    const dry = variants().filter(s => !s.tags.includes("torrent"));
    expect(pickSegments(gallery(3, { current: true, guard: false }), makeRng(3), dry)).toBeNull();
  });
});
describe("Stitched Water worlds", () => {
  it("fill Medium and Hard to the ladder's screen range with stitched galleries and channels", () => {
    let galleries = 0, channels = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const w = generateWaterV2(seed); expect(w.fallback, `seed ${seed}`).toBe(false);
      for (const level of w.graph.levels) { const t = ladderTier("water", level.tier), n = chainScreens(level); expect(n).toBeGreaterThanOrEqual(t.screens[0]); expect(n).toBeLessThanOrEqual(t.screens[1]); }
      galleries += w.rooms.filter(r => r.spec!.stitched && r.spec!.puzzle === "lever").length; channels += w.rooms.filter(r => r.spec!.stitched && r.spec!.puzzle === "channel").length;
      expect(w.rooms.filter(r => r.tier === "easy").every(r => !r.spec!.stitched && (r.spec!.geometry?.cols ?? 40) === 40)).toBe(true);
    }
    expect(galleries).toBeGreaterThan(250); expect(channels).toBe(240);
  });
});
