// Protect presentation direction, shortest turns, stop/pause stability and reduced-motion behavior.
import { it, expect } from "vitest";
import { restingPose, swimPose } from "../src/game/cell/swimMotion";
it("faces velocity smoothly without changing velocity or snapping across the angle seam", () => {
  let p = restingPose(); p = swimPose(p, 100, 0, .1, false);
  expect(p.angle).toBeGreaterThan(0); expect(p.angle).toBeLessThan(Math.PI / 2);
  for (let n = 0; n < 60; n++) p = swimPose(p, 100, 0, 1 / 60, false);
  expect(p.angle).toBeCloseTo(Math.PI / 2, 3);
  const seam = { ...p, angle: Math.PI - .01 };
  expect(Math.abs(swimPose(seam, -1, 100, .1, false).angle - seam.angle)).toBeLessThan(.1);
});
it("keeps heading at rest, freezes on zero delta, and wriggles only without reduced motion", () => {
  const p = { ...restingPose(), angle: 1.1 };
  expect(swimPose(p, 0, 0, .1, false).angle).toBe(1.1);
  const a = swimPose(p, 40, 50, .05, false); expect(a.sx).not.toBe(1); expect(a.sx + a.sy).toBeCloseTo(2);
  expect(swimPose(a, 40, 50, 0, false)).toEqual(a);
  const reduced = swimPose(p, 40, 50, .05, true);
  expect(reduced.sx).toBe(1); expect(reduced.sy).toBe(1); expect(reduced.rotation).toBe(reduced.angle);
});
