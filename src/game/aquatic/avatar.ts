// ---------------------------------------------------------------------------
// avatar.ts
// Purpose : The body you swim behind, as pure physics: turn to steer with the cell stage's momentum (thrust that
//           builds up, water drag), rise and sink between the seabed and the surface, and two abilities: dash (a
//           burst of speed, then a cooldown) and jump (near the surface: a breach out of the water and back;
//           underwater: a short upward kick).
// Usage   : const ev = steerAvatar(av, { turn, push, rise }, dt, movement(creature), AQ.water)
//           jump(av, AQ.water) -> "breach" | "kick" | null;  dash(av, movement(creature)) -> boolean
// Notes   : Pure (mutates the avatar record it is given, like steer.ts). Tested in tests/aquatic.test.ts. The
//           stats that shape the numbers live in creature.ts (movement()).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { swim } from "../cell/steer";
import type { Movement } from "./creature";
import { wrapAngle } from "./view";

export interface Avatar {
  x: number;
  y: number;
  z: number; // height above the seabed
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  spool: number; // 0..1 thrust build-up
  airborne: boolean; // mid-breach, above the surface
  dashLeft: number; // s of dash burst left
  dashCd: number;
  kickCd: number;
}

export interface Water {
  surface: number;
  floorZ: number;
  riseAccel: number;
  vDrag: number;
  gravity: number;
  breachBand: number;
  breachSpeed: number;
  kick: number;
  kickCdS: number;
}

export interface Steer {
  turn: number; // -1..1, + = right
  push: number; // -1..1: forward, or back to slow harder
  rise: number; // -1..1: up or down
}

export function newAvatar(x: number, y: number, z: number, heading: number): Avatar {
  return { x, y, z, vx: 0, vy: 0, vz: 0, heading, spool: 0, airborne: false, dashLeft: 0, dashCd: 0, kickCd: 0 };
}

/** One step. Returns "splash" on the frame a breach falls back into the water. */
export function steerAvatar(a: Avatar, s: Steer, dt: number, m: Movement, w: Water): "splash" | null {
  a.dashCd = Math.max(0, a.dashCd - dt);
  a.kickCd = Math.max(0, a.kickCd - dt);
  if (a.airborne) { // in the air: no steering, gravity, a little air drag
    a.vz -= w.gravity * dt;
    a.vx *= Math.exp(-0.3 * dt);
    a.vy *= Math.exp(-0.3 * dt);
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.z += a.vz * dt;
    if (a.z <= w.surface && a.vz < 0) {
      a.airborne = false;
      a.vz *= 0.35; // the water catches you
      return "splash";
    }
    return null;
  }
  a.heading = wrapAngle(a.heading + Math.max(-1, Math.min(1, s.turn)) * m.turnRate * dt);
  const dashing = a.dashLeft > 0;
  a.dashLeft = Math.max(0, a.dashLeft - dt);
  const pushing = s.push > 0 || dashing;
  a.spool = pushing ? Math.min(1, a.spool + dt / Math.max(1e-6, m.spoolS)) : 0;
  const thrust = dashing ? 1 : pushing ? (m.spoolMin + (1 - m.spoolMin) * a.spool) * Math.min(1, s.push) : 0;
  const brake = s.push < 0 ? 2 : 1; // holding back drags harder: a heavy body still coasts, just less
  const top = dashing ? Math.max(m.maxSpeed, m.dashSpeed) : m.maxSpeed;
  swim(a, Math.cos(a.heading) * thrust, Math.sin(a.heading) * thrust, dt,
    { accel: dashing ? m.accel * 4 : m.accel, maxSpeed: top, drag: dashing ? 0 : m.drag * brake });
  // up and down: thrust against water drag; the seabed and the surface stop you (only a breach leaves the water)
  a.vz += Math.max(-1, Math.min(1, s.rise)) * w.riseAccel * dt;
  a.vz *= Math.exp(-w.vDrag * dt);
  a.z += a.vz * dt;
  if (a.z < w.floorZ) { a.z = w.floorZ; a.vz = Math.max(0, a.vz); }
  if (a.z > w.surface) { a.z = w.surface; a.vz = Math.min(0, a.vz); }
  return null;
}

/** Jump: at the surface, breach (out of the water in an arc); underwater, a short upward kick on a cooldown. */
export function jump(a: Avatar, w: Water): "breach" | "kick" | null {
  if (a.airborne) return null;
  if (a.z >= w.surface - w.breachBand) {
    a.airborne = true;
    a.vz = w.breachSpeed;
    a.z = w.surface + 0.01;
    return "breach";
  }
  if (a.kickCd > 0) return null;
  a.vz += w.kick;
  a.kickCd = w.kickCdS;
  return "kick";
}

/** Dash: a burst of top speed forward, then a cooldown. Not in the air. */
export function dash(a: Avatar, m: Movement): boolean {
  if (a.airborne || a.dashCd > 0) return false;
  a.dashLeft = m.dashS;
  a.dashCd = m.dashCdS;
  a.vx += Math.cos(a.heading) * m.dashSpeed * 0.6;
  a.vy += Math.sin(a.heading) * m.dashSpeed * 0.6;
  return true;
}
