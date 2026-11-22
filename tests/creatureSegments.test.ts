// Purpose: Every link a segment declares is real: the search solver, driving the real controller over the segment's
//          real collision, travels each declared port-to-port (and port-to-lever, port-to-hatch) link at the minimum
//          traits of the tiers that use it, in every Gardener state. Mirrors are proved separately. The stitcher
//          composes rooms from these declarations, so this test is what lets generation skip runtime search.
import { describe, it, expect } from "vitest";
import { SEGMENTS, variants, ports, profile, mirror, SEG, type Segment, type Port } from "../src/game/creature/levelgen/segments";
import { assemble } from "../src/game/creature/levelgen/stitch";
import { searchRoom } from "../src/game/creature/levelgen/search";
import { freshExpedition } from "../src/game/creature/expedition";
import type { WaterRoom } from "../src/game/creature/waterWorld";
import type { Opening } from "../src/game/creature/levelgen/roomSpec";
import { MIN_TRAITS, GARDEN_STATES } from "./helpers/searchMatrix";

const HATCH: Record<string, { tiles: [number, number]; entry: { x: number; y: number } }> = {
  near: { tiles: [19, 21], entry: { x: 328, y: 116 } }, far: { tiles: [36, 37], entry: { x: 592, y: 116 } } };
/** A one-screen test room holding just this segment (no exit wall: the channel puzzle has none). */
function testRoom(s: Segment, current = false): WaterRoom {
  const { room, spec } = assemble([s], { name: s.id, current, puzzle: "channel", hint: s.id });
  const h = HATCH[s.tags.includes("near") ? "near" : s.tags.includes("far") ? "far" : ""];
  if (h) spec.openings.push({ side: "top", tiles: h.tiles, probe: [h.tiles[0] * 16 + 3, (h.tiles[1] + 1) * 16 - 3], to: { room: 99, x: 0, y: 0, facing: 1 }, label: { text: "", always: true } } as Opening);
  return { id: 0, tier: current ? "hard" : "medium", left: -1, right: -1, branch: -1, ...room, spec };
}
/** Where a search starts for a port, and how to tell it reached one. */
function at(s: Segment, p: Port): { x: number; y: number } {
  if (p === "C") return { x: s.control!.x * 16 + 8, y: (SEG.firstRow + s.control!.y + 1) * 16 };
  if (p === "H") return HATCH[s.tags.includes("near") ? "near" : "far"].entry;
  const rows = ports(s, p[0] as "L" | "R").find(q => q.name === p)!.rows;
  return { x: p[0] === "L" ? 24 : 616, y: (SEG.firstRow + rows[1] + 1) * 16 };
}
function reached(s: Segment, p: Port, res: ReturnType<typeof searchRoom>): boolean {
  if (p === "H") return res.reached.openings.includes(99);
  if (p === "C") { const c = at(s, "C"); return res.positions.some(q => Math.abs(q.x - c.x) < 28 && Math.abs(q.y - c.y) < 25); }
  const rows = ports(s, p[0] as "L" | "R").find(q => q.name === p)!.rows, y0 = (SEG.firstRow + rows[0]) * 16, y1 = (SEG.firstRow + rows[1] + 1) * 16 + 2;
  return res.positions.some(q => (p[0] === "L" ? q.x <= 48 : q.x >= 592) && q.y >= y0 && q.y <= y1) || (p[0] === "L" ? res.reached.left : res.reached.right) && rows[1] === SEG.rows - 1;
}

describe("Segment library", () => {
  it("computes edges from the rock and mirrors them", () => {
    const merge = SEGMENTS.find(s => s.id === "merge")!;
    expect(profile(merge, "L")).toBe(".............");
    expect(ports(merge, "R").map(p => p.name)).toEqual(["R0", "R1"]);
    expect(profile(mirror(merge), "L")).toBe(profile(merge, "R"));
    expect(mirror(merge).links).toContainEqual({ from: "L1", to: "C" });
    expect(variants().length).toBe(SEGMENTS.length * 2 - 2); // every segment but the two channel climbs has a mirror
  });
  it("names only ports that exist, and every slot it uses", () => {
    for (const s of variants()) for (const l of s.links) for (const p of [l.from, l.to]) {
      if (p === "C") expect(s.control, `${s.id} ${p}`).toBeDefined();
      else if (p === "H") expect(s.tags.some(t => t === "near" || t === "far"), s.id).toBe(true);
      else expect(ports(s, p[0] as "L" | "R").map(q => q.name), `${s.id} ${p}`).toContain(p);
    }
  });
  // A "torrent" segment is a forced water crossing: with the current wild, or without fins, nobody gets across it.
  for (const s of variants().filter(v => v.tags.includes("torrent"))) it(`holds the torrent in ${s.id}`, () => {
    const r = testRoom(s, true), start = at(s, "L0");
    for (const [diverted, fins] of [[false, true], [true, false]] as const) {
      const e = { ...freshExpedition(0), basinRaised: true, torrentDiverted: diverted };
      const res = searchRoom(r, e, { ...MIN_TRAITS.hard, fins }, new Set(), { start, exhaustive: true, collect: true });
      expect(reached(s, "R0", res), `${s.id} crossed with diverted ${diverted}, fins ${fins}`).toBe(false);
    }
  }, 60000);
  for (const s of variants()) it(`proves every link of ${s.id} with the search solver`, () => {
    const runs: [boolean, typeof MIN_TRAITS.medium][] = [[false, MIN_TRAITS.medium], [true, MIN_TRAITS.hard]];
    for (const [current, traits] of runs) for (const st of GARDEN_STATES) {
      if (current && !st.diverted) continue; // a wild current is the Gardener's to divert; fins need it diverted
      const r = testRoom(s, current), e = { ...freshExpedition(0), basinRaised: st.raised, torrentDiverted: st.diverted };
      for (const from of [...new Set(s.links.map(l => l.from))]) {
        const res = searchRoom(r, e, traits, new Set(), { start: at(s, from), exhaustive: true, collect: true });
        for (const l of s.links.filter(k => k.from === from))
          expect(reached(s, l.to, res), `${s.id}: ${l.from} -> ${l.to} (${current ? "current" : "still"}, raised ${st.raised}, diverted ${st.diverted})`).toBe(true);
      }
    }
  }, 60000);
});
