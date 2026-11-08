// ---------------------------------------------------------------------------
// cellSteer.test.ts
// Purpose : Locks the pond's movement maths (src/game/cell/steer.ts) and the atlas row lookup (atlas.ts).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { animSpecs, firstFrame, type AtlasLayout } from "../src/game/cell/atlas";
import { keepInside, knockApart, nearest, swim, toward, wanderDir, type Body } from "../src/game/cell/steer";

const P = { accel: 500, maxSpeed: 100, drag: 2 };

describe("swim", () => {
  it("never goes past max speed, even with a long push", () => {
    const b: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    for (let i = 0; i < 300; i++) swim(b, 1, 1, 1 / 60, P);
    expect(Math.hypot(b.vx, b.vy)).toBeLessThanOrEqual(100 + 1e-9);
  });

  it("drifts to a stop without input", () => {
    const b: Body = { x: 0, y: 0, vx: 100, vy: 0 };
    for (let i = 0; i < 600; i++) swim(b, 0, 0, 1 / 60, P);
    expect(Math.abs(b.vx)).toBeLessThan(0.1);
  });

  it("diagonal input is no faster than straight", () => {
    const a: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    const d: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    swim(a, 1, 0, 0.1, P);
    swim(d, 1, 1, 0.1, P);
    expect(Math.hypot(d.vx, d.vy)).toBeCloseTo(Math.hypot(a.vx, a.vy));
  });
});

describe("pond helpers", () => {
  it("keeps bodies in the world", () => {
    const b: Body = { x: -50, y: 900, vx: -10, vy: 10 };
    keepInside(b, 10, 640, 360);
    expect(b).toMatchObject({ x: 10, y: 350 });
    expect(b.vx).toBeGreaterThan(0);
    expect(b.vy).toBeLessThan(0);
  });

  it("knocks bodies apart in opposite directions, even when they overlap exactly", () => {
    const a: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    const b: Body = { x: 0, y: 0, vx: 0, vy: 0 };
    knockApart(a, b, 50);
    expect(a.vx).toBe(-50);
    expect(b.vx).toBe(50);
  });

  it("wanderDir is a unit vector; toward handles zero distance", () => {
    const d = wanderDir(() => 0.3);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
    expect(toward({ x: 1, y: 1 }, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
  });

  it("nearest picks the closest, null for none", () => {
    expect(nearest({ x: 0, y: 0 }, [{ x: 5, y: 0 }, { x: 2, y: 0 }])).toEqual({ x: 2, y: 0 });
    expect(nearest({ x: 0, y: 0 }, [])).toBeNull();
  });
});

describe("atlas lookup", () => {
  const layout: AtlasLayout = {
    cell: 32, columns: 4,
    rows: [
      { index: 0, pose: "swim", direction: "prickle", frames: 4, first_frame: 0 },
      { index: 1, pose: "swim", direction: "snail", frames: 4, first_frame: 4 },
    ],
  };
  it("finds rows by name and fails loudly on a missing one", () => {
    expect(firstFrame(layout, "swim", "snail")).toBe(4);
    expect(() => firstFrame(layout, "swim", "nope")).toThrow(/no row/);
  });
  it("builds one animation per row", () => {
    expect(animSpecs("pond", layout)[1]).toEqual({ key: "pond:swim:snail", start: 4, end: 7 });
  });
});
