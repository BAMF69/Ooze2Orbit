// ---------------------------------------------------------------------------
// critters.ts
// Purpose : What the lake's smaller creatures want to do each moment (the deepmaw has the gulper's mind instead):
//           darters and finrays flee you, spinefish chase you when you come close, shellbacks ignore you until you
//           ram them, then everyone who was rammed bites back for a while. Each keeps to its own depth band unless
//           it is chasing or fleeing you.
// Usage   : const it = critterIntent(KINDS.spinefish, me, player, provokedLeft > 0, wanderDir)
//           it.dir (unit, top-down), it.targetZ (height to swim toward), it.speedMult, it.mode
// Notes   : Pure. Tested in tests/aquaticCreature.test.ts ("critters"). The scene moves them (swim()) and resolves
//           contacts (ram, bite).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import type { KindTuning } from "./tuning";

export interface Pos3 {
  x: number;
  y: number;
  z: number;
}

export interface Intent {
  dir: { x: number; y: number };
  targetZ: number;
  speedMult: number;
  mode: "wander" | "chase" | "flee";
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function unit(dx: number, dy: number): { x: number; y: number } {
  const d = Math.hypot(dx, dy);
  return d < 1e-6 ? { x: 0, y: 0 } : { x: dx / d, y: dy / d };
}

/** The height a critter drifts back to when nothing is happening: the middle of its band. */
export function homeZ(k: KindTuning): number {
  return (k.zMin + k.zMax) / 2;
}

/** A darter school's pick: the nearest fish of the given kinds within range of the school's centre, or null. */
export function schoolTarget<T extends Pos3 & { id: number }>(centre: Pos3, candidates: readonly T[], range: number): T | null {
  let best: T | null = null;
  let bestD = range;
  for (const c of candidates) {
    const d = Math.hypot(c.x - centre.x, c.y - centre.y, c.z - centre.z);
    if (d <= bestD) { best = c; bestD = d; }
  }
  return best;
}

export function critterIntent(k: KindTuning, me: Pos3, player: Pos3, provoked: boolean, wander: { x: number; y: number }): Intent {
  const dist = Math.hypot(player.x - me.x, player.y - me.y, player.z - me.z);
  if (k.flee > 0 && dist < k.flee && !provoked) {
    // away from you, and away vertically too, but never out of the water column it can live in
    const away = unit(me.x - player.x, me.y - player.y);
    const up = me.z >= player.z ? k.zMax : k.zMin;
    return { dir: away, targetZ: up, speedMult: 1.35, mode: "flee" };
  }
  if ((k.aggro > 0 && dist < k.aggro) || (provoked && k.provoked)) {
    // chasing: it follows you up and down, a little past its band (a hunter leaves home for a meal)
    return { dir: unit(player.x - me.x, player.y - me.y), targetZ: clamp(player.z, k.zMin - 30, k.zMax + 30), speedMult: 1.15, mode: "chase" };
  }
  return { dir: wander, targetZ: clamp(me.z, k.zMin, k.zMax) === me.z ? me.z : homeZ(k), speedMult: 1, mode: "wander" };
}
