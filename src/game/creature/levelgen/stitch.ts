// ---------------------------------------------------------------------------
// stitch.ts (creature/levelgen)
// Purpose : The segment stitcher (CREATURE_LEVELGEN.md §7a step 2): build a room 2-5 screens wide from one-screen
//           segments (segments.ts). Path first: pick a segment per cell, left to right with backtracking, so that
//           neighbouring edges have identical open rows, then require the segments' declared links to connect the
//           entrance to the lever, the lever to the exit, and the exit back to the entrance (a channel: hatch to
//           hatch, both ways). The result is a normal room spec, so physics, art, objectives and bots need nothing new.
// Usage   : pickSegments(plan, rng) -> Segment[] | null ; assemble(cells, room) -> { room, spec }
// Notes   : Pure and deterministic. No search runs here (generation must stay fast in the browser): every link a
//           segment declares is proved by the search solver in tests/creatureSegments.test.ts, and whole stitched
//           rooms are search-proved over hundreds of seeds in tests/creatureStitch.test.ts.
// Authored: Written with Claude (Opus 5.5). Path-first idea from Spelunky's level generator (no code copied).
// ---------------------------------------------------------------------------
import type { Rng } from "./rng";
import type { RoomSpec, CollisionRule, EnemySpawn } from "./roomSpec";
import type { RoomFields } from "./templates";
import { SEG, variants, profile, ports, clearFloor, slotColumns, type Segment, type Port } from "./segments";
import { sizedGeometry, TILE, type WaterRegion } from "./geometry";

export interface StitchPlan {
  kind: "gallery" | "channel"; cells: number;
  /** Segment ratings the tier allows: every segment at or under the maximum, at least one at or over the minimum. */
  ratings: [number, number];
  control: boolean; guard: boolean; cache: boolean;
  /** A current room: at least one forced water crossing ("torrent" segment), so the torrent actually guards it. */
  current?: boolean;
}
const ENEMY_Y = { charger: 288, ambusher: 288, swimmer: 268, dropper: 128 } as const;
const role = (s: Segment): "control" | "guard" | "cache" | "near" | "far" | null =>
  s.tags.includes("near") ? "near" : s.tags.includes("far") ? "far" : s.control ? "control" : s.enemies?.length ? "guard" : s.cache ? "cache" : null;

/** Which role each cell must fill: the lever, the guard post and the cache each get one cell (never the entrance for a guard). */
function roles(plan: StitchPlan, rng: Rng): (ReturnType<typeof role>)[] {
  const out: ReturnType<typeof role>[] = Array.from({ length: plan.cells }, () => null);
  if (plan.kind === "channel") { out[0] = "near"; out[plan.cells - 1] = "far"; return out; }
  const free = () => out.map((r, i) => r === null ? i : -1).filter(i => i >= 0);
  if (plan.control) out[rng.pick(free())] = "control";
  if (plan.cache) { const f = free(); if (f.length) out[rng.pick(f)] = "cache"; }
  // The guard post is optional: it gives way when a current room still needs a free cell for its torrent crossing.
  const spare = free().length - (plan.current && !plan.cache ? 1 : 0);
  if (plan.guard && spare > 0) { const f = free().filter(i => i > 0); if (f.length) out[rng.pick(f)] = "guard"; }
  return out;
}
/** Does the stitched sequence connect what it must, using only the segments' declared links? */
export function connected(cells: Segment[], kind: StitchPlan["kind"]): boolean {
  const adj = new Map<string, string[]>(), edge = (a: string, b: string) => { const l = adj.get(a) ?? []; l.push(b); adj.set(a, l); };
  cells.forEach((s, i) => {
    for (const l of s.links) edge(`${i}:${l.from}`, `${i}:${l.to}`);
    if (i > 0) for (const p of ports(cells[i - 1], "R")) { edge(`${i - 1}:${p.name}`, `${i}:L${p.name.slice(1)}`); edge(`${i}:L${p.name.slice(1)}`, `${i - 1}:${p.name}`); }
  });
  const reach = (from: string, to: string): boolean => {
    const seen = new Set([from]), stack = [from];
    while (stack.length) { const n = stack.pop()!; if (n === to) return true; for (const m of adj.get(n) ?? []) if (!seen.has(m)) { seen.add(m); stack.push(m); } }
    return false;
  };
  const last = cells.length - 1;
  if (kind === "channel") return reach(`0:H`, `${last}:H`) && reach(`${last}:H`, `0:H`);
  const c = cells.findIndex(s => s.control), entry = "0:L0", exit = `${last}:R0`;
  return c >= 0 && reach(entry, `${c}:C`) && reach(`${c}:C`, exit) && reach(exit, entry) && reach(`${c}:C`, entry);
}
/** Path-first selection with backtracking; null when no sequence satisfies the plan. */
export function pickSegments(plan: StitchPlan, rng: Rng, library: Segment[] = variants(), attempts = 60): Segment[] | null {
  const want = roles(plan, rng), last = plan.cells - 1;
  const fits = (s: Segment, i: number): boolean => {
    if (s.rating > plan.ratings[1] || role(s) !== want[i]) return false;
    if (plan.kind === "channel" ? want[i] === null && !s.tags.includes("channel") : false) return false;
    // A gallery's entrance needs a clear floor lane where the body arrives; its exit, where the exit wall stands.
    if (plan.kind === "gallery" && i === 0 && !(clearFloor(s, 0, 5) && profile(s, "L").endsWith("....")))
      return false;
    if (plan.kind === "gallery" && i === last && !(clearFloor(s, 32, 39) && profile(s, "R").endsWith("....")))
      return false;
    // Nothing the player must reach may stand past the exit wall (tile 35 of the last cell).
    if (plan.kind === "gallery" && i === last && slotColumns(s).some(x => x >= 34)) return false;
    return true;
  };
  for (let a = 0; a < attempts; a++) {
    const chosen: Segment[] = [];
    const place = (i: number): boolean => {
      if (i === plan.cells) return chosen.some(s => s.rating >= plan.ratings[0]) && (!plan.current || chosen.some(s => s.tags.includes("torrent"))) && connected(chosen, plan.kind);
      const options = shuffle(library.filter(s => fits(s, i) && (i === 0 || profile(chosen[i - 1], "R") === profile(s, "L"))), rng);
      for (const s of options.slice(0, 6)) { chosen.push(s); if (place(i + 1)) return true; chosen.pop(); }
      return false;
    };
    if (place(0)) return chosen;
  }
  return null;
}
function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = rng.int(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** Turn a segment sequence into a room: collision rules, merged water, slots at absolute positions. */
export function assemble(cells: Segment[], base: { name: string; current: boolean; puzzle: "lever" | "channel"; hint: string }): { room: RoomFields; spec: RoomSpec } {
  const cols = cells.length * SEG.cols, width = cols * TILE;
  const abs = (i: number, x: number) => i * SEG.cols + x;
  const collision: CollisionRule[] = cells.flatMap((s, i) => s.rock.map(r => ({ solid: true, x0: abs(i, r.x0), x1: abs(i, r.x1), y0: SEG.firstRow + r.y0, y1: SEG.firstRow + r.y1 })));
  const spans = cells.flatMap((s, i) => s.water ? [[abs(i, s.water[0]), abs(i, s.water[1])] as [number, number]] : []);
  const merged: [number, number][] = [];
  for (const sp of spans) { const m = merged[merged.length - 1]; if (m && sp[0] <= m[1] + 1) m[1] = Math.max(m[1], sp[1]); else merged.push([...sp]); }
  const water: WaterRegion[] = merged.map(([a, b]) => ({ x0: a * TILE, x1: (b + 1) * TILE, low: 288, raised: 224 }));
  const px = (i: number, x: number) => abs(i, x) * TILE;
  const food = [...new Set(cells.flatMap((s, i) => s.food.map(x => px(i, x))))].filter(x => x >= 96 && x <= width - 80);
  // Every room carries at least four food: top up at cell midpoints when edge-hugging slots fell outside the room.
  for (let i = 0; food.length < 4 && i < cells.length * 2; i++) { const x = px(Math.floor(i / 2), i % 2 ? 30 : 14); if (!food.includes(x) && x >= 96 && x <= width - 80) food.push(x); }
  food.sort((a, b) => a - b);
  const enemies: EnemySpawn[] = cells.flatMap((s, i) => (s.enemies ?? []).map(e => ({ kind: e.kind, x: px(i, e.x) + 8, y: ENEMY_Y[e.kind] })));
  const guard = cells.findIndex(s => s.net), ci = cells.findIndex(s => s.control), ki = cells.findIndex(s => s.cache);
  const net = guard >= 0 ? { rig: { x: px(guard, cells[guard].net!.rig) + 8, y: 304 }, frame: { x: px(guard, cells[guard].net!.frame) + 8, y: 288 } } : { rig: { x: 104, y: 304 }, frame: { x: 368, y: 288 } };
  const reeds = cells.flatMap((s, i) => (s.reeds ?? []).map(x => px(i, x)));
  const control = ci >= 0 ? cells[ci].control! : null;
  const room: RoomFields = { name: base.name, gate: false, tunnel: false, current: base.current, goal: false, gateX: 288, platforms: [], food,
    foes: enemies.filter(e => e.kind !== "dropper").map(e => e.x), cover: reeds[0] ?? 224, variant: 0 };
  const spec: RoomSpec = {
    puzzle: base.puzzle, controls: control ? [{ x: px(ci, control.x) + 8, y: (SEG.firstRow + control.y + 1) * TILE, text: "Sluice lever", guarded: false }] : [],
    timed: 0, leftHatch: null, sealed: false, enemies, reeds: reeds.length ? reeds : [272], net, vent: null,
    cache: ki >= 0 ? { x: px(ki, cells[ki].cache!.x) + 8, y: (SEG.firstRow + cells[ki].cache!.y + 1) * TILE } : null,
    pits: [], switchback: false, collision, base: { platforms: false, tunnel: false, gate: false }, openings: [], verticalOpenFrom: null, farOpenFrom: null,
    returnArrival: null, arriveFromRight: { x: width - 40, y: 304, facing: -1 }, branchArchX: null, hint: { priority: base.hint, fallback: base.hint },
    keyed: null, geometry: sizedGeometry(cols, undefined, water), stitched: cells.map(s => s.id),
  };
  return { room, spec };
}
export type { Port };
