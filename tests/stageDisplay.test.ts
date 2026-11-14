// Purpose: Protect all-stage safe camera bounds and responsive maze coordinates independently of Phaser.
import { describe, expect, it } from "vitest";
import { stageViewport, type DisplayStage } from "../src/core/viewport";
import { warsLayout } from "../src/game/civ/layout";
const safe = { top: 44, right: 12, bottom: 34, left: 12 };
describe("remaining stage display adapters", () => {
  for (const stage of ["aquatic", "creature", "civ", "space"] as DisplayStage[]) it(`${stage} keeps portrait and landscape inside safe bounds`, () => {
    for (const [w, h] of [[375, 812], [812, 375], [800, 1280], [1280, 720]]) {
      const box = stageViewport(stage, w, h, safe);
      expect(box.top).toBeGreaterThanOrEqual(safe.top); expect(box.left).toBe(safe.left);
      expect(box.left + box.width).toBeLessThanOrEqual(w - safe.right);
      expect(box.top + box.height).toBeLessThanOrEqual(h - safe.bottom - 64);
      expect(box.logicalWidth).toBeGreaterThan(0); expect(box.logicalHeight).toBeGreaterThan(0);
    }
  });
  it("stacks civilization mazes in portrait and keeps grid hit coordinates aligned", () => {
    const b = warsLayout(360, 599); expect(b.stacked).toBe(true); expect(b.left.x).toBe(b.right.x);
    expect(b.right.y).toBeGreaterThan(b.left.y + b.tile * 7);
    expect(b.right.y + b.tile * 7).toBeLessThanOrEqual(599);
    for (let x = 0; x < 11; x++) expect(Math.floor(((b.left.x + (x + 0.5) * b.tile) - b.left.x) / b.tile)).toBe(x);
  });
  it("fits both civilization grids side by side on short landscape viewports", () => {
    const b = warsLayout(640, 180); expect(b.stacked).toBe(false);
    expect(b.left.x + b.tile * 11).toBeLessThan(b.right.x); expect(b.right.x + b.tile * 11).toBeLessThanOrEqual(640);
    expect(b.right.y + b.tile * 7).toBeLessThanOrEqual(180);
  });
  it("preserves a full-height side view in creature portrait instead of flattening its room", () => {
    const b = stageViewport("creature", 375, 812, safe); expect(b.logicalHeight).toBe(360); expect(b.logicalWidth).toBeLessThan(360);
  });
});
