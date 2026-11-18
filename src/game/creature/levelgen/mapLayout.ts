// ---------------------------------------------------------------------------
// mapLayout.ts (creature/levelgen)
// Purpose : Place a level's rooms on a grid for the minimap (BAMF69 2026-11-17) and prove the result is a
//           coherent map: no two rooms share a cell, every door joins two cells that touch on the side the door
//           is on, every room is reached, and each room's footprint is one connected shape. Runs inside the
//           generator's reject loop (worldProblemsV2), so a seed whose map would not make sense is rejected.
// Usage   : layoutLevel(world, tier) -> MapLayout ; mapProblems(layout) -> string[] (empty = coherent)
// Notes   : Pure. Rooms are one screen, so one cell, unless a second connection lands somewhere the first
//           placement cannot reach: then the destination grows by exactly the cell the door needs (the drain's
//           floor drop makes the following shaft an L-shape that reaches under the drain). Generated worlds since
//           step 1.6 carry the graph's ManiaMap layout (multi-cell rooms, doors on any side) and use it directly.
// Authored: Written with Claude (Opus 5.5).
// ---------------------------------------------------------------------------
import type { Difficulty, WaterWorld, WaterRoom } from "../waterWorld";
import { roomSpec } from "./roomSpec";

export interface Cell { x: number; y: number }
export type DoorSide = "left" | "right" | "top" | "bottom";
export interface Door { from: number; to: number; side: DoorSide; a: Cell; b: Cell }
export interface MapLayout { tier: Difficulty; rooms: Map<number, Cell[]>; doors: Door[]; unplaced: number[] }
const STEP: Record<DoorSide, Cell> = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } };
const key = (c: Cell): string => `${c.x},${c.y}`;
const add = (c: Cell, d: Cell): Cell => ({ x: c.x + d.x, y: c.y + d.y });
/** Level entry room; kept local (not world.ts) so world.ts can run this check without an import cycle. */
const entryOf = (w: WaterWorld, tier: Difficulty): number => "starts" in w ? (w as WaterWorld & { starts: Record<Difficulty, number> }).starts[tier] : { easy: 0, medium: 4, hard: 7 }[tier];

/** Every connection a room has, in the order the map should place them: horizontal chain first, then shafts. */
function links(r: WaterRoom): { to: number; side: DoorSide }[] {
  const out: { to: number; side: DoorSide }[] = [];
  if (r.right >= 0) out.push({ to: r.right, side: "right" });
  if (r.left >= 0 && !roomSpec(r).returnArrival) out.push({ to: r.left, side: "left" }); // branches return down their shaft
  for (const op of roomSpec(r).openings) out.push({ to: op.to.room, side: op.side });
  return out;
}
/** A generated world carries its ManiaMap layout (levelgen/maniamap.ts via graph.ts): read it as is. */
type WithMaps = WaterWorld & { maps?: Partial<Record<Difficulty, { cells: Record<number, Cell[]>; doors: Door[] }>> };
export function layoutLevel(w: WaterWorld, tier: Difficulty): MapLayout {
  const saved = (w as WithMaps).maps?.[tier];
  if (saved) {
    const level = w.rooms.filter(r => r.tier === tier);
    const rooms = new Map(Object.entries(saved.cells).map(([id, cells]) => [Number(id), cells.map(c => ({ ...c }))]));
    return { tier, rooms, doors: saved.doors.map(d => ({ ...d })), unplaced: level.filter(r => !rooms.has(r.id)).map(r => r.id) };
  }
  return deriveLayout(w, tier);
}
/** v1 worlds (and generated worlds whose layout failed) derive a map from their links, growing L-shapes as needed. */
function deriveLayout(w: WaterWorld, tier: Difficulty): MapLayout {
  const level = w.rooms.filter(r => r.tier === tier), byId = new Map(level.map(r => [r.id, r]));
  const rooms = new Map<number, Cell[]>(), doors: Door[] = [], start = entryOf(w, tier);
  rooms.set(start, [{ x: 0, y: 0 }]);
  // Two passes: place every room by its first connection, then resolve the remaining doors.
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!, here = rooms.get(id)![0];
    for (const l of links(byId.get(id)!)) if (byId.has(l.to) && !rooms.has(l.to)) { rooms.set(l.to, [add(here, STEP[l.side])]); queue.push(l.to); }
  }
  for (const r of level) {
    const cells = rooms.get(r.id); if (!cells) continue;
    for (const l of links(r)) {
      const dest = rooms.get(l.to); if (!dest) continue;
      // A door leaves from the source cell on that side; prefer a source cell already facing the destination.
      let pair: [Cell, Cell] | null = null;
      for (const a of cells) { const b = add(a, STEP[l.side]); if (dest.some(c => key(c) === key(b))) { pair = [a, b]; break; } }
      if (!pair) { // grow the destination by the cell the door needs, joined to it by the free corner cell if diagonal
        const a = cells[0], b = add(a, STEP[l.side]), d0 = dest[0];
        if (Math.abs(b.x - d0.x) + Math.abs(b.y - d0.y) === 2 && b.x !== d0.x && b.y !== d0.y) {
          const taken = (c: Cell) => [...rooms.values()].some(cs => cs.some(x => key(x) === key(c)));
          const corner = [{ x: d0.x, y: b.y }, { x: b.x, y: d0.y }].find(c => !taken(c)) ?? { x: d0.x, y: b.y };
          dest.push(corner);
        }
        dest.push(b); pair = [a, b];
      }
      doors.push({ from: r.id, to: l.to, side: l.side, a: pair[0], b: pair[1] });
    }
  }
  return { tier, rooms, doors, unplaced: level.filter(r => !rooms.has(r.id)).map(r => r.id) };
}
/** Named problems, each with a deliberately-broken test (tests/creatureMinimap.test.ts). */
export function mapProblems(m: MapLayout): string[] {
  const bad = new Set<string>(), owner = new Map<string, number>();
  if (m.unplaced.length) bad.add("map unreached room");
  for (const [id, cells] of m.rooms) {
    for (const c of cells) { const k = key(c), o = owner.get(k); if (o !== undefined && o !== id) bad.add("map overlap"); owner.set(k, id); }
    // Footprint must be one connected shape (cells joined edge to edge).
    const seen = new Set([key(cells[0])]), stack = [cells[0]];
    while (stack.length) { const c = stack.pop()!; for (const d of Object.values(STEP)) { const n = add(c, d); if (cells.some(x => key(x) === key(n)) && !seen.has(key(n))) { seen.add(key(n)); stack.push(n); } } }
    if (seen.size !== new Set(cells.map(key)).size) bad.add("map footprint");
    if (cells.length > 6) bad.add("map footprint"); // a channel spans at most five cells (drain to finale)
  }
  for (const d of m.doors) {
    const step = STEP[d.side];
    if (d.b.x - d.a.x !== step.x || d.b.y - d.a.y !== step.y) bad.add("map door");
    if (owner.get(key(d.a)) !== d.from || owner.get(key(d.b)) !== d.to) bad.add("map door");
    const back = m.doors.find(e => e.from === d.to && e.to === d.from && key(e.a) === key(d.b) && key(e.b) === key(d.a));
    if (!back) bad.add("map door");
  }
  return [...bad];
}
export const bounds = (m: MapLayout): { x0: number; y0: number; x1: number; y1: number } => {
  const all = [...m.rooms.values()].flat();
  return { x0: Math.min(...all.map(c => c.x)), y0: Math.min(...all.map(c => c.y)), x1: Math.max(...all.map(c => c.x)), y1: Math.max(...all.map(c => c.y)) };
};
