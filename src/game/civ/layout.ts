// Purpose: Pure maze presentation coordinates; combat continues to use the same grid units.
import { DEFAULT_BOARD, type Board } from "./battlefields";
export function warsLayout(width: number, height: number, bottomReserve = 56, board: Pick<Board, "cols" | "rows"> = DEFAULT_BOARD) {
  const stacked = width < 600;
  const tile = Math.max(4, Math.floor(stacked ? Math.min((width - 24) / board.cols, (height - 64 - bottomReserve) / (board.rows * 2)) : Math.min((width - 60) / (board.cols * 2), (height - 38 - bottomReserve) / board.rows)));
  const left = { x: stacked ? (width - tile * board.cols) / 2 : 12, y: 22 };
  const right = { x: stacked ? left.x : width / 2 + 12, y: stacked ? left.y + tile * board.rows + 32 : left.y };
  return { tile, left, right, stacked };
}
