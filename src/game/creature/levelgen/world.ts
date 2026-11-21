// ---------------------------------------------------------------------------
// world.ts (creature/levelgen)
// Purpose : Turn a validated progression graph into a playable Water world: numbered rooms with specs, chain
//           links, shaft openings for every vertical edge, keyed controls for class doors and vaults, and the
//           level entry rooms. The scene, physics, view and bots consume the result like a v1 world.
// Usage   : generateWaterV2(seed) -> WaterWorld (version 2, with graph and starts); worldProblemsV2 for checks.
// Notes   : Seed 0 reproduces the v1 eleven rooms (tests/creatureLevelWorld.test.ts compares the goldens).
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
import { WATER, type WaterRoom, type WaterWorld, type Difficulty } from "../waterWorld";
import { generateWaterGraph, findNode, TIERS, type BiomeGraph, type LevelGraph, type RoomNode, type Rerolls } from "./graph";
import { makeRng } from "./rng";
import { buildRoom, climbScript, bonusThreshold, type Built, type Step } from "./templates";
import { specSolid, type Opening, type StateCondition } from "./roomSpec";
import { ENEMIES } from "../waterEncounters";
import type { RoomObjective } from "../waterObjectives";
import { LEVELGEN } from "./tuning";
import { ladderTier } from "./ladder";
import { layoutLevel, mapProblems } from "./mapLayout";
import { V1_GEOMETRY, arrivalMinX, arrivalMaxX, topEdgeY, floorY } from "./geometry";
import type { ClassSkill } from "./keys";

export interface WorldV2 extends WaterWorld { version: 2; starts: Record<Difficulty, number>; graph: BiomeGraph; solutions: Record<number, Step[]>;
  /** The lineage's class skills the world was built for; class doors must use one of them (invariant 4). */
  classes: ClassSkill[];
  /** Each level's map in room ids, from the graph's ManiaMap layout; the minimap and map checks read it. */
  maps: Partial<Record<Difficulty, SavedMap>> }
export interface SavedMap { cells: Record<number, { x: number; y: number }[]>; doors: { from: number; to: number; side: "left" | "right" | "top" | "bottom"; a: { x: number; y: number }; b: { x: number; y: number } }[] }
export const isWorldV2 = (w: WaterWorld): w is WorldV2 => w.version === 2 && "starts" in w;

/** Rooms are numbered chain first, then branches, level by level, so seed 0 keeps the v1 ids 0..10; channels (step
 *  1.6 loops) come after every level for the same reason. */
function numberRooms(g: BiomeGraph): Map<string, number> {
  const ids = new Map<string, number>(); let next = 0;
  for (const level of g.levels) {
    for (const n of level.nodes.filter(n => n.onCritical).sort((a, b) => a.depth - b.depth)) ids.set(n.id, next++);
    for (const n of level.nodes.filter(n => !n.onCritical && n.role !== "channel")) ids.set(n.id, next++);
  }
  for (const level of g.levels) for (const n of level.nodes.filter(n => n.role === "channel")) ids.set(n.id, next++);
  return ids;
}
/** A stable per-room salt from its graph node id ("hard:2"), so a room's own randomness never depends on numbering. */
const nodeSalt = (id: string): number => { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) % 0x7fffffff + 1; };
/** The class a class door is built for. Class skills are only ever appended to a lineage, so its first class never
 *  changes: a door chosen from it stays the same when a second class is added (review finding 4). */
export const doorClass = (classes: readonly ClassSkill[]): ClassSkill => classes[0] ?? "roar";
export function buildWorld(g: BiomeGraph, classes: ClassSkill[] = ["roar"]): WorldV2 {
  const ids = numberRooms(g), rooms: WaterRoom[] = [], built = new Map<string, Built>(), solutions: Record<number, Step[]> = {};
  const starts = {} as Record<Difficulty, number>;
  for (const level of g.levels) {
    const chain = level.nodes.filter(n => n.onCritical).sort((a, b) => a.depth - b.depth);
    starts[level.tier] = ids.get(chain[0].id)!;
    for (const node of level.nodes) {
      const roomId = ids.get(node.id)!, index = node.onCritical ? node.depth : chain.length + 1;
      const shaped = node.role === "classTrial" ? { ...node, classVariant: doorClass(classes) } : node;
      if (node.role === "classTrial") node.classVariant = shaped.classVariant;
      // Keyed by the graph node, not the room number: refreshing one level shifts the numbers of the next ones.
      const b = buildRoom({ tier: level.tier, node: shaped, rng: makeRng((g.seed ^ 0x5eed ^ Math.imul(nodeSalt(node.id), 0x9e3779b9) ^ Math.imul(level.reroll ?? 0, 0x85ebca6b)) >>> 0), authored: g.seed === 0 && !g.fallback || g.fallback, index, roomId });
      built.set(node.id, b);
      rooms.push({ id: roomId, tier: level.tier, left: -1, right: -1, branch: -1, ...b.room, spec: b.spec });
      solutions[roomId] = [...b.solution];
    }
    linkLevel(level, ids, rooms, built, solutions);
  }
  rooms.sort((a, b) => a.id - b.id);
  const maps: WorldV2["maps"] = {};
  for (const level of g.levels) if (level.map) maps[level.tier] = {
    cells: Object.fromEntries(Object.entries(level.map.cells).map(([n, c]) => [ids.get(n)!, c])),
    doors: level.map.doors.map(d => ({ ...d, from: ids.get(d.from)!, to: ids.get(d.to)! })) };
  return { version: 2, seed: g.seed, rooms, fallback: g.fallback, rejected: g.rejected, starts, graph: g, solutions, classes: [...classes], maps };
}
function linkLevel(level: LevelGraph, ids: Map<string, number>, rooms: WaterRoom[], built: Map<string, Built>, solutions: Record<number, Step[]>): void {
  const room = (nodeId: string): WaterRoom => rooms.find(r => r.id === ids.get(nodeId))!;
  for (const e of level.edges) {
    const from = room(e.from), to = room(e.to), fromNode = findNode(level, e.from), toNode = findNode(level, e.to), fb = built.get(e.from)!, tb = built.get(e.to)!;
    if (e.fromSide === "right") { from.right = to.id; to.left = from.id; }
    if (e.fromSide === "left") continue; // the reciprocal of a chain edge: both links were set above
    if (e.fromSide === "top" || e.fromSide === "bottom") {
      // A channel has two ceiling hatches: the one under the drain (near) and the one under the finale (far).
      const nearSide = (n: typeof fromNode) => n.role === "drain";
      const hosting = fb.channel ? (nearSide(toNode) ? fb.channel.near : fb.channel.far) : e.fromSide === "top" ? fb.hostTop : fb.hostBottom;
      const entry = tb.channel ? (nearSide(fromNode) ? tb.channel.nearEntry : tb.channel.farEntry) : e.fromSide === "top" ? tb.entries.bottom : tb.entries.top;
      if (!hosting || !entry) throw new Error(`template ${fromNode.role} cannot open ${e.fromSide} toward ${toNode.role}`);
      const when: StateCondition | undefined = toNode.role === "vault" || fromNode.role === "vault" && e.fromSide === "bottom" ? (toNode.role === "vault" ? "bonusOpen" : undefined)
        : fromNode.role === "channel" ? (nearSide(toNode) ? "verticalOpen" : "farOpen")
        : toNode.role === "channel" && !nearSide(fromNode) ? "latched" // the finale's hatch: only once its seal is claimed
        : e.opensWhen === "controls" ? (e.fromSide === "bottom" ? "open" : "verticalOpen") : undefined;
      const opening: Opening = { side: e.fromSide, tiles: hosting.tiles, probe: hosting.probe, when, to: { room: to.id, ...entry },
        label: { text: toNode.role === "vault" ? `↑ GROTTO · ${toNode.vaultStat} ${bonusThreshold(level.tier)}` : hosting.label, always: hosting.always } };
      from.spec!.openings.push(opening); from.spec!.collision.unshift(...hosting.rules);
      if (fromNode.role === "channel") { if (nearSide(toNode)) from.spec!.verticalOpenFrom = to.id; else from.spec!.farOpenFrom = to.id; }
      else if (e.fromSide === "top" && e.opensWhen === "controls") from.spec!.verticalOpenFrom = to.id;
      if (toNode.role === "nursery" && e.fromSide === "top") { from.branch = to.id; from.spec!.branchArchX = 126; to.left = from.id; }
      if (toNode.role === "vault" && e.fromSide === "top") {
        to.left = from.id;
        from.spec!.keyed = fb.vaultKeyed!(e.keys!, toNode.vaultStat!, bonusThreshold(level.tier));
        // The host's own script now also opens the grotto shaft and climbs out through the top.
        solutions[from.id] = [{ to: [144, 304], use: "keyed" }, ...climbScript(), ...solutions[from.id]];
      }
      if (toNode.role === "nursery" && e.fromSide === "top") solutions[from.id] = [...climbScript(), ...solutions[from.id]];
    }
  }
}
export function generateWaterV2(seed: number, classes: ClassSkill[] = ["roar"], rerolls: Rerolls = {}): WorldV2 {
  const rejected: string[] = [];
  for (let attempt = 0; attempt < LEVELGEN.attempts; attempt++) {
    const g = generateWaterGraph(attempt === 0 ? seed : (seed + attempt * 0x9e3779b9) >>> 0, rerolls);
    rejected.push(...g.rejected.map(r => `graph ${r}`));
    const w = buildWorld(g, classes), bad = worldProblemsV2(w);
    if (!bad.length) return { ...w, seed: seed >>> 0, rejected };
    rejected.push(`world attempt ${attempt}: ${bad.join(", ")}`);
  }
  const fallback = buildWorld({ ...generateWaterGraph(0), fallback: true }, classes);
  return { ...fallback, seed: seed >>> 0, fallback: true, rejected };
}
export const levelEntry = (w: WaterWorld, tier: Difficulty): number => isWorldV2(w) ? w.starts[tier] : { easy: 0, medium: 4, hard: 7 }[tier];
export const roomNode = (w: WorldV2, roomId: number): RoomNode | undefined => {
  const ids = numberRooms(w.graph);
  for (const level of w.graph.levels) for (const n of level.nodes) if (ids.get(n.id) === roomId) return n;
  return undefined;
};

/** Every objective flag set: the room as a player who has solved it walks it. */
const SOLVED: RoomObjective = { first: true, open: true, remaining: 0, verticalOpen: true, keyOpen: true, bonusOpen: true, farOpen: true, arenaActive: true, arenaCleared: true };
/** Invariant 11: no enemy (swimmers included) stands on an arrival, and every enemy that can detect it gives the player
 *  LEVELGEN.arrivalReaction seconds: its tell plus the time to cover the distance at full speed. */
export function arrivalFair(enemies: readonly { kind: keyof typeof ENEMIES; x: number; y: number }[], at: { x: number; y: number }): boolean {
  return enemies.every(e => {
    const t = ENEMIES[e.kind], d = Math.hypot(e.x - at.x, e.y - at.y);
    if (d < 60) return false;
    return d > t.detect || t.tell + d / t.speed >= LEVELGEN.arrivalReaction;
  });
}
/** After a level's map is refreshed, room ids shift: keep the visited rooms of the other levels (matched by their
 *  graph node, which does not change) and forget the refreshed level's, whose rooms are new. */
export function remapVisited(before: WorldV2, after: WorldV2, visited: readonly number[], tier: Difficulty): number[] {
  const ids = numberRooms(after.graph), out: number[] = [];
  for (const id of visited) { const n = roomNode(before, id); if (!n) continue;
    const level = before.graph.levels.find(l => l.nodes.includes(n))!;
    if (level.tier === tier) continue; const next = ids.get(n.id); if (next !== undefined) out.push(next); }
  return out;
}
/** Static invariants on the built world (the physical ones run in solver.ts and the tests). */
export function worldProblemsV2(w: WorldV2): string[] {
  const bad = new Set<string>(), rooms = w.rooms, byId = new Map(rooms.map(r => [r.id, r]));
  if (new Set(rooms.map(r => r.id)).size !== rooms.length || rooms.some(r => !r.spec)) bad.add("room identity");
  // Every level reaches exactly one goal through any of its links (left, right or a shaft): no chain direction is assumed.
  for (const tier of TIERS) {
    const seen = new Set<number>([w.starts[tier]]), queue = [w.starts[tier]];
    while (queue.length) {
      const r = byId.get(queue.shift()!);
      if (!r || r.tier !== tier) { bad.add("connected paths"); break; }
      for (const n of [r.left, r.right, r.branch, ...r.spec!.openings.map(o => o.to.room)]) if (n >= 0 && !seen.has(n)) { seen.add(n); queue.push(n); }
    }
    const goals = rooms.filter(r => r.tier === tier && r.goal);
    if (goals.length !== 1 || !seen.has(goals[0].id) || rooms.some(r => r.tier === tier && !seen.has(r.id))) bad.add("connected paths");
  }
  for (const r of rooms) if (r.spec!.variant && !w.classes.includes(r.spec!.variant as ClassSkill)) bad.add("class triad");
  // A gallery the stitcher could not fill fell back to a one-screen room: reject the attempt (the map expects its width).
  for (const level of w.graph.levels) for (const n of level.nodes) if (n.role === "gallery") {
    const r = rooms.find(q => q.id === numberRooms(w.graph).get(n.id));
    if (!r?.spec?.stitched || r.spec.stitched.length !== n.cells) bad.add("stitch");
  }
  for (const r of rooms) {
    const s = r.spec!, g = s.geometry ?? V1_GEOMETRY, exitX = g.width - (WATER.width - WATER.exit);
    if (r.right !== -1 && byId.get(r.right)?.left !== r.id) bad.add("return routes");
    if (r.left !== -1 && !byId.has(r.left)) bad.add("return routes");
    if (r.gateX % 16 || r.gateX < 256 || r.gateX > 400 || r.platforms.some(p => p.x % 16 || p.y % 16 || p.width % 16)) bad.add("lattice geometry");
    // The real collision (specSolid, review finding 7), in the solved state: the walk along the floor must be clear.
    // A switchback (the shaft) blocks its floor on purpose, and a stitched room's segments may stand rock on it;
    // the search solver proves those routes instead.
    if (!s.switchback && !s.stitched) for (let x = WATER.spawn; x <= exitX; x += 4) for (const tx of [Math.floor((x - 7) / 16), Math.floor((x + 6.999) / 16)])
      if (specSolid(r, true, tx, g.floorRow - 2, SOLVED) || specSolid(r, true, tx, g.floorRow - 1, SOLVED)) bad.add("body clearance");
    if (r.food.length < 4 || r.food.some(x => x < 96 || x > g.width - 80 || x % 16) || new Set(r.food).size !== r.food.length) bad.add("food spacing");
    // No enemy at the entrance or past the exit; anywhere between is allowed (the old x >= 352 rule forced every
    // threat into the right third of the room: review finding 9).
    const enemyCap = s.stitched ? ladderTier("water", r.tier).enemiesPerScreen * s.stitched.length : r.tier === "easy" ? 1 : r.tier === "medium" ? 2 : 3;
    if (s.enemies.some(e => e.x < 160 || e.x > g.width - 80) || s.enemies.length > enemyCap) bad.add("encounter safety");
    for (const op of s.openings) {
      const dest = byId.get(op.to.room); if (!dest || !dest.spec) { bad.add("arrival safety"); continue; }
      if (!dest.spec.openings.some(back => back.to.room === r.id && back.side !== op.side)) bad.add("return routes");
      const dg = dest.spec.geometry ?? V1_GEOMETRY;
      if (op.to.x < arrivalMinX(dg) || op.to.x > arrivalMaxX(dg) || op.to.y < topEdgeY(dg) || op.to.y > floorY(dg)) bad.add("arrival safety");
      if (!arrivalFair(dest.spec.enemies, op.to)) bad.add("arrival safety");
    }
    if (r.gate && s.puzzle !== "lever" && s.puzzle !== "shaft") bad.add("Gardener crossing");
    if (s.keyed && s.controls.some(c => Math.abs(c.x - s.keyed!.x) < 40 && Math.abs(c.y - s.keyed!.y) < 30)) bad.add("control spacing");
  }
  for (const tier of TIERS) if (!rooms.some(r => r.tier === tier && (r.gate || r.current))) bad.add("Gardener crossing");
  // The minimap must make sense: no overlapping rooms, doors between touching cells (mapLayout.ts).
  for (const tier of TIERS) {
    const m = layoutLevel(w, tier);
    for (const p of mapProblems(m)) bad.add(p);
    // The map must show every link the rooms really have, on the side they have it (no hidden or invented doors).
    for (const r of rooms.filter(q => q.tier === tier)) {
      const links = [...(r.right >= 0 ? [[r.right, "right"]] : []), ...r.spec!.openings.map(o => [o.to.room, o.side])] as [number, string][];
      for (const [to, side] of links) if (!m.doors.some(d => d.from === r.id && d.to === to && d.side === side)) bad.add("map door");
    }
  }
  return [...bad];
}
