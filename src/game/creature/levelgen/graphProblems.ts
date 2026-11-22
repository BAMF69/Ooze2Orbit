// ---------------------------------------------------------------------------
// graphProblems.ts (creature/levelgen)
// Purpose : Invariants 1 to 10 of CREATURE_LEVELGEN.md §5 as one function returning named problems, shared by
//           the generator's reject loop, the tests and any debug view. A graph that lists no problem is solvable
//           by every lineage the simulator models; the physical layer then has to confirm it with the controller.
// Usage   : graphProblems(biomeGraph) -> string[] (empty means accepted)
// Notes   : Each name has a deliberately-broken test in tests/creatureLevelGraph.test.ts (SOP-17 §1).
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
import { ladderTier } from "./ladder";
import { cycleCount, chainScreens, type BiomeGraph, type LevelGraph, type Edge, type GardenerControl } from "./graph";
import { MATERIALS, isStoryOrTerrain, isCritical, CLASS_SKILLS, type Key } from "./keys";
import { LEVELGEN } from "./tuning";
import { sphereSearch, minimalKeys, maximalKeys, reachable } from "./lineageSim";
import type { ClassSkill } from "./keys";

/** `classes`: the lineage's class skills, when known; every class door must then be built for one of them. */
export function graphProblems(g: BiomeGraph, classes?: readonly ClassSkill[]): string[] {
  const bad = new Set<string>();
  if (g.version !== LEVELGEN.version || g.levels.length !== 3) bad.add("graph identity");
  for (const level of g.levels) {
    const ids = new Set(level.nodes.map(n => n.id));
    if (ids.size !== level.nodes.length || level.nodes.filter(n => n.goal).length !== 1 || level.nodes.filter(n => n.depth === 0).length !== 1) bad.add("graph identity");
    for (const e of level.edges) {
      if (!ids.has(e.from) || !ids.has(e.to) || !level.edges.some(r => r.id === e.reciprocal && r.from === e.to && r.to === e.from && r.fromSide === e.toSide && r.toSide === e.fromSide)) bad.add("reciprocity");
      const critical = level.nodes.find(n => n.id === e.from)?.onCritical && level.nodes.find(n => n.id === e.to)?.onCritical;
      if (critical && e.materials.some(m => !isCritical(m) && m !== "open")) bad.add("critical materials");
      if (e.keys && e.materials.some(isCritical)) bad.add("critical materials");
    }
    if (!chainConnected(level, n => n.onCritical)) bad.add("critical chain");
    if (!chainConnected(level, n => n.onCritical && n.role !== "vault")) bad.add("bonus isolation");
    if (level.placements.some(p => p.kind === "storyKey" && level.nodes.find(n => n.id === p.node)?.role === "vault")) bad.add("bonus isolation");
    // Counted from the edges, never from the generator's own field (review finding 3): parallel edges add nothing.
    if (cycleCount(level) < (level.tier === "easy" ? 0 : 1)) bad.add("loop");
    if (!level.map) bad.add("map layout");
    const chain = level.nodes.filter(n => n.onCritical).sort((a, b) => a.depth - b.depth);
    for (let n = LEVELGEN.pacing.maxSameRole; n < chain.length; n++)
      if (chain.slice(n - LEVELGEN.pacing.maxSameRole, n + 1).every(x => x.role === chain[n].role)) bad.add("pacing");
    for (let n = LEVELGEN.pacing.maxSpikesInRow; n < chain.length; n++)
      if (chain.slice(n - LEVELGEN.pacing.maxSpikesInRow, n + 1).every(x => x.sealed)) bad.add("pacing");
    // Recovery (§5 invariant 10): every Hard spike (a sealed room) has a food cache room within three rooms of it.
    if (level.tier === "hard") for (const spike of chain.filter(n => n.sealed))
      if (!chain.some(n => (RECOVERY.has(n.role) || n.cache) && Math.abs(n.depth - spike.depth) <= LEVELGEN.pacing.recoveryWithin)) bad.add("pacing");
    // The ladder (levelgen/ladder.ts): a generated level's critical path lands inside its tier's screen range.
    if (!g.authored && !level.authored) { const t = ladderTier("water", level.tier), w = chainScreens(level); if (w < t.screens[0] || w > t.screens[1]) bad.add("ladder size"); }
    for (const n of level.nodes) if (n.role === "classTrial") {
      if (!level.edges.some(e => e.from === n.id && e.materials.includes("classDoor"))) bad.add("class triad");
      // The variant must be a class this lineage has (review finding 4); unset means "not built for a lineage yet".
      if (classes && (!n.classVariant || !classes.includes(n.classVariant))) bad.add("class triad");
    }
  }
  for (const m of Object.values(MATERIALS)) if (m.critical && m.opens.some(all => all.some(k => k !== "play" && !isStoryOrTerrain(k)))) bad.add("critical materials");
  if (gardenerCircular(GARDENER_PREREQ) || gardenerUnreachable(g)) bad.add("gardener circularity");
  // Keys before gates, for the weakest lineage of each class and for the strongest lineage.
  for (const c of CLASS_SKILLS) { const sim = sphereSearch(g, minimalKeys(c)); if (sim.problem) bad.add(sim.problem); }
  if (sphereSearch(g, maximalKeys()).problem) bad.add("keys before gates");
  // Easy must open to a first-generation creature with no story key: entry, goal and both discoveries.
  const easy = g.levels.find(l => l.tier === "easy");
  if (easy) {
    const keys = new Set<Key>([...minimalKeys("roar"), "gardener:raise", "gardener:divert"]), seen = reachable(easy, keys);
    if (!easy.entry.some(all => all.every(k => keys.has(k))) || !easy.nodes.filter(n => n.goal || n.role === "nursery").every(n => seen.has(n.id))) bad.add("easy open");
  }
  return [...bad];
}
/** Rooms that hold a food cache: the recovery a Hard spike needs nearby. */
const RECOVERY = new Set(["shaft"]);
/** Invariant 6 where the graph places the controls: an intervention operated in a room must be reachable without its
 *  own effect (and without anything that needs it). A menu control (the nest toggle) is always reachable. */
export function gardenerUnreachable(g: BiomeGraph): boolean {
  return g.gardener.some((c: GardenerControl) => {
    if (c.at === "menu") return false;
    const at = c.at, level = g.levels.find(l => l.tier === at.tier); if (!level) return true;
    const without = new Set<Key>([...maximalKeys(), ...g.gardener.map(x => x.key)].filter(k => k !== c.key && !(GARDENER_PREREQ[k as keyof typeof GARDENER_PREREQ] ?? []).includes(c.key)));
    return !reachable(level, without).has(at.node);
  });
}
/** Gardener terrain prerequisites; the generator never creates a circular one (invariant 6). */
export const GARDENER_PREREQ: Record<"gardener:raise" | "gardener:divert", Key[]> = { "gardener:raise": [], "gardener:divert": ["gardener:raise"] };
/** True when following prerequisites from any intervention returns to itself. */
export function gardenerCircular(prereq: Record<string, Key[]>): boolean {
  const visit = (k: string, trail: Set<string>): boolean => trail.has(k) || (prereq[k] ?? []).some(p => visit(p, new Set([...trail, k])));
  return Object.keys(prereq).some(k => visit(k, new Set()));
}

function chainConnected(level: LevelGraph, keep: (n: LevelGraph["nodes"][number]) => boolean): boolean {
  const nodes = level.nodes.filter(keep), ids = new Set(nodes.map(n => n.id)), entry = nodes.find(n => n.depth === 0), goal = nodes.find(n => n.goal);
  if (!entry || !goal) return false;
  const seen = new Set<string>([entry.id]), queue = [entry.id];
  while (queue.length) { const id = queue.shift()!; for (const e of level.edges as Edge[]) if (e.from === id && ids.has(e.to) && !seen.has(e.to)) { seen.add(e.to); queue.push(e.to); } }
  return seen.has(goal.id);
}
