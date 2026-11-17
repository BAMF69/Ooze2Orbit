// Purpose: Generated Water worlds are built from the proven templates: seed 0 is byte-for-byte the v1 rooms (the v1
//          goldens), hundreds of seeds pass the static validator, and the REAL controller solves every generated room
//          along its template's script and returns, while the D+Shift sprint and key-less lineages are refused.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { generateWaterV2, worldProblemsV2, levelEntry, isWorldV2 } from "../src/game/creature/levelgen/world";
import { runScript, sprintThrough } from "../src/game/creature/levelgen/solver";
import { roomSpec } from "../src/game/creature/levelgen/roomSpec";
import { keysOf, statKey, type Key } from "../src/game/creature/levelgen/keys";
import { generateWater, WATER } from "../src/game/creature/waterWorld";
import { freshExpedition } from "../src/game/creature/expedition";
import { newGarden } from "../src/game/creature/generations";
import { newBody, boxHits } from "../src/game/creature/physics";
import { stepWaterBody } from "../src/game/creature/waterPhysics";
import { challengeSolid } from "../src/game/creature/waterChallenges";
import { roomRecord, hash } from "./helpers/roomRecord";

const SEEDS = [0, 1, 2, 3, 7, 42, 101, 255, 1001, 0xffffffff];
const traits = { ...newGarden().traits, gills: true, fins: true };
const world = (seed: number) => { const w = generateWaterV2(seed); return { w, e: { ...freshExpedition(seed), basinRaised: true, torrentDiverted: true } }; };
/** Every key a lineage could hold, so scripts prove reachability rather than inheritance. */
const allKeys = (): Set<Key> => new Set<Key>([...keysOf({ stats: { strength: 30, vitality: 30, agility: 30, intellect: 30, armor: 30 }, gills: true, fins: true, classSkills: ["roar", "burrow", "tool"] }, { basinRaised: true, torrentDiverted: true })]);

describe("Generated Water worlds", () => {
  it("seed 0 rebuilds the eleven v1 rooms by the v1 golden records, plus the new Hard drain-to-shaft loop", () => {
    const golden = JSON.parse(readFileSync(new URL("../data/golden/creatureLegacyRooms.json", import.meta.url), "utf8"))["0"] as Record<string, string>;
    const w = generateWaterV2(0), v1 = generateWater(0);
    expect(w.rooms.map(r => r.id)).toEqual(v1.rooms.map(r => r.id)); expect(w.starts).toEqual({ easy: 0, medium: 4, hard: 7 });
    for (const r of w.rooms) if (r.id !== 8 && r.id !== 9) expect(hash(roomRecord(w.rooms, r)), `room ${r.id} ${r.name}`).toBe(golden[String(r.id)]);
    // Hard now loops like Medium: the only difference from v1 in rooms 8 and 9 is the shaft between them.
    expect(w.rooms[8].spec!.openings.map(o => [o.side, o.to.room, o.when])).toEqual([["bottom", 9, "open"]]);
    expect(w.rooms[9].spec!.openings.map(o => [o.side, o.to.room, o.when])).toEqual([["top", 8, "verticalOpen"]]);
    expect(w.rooms[9].spec!.verticalOpenFrom).toBe(8);
    for (const id of [8, 9]) { const stripped = { ...w.rooms[id], spec: { ...w.rooms[id].spec!, openings: [], verticalOpenFrom: null, collision: w.rooms[id].spec!.collision.filter(c => !c.when) } }; expect(hash(roomRecord(w.rooms, stripped)), `room ${id} without the loop`).toBe(golden[String(id)]); }
    expect(w.rooms.map(r => [r.left, r.right, r.branch])).toEqual(v1.rooms.map(r => [r.left, r.right, r.branch]));
  });
  it("validates 300 seeds without fallback, with varied room counts, vaults and class trials", () => {
    const shapes = new Set<string>(); let vaults = 0, trials = 0, rooms = 0;
    for (let seed = 0; seed <= 300; seed++) {
      const w = generateWaterV2(seed);
      expect(worldProblemsV2(w), `seed ${seed}`).toEqual([]); expect(w.fallback, `seed ${seed}`).toBe(false);
      expect(isWorldV2(w)).toBe(true); expect(generateWaterV2(seed)).toEqual(w);
      shapes.add(w.rooms.map(r => r.spec!.puzzle[0] + (r.spec!.keyed ? "k" : "") + (r.spec!.openings.length)).join(""));
      vaults += w.rooms.filter(r => r.name === "Hidden grotto").length; trials += w.rooms.filter(r => r.spec!.variant).length; rooms += w.rooms.length;
      for (const tier of ["easy", "medium", "hard"] as const) expect(w.rooms.find(r => r.id === levelEntry(w, tier))?.tier).toBe(tier);
    }
    expect(shapes.size).toBeGreaterThan(40); expect(vaults).toBeGreaterThan(200); expect(trials).toBeGreaterThan(60);
    console.log(`Water worlds v2: 301 seeds, ${shapes.size} distinct room sequences, ${rooms} rooms, ${vaults} vaults, ${trials} class trials`);
  }, 30000);
});

describe("Generated rooms through the real controller", () => {
  it("solves every room of ten worlds along its template script and returns to the entrance", () => {
    let solved = 0; const roles = new Map<string, number>();
    for (const seed of SEEDS) {
      const { w, e } = world(seed);
      for (const r of w.rooms) {
        const start = r.spec!.returnArrival ? { x: 152, y: 298 } : { x: WATER.spawn, y: WATER.floor }; // branches are entered from their shaft
        const run = runScript(r, e, w.solutions[r.id], traits, allKeys(), start);
        expect(run.ok, `seed ${seed} room ${r.id} ${r.name} (${r.spec!.puzzle}): step ${run.step} ${run.reason}`).toBe(true);
        expect(run.falls, `seed ${seed} room ${r.id} fell into its pit`).toBe(0);
        solved++; roles.set(r.spec!.puzzle, (roles.get(r.spec!.puzzle) ?? 0) + 1);
      }
    }
    console.log(`Controller solved ${solved} generated rooms: ${[...roles].map(([k, v]) => `${k} ${v}`).join(", ")}`);
  }, 60000);
  it("blocks D + Shift in every generated room, even with maximum traits and every Gardener benefit", () => {
    let blocked = 0;
    const max = { ...traits, strength: 30, vitality: 30 };
    for (const seed of SEEDS) { const { w, e } = world(seed); for (const r of w.rooms) {
      const run = sprintThrough(r, e, max);
      expect(run.x, `D+Shift escaped seed ${seed}, room ${r.id}`).toBeLessThan(560); expect(run.open).toBe(false); blocked++;
    } }
    console.log(`D+Shift blocked in ${blocked}/${blocked} generated rooms`);
  });
  it("refuses class doors and grotto shafts to a lineage without the key, and opens them with it", () => {
    let doors = 0, grottos = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const { w, e } = world(seed);
      for (const r of w.rooms) {
        const k = r.spec!.keyed; if (!k) continue;
        const without = runScript(r, e, w.solutions[r.id], traits, new Set<Key>(["play", "gills", "fins"]));
        expect(without.ok).toBe(false); expect(without.reason).toContain("refused");
        const needed = k.requires[0], withKey = runScript(r, e, w.solutions[r.id], traits, new Set<Key>(["play", "gills", "fins", ...needed]));
        expect(withKey.ok, `seed ${seed} room ${r.id}: ${withKey.reason}`).toBe(true);
        if (k.opens === "keyOpen") doors++; else grottos++;
      }
    }
    expect(doors).toBeGreaterThan(5); expect(grottos).toBeGreaterThan(10);
    console.log(`Keyed controls: ${doors} class doors and ${grottos} grotto shafts refused without the key, opened with it`);
  }, 60000);
  it("lands every shaft arrival on safe ground in the destination room, in the state that opened it", () => {
    let arrivals = 0;
    for (const seed of SEEDS) { const { w, e } = world(seed); for (const r of w.rooms) for (const op of r.spec!.openings) {
      const dest = w.rooms.find(q => q.id === op.to.room)!, o = { first: true, open: true, remaining: 0, verticalOpen: true, keyOpen: true, bonusOpen: true };
      const b = newBody(op.to.x, op.to.y); b.vy = op.to.vy ?? 0;
      expect(boxHits(b.x, b.y, b.w, b.h, (x, y) => challengeSolid(dest, true, x, y, o)), `arrival inside geometry: seed ${seed} ${r.id}->${dest.id}`).toBe(false);
      for (let n = 0; n < 150; n++) stepWaterBody(b, dest, e, traits, { dir: 0, vertical: 0, jump: false, crouch: false, sprint: false }, 1 / 60, o);
      expect(b.y, `arrival fell out: seed ${seed} ${r.id}->${dest.id}`).toBeLessThan(338); expect(b.x).toBeGreaterThan(20); expect(b.x).toBeLessThan(620);
      arrivals++;
    } }
    expect(arrivals).toBeGreaterThan(40);
  });
  it("lets a vault lineage reach the grotto reward only through the opened shaft, and come back down", () => {
    let checked = 0;
    for (let seed = 1; seed <= 80 && checked < 6; seed++) {
      const { w, e } = world(seed);
      const host = w.rooms.find(r => r.spec!.keyed?.opens === "bonusOpen"); if (!host) continue;
      const vault = w.rooms.find(r => r.id === host.spec!.openings.find(op => op.when === "bonusOpen")!.to.room)!;
      const stat = roomSpec(host).keyed!.requires[0][0];
      const up = runScript(host, e, w.solutions[host.id].slice(0, 4), traits, new Set<Key>(["play", stat]));
      expect(up.ok, `${seed}: ${up.reason}`).toBe(true); expect(up.objective.bonusOpen).toBe(true);
      const inside = runScript(vault, e, w.solutions[vault.id], traits, new Set<Key>(["play"]), { x: 152, y: 298 });
      expect(inside.ok, `${seed}: ${inside.reason}`).toBe(true); expect(vault.reward).toMatch(/fullArmor|iceBreath/);
      expect(statKey("strength", 0)).toBe("stat:strength>=0"); checked++;
    }
    expect(checked).toBe(6);
  });
});
