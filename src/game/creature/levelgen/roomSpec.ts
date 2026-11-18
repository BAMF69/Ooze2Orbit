// ---------------------------------------------------------------------------
// roomSpec.ts (creature/levelgen)
// Purpose : The one description of what a Water room contains, consumed by collision, rendering, objectives,
//           spawning, routes and validation alike (CREATURE_LEVELGEN.md §3.3). Before this file, the same facts
//           were keyed on room IDs in seven modules; a generated room could not exist because nothing read it.
// Usage   : roomSpec(room) -> RoomSpec; specSolid(room, raised, tx, ty, objective?) is THE collision test.
// Notes   : Pure. A v1 room has no `spec` field (its save fingerprint must not change), so it is projected from
//           the frozen ID tables in legacyWater.ts and cached per room object. Generated rooms carry their spec.
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
import { roomSolid, type WaterRoom } from "../waterWorld";
import type { EnemyKind } from "../waterEncounters";
import type { RoomObjective } from "../waterObjectives";
import { legacySpec } from "./legacyWater";
import type { Key } from "./keys";
import { V1_GEOMETRY, type RoomGeometry } from "./geometry";
/** The room's size and water, v1 one-screen numbers unless the room says otherwise. */
export const roomGeometry = (r: WaterRoom): RoomGeometry => roomSpec(r).geometry ?? V1_GEOMETRY;

export interface Point { x: number; y: number }
/** Inclusive tile rectangle; -99/99 stand for "to the edge" so bounds rules read naturally. */
export interface TileRect { x0: number; x1: number; y0: number; y1: number }
export type Puzzle = "lever" | "drain" | "shaft" | "pressure";
export type StateCondition = "open" | "verticalOpen" | "keyOpen" | "bonusOpen";
export interface Control { x: number; y: number; text: string; guarded: boolean }
export interface EnemySpawn { kind: EnemyKind; x: number; y: number }
/** Extra collision over the base room. `stateOnly` rules exist only when an objective state is supplied;
 *  `when` applies a rule once a condition holds, `unless` removes it once a condition holds. */
export interface CollisionRule extends TileRect { solid: boolean; when?: StateCondition; unless?: StateCondition; stateOnly?: boolean }
/** A control that opens with a key the lineage holds (class skill, stat threshold), not with play alone. */
export interface KeyedControl { x: number; y: number; text: string; requires: Key[][]; opens: "keyOpen" | "bonusOpen"; locked: string }
export interface Arrival { room: number; x: number; y: number; facing: number; vy?: number }
export interface Opening {
  side: "top" | "bottom"; tiles: [number, number]; probe: [number, number]; when?: StateCondition;
  to: Arrival; label: { text: string; always: boolean };
}
export interface Pit { tiles: [number, number]; recoverX: number }
export interface RoomSpec {
  puzzle: Puzzle; controls: Control[]; timed: number;
  leftHatch: Point | null; sealed: boolean;
  enemies: EnemySpawn[]; reeds: number[]; net: { rig: Point; frame: Point }; vent: Point | null; cache: Point | null;
  pits: Pit[]; switchback: boolean;
  collision: CollisionRule[]; base: { platforms: boolean; tunnel: boolean; gate: boolean };
  openings: Opening[]; verticalOpenFrom: number | null;
  returnArrival: { x: number; y: number; facing: number } | null; arriveFromRight: { x: number; y: number; facing: number };
  branchArchX: number | null; hint: { priority: string | null; fallback: string };
  keyed: KeyedControl | null; variant?: string;
  /** Room size and water; absent means one v1 screen (levelgen/geometry.ts V1_GEOMETRY). */
  geometry?: RoomGeometry;
}

const cache = new WeakMap<WaterRoom, RoomSpec>();
export function roomSpec(r: WaterRoom): RoomSpec {
  if (r.spec) return r.spec;
  let s = cache.get(r); if (!s) { s = legacySpec(r); cache.set(r, s); }
  return s;
}
const inRect = (q: TileRect, x: number, y: number): boolean => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1;
const met = (when: StateCondition | undefined, o: RoomObjective | undefined): boolean =>
  !when || (when === "open" ? !!o?.open : when === "verticalOpen" ? !!o?.verticalOpen : when === "keyOpen" ? !!o?.keyOpen : !!o?.bonusOpen);
export const conditionMet = met;
export const openingRect = (op: Opening): TileRect => ({ x0: op.tiles[0], x1: op.tiles[1], y0: op.side === "top" ? -99 : 19, y1: op.side === "top" ? 5 : 99 });

/** The collision test, cached per room and collision-relevant state: the body asks tile by tile thousands of times
 *  per second, and the search solver millions of times per room. Raw rules: specSolidRaw. */
const solidCache = new WeakMap<WaterRoom, Map<number, Uint8Array>>();
export function specSolid(r: WaterRoom, raised: boolean, x: number, y: number, o?: RoomObjective): boolean {
  const s = roomSpec(r), g = s.geometry ?? V1_GEOMETRY;
  if (x < -2 || y < -2 || x > g.cols + 1 || y > g.rows + 1) return specSolidRaw(r, raised, x, y, o);
  // Everything the rules read: raised water, state flags, and the rule list sizes (a spec edited later re-keys).
  const bits = (raised ? 1 : 0) | (o ? 2 : 0) | (o?.open ? 4 : 0) | (o?.verticalOpen ? 8 : 0) | (o?.keyOpen ? 16 : 0) | (o?.bonusOpen ? 32 : 0);
  const key = ((s.collision.length * 64 + s.openings.length) * 16 + s.pits.length) * 64 + bits; // numeric: built per query
  let rooms = solidCache.get(r); if (!rooms) { rooms = new Map(); solidCache.set(r, rooms); }
  const w = g.cols + 4, h = g.rows + 4;
  let grid = rooms.get(key);
  if (!grid) { grid = new Uint8Array(w * h); for (let ty = -2; ty < h - 2; ty++) for (let tx = -2; tx < w - 2; tx++) grid[(ty + 2) * w + tx + 2] = specSolidRaw(r, raised, tx, ty, o) ? 1 : 0; rooms.set(key, grid); }
  return grid[(y + 2) * w + x + 2] === 1;
}
/** Order matters: openings and pits punch through, then stated ledges, then the base room. */
export function specSolidRaw(r: WaterRoom, raised: boolean, x: number, y: number, o?: RoomObjective): boolean {
  const s = roomSpec(r), g = s.geometry ?? V1_GEOMETRY;
  if (o) {
    for (const op of s.openings) if (met(op.when, o) && inRect(openingRect(op), x, y)) return false;
    for (const p of s.pits) if (x >= p.tiles[0] && x <= p.tiles[1] && y >= g.floorRow) return false;
  }
  for (const rule of s.collision) {
    if (rule.stateOnly && !o) continue;
    if (!met(rule.when, o) || rule.unless && met(rule.unless, o)) continue;
    if (inRect(rule, x, y)) return rule.solid;
  }
  return roomSolid({ ...r, platforms: s.base.platforms ? r.platforms : [], tunnel: r.tunnel && s.base.tunnel, gate: r.gate && s.base.gate }, raised, x, y, g);
}
// ---------------------------------------------------------------------------
// Footer: debug with `?debug` in the scene (enemy ranges) or by printing roomSpec(room) in a test.
// ---------------------------------------------------------------------------
