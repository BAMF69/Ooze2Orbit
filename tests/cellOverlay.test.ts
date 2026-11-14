// Preserve actual progression gates while presenting four form sections and a full-pond viewport.
import { it, expect } from "vitest";
import { newCreature } from "../src/game/cell/rules";
import { growthSections } from "../src/game/cell/growthMeter";
import { stageViewport } from "../src/core/viewport";
it("fills the active section from its real food gate, and marks Form 4 complete without another gate", () => {
  const c = newCreature(); expect(growthSections({ ...c, food: 20 })).toEqual([.5, 0, 0, 0]);
  expect(growthSections({ ...c, form: 2, food: 45 })).toEqual([1, .5, 0, 0]);
  expect(growthSections({ ...c, form: 3, food: 70 })).toEqual([1, 1, .5, 0]);
  expect(growthSections({ ...c, form: 4, food: 0 })).toEqual([1, 1, 1, 1]);
  expect(growthSections({ ...c, form: 2, food: 0 })).toEqual([1, 0, 0, 0]);
});
it("fills desktop and mobile viewports while the HUD independently respects cutouts", () => {
  for (const [w, h] of [[1440, 900], [375, 812], [812, 375], [800, 1280]]) {
    const b = stageViewport("main", w, h, { top: 44, right: 10, bottom: 34, left: 10 });
    expect([b.left, b.top, b.width, b.height]).toEqual([0, 0, w, h]);
    expect(Math.abs(b.logicalWidth / b.logicalHeight - w / h)).toBeLessThan(.01);
  }
});
