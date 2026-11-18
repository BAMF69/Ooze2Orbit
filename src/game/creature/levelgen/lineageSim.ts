// ---------------------------------------------------------------------------
// lineageSim.ts (creature/levelgen)
// Purpose : Invariant 3 (CREATURE_LEVELGEN.md §5): play a whole lineage against a biome graph, one generation at
//           a time. Each generation walks every level its keys open, banks the story keys it can reach (they
//           only express in the next daughter, as in expedition.ts), and stops when the hard seal is banked.
//           Fun parts, skills and stats above the seed are never assumed; Gardener terrain is always available.
// Usage   : simulateLineage(graph, minimalKeys("roar")) -> { generations, banked, problem? }
// Notes   : Pure. The real game may take longer (deaths lose cargo); this is the lower bound on generations.
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
import type { BiomeGraph, LevelGraph } from "./graph";
import { MATERIALS, opens, holds, STATS, statKey, type Key, type ClassSkill } from "./keys";
import { LEVELGEN } from "./tuning";

export interface LineageResult { generations: number; banked: Key[]; completed: string[]; log: string[]; problem?: string }
export const minimalKeys = (c: ClassSkill): Set<Key> => new Set<Key>(["play", `class:${c}`, ...STATS.map(s => statKey(s, 0))]);
export const maximalKeys = (): Set<Key> => new Set<Key>(["play", "gills", "fins", "class:roar", "class:burrow", "class:tool", ...STATS.map(s => statKey(s, 17))]);

/** Nodes reachable from the level entry with these keys; vault edges carry their own thresholds. */
export function reachable(level: LevelGraph, keys: ReadonlySet<Key>): Set<string> {
  const entry = level.nodes.find(n => n.depth === 0 && n.onCritical) ?? level.nodes[0];
  const seen = new Set<string>([entry.id]), queue = [entry.id];
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of level.edges) {
      if (e.from !== id || seen.has(e.to)) continue;
      const open = e.keys ? e.keys.some(all => all.every(k => holds(keys, k))) : e.materials.every(m => opens(MATERIALS[m], keys));
      if (open) { seen.add(e.to); queue.push(e.to); }
    }
  }
  return seen;
}
export function simulateLineage(g: BiomeGraph, start: ReadonlySet<Key>, maxGenerations: number = LEVELGEN.lineage.maxGenerations): LineageResult {
  const banked = new Set<Key>(start), completed = new Set<string>(), log: string[] = [];
  for (let gen = 1; gen <= maxGenerations; gen++) {
    const keys = new Set<Key>([...banked, "gardener:raise", "gardener:divert"]);
    const found = new Set<Key>();
    for (const level of g.levels) {
      if (!level.entry.some(all => all.every(k => holds(keys, k)))) { log.push(`G${gen}: ${level.tier} locked`); continue; }
      const seen = reachable(level, keys);
      for (const p of level.placements) if (seen.has(p.node)) {
        if (p.kind === "storyKey" && !banked.has(p.key as Key)) found.add(p.key as Key);
        if (p.kind === "seal") completed.add(p.key);
      }
      log.push(`G${gen}: ${level.tier} reached ${seen.size}/${level.nodes.length}`);
    }
    if (completed.has("hard")) return { generations: gen, banked: [...banked], completed: [...completed], log };
    if (!found.size) return { generations: gen, banked: [...banked], completed: [...completed], log, problem: "keys before gates" };
    for (const k of found) banked.add(k);
  }
  return { generations: maxGenerations, banked: [...banked], completed: [...completed], log, problem: "keys before gates" };
}
