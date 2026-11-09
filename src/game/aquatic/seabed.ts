// ---------------------------------------------------------------------------
// seabed.ts
// Purpose : The seabed does things (BAMF69 2026-11-08): rocks are solid and push you off (no damage), seaweed
//           tangles you and slows you for a moment. Pure: which rock you touch and which way it pushes, and whether
//           any weed has you.
// Usage   : const e = seabedContact(you, things, AQ.seabed); if (e.push) { vx += e.push.x; ... }; if (e.tangled) ...
// Notes   : Tested in tests/aquaticCreature.test.ts ("seabed"). Heights are above the seabed (z).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

export interface SeabedTuning {
  rockBounce: number;
  rockHeight: number;
  weedHeight: number;
  radius: number;
}

export interface SeabedThing {
  kind: string; // "rock" and "weed" matter; anything else is ignored
  x: number;
  y: number;
}

/** The push (px/s, away from the rock's centre) from the nearest rock you touch, and whether a weed tangles you. */
export function seabedContact(
  you: { x: number; y: number; z: number; size: number }, things: readonly SeabedThing[], t: SeabedTuning,
): { push: { x: number; y: number } | null; tangled: boolean } {
  let push: { x: number; y: number } | null = null;
  let tangled = false;
  let nearest = Infinity;
  const reach = t.radius + you.size * 0.4;
  for (const th of things) {
    if (th.kind !== "rock" && th.kind !== "weed") continue;
    const dx = you.x - th.x, dy = you.y - th.y;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
    const d = Math.hypot(dx, dy);
    if (d > reach) continue;
    if (th.kind === "weed") { if (you.z < t.weedHeight) tangled = true; continue; }
    if (you.z >= t.rockHeight || d >= nearest) continue;
    nearest = d;
    const n = d < 1e-6 ? { x: 1, y: 0 } : { x: dx / d, y: dy / d };
    push = { x: n.x * t.rockBounce, y: n.y * t.rockBounce };
  }
  return { push, tangled };
}
