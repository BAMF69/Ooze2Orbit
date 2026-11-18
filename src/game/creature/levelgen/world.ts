// ---------------------------------------------------------------------------
// world.ts (creature/levelgen)
// Purpose : Turn a validated progression graph into a playable Water world: numbered rooms with specs, chain
//           links, shaft openings for every vertical edge, keyed controls for class doors and vaults, and the
//           level entry rooms. The scene, physics, view and bots consume the result like a v1 world.
// Usage   : generateWaterV2(seed) -> WaterWorld (version 2, with graph and starts); worldProblemsV2 for checks.
// Notes   : Seed 0 reproduces the v1 eleven rooms (tests/creatureLevelWorld.test.ts compares the goldens).
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
import { WATER, roomSolid, type WaterRoom, type WaterWorld, type Difficulty } from "../waterWorld";
import { generateWaterGraph, findNode, TIERS, type BiomeGraph, type LevelGraph, type RoomNode } from "./graph";
import { makeRng } from "./rng";
import { buildRoom, climbScript, bonusThreshold, type Built, type Step } from "./templates";
import type { Opening, StateCondition } from "./roomSpec";
import { LEVELGEN } from "./tuning";
import { layoutLevel, mapProblems } from "./mapLayout";
import type { ClassSkill } from "./keys";

export interface WorldV2 extends WaterWorld { version: 2; starts: Record<Difficulty, number>; graph: BiomeGraph; solutions: Record<number, Step[]> }
export const isWorldV2 = (w: WaterWorld): w is WorldV2 => w.version === 2 && "starts" in w;

/** Rooms are numbered chain first, then branches, level by level, so seed 0 keeps the v1 ids 0..10. */
function numberRooms(g: BiomeGraph): Map<string, number> {
  const ids = new Map<string, number>(); let next = 0;
  for (const level of g.levels) {
    for (const n of level.nodes.filter(n => n.onCritical).sort((a, b) => a.depth - b.depth)) ids.set(n.id, next++);
    for (const n of level.nodes.filter(n => !n.onCritical)) ids.set(n.id, next++);
  }
  return ids;
}
export function buildWorld(g: BiomeGraph, classes: ClassSkill[] = ["roar"]): WorldV2 {
  const ids = numberRooms(g), rooms: WaterRoom[] = [], built = new Map<string, Built>(), solutions: Record<number, Step[]> = {};
  const starts = {} as Record<Difficulty, number>;
  const rng = makeRng(g.seed ^ 0x5eed);
  for (const level of g.levels) {
    const chain = level.nodes.filter(n => n.onCritical).sort((a, b) => a.depth - b.depth);
    starts[level.tier] = ids.get(chain[0].id)!;
    for (const node of level.nodes) {
      const roomId = ids.get(node.id)!, index = node.onCritical ? node.depth : chain.length + 1;
      if (node.role === "classTrial") node.classVariant = classes.includes(node.classVariant!) ? node.classVariant : classes[rng.int(classes.length)];
      const b = buildRoom({ tier: level.tier, node, rng: rng.fork(roomId + 1), authored: g.seed === 0 && !g.fallback || g.fallback, index, roomId });
      built.set(node.id, b);
      rooms.push({ id: roomId, tier: level.tier, left: -1, right: -1, branch: -1, ...b.room, spec: b.spec });
      solutions[roomId] = [...b.solution];
    }
    linkLevel(level, ids, rooms, built, solutions);
  }
  rooms.sort((a, b) => a.id - b.id);
  return { version: 2, seed: g.seed, rooms, fallback: g.fallback, rejected: g.rejected, starts, graph: g, solutions };
}
function linkLevel(level: LevelGraph, ids: Map<string, number>, rooms: WaterRoom[], built: Map<string, Built>, solutions: Record<number, Step[]>): void {
  const room = (nodeId: string): WaterRoom => rooms.find(r => r.id === ids.get(nodeId))!;
  for (const e of level.edges) {
    const from = room(e.from), to = room(e.to), fromNode = findNode(level, e.from), toNode = findNode(level, e.to), fb = built.get(e.from)!, tb = built.get(e.to)!;
    if (e.fromSide === "right") { from.right = to.id; to.left = from.id; }
    if (e.fromSide === "left") continue; // the reciprocal of a chain edge: both links were set above
    if (e.fromSide === "top" || e.fromSide === "bottom") {
      const hosting = e.fromSide === "top" ? fb.hostTop : fb.hostBottom, entry = e.fromSide === "top" ? tb.entries.bottom : tb.entries.top;
      if (!hosting || !entry) throw new Error(`template ${fromNode.role} cannot open ${e.fromSide} toward ${toNode.role}`);
      const when: StateCondition | undefined = toNode.role === "vault" || fromNode.role === "vault" && e.fromSide === "bottom" ? (toNode.role === "vault" ? "bonusOpen" : undefined)
        : e.opensWhen === "controls" ? (e.fromSide === "bottom" ? "open" : "verticalOpen") : undefined;
      const opening: Opening = { side: e.fromSide, tiles: hosting.tiles, probe: hosting.probe, when, to: { room: to.id, ...entry },
        label: { text: toNode.role === "vault" ? `↑ GROTTO · ${toNode.vaultStat} ${bonusThreshold(level.tier)}` : hosting.label, always: hosting.always } };
      from.spec!.openings.push(opening); from.spec!.collision.unshift(...hosting.rules);
      if (e.fromSide === "top" && e.opensWhen === "controls") from.spec!.verticalOpenFrom = to.id;
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
export function generateWaterV2(seed: number, classes: ClassSkill[] = ["roar"]): WorldV2 {
  const rejected: string[] = [];
  for (let attempt = 0; attempt < LEVELGEN.attempts; attempt++) {
    const g = generateWaterGraph(attempt === 0 ? seed : (seed + attempt * 0x9e3779b9) >>> 0);
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

/** Static invariants on the built world (the physical ones run in solver.ts and the tests). */
export function worldProblemsV2(w: WorldV2): string[] {
  const bad = new Set<string>(), rooms = w.rooms, byId = new Map(rooms.map(r => [r.id, r]));
  if (new Set(rooms.map(r => r.id)).size !== rooms.length || rooms.some(r => !r.spec)) bad.add("room identity");
  for (const tier of TIERS) {
    let id = w.starts[tier], seen = new Set<number>(), goal = false;
    while (id !== -1 && !seen.has(id)) { seen.add(id); const r = byId.get(id); if (!r || r.tier !== tier) { bad.add("connected paths"); break; } goal = r.goal; id = r.right; }
    if (!goal || id !== -1) bad.add("connected paths");
  }
  for (const r of rooms) {
    const s = r.spec!;
    if (r.right !== -1 && byId.get(r.right)?.left !== r.id) bad.add("return routes");
    if (r.left !== -1 && !byId.has(r.left)) bad.add("return routes");
    if (r.gateX % 16 || r.gateX < 256 || r.gateX > 400 || r.platforms.some(p => p.x % 16 || p.y % 16 || p.width % 16)) bad.add("lattice geometry");
    for (let x = WATER.spawn; x <= WATER.exit; x += 4) for (const tx of [Math.floor((x - 7) / 16), Math.floor((x + 6.999) / 16)])
      if (roomSolid({ ...r, platforms: s.base.platforms ? r.platforms : [], tunnel: false }, true, tx, 17) || roomSolid(r, true, tx, 18)) bad.add("body clearance");
    if (r.food.length < 4 || r.food.some(x => x < 96 || x > 560 || x % 16) || new Set(r.food).size !== r.food.length) bad.add("food spacing");
    if (s.enemies.some(e => e.x < 352 || e.x > 560) || s.enemies.length > (r.tier === "easy" ? 1 : r.tier === "medium" ? 2 : 3)) bad.add("encounter safety");
    for (const op of s.openings) {
      const dest = byId.get(op.to.room); if (!dest || !dest.spec) { bad.add("arrival safety"); continue; }
      if (!dest.spec.openings.some(back => back.to.room === r.id && back.side !== op.side)) bad.add("return routes");
      if (op.to.x < 24 || op.to.x > 616 || op.to.y < 96 || op.to.y > 304) bad.add("arrival safety");
      // No spawn damage: nothing may stand on the arrival point itself (tell ranges are the player's problem, as in v1).
      if (dest.spec.enemies.some(e => e.kind !== "swimmer" && Math.abs(e.x - op.to.x) < 60 && Math.abs(e.y - op.to.y) < 60)) bad.add("arrival safety");
    }
    if (r.gate && s.puzzle !== "lever" && s.puzzle !== "shaft") bad.add("Gardener crossing");
    if (s.keyed && s.controls.some(c => Math.abs(c.x - s.keyed!.x) < 40 && Math.abs(c.y - s.keyed!.y) < 30)) bad.add("control spacing");
  }
  for (const tier of TIERS) if (!rooms.some(r => r.tier === tier && (r.gate || r.current))) bad.add("Gardener crossing");
  // The minimap must make sense: no overlapping rooms, doors between touching cells (mapLayout.ts).
  for (const tier of TIERS) for (const p of mapProblems(layoutLevel(w, tier))) bad.add(p);
  return [...bad];
}
