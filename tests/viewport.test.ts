// Purpose: Protect safe bounds, camera sizing and fixed resolution fallback without browser/engine imports.
import { describe, expect, it } from "vitest";
import { cellViewport } from "../src/core/viewport";
const zero = { top: 0, right: 0, bottom: 0, left: 0 };
describe("cell display layout", () => {
  it("keeps desktop simulation coordinates at their established resolution", () => {
    const a = cellViewport(1920, 1080, zero), b = cellViewport(1280, 720, zero);
    expect([a.logicalWidth, a.logicalHeight]).toEqual([640, 360]); expect(b.logicalHeight).toBe(360);
  });
  it("uses portrait world space instead of shrinking a landscape screenshot", () => {
    const p = cellViewport(375, 812, { ...zero, top: 44, bottom: 34 });
    expect(p.logicalWidth).toBe(360); expect(p.logicalHeight).toBeGreaterThan(p.logicalWidth);
    expect(p.top).toBe(168); expect(p.top + p.height).toBeLessThanOrEqual(812 - 34);
  });
  it("respects landscape cutouts and adapts tablet portrait framing", () => {
    const p = cellViewport(812, 375, { ...zero, left: 44, right: 44, bottom: 21 });
    expect(p.left).toBe(44); expect(p.width).toBe(724); expect(p.logicalHeight).toBeLessThan(360);
    expect(cellViewport(800, 1280, zero).logicalWidth).toBe(480);
  });
  it("bounds camera allocations and repairs bad inset measurements", () => {
    const p = cellViewport(200, 4000, { top: NaN, right: -2, left: Infinity, bottom: 0 });
    expect(p.logicalHeight).toBe(720); expect(p.left).toBe(0); expect(p.width).toBe(200);
  });
});
