// ---------------------------------------------------------------------------
// view.ts
// Purpose : The pseudo-3D behind view, as pure maths: where a point in the lake (x, y on the top-down plane, z its
//           height above the seabed) lands on screen when the camera sits behind the avatar at its height, which
//           side of a creature is seen (back, side, front), and which screen edge a hidden threat is on (left,
//           right, behind, above, below).
// Usage   : const cam = cameraBehind(avatar, AQ.camera); const p = project(cam, x, y, z, W, H, AQ.camera)
//           viewOf(creatureHeading, cam.heading) -> "back" | "side" | "front", plus flip
// Notes   : No Phaser. Tested in tests/aquatic.test.ts. The world stays top-down (x, y, heading in radians,
//           0 = +x) plus a height z (0 = seabed); only drawing is "3D".
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
//
// Pseudocode
//   camera = avatar position - heading * back, at the avatar's height + eye, looking along heading
//   for a point: d = point - camera; depth = d . forward; side = d . right
//   depth < near or > far -> not drawn
//   screen x = W/2 + side * focal / depth;  screen y = horizon + (camera z - z) * focal / depth;  scale = focal / depth

export interface Heading {
  x: number;
  y: number;
  z?: number;
  heading: number;
}

export interface Camera {
  x: number;
  y: number;
  z: number; // eye height above the seabed
  heading: number;
  fx: number; // forward unit vector
  fy: number;
}

export interface CameraTuning {
  back: number;
  eye: number; // the camera rides this far above the avatar
  focal: number;
  horizon: number;
  near: number;
  far: number;
}

export interface Projected {
  sx: number;
  sy: number;
  scale: number; // how big a thing of world size 1 is on screen at this depth (focal / depth)
  depth: number;
  side: number;
}

export function cameraBehind(a: Heading, t: { back: number; eye: number }): Camera {
  const fx = Math.cos(a.heading);
  const fy = Math.sin(a.heading);
  return { x: a.x - fx * t.back, y: a.y - fy * t.back, z: (a.z ?? 0) + t.eye, heading: a.heading, fx, fy };
}

/** Where a point at height z lands on a W x H screen, or null when it is behind the camera, too near or too far. */
export function project(cam: Camera, x: number, y: number, z: number, w: number, h: number, t: CameraTuning): Projected | null {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const depth = dx * cam.fx + dy * cam.fy;
  if (depth < t.near || depth > t.far) return null;
  const side = -dx * cam.fy + dy * cam.fx; // + is to the right of the view
  const scale = t.focal / depth;
  return { sx: w / 2 + side * scale, sy: h * t.horizon + (cam.z - z) * scale, scale, depth, side };
}

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r <= -Math.PI) r += Math.PI * 2;
  if (r > Math.PI) r -= Math.PI * 2;
  return r;
}

/**
 * Which side of a creature the camera sees: swimming away = back, toward us = front, across = side.
 * flip = true when a side view should be mirrored (the sprites are drawn facing right).
 */
export function viewOf(creatureHeading: number, cameraHeading: number): { view: "back" | "side" | "front"; flip: boolean } {
  const rel = wrapAngle(creatureHeading - cameraHeading);
  const a = Math.abs(rel);
  if (a < Math.PI / 4) return { view: "back", flip: false };
  if (a > (Math.PI * 3) / 4) return { view: "front", flip: false };
  return { view: "side", flip: rel < 0 }; // heading to the camera's left: face left
}

export type Edge = "left" | "right" | "behind" | "above" | "below";

/**
 * The behind-you warning: the nearest threat within range that the view does not show, and the screen edge it
 * comes from (0 strength at the range, 1 when touching). In front but far above or below the view also counts.
 * Null when every close threat is visible.
 */
export function hiddenThreat(
  a: Heading, threats: readonly { x: number; y: number; z?: number }[], range: number, viewHalfAngle: number,
  viewHalfPitch = Math.PI / 2,
): { edge: Edge; strength: number; dist: number } | null {
  let best: { edge: Edge; strength: number; dist: number } | null = null;
  for (const t of threats) {
    const dx = t.x - a.x;
    const dy = t.y - a.y;
    const dz = (t.z ?? 0) - (a.z ?? 0);
    const flat = Math.hypot(dx, dy);
    const dist = Math.hypot(flat, dz);
    if (dist > range) continue;
    if (best && dist >= best.dist) continue;
    const rel = wrapAngle(Math.atan2(dy, dx) - a.heading);
    const pitch = Math.atan2(dz, flat);
    let edge: Edge | null = null;
    if (Math.abs(rel) > viewHalfAngle) edge = Math.abs(rel) > (Math.PI * 3) / 4 ? "behind" : rel > 0 ? "right" : "left";
    else if (Math.abs(pitch) > viewHalfPitch) edge = pitch > 0 ? "above" : "below";
    if (!edge) continue; // in view: you can see it
    best = { edge, strength: 1 - dist / range, dist };
  }
  return best;
}
