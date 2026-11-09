// ---------------------------------------------------------------------------
// sight.ts (creature)
// Purpose : What a foe notices (the stealth way must be readable, not random): a stalker sees in a cone ahead of
//           it, out to its range; crouching halves the range, camouflage halves it again, and crouching in tall
//           grass hides you completely. A sleeping brute hears instead: walking near it fills its wake meter,
//           sprinting fills it faster, creeping does not, and the meter drains while you are quiet.
// Usage   : sees({ x, y, facing }, you, { inGrass, crouched, camo }) ; noise(meter, distance, moving, crouched, dt)
// Notes   : Pure, tested in tests/creatureWays.test.ts. Pixels. Numbers: CR.foes, CR.stealth.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { CR } from "./tuning";

export interface Hiding { inGrass: boolean; crouched: boolean; camo: boolean }

/** The sight range left after crouching and camouflage (0 = hidden). */
export function sightRange(h: Hiding): number {
  if (h.crouched && h.inGrass) return 0;
  const s = CR.stealth;
  return CR.foes.stalker.sight * (h.crouched ? s.crouchSightMult : 1) * (h.camo ? s.camoSightMult : 1);
}

/** Does a stalker at eye (x, y) facing ±1 see you at (px, py)? */
export function sees(eye: { x: number; y: number; facing: number }, you: { x: number; y: number }, h: Hiding, rangeMult = 1): boolean {
  const range = sightRange(h) * rangeMult; // rangeMult: the boss sees farther
  const dx = (you.x - eye.x) * eye.facing, dy = you.y - eye.y;
  if (range <= 0 || dx <= 0 || dx > range) return false;
  if (dy < -CR.foes.stalker.sightUp || dy > CR.foes.stalker.sightUp) return false;
  return Math.abs(Math.atan2(dy, dx)) <= (CR.foes.stalker.coneDeg * Math.PI) / 180 || Math.abs(dy) < 20;
}

/** A sleeping brute's wake meter after one step: walking near fills it, creeping or distance lets it drain. */
export function noise(meter: number, dist: number, moving: boolean, crouched: boolean, dt: number, sprinting = false): number {
  const loud = moving && !crouched && dist < CR.foes.brute.hearRange;
  const rate = sprinting ? CR.stealth.noiseRun : CR.stealth.noiseWalk; // sprinting is louder
  return Math.max(0, meter + (loud ? rate : -CR.stealth.noiseDecay) * dt);
}

export const woken = (meter: number) => meter >= CR.foes.brute.wakeNoise;
