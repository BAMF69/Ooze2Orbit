// Purpose: Golden fingerprints of every room rule the seed-v1 Water world exposes (collision in every state,
//          controls, barriers, enemies, reeds, nets, vents, pits, vertical openings/arrivals, returns), so the
//          room-ID tables can move onto one generated model with zero behavior change (CREATURE_LEVELGEN.md §7 step 0).
// Usage  : UPDATE_GOLDEN=1 npx vitest run tests/creatureLegacyRooms.test.ts  rewrites data/golden/creatureLegacyRooms.json.
// Notes  : The probe set is deliberately exhaustive over tiles and objective states; any drift is a real behavior change.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { generateWater, returnX, type WaterRoom } from "../src/game/creature/waterWorld";
import { newObjective, valves, leftExit, drainedRoom, emergencyRelease, objectiveBarrier, type RoomObjective } from "../src/game/creature/waterObjectives";
import { challengeSolid, switchback } from "../src/game/creature/waterChallenges";
import { arenaRoom, guardedControl } from "../src/game/creature/waterCombatRooms";
import { encounterKinds, spawnEncounters, reedPatches, hasVent, reedCover } from "../src/game/creature/waterEncounters";
import { netRig, netFrame } from "../src/game/creature/waterTraps";
import { verticalOpening, verticalArrival, horizontalReturn, pitRoom } from "../src/game/creature/waterRoutes";

const GOLDEN = new URL("../data/golden/creatureLegacyRooms.json", import.meta.url);
const SEEDS = [...Array(48).keys()].concat([255, 1001, 4242, 0x7fffffff, 0xffffffff]);
const base = newObjective();
const STATES: (RoomObjective | undefined)[] = [undefined, base, { ...base, first: true }, { ...base, first: true, open: true },
  { ...base, verticalOpen: true }, { ...base, open: true, verticalOpen: true }, { ...base, arenaActive: true },
  { ...base, arenaActive: true, arenaCleared: true, open: true }, { ...base, open: true, remaining: 5 }];

function hash(s: string): string {
  let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}
/** Everything a room decides, as text: tiles per state, rules, spawns and routes. */
export function roomRecord(rooms: WaterRoom[], r: WaterRoom): string {
  const out: string[] = [];
  for (const raised of [false, true]) for (const [n, o] of STATES.entries()) {
    let grid = "";
    for (let ty = -1; ty <= 22; ty++) for (let tx = -1; tx <= 41; tx++) grid += challengeSolid(r, raised, tx, ty, o) ? "#" : ".";
    out.push(`solid r${raised} s${n} ${grid}`);
    if (o) {
      out.push(`barrier s${n} ` + [...Array(42).keys()].map(tx => objectiveBarrier(r, o, tx - 1) ? "#" : ".").join(""));
      let open = "";
      for (let ty = -1; ty <= 22; ty++) for (let tx = -1; tx <= 41; tx++) open += verticalOpening(r, o, tx, ty) ? "^" : ".";
      out.push(`opening s${n} ${open}`);
      const arrivals: string[] = [];
      for (let x = 0; x <= 640; x += 4) for (const y of [60, 95, 96, 300, 338, 339, 350]) {
        const a = verticalArrival(r, x, y, o); if (a) arrivals.push(`${x},${y}->${JSON.stringify(a)}`);
      }
      out.push(`arrivals s${n} ${arrivals.join(" ")}`);
      out.push(`drained s${n} ${drainedRoom(r, o)} emergency ${JSON.stringify(emergencyRelease(r, o, 600))} ${JSON.stringify(emergencyRelease(r, o, 500))}`);
    }
  }
  out.push(`valves ${JSON.stringify(valves(r))} leftExit ${leftExit(r)} arena ${arenaRoom(r)} guarded ${[0, 1, 2].map(i => guardedControl(r, i))}`);
  out.push(`kinds ${encounterKinds(r)} spawns ${JSON.stringify(spawnEncounters(r))} reeds ${reedPatches(r)} vent ${hasVent(r)} pit ${pitRoom(r)} switchback ${switchback(r)}`);
  out.push(`cover ` + [...Array(81).keys()].map(i => reedCover(r, i * 8) ? "r" : ".").join(""));
  out.push(`net ${JSON.stringify(netRig(r))} ${JSON.stringify(netFrame(r))} returnX ${returnX(r)}`);
  for (const other of rooms) if (other.id !== r.id) out.push(`return ${r.id}->${other.id} ${JSON.stringify(horizontalReturn(r, other))}`);
  return out.join("\n");
}

describe("Legacy Water room rules are frozen by golden fingerprints", () => {
  const actual: Record<string, Record<string, string>> = {};
  for (const seed of SEEDS) {
    const w = generateWater(seed); actual[seed] = {};
    for (const r of w.rooms) actual[seed][r.id] = hash(roomRecord(w.rooms, r));
  }
  if (process.env.UPDATE_GOLDEN) writeFileSync(GOLDEN, JSON.stringify(actual, null, 1) + "\n");
  const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as typeof actual;
  for (const seed of SEEDS) it(`seed ${seed} matches the pinned room rules`, () => {
    expect(actual[seed], `seed ${seed}`).toEqual(golden[String(seed)]);
  });
});
