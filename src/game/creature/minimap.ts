// ---------------------------------------------------------------------------
// minimap.ts (creature)
// Purpose : The level minimap (BAMF69 2026-11-17: "a minimap that shows the adjoining rooms"). Shows explored
//           rooms, the current room, unexplored rooms that border an explored one as outlines, the doors between
//           them, the goal once seen, and rewards still to collect. Unexplored rooms further away stay hidden.
// Usage   : const model = minimapModel(world, tier, visited, current); drawMinimap(canvas, model)
// Notes   : The model is pure (tests/creatureMinimap.test.ts); drawMinimap only paints it. Layout and its
//           consistency checks live in levelgen/mapLayout.ts and run in the generator.
// Authored: Written with Claude (Opus 5.5).
// ---------------------------------------------------------------------------
import type { Difficulty, WaterWorld } from "./waterWorld";
import { layoutLevel, bounds, type Cell, type DoorSide } from "./levelgen/mapLayout";

export type RoomState = "current" | "visited" | "adjoining";
export interface MiniRoom { id: number; cells: Cell[]; state: RoomState; goal: boolean; reward: boolean }
export interface MiniDoor { a: Cell; side: DoorSide }
export interface MinimapModel { rooms: MiniRoom[]; doors: MiniDoor[]; size: { w: number; h: number } }
export const MINIMAP = { cellW: 22, cellH: 14, gap: 3, pad: 6 };

export function minimapModel(w: WaterWorld, tier: Difficulty, visited: readonly number[], current: number, banked: readonly string[] = []): MinimapModel {
  const layout = layoutLevel(w, tier), seen = new Set([...visited, current]);
  const known = new Set<number>(), b = bounds(layout);
  for (const id of layout.rooms.keys()) if (seen.has(id)) known.add(id);
  for (const d of layout.doors) if (seen.has(d.from)) known.add(d.to); // the adjoining rooms
  const shift = (c: Cell): Cell => ({ x: c.x - b.x0, y: c.y - b.y0 });
  const rooms: MiniRoom[] = [...layout.rooms].filter(([id]) => known.has(id)).map(([id, cells]) => {
    const r = w.rooms.find(q => q.id === id)!;
    return { id, cells: cells.map(shift), state: id === current ? "current" : seen.has(id) ? "visited" : "adjoining",
      goal: r.goal, reward: !!r.reward && !banked.includes(r.reward) && seen.has(id) };
  });
  // A door is drawn once (from its smaller-id side) when both of its rooms are on the map.
  const doors = layout.doors.filter(d => known.has(d.from) && known.has(d.to) && (seen.has(d.from) || seen.has(d.to)) && d.from < d.to)
    .map(d => ({ a: shift(d.a), side: d.side }));
  return { rooms, doors, size: { w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 } };
}

/** Paints the model; device-pixel aware so it stays crisp on phones. */
export function drawMinimap(canvas: HTMLCanvasElement, m: MinimapModel): void {
  const { cellW, cellH, gap, pad } = MINIMAP, ratio = Math.min(3, globalThis.devicePixelRatio || 1);
  const width = pad * 2 + m.size.w * (cellW + gap) - gap, height = pad * 2 + m.size.h * (cellH + gap) - gap;
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const g = canvas.getContext("2d"); if (!g) return;
  g.setTransform(ratio, 0, 0, ratio, 0, 0); g.clearRect(0, 0, width, height);
  const px = (c: Cell) => ({ x: pad + c.x * (cellW + gap), y: pad + c.y * (cellH + gap) });
  for (const r of m.rooms) {
    // One rounded block per cell, with the gaps inside a multi-cell room filled so an L reads as one room.
    g.fillStyle = r.state === "current" ? "#f2d27a" : r.state === "visited" ? "#5f9e8f" : "transparent";
    g.strokeStyle = r.state === "adjoining" ? "#9fbfb3" : "#0a2634"; g.lineWidth = r.state === "adjoining" ? 1.5 : 2;
    for (const c of r.cells) {
      const p = px(c);
      if (r.state !== "adjoining") g.fillRect(p.x, p.y, cellW, cellH);
      for (const n of r.cells) if (n.x === c.x + 1 && n.y === c.y || n.y === c.y + 1 && n.x === c.x) {
        if (r.state !== "adjoining") g.fillRect(p.x + (n.x > c.x ? cellW : 0), p.y + (n.y > c.y ? cellH : 0), n.x > c.x ? gap : cellW, n.y > c.y ? gap : cellH);
      }
      if (r.state === "adjoining") { g.setLineDash([3, 2]); g.strokeRect(p.x + 0.75, p.y + 0.75, cellW - 1.5, cellH - 1.5); g.setLineDash([]); }
      else g.strokeRect(p.x, p.y, cellW, cellH);
    }
    const p = px(r.cells[0]);
    if (r.goal) { g.fillStyle = "#e4be71"; g.beginPath(); g.arc(p.x + cellW - 5, p.y + 5, 3, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#0a2634"; g.lineWidth = 1; g.stroke(); }
    if (r.reward) { g.fillStyle = "#9bd292"; g.fillRect(p.x + 3, p.y + cellH - 6, 4, 4); }
  }
  g.fillStyle = "#edf4e4";
  for (const d of m.doors) {
    const p = px(d.a);
    if (d.side === "right") g.fillRect(p.x + cellW - 1, p.y + cellH / 2 - 2, gap + 2, 4);
    if (d.side === "left") g.fillRect(p.x - gap - 1, p.y + cellH / 2 - 2, gap + 2, 4);
    if (d.side === "bottom") g.fillRect(p.x + cellW / 2 - 2, p.y + cellH - 1, 4, gap + 2);
    if (d.side === "top") g.fillRect(p.x + cellW / 2 - 2, p.y - gap - 1, 4, gap + 2);
  }
}
