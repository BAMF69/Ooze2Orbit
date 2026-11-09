// ---------------------------------------------------------------------------
// river.ts
// Purpose : The river runs between the aquatic maps (BAMF69 2026-11-08): a fast, narrow channel you are carried down.
//           Builds a run from a seed: rows of obstacles you must read and pass (a rock wall with a gap: steer through;
//           rocks on the riverbed: swim over; logs floating at the top: dive under or jump them), food along the way,
//           a few spinefish, and the river's unique part, placed somewhere risky. Every row always has a way through.
// Usage   : const run = makeRiver(RIVERS[0], mulberry32(7)); hitAt(run, s, x, z, radius) -> the obstacle you touch
//           Coordinates: s = distance down the river (0 = start), x = across (0 = middle, +- width/2 = the banks),
//           z = height above the riverbed (0 .. depth).
// Notes   : Pure. Tested in tests/aquaticRiver.test.ts. The scene maps (x, s) onto the lake plane to draw it.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
//
// Pseudocode
//   for s from 400 to length - 300 step rowEvery:
//     pick a row type: wall (gap at a random x), low (rocks on the bed: go high), high (logs on top: go low or jump)
//     place round obstacles (s, x, z, r) to fill the row except the passage
//   scatter food mostly in the passages; a few spinefish between rows; the part in a wall row's gap past halfway

import type { RiverSpec } from "./tuning";

export type RiverThingKind = "rock" | "log" | "algae" | "plankton" | "meat" | "spinefish" | "part";

export interface RiverThing {
  kind: RiverThingKind;
  s: number;
  x: number;
  z: number;
  r: number; // collision radius (obstacles), pickup radius otherwise
}

export interface RiverRun {
  spec: RiverSpec;
  things: RiverThing[];
  rows: { s: number; type: "wall" | "low" | "high"; gapX: number }[];
}

export const OBSTACLE_R = 26;
const STEP = 44; // obstacle spacing across a row

export function makeRiver(spec: RiverSpec, rng: () => number): RiverRun {
  const things: RiverThing[] = [];
  const rows: RiverRun["rows"] = [];
  const half = spec.width / 2;
  const across = (from: number, to: number, f: (x: number) => void) => { for (let x = from; x <= to; x += STEP) f(x); };
  let k = 0;
  for (let s = 400; s <= spec.length - 300; s += spec.rowEvery, k++) {
    const roll = rng();
    const type = k < 2 ? "wall" : roll < 0.5 ? "wall" : roll < 0.75 ? "low" : "high";
    const gapX = (rng() - 0.5) * (spec.width - spec.gap - 40);
    rows.push({ s, type, gapX });
    if (type === "wall") { // rocks floor to top, except the gap: steer through it
      across(-half, half, (x) => {
        if (Math.abs(x - gapX) < spec.gap / 2 + OBSTACLE_R) return;
        for (let z = 18; z < spec.depth; z += 36) things.push({ kind: "rock", s, x, z, r: OBSTACLE_R });
      });
    } else if (type === "low") { // a bank of rocks on the riverbed: swim over it
      across(-half, half, (x) => things.push({ kind: "rock", s, x, z: 20, r: OBSTACLE_R + 6 }));
    } else { // logs floating at the top: dive under them, or jump them at the surface
      across(-half, half, (x) => things.push({ kind: "log", s, x, z: spec.depth - 16, r: OBSTACLE_R }));
    }
  }
  // food: mostly where you will be anyway (a row's passage), the rest anywhere
  for (let i = 0; i < spec.food; i++) {
    const row = rows[Math.floor(rng() * rows.length)];
    const s = row.s + (rng() < 0.5 ? -1 : 1) * (60 + rng() * (spec.rowEvery / 2 - 70));
    const x = rng() < 0.6 ? row.gapX + (rng() - 0.5) * 40 : (rng() - 0.5) * (spec.width - 40);
    const kind: RiverThingKind = rng() < 0.4 ? "meat" : rng() < 0.5 ? "plankton" : "algae";
    things.push({ kind, s, x, z: 20 + rng() * (spec.depth - 40), r: 24 });
  }
  // a few spinefish holding station between rows
  for (let i = 0; i < Math.round(spec.length / 900); i++) {
    const row = rows[2 + Math.floor(rng() * Math.max(1, rows.length - 3))];
    if (row) things.push({ kind: "spinefish", s: row.s + spec.rowEvery / 2, x: (rng() - 0.5) * (spec.width - 60), z: 30 + rng() * 50, r: 18 });
  }
  // the river's unique part: in the gap of a wall row past halfway, right where the rocks crowd in
  const late = rows.filter((r) => r.type === "wall" && r.s > spec.length * 0.5);
  const at = late[Math.floor(rng() * late.length)] ?? rows[rows.length - 1];
  things.push({ kind: "part", s: at.s, x: at.gapX, z: spec.depth / 2, r: 22 });
  return { spec, things, rows };
}

/** The obstacle (rock or log) a body of `radius` at (s, x, z) touches, or null. */
export function hitAt(run: RiverRun, s: number, x: number, z: number, radius: number): RiverThing | null {
  for (const t of run.things) {
    if (t.kind !== "rock" && t.kind !== "log") continue;
    if (Math.abs(t.s - s) > t.r + radius) continue;
    if (Math.hypot(t.s - s, t.x - x, t.z - z) < t.r + radius) return t;
  }
  return null;
}

// ---- swimming a river run ----------------------------------------------------------------------------
/** You in a river run: carried down by the current, steering across and up and down; can jump clear at the top. */
export interface RiverBody {
  s: number;
  x: number;
  z: number;
  vx: number; // across
  vz: number;
  speed: number; // down the river
  airborne: boolean;
  dashLeft: number;
}

export interface RiverInput {
  turn: number; // -1..1 across (+ = right bank)
  push: number; // -1..1: swim with the current, or hold back
  rise: number; // -1..1
}

export function newRiverBody(spec: RiverSpec): RiverBody {
  return { s: 0, x: 0, z: spec.depth / 2, vx: 0, vz: 0, speed: spec.current, airborne: false, dashLeft: 0 };
}

const GRAVITY = 520;
const RISE = 260;

/** One step down the river. Returns true on the frame a jump lands back in the water. */
export function riverStep(b: RiverBody, inp: RiverInput, dt: number, spec: RiverSpec, dashSpeed: number): boolean {
  const want = spec.current + (inp.push > 0 ? spec.boost * inp.push : inp.push < 0 ? spec.slow * inp.push : 0) + (b.dashLeft > 0 ? dashSpeed : 0);
  b.dashLeft = Math.max(0, b.dashLeft - dt);
  b.speed += (want - b.speed) * Math.min(1, dt * 3); // the water gets you up to speed (and back after a hit)
  b.s += b.speed * dt;
  b.vx += (Math.max(-1, Math.min(1, inp.turn)) * spec.strafe - b.vx) * Math.min(1, dt * 6);
  b.x = Math.max(-spec.width / 2 + 10, Math.min(spec.width / 2 - 10, b.x + b.vx * dt));
  if (b.airborne) {
    b.vz -= GRAVITY * dt;
    b.z += b.vz * dt;
    if (b.z <= spec.depth && b.vz < 0) { b.airborne = false; b.vz *= 0.35; return true; }
    return false;
  }
  b.vz += Math.max(-1, Math.min(1, inp.rise)) * RISE * dt;
  b.vz *= Math.exp(-2.4 * dt);
  b.z = Math.max(8, Math.min(spec.depth, b.z + b.vz * dt));
  if (b.z >= spec.depth) b.vz = Math.min(0, b.vz);
  return false;
}

/** Jump: near the top, clear the water (over a log); underwater it does nothing (the current is too strong). */
export function riverJump(b: RiverBody, spec: RiverSpec, speed: number): boolean {
  if (b.airborne || b.z < spec.depth - 16) return false;
  b.airborne = true;
  b.vz = speed;
  b.z = spec.depth + 0.01;
  return true;
}
