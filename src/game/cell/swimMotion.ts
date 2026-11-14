// Purpose: Presentation-only heading and wriggle; no influence on collision or swim velocity.
// Authored: Written with Codex for Ooze2Orbit.
export const SWIM_ART = { turnRate: 9, minSpeed: 5, maxDt: .1, baseHz: 2.5, speedHz: .018, squash: .055, wiggle: .055 };
export interface SwimPose { angle: number; phase: number; sx: number; sy: number; rotation: number }
export const restingPose = (phase = 0): SwimPose => ({ angle: 0, phase, sx: 1, sy: 1, rotation: 0 });
export function swimPose(old: SwimPose, vx: number, vy: number, dt: number, reduced: boolean): SwimPose {
  const t = Math.max(0, Math.min(SWIM_ART.maxDt, dt)), speed = Math.hypot(vx, vy);
  const target = speed > SWIM_ART.minSpeed ? Math.atan2(vy, vx) + Math.PI / 2 : old.angle;
  const delta = Math.atan2(Math.sin(target - old.angle), Math.cos(target - old.angle));
  const angle = old.angle + delta * (1 - Math.exp(-SWIM_ART.turnRate * t));
  const phase = old.phase + t * (SWIM_ART.baseHz + speed * SWIM_ART.speedHz) * Math.PI * 2;
  const strength = reduced ? 0 : Math.min(1, .18 + speed / 100);
  const wave = Math.sin(phase) * strength;
  return { angle, phase, sx: 1 + wave * SWIM_ART.squash, sy: 1 - wave * SWIM_ART.squash,
    rotation: angle + Math.sin(phase * .5) * strength * SWIM_ART.wiggle };
}
