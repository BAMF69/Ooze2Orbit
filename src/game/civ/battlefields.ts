// Purpose: Pure battle registry and deterministic, bounded terrain generation.
// A board is the source of truth for navigation, drawing and pointer conversion.
export interface Cell { x: number; y: number }
export type ModeId = "tower" | "hero" | "tug";
export type Difficulty = "easy" | "medium" | "hard";
export const MODES = {
  tower: { name: "Tower wars", available: true, levers: ["ore", "rocky"] },
  hero: { name: "Hero lane wars", available: false, levers: [] },
  tug: { name: "Tug-of-war", available: false, levers: [] },
} as const;
export { DIFFICULTIES, GENERATOR_VERSION, TERRAIN } from "./battlefieldTuning";
import { DIFFICULTIES, GENERATOR_VERSION, TERRAIN } from "./battlefieldTuning";
export interface Board {
  cols: number; rows: number; entry: Cell; exit: Cell; obstacles: Cell[]; seed: number; generatorVersion: number;
}
export const DEFAULT_BOARD: Board = { cols: 11, rows: 7, entry: { x: 0, y: 3 }, exit: { x: 10, y: 3 }, obstacles: [], seed: 0, generatorVersion: GENERATOR_VERSION };
export const cellKey = (board: Pick<Board, "cols">, c: Cell) => c.y * board.cols + c.x;
export const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export const cellOf = (p: Cell, board: Pick<Board, "cols" | "rows"> = DEFAULT_BOARD): Cell => ({
  x: Math.max(0, Math.min(board.cols - 1, Math.round(p.x))), y: Math.max(0, Math.min(board.rows - 1, Math.round(p.y))),
});

/** Starting on a building remains escapable; a blocked destination never does. */
export function route(buildings: readonly Cell[], start?: Cell, board: Board = DEFAULT_BOARD, goal: Cell = board.exit): Cell[] {
  const key = (c: Cell) => cellKey(board, c), blocked = new Set([...board.obstacles, ...buildings].map(key));
  const first = cellOf(start ?? board.entry, board), todo = [first], parents = new Map<number, Cell | null>([[key(first), null]]);
  if (blocked.has(key(goal)) && !sameCell(first, goal)) return [];
  for (let n = 0; n < todo.length; n++) {
    const c = todo[n];
    if (sameCell(c, goal)) {
      const out = [c]; let previous = parents.get(key(c));
      while (previous) { out.unshift(previous); previous = parents.get(key(previous)); } return out;
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
      const next = { x: c.x + dx, y: c.y + dy }, k = key(next);
      if (next.x < 0 || next.x >= board.cols || next.y < 0 || next.y >= board.rows || blocked.has(k) || parents.has(k)) continue;
      parents.set(k, c); todo.push(next);
    }
  }
  return [];
}

export const heroHome = (board: Board): Cell => ({ x: board.exit.x - TERRAIN.heroOffset, y: board.exit.y });
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
}
export function generateBoard(difficulty: Difficulty, seed: number): Board {
  const spec = DIFFICULTIES[difficulty], row = Math.floor(spec.rows / 2);
  const board: Board = { cols: spec.cols, rows: spec.rows, entry: { x: 0, y: row }, exit: { x: spec.cols - 1, y: row }, obstacles: [], seed: seed >>> 0, generatorVersion: GENERATOR_VERSION };
  const random = seededRandom(seed), home = heroHome(board);
  for (let n = 0; n < spec.obstacles * TERRAIN.attemptFactor && board.obstacles.length < spec.obstacles; n++) {
    const c = { x: 1 + Math.floor(random() * (board.cols - 2)), y: Math.floor(random() * board.rows) };
    if (sameCell(c, home) || board.obstacles.some(o => sameCell(o, c))) continue;
    board.obstacles.push(c);
    if (!route([], undefined, board).length || !route([], home, board).length) board.obstacles.pop();
  }
  // A bounded shortfall is safe: fewer obstacles are preferable to an invalid board.
  return board;
}

export interface Launch { standalone: boolean; mode: ModeId; difficulty: Difficulty; seed: number; error?: string }
export function parseLaunch(search: string): Launch {
  const q = new URLSearchParams(search), standalone = q.has("mode") || q.has("difficulty");
  const mode = q.get("mode") ?? "tower", difficulty = q.get("difficulty") ?? "easy", rawSeed = q.get("seed") ?? "0";
  const seed = Number(rawSeed);
  const out: Launch = { standalone, mode: "tower", difficulty: "easy", seed: 0 };
  if (!Object.hasOwn(MODES, mode)) return { ...out, error: "Unknown battlefield mode." };
  out.mode = mode as ModeId;
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) return { ...out, error: "Unknown difficulty." };
  out.difficulty = difficulty as Difficulty;
  if (!/^\d+$/.test(rawSeed) || !Number.isSafeInteger(seed) || seed > TERRAIN.seedMax) return { ...out, error: "Seed must be an unsigned 32-bit integer." };
  out.seed = seed;
  if (!MODES[out.mode].available) out.error = `${MODES[out.mode].name} is coming in a later campaign step.`;
  return out;
}
