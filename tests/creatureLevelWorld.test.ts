// Purpose: Generated Water worlds are built from the proven templates: seed 0 is byte-for-byte the v1 rooms (the v1
//          goldens), hundreds of seeds pass the static validator, and the REAL controller solves every generated room
//          along its template's script and returns, while the D+Shift sprint and key-less lineages are refused.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { generateWaterV2, worldProblemsV2, levelEntry, isWorldV2, arrivalFair, buildWorld } from "../src/game/creature/levelgen/world";
import { generateWaterGraph } from "../src/game/creature/levelgen/graph";
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
  it("seed 0 rebuilds the eleven v1 rooms, plus two channels, differing only by the deliberate loop and threat-placement fixes", () => {
    const golden = JSON.parse(readFileSync(new URL("../data/golden/creatureLegacyRooms.json", import.meta.url), "utf8"))["0"] as Record<string, string>;
    const w = generateWaterV2(0), v1 = generateWater(0);
    expect(w.rooms.slice(0, 11).map(r => r.id)).toEqual(v1.rooms.map(r => r.id)); expect(w.starts).toEqual({ easy: 0, medium: 4, hard: 7 });
    expect(w.rooms.slice(0, 11).map(r => [r.left, r.right, r.branch])).toEqual(v1.rooms.map(r => [r.left, r.right, r.branch]));
    // Step 1.6 loops: a channel (11 under Medium, 12 under Hard) joins each drain's floor to a hatch behind the finale.
    expect(w.rooms.slice(11).map(r => [r.id, r.tier, r.spec!.puzzle, r.spec!.geometry!.cols])).toEqual([[11, "medium", "channel", 120], [12, "hard", "channel", 120]]);
    expect(w.rooms[4].spec!.openings.map(o => [o.side, o.to.room, o.when])).toEqual([["bottom", 11, "open"]]);
    expect(w.rooms[6].spec!.openings.map(o => [o.side, o.to.room, o.when])).toEqual([["bottom", 11, "latched"]]); // opens once the seal is claimed
    expect(w.rooms[11].spec!.openings.map(o => [o.side, o.to.room, o.when])).toEqual([["top", 4, "verticalOpen"], ["top", 6, "farOpen"]]);
    expect([w.rooms[11].spec!.verticalOpenFrom, w.rooms[11].spec!.farOpenFrom]).toEqual([4, 6]);
    expect(w.rooms[5].spec!.openings).toEqual([]); // the shaft no longer carries the parallel-edge "loop"
    // Search-found relation fixes (2026-11-18): guarded drain nets sit between both guards; the Hard shaft relay has a
    // guard in range; the Hard finale's swimmer is within one lunge of the net. Nothing else differs from v1.
    const changed = w.rooms.slice(0, 11).filter(r => JSON.stringify(r.spec!.enemies) !== JSON.stringify(roomSpec(v1.rooms[r.id]).enemies) || r.spec!.net.frame.x !== roomSpec(v1.rooms[r.id]).net.frame.x).map(r => r.id);
    expect(changed).toEqual([4, 8, 9, 10]);
    const loopRooms = [4, 5, 6, 8, 9, 10]; // the rooms whose vertical openings changed
    for (const r of w.rooms.slice(0, 11)) {
      const v = roomSpec(v1.rooms[r.id]), s = r.spec!, loop = loopRooms.includes(r.id);
      const reverted = { ...r, spec: { ...s, enemies: v.enemies, reeds: v.reeds, net: v.net, openings: loop ? v.openings : s.openings,
        verticalOpenFrom: loop ? v.verticalOpenFrom : s.verticalOpenFrom, collision: loop ? v.collision : s.collision } };
      if (!loop && r.id !== 4) expect(hash(roomRecord(w.rooms.slice(0, 11), r)), `room ${r.id} unchanged`).toBe(golden[String(r.id)]);
      expect(hash(roomRecord(w.rooms.slice(0, 11), reverted)), `room ${r.id} ${r.name} with the deliberate changes reverted`).toBe(golden[String(r.id)]);
    }
  });
  // Finding 7: the static validator used the base room instead of the real collision, skipped swimmers and ignored tell range.
  it("rejects a blocked floor walk, a swimmer on an arrival and an enemy that strikes before the player can react", () => {
    const blocked = generateWaterV2(0); blocked.rooms[1].spec!.collision.push({ solid: true, x0: 20, x1: 20, y0: 17, y1: 18 });
    expect(worldProblemsV2(blocked)).toContain("body clearance");
    const swimmerOnTop = generateWaterV2(0), channel = swimmerOnTop.rooms[11], arrival = swimmerOnTop.rooms[4].spec!.openings[0].to; // the drain drop
    channel.spec!.enemies.push({ kind: "swimmer", x: arrival.x + 20, y: arrival.y }); expect(worldProblemsV2(swimmerOnTop)).toContain("arrival safety");
    expect(arrivalFair([{ kind: "swimmer", x: 64, y: 0 }], { x: 0, y: 0 })).toBe(false); // .85 s tell + .34 s approach < 1.2 s
    expect(arrivalFair([{ kind: "swimmer", x: 100, y: 0 }], { x: 0, y: 0 })).toBe(true);
    expect(arrivalFair([{ kind: "charger", x: 88, y: 0 }], { x: 0, y: 0 })).toBe(true); // v1's drain guard and its drop
  });
  // Finding 4: the class door's variant must not change when the lineage gains a second class.
  it("keeps every class door's variant when a second class is added, and rejects a door for a class the lineage lacks", () => {
    let trials = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const one = generateWaterV2(seed, ["burrow"]), two = generateWaterV2(seed, ["burrow", "tool"]);
      const variants = (w: typeof one) => w.rooms.filter(r => r.spec!.variant).map(r => [r.id, r.spec!.variant]);
      expect(variants(two)).toEqual(variants(one)); trials += variants(one).length;
      for (const [, v] of variants(one)) expect(v).toBe("burrow");
    }
    expect(trials).toBeGreaterThan(5);
    const seed = [...Array(60).keys()].find(n => generateWaterV2(n).rooms.some(r => r.spec!.variant))!;
    const w = buildWorld(generateWaterGraph(seed), ["tool"]); expect(worldProblemsV2(w)).not.toContain("class triad");
    w.classes = ["roar"]; expect(worldProblemsV2(w)).toContain("class triad");
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
        const start = r.spec!.start ?? (r.spec!.returnArrival ? { x: 152, y: 298 } : { x: WATER.spawn, y: WATER.floor }); // branches from their shaft, channels from the drain
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
      if (r.spec!.puzzle === "channel") continue; // a passage, not a gate: it demands nothing to cross
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
      const dw = dest.spec!.geometry?.width ?? 640;
      expect(b.y, `arrival fell out: seed ${seed} ${r.id}->${dest.id}`).toBeLessThan(338); expect(b.x).toBeGreaterThan(20); expect(b.x).toBeLessThan(dw - 20);
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
