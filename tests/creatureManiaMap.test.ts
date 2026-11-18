// Purpose: The ManiaMap layout port (levelgen/maniamap.ts) places multi-cell rooms so their doors meet and no two rooms
//          share a cell, closes cycles by inserting a room between two placed rooms, and honours door types and sides.
import { describe, it, expect } from "vitest";
import { cell, door, template, typesAlign, codesAlign, configurationSpace, intersects, generateLayout, type Layout, type LayoutNode, type LayoutEdge } from "../src/game/creature/levelgen/maniamap";
import { makeRng } from "../src/game/creature/levelgen/rng";

const ew = (id: string, south = false) => template(id, [[cell({ west: door(), east: door(), ...(south ? { south: door() } : {}) })]]);
/** A three-cell channel under a run of rooms, doors up at both ends. */
const channel = template("channel", [[cell({ north: door() }), cell(), cell({ north: door() })]]);
function noOverlap(l: Layout): boolean {
  const seen = new Set<string>();
  for (const r of l.rooms.values()) r.template.cells.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return; const k = `${x + r.position.x},${y + r.position.y}`; if (seen.has(k)) throw new Error(`overlap at ${k}`); seen.add(k);
  }));
  return true;
}

describe("ManiaMap port", () => {
  it("aligns door types and codes as ManiaMap does", () => {
    expect(typesAlign("twoWay", "oneWayExit")).toBe(true);
    expect(typesAlign("oneWayExit", "twoWayExit")).toBe(false);
    expect(typesAlign("oneWayExit", "oneWayEntrance")).toBe(true);
    expect(typesAlign("twoWayEntrance", "oneWayEntrance")).toBe(false);
    expect(codesAlign(0, 0)).toBe(true); expect(codesAlign(1, 2)).toBe(false); expect(codesAlign(3, 2)).toBe(true);
  });
  it("finds every offset where two rooms' doors face each other, and none that overlap", () => {
    const a = ew("a"), b = ew("b");
    expect(configurationSpace(a, b).map(c => [c.position.x, c.position.y, c.from.direction]).sort()).toEqual([[-1, 0, "west"], [1, 0, "east"]]);
    expect(intersects(channel, a, { x: 1, y: 0 })).toBe(true); expect(intersects(channel, a, { x: 1, y: -1 })).toBe(false);
    expect(configurationSpace(ew("a", true), channel).map(c => [c.position.x, c.position.y])).toEqual(expect.arrayContaining([[0, 1], [-2, 1]]));
  });
  it("places a chain to the right when every edge names the east side", () => {
    const nodes: LayoutNode[] = ["a", "b", "c", "d"].map(id => ({ id, template: ew(id) }));
    const edges: LayoutEdge[] = [["a", "b"], ["b", "c"], ["c", "d"]].map(([from, to]) => ({ from, to, side: "east" }));
    const l = generateLayout(nodes, edges, makeRng(3))!;
    expect([...l.rooms.values()].map(r => r.position.x)).toEqual([0, 1, 2, 3]); expect(l.connections).toHaveLength(3);
  });
  it("closes a real cycle: a channel under three rooms joins the first to the third", () => {
    for (let seed = 0; seed < 20; seed++) {
      const nodes: LayoutNode[] = [{ id: "drain", template: ew("drain", true) }, { id: "shaft", template: ew("shaft") }, { id: "after", template: ew("after", true) }, { id: "channel", template: channel }];
      const edges: LayoutEdge[] = [{ from: "drain", to: "shaft", side: "east" }, { from: "shaft", to: "after", side: "east" }, { from: "drain", to: "channel", side: "south" }, { from: "channel", to: "after", side: "north" }];
      const l = generateLayout(nodes, edges, makeRng(seed));
      expect(l, `seed ${seed}`).not.toBeNull();
      expect(noOverlap(l!)).toBe(true);
      expect(l!.rooms.get("channel")!.position).toEqual({ x: 0, y: 1 }); expect(l!.rooms.get("after")!.position).toEqual({ x: 2, y: 0 });
      expect(l!.connections).toHaveLength(4);
    }
  });
  it("returns null when the doors cannot meet", () => {
    const nodes: LayoutNode[] = [{ id: "a", template: ew("a") }, { id: "b", template: ew("b") }];
    expect(generateLayout(nodes, [{ from: "a", to: "b", side: "south" }], makeRng(1), 3)).toBeNull();
  });
});
