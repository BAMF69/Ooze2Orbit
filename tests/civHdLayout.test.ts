import { describe, expect, it } from "vitest";
import { CIV_HD_LAYOUT, hdCellAt, hdWarsLayout } from "../src/game/civ/hdLayout";
import { ORDER_TAP_DISTANCE, OrderGesture } from "../src/game/civ/pointerOrders";
import { WAR } from "../src/game/civ/warsTuning";

describe("civilization fullscreen battlefield transform", () => {
  const sizes = [
    { width: 1440, height: 900, top: 140, bottom: 690, stacked: false },
    { width: 375, height: 812, top: 140, bottom: 602, stacked: true },
    { width: 812, height: 375, top: 92, bottom: 249, stacked: false },
    { width: 800, height: 1280, top: 150, bottom: 1050, stacked: true },
  ];
  for (const size of sizes) it(`fits both mazes above the dock at ${size.width} by ${size.height}`, () => {
    const layout = hdWarsLayout(size.width, size.height, size.top, size.bottom);
    expect(layout.stacked).toBe(size.stacked); expect(layout.tile).toBeGreaterThan(0);
    for (const origin of [layout.left, layout.right]) {
      expect(origin.x).toBeGreaterThanOrEqual(CIV_HD_LAYOUT.margin);
      expect(origin.x + WAR.cols * layout.tile).toBeLessThanOrEqual(size.width - CIV_HD_LAYOUT.margin);
      expect(origin.y - CIV_HD_LAYOUT.label).toBeGreaterThanOrEqual(size.top);
      expect(origin.y + WAR.rows * layout.tile).toBeLessThanOrEqual(size.bottom);
    }
    for (const side of [0, 1] as const) {
      const origin = side ? layout.right : layout.left;
      for (let y = 0; y < WAR.rows; y++) for (let x = 0; x < WAR.cols; x++) {
        expect(hdCellAt(layout, origin.x + (x + 0.5) * layout.tile, origin.y + (y + 0.5) * layout.tile, side)).toEqual({ x, y });
      }
      expect(hdCellAt(layout, origin.x - 0.01, origin.y, side)).toBeNull();
      expect(hdCellAt(layout, origin.x + WAR.cols * layout.tile, origin.y, side)).toBeNull();
      expect(hdCellAt(layout, origin.x, origin.y + WAR.rows * layout.tile, side)).toBeNull();
    }
    if (layout.stacked) {
      expect(layout.left.y + WAR.rows * layout.tile).toBeLessThan(layout.right.y);
      expect(hdCellAt(layout, layout.left.x + layout.tile, layout.right.y - 1)).toBeNull();
    } else {
      expect(layout.left.x + WAR.cols * layout.tile).toBeLessThan(layout.right.x);
      expect(hdCellAt(layout, layout.right.x - 1, layout.left.y + layout.tile)).toBeNull();
    }
  });

  it("declines selection when HUD consumes all available room or coordinates are invalid", () => {
    const layout = hdWarsLayout(375, 812, 700, 700);
    expect(layout.tile).toBe(0); expect(hdCellAt(layout, 150, 700)).toBeNull();
    expect(hdCellAt(hdWarsLayout(800, 600, 100, 500), NaN, 200)).toBeNull();
  });
});

describe("civilization single-finger orders", () => {
  it("accepts one completed tap and never emits it twice", () => {
    const gesture = new OrderGesture(); gesture.begin(1, 20, 40, "portrait");
    gesture.move(1, 20 + ORDER_TAP_DISTANCE, 40);
    expect(gesture.finish(1, 25, 40, "portrait")).toBe(true);
    expect(gesture.finish(1, 25, 40, "portrait")).toBe(false);
  });
  it("never places when a drag returns to its starting cell", () => {
    const gesture = new OrderGesture(); gesture.begin(1, 20, 40, "same");
    gesture.move(1, 20 + ORDER_TAP_DISTANCE + 1, 40); gesture.move(1, 20, 40);
    expect(gesture.finish(1, 20, 40, "same")).toBe(false);
  });
  it("cancels a two-finger interaction until both fingers release", () => {
    const gesture = new OrderGesture(); gesture.begin(1, 20, 40, "same"); gesture.begin(2, 25, 40, "same");
    expect(gesture.finish(2, 25, 40, "same")).toBe(false);
    expect(gesture.finish(1, 20, 40, "same")).toBe(false);
    gesture.begin(3, 30, 40, "same"); expect(gesture.finish(3, 30, 40, "same")).toBe(true);
  });
  it("cancels resize/rotation, explicit release and interrupted focus or scheme changes", () => {
    const gesture = new OrderGesture(); gesture.begin(1, 20, 40, "portrait");
    expect(gesture.finish(1, 20, 40, "landscape")).toBe(false);
    gesture.begin(2, 20, 40, "same"); gesture.cancel(); expect(gesture.finish(2, 20, 40, "same")).toBe(false);
    gesture.begin(3, 20, 40, "same"); expect(gesture.finish(4, 20, 40, "same")).toBe(false);
    expect(gesture.finish(3, 20, 40, "same")).toBe(false);
  });
});
