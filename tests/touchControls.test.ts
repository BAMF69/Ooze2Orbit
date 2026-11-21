// Purpose: Touch layout file repair, size/sensitivity steps, on-screen clamping, the d-pad breach rule,
//          the stick dead zone, and the reduced render budgets from the 2026-11-21 playtest.
import { describe, expect, it } from "vitest";
import { TOUCH_LAYOUT, clampOffset, defaultTouchLayout, parseTouchLayout, stepDeadzone, stepScale, touchLayoutText } from "../src/core/touchLayout";
import { SurfaceBreach } from "../src/game/aquatic/surfaceBreach";
import { stickDirections } from "../src/core/controlScheme";
import { RENDER_BUDGET, isLowEndDevice, renderTarget } from "../src/core/renderQuality";

describe("touch layout file", () => {
  it("falls back to defaults for a missing or damaged file", () => {
    expect(parseTouchLayout(null)).toEqual(defaultTouchLayout());
    expect(parseTouchLayout("{oops")).toEqual(defaultTouchLayout());
    expect(parseTouchLayout("[1,2]")).toEqual(defaultTouchLayout());
  });
  it("repairs fields one by one and clamps out-of-range values", () => {
    const l = parseTouchLayout(JSON.stringify({ stick: { scale: 9, dx: -4, dy: "x" }, buttons: { scale: 1.5 }, deadzone: 0 }));
    expect(l.stick).toEqual({ scale: TOUCH_LAYOUT.maxScale, dx: -TOUCH_LAYOUT.maxOffset, dy: 0 });
    expect(l.buttons).toEqual({ scale: 1.5, dx: 0, dy: 0 });
    expect(l.deadzone).toBe(TOUCH_LAYOUT.minDeadzone);
  });
  it("round-trips through its text form", () => {
    const l = stepScale(stepDeadzone(defaultTouchLayout(), 2), "stick", 4);
    expect(parseTouchLayout(touchLayoutText(l))).toEqual(l);
  });
  it("steps sizes and sensitivity inside their ranges", () => {
    let l = defaultTouchLayout();
    for (let i = 0; i < 40; i++) l = stepScale(l, "buttons", 1);
    expect(l.buttons.scale).toBe(TOUCH_LAYOUT.maxScale);
    for (let i = 0; i < 40; i++) l = stepDeadzone(l, -1);
    expect(l.deadzone).toBe(TOUCH_LAYOUT.minDeadzone);
    expect(stepScale(defaultTouchLayout(), "stick", 3).stick.scale).toBeCloseTo(1.3);
  });
  it("defaults to a larger dead zone than the old 0.18 that testers called too sensitive", () => {
    expect(defaultTouchLayout().deadzone).toBeGreaterThan(0.18);
  });
});

describe("clampOffset keeps a moved group on screen", () => {
  const base = { left: 20, top: 600, width: 100, height: 100 };
  it("passes through an offset that stays inside", () => {
    expect(clampOffset(base, 400, 800, 50, -100)).toEqual({ dx: 50, dy: -100 });
  });
  it("pulls a group dragged past an edge back inside", () => {
    const o = clampOffset(base, 400, 800, -500, 500);
    expect(base.left + o.dx).toBe(TOUCH_LAYOUT.edgeMargin);
    expect(base.top + o.dy + base.height).toBe(800 - TOUCH_LAYOUT.edgeMargin);
  });
  it("centres a group bigger than the screen instead of jumping", () => {
    const o = clampOffset({ left: 0, top: 0, width: 500, height: 50 }, 400, 800, 0, 0);
    expect(o.dx).toBe(-50);
  });
});

describe("d-pad up at the surface breaches once per hold", () => {
  it("breaches when up is held and the swimmer arrives at the surface", () => {
    const b = new SurfaceBreach();
    expect(b.update(true, false, false)).toBe(false); // rising
    expect(b.update(true, true, false)).toBe(true); // arrived: breach
    expect(b.update(true, true, true)).toBe(false); // in the air
    expect(b.update(true, true, false)).toBe(false); // splashed back, still holding: no second breach
    expect(b.update(false, true, false)).toBe(false); // release re-arms
    expect(b.update(true, true, false)).toBe(true); // press at the surface: breach
  });
  it("never breaches without up held", () => {
    const b = new SurfaceBreach();
    for (let i = 0; i < 5; i++) expect(b.update(false, true, false)).toBe(false);
  });
});

describe("stick dead zone", () => {
  it("ignores a small thumb movement with a bigger dead zone", () => {
    expect(stickDirections(0.2, 0, 0.18)).toEqual(["move_right"]);
    expect(stickDirections(0.2, 0, 0.26)).toEqual([]);
  });
});

describe("older-device render budgets", () => {
  it("Performance draws no more than about 960x540", () => {
    const t = renderTarget(1024, 768, 640, 480, 2, "performance", true);
    expect(t.width * t.height).toBeLessThanOrEqual(RENDER_BUDGET.performance.pixels * 1.01);
  });
  it("Auto on a low-end touch device uses a smaller budget than normal Auto", () => {
    const normal = renderTarget(1024, 768, 640, 480, 2, "auto", true);
    const low = renderTarget(1024, 768, 640, 480, 2, "auto", true, 8192, true);
    expect(low.width * low.height).toBeLessThan(normal.width * normal.height);
  });
  it("guesses low-end only from reported numbers", () => {
    expect(isLowEndDevice(4, undefined)).toBe(true);
    expect(isLowEndDevice(8, 2)).toBe(true);
    expect(isLowEndDevice(8, undefined)).toBe(false);
    expect(isLowEndDevice(undefined, undefined)).toBe(false);
  });
});
