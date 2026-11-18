// Purpose: One text record of everything a Water room decides, shared by the v1 goldens and the v2 comparison.
import { returnX, type WaterRoom } from "../../src/game/creature/waterWorld";
import { newObjective, valves, leftExit, drainedRoom, emergencyRelease, objectiveBarrier, type RoomObjective } from "../../src/game/creature/waterObjectives";
import { challengeSolid, switchback } from "../../src/game/creature/waterChallenges";
import { arenaRoom, guardedControl } from "../../src/game/creature/waterCombatRooms";
import { encounterKinds, spawnEncounters, reedPatches, hasVent, reedCover } from "../../src/game/creature/waterEncounters";
import { netRig, netFrame } from "../../src/game/creature/waterTraps";
import { verticalOpening, verticalArrival, horizontalReturn, pitRoom } from "../../src/game/creature/waterRoutes";
export const base = newObjective();
const STATES: (RoomObjective | undefined)[] = [undefined, base, { ...base, first: true }, { ...base, first: true, open: true },
  { ...base, verticalOpen: true }, { ...base, open: true, verticalOpen: true }, { ...base, arenaActive: true },
  { ...base, arenaActive: true, arenaCleared: true, open: true }, { ...base, open: true, remaining: 5 }];

export function hash(s: string): string {
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

