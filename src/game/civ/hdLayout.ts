// Purpose: One fullscreen maze transform for drawing, highlighting and pointer orders.
// HUD bounds are passed in logical canvas pixels; simulation coordinates come from the battle board.
import type { Cell } from "./wars";
import { DEFAULT_BOARD, type Board } from "./battlefields";

export const CIV_HD_LAYOUT = { margin: 16, label: 24, sideGap: 32, stackGap: 36, bottom: 8 };
export interface HdWarsLayout {
  tile: number;
  cols?: number; rows?: number;
  left: Cell;
  right: Cell;
  stacked: boolean;
}

const finite = (n: number, fallback = 0) => Number.isFinite(n) ? n : fallback;

/** Pick whichever arrangement gives the larger readable tiles inside the unobscured HUD bounds. */
export function hdWarsLayout(width: number, height: number, top: number, bottom: number, board: Pick<Board, "cols" | "rows"> = DEFAULT_BOARD): HdWarsLayout {
  const w = Math.max(0, finite(width)), h = Math.max(0, finite(height));
  const first = Math.max(0, Math.min(h, finite(top)));
  const last = Math.max(first, Math.min(h, finite(bottom, h)));
  const room = last - first, spec = CIV_HD_LAYOUT;
  const sideTile = Math.max(0, Math.floor(Math.min(
    (w - spec.margin * 2 - spec.sideGap) / (board.cols * 2),
    (room - spec.label - spec.bottom) / board.rows,
  )));
  const stackTile = Math.max(0, Math.floor(Math.min(
    (w - spec.margin * 2) / board.cols,
    (room - spec.label - spec.stackGap - spec.bottom) / (board.rows * 2),
  )));
  const stacked = stackTile > sideTile;
  const tile = stacked ? stackTile : sideTile;
  const gridWidth = tile * board.cols, gridHeight = tile * board.rows;
  const contentHeight = spec.label + gridHeight * (stacked ? 2 : 1) + (stacked ? spec.stackGap : 0) + spec.bottom;
  const y = first + Math.max(0, (room - contentHeight) / 2) + Math.min(spec.label, room);
  if (stacked) {
    const x = (w - gridWidth) / 2;
    return { tile, stacked, cols: board.cols, rows: board.rows, left: { x, y }, right: { x, y: y + gridHeight + spec.stackGap } };
  }
  const x = (w - gridWidth * 2 - spec.sideGap) / 2;
  return { tile, stacked, cols: board.cols, rows: board.rows, left: { x, y }, right: { x: x + gridWidth + spec.sideGap, y } };
}

/** The same half-open tile bounds used by the renderer; board edges and the inter-board gap do not build. */
export function hdCellAt(layout: HdWarsLayout, x: number, y: number, side: 0 | 1 = 0): Cell | null {
  if (layout.tile <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const origin = side === 0 ? layout.left : layout.right;
  const column = Math.floor((x - origin.x) / layout.tile), row = Math.floor((y - origin.y) / layout.tile);
  return column >= 0 && column < (layout.cols ?? DEFAULT_BOARD.cols) && row >= 0 && row < (layout.rows ?? DEFAULT_BOARD.rows) ? { x: column, y: row } : null;
}
