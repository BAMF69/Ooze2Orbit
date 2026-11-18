// ---------------------------------------------------------------------------
// lineageSim.ts (creature/levelgen)
// Purpose : Invariant 3 (CREATURE_LEVELGEN.md §5): play a whole lineage against a biome graph, one generation at
//           a time, as a sphere search: each generation reaches what its keys open, and the next daughter expresses
//           one of the story keys found (as in expedition.ts). Stops when the hard seal is reachable. Fun parts,
//           skills and stats above the seed are never assumed; Gardener terrain is available where the graph puts it.
// Usage   : sphereSearch(graph, minimalKeys("roar")) -> { generations, spheres, problem? }
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
  const seen = new Set<string>([entry.id]);
  // Fixed point: an edge opened by another room's controls becomes passable once that room is reached.
  for (let grew = true; grew;) {
    grew = false;
    for (const e of level.edges) {
      if (!seen.has(e.from) || seen.has(e.to) || e.openedBy && !seen.has(e.openedBy)) continue;
      const open = e.keys ? e.keys.some(all => all.every(k => holds(keys, k))) : e.materials.every(m => opens(MATERIALS[m], keys));
      if (open) { seen.add(e.to); grew = true; }
    }
  }
  return seen;
}
/**
 * Sphere search (randomizer "spheres", one sphere per generation). Each generation walks every level its keys open
 * and finds the story keys it can reach; the NEXT daughter expresses exactly ONE of them (a daughter carries one new
 * adaptation; review finding 5: the old simulator banked every key at once). All choices are explored breadth-first,
 * so `generations` is the fewest a lineage can need, and `spheres` lists what each generation reached.
 */
export interface SphereResult extends LineageResult { spheres: { generation: number; held: Key[]; reached: string[]; found: Key[] }[] }
export function sphereSearch(g: BiomeGraph, start: ReadonlySet<Key>, maxGenerations: number = LEVELGEN.lineage.maxGenerations): SphereResult {
  type State = { held: Set<Key>; completed: Set<string>; trail: SphereResult["spheres"] };
  let frontier: State[] = [{ held: new Set(start), completed: new Set(), trail: [] }];
  const seen = new Set<string>();
  for (let gen = 1; gen <= maxGenerations && frontier.length; gen++) {
    const next: State[] = [];
    for (const st of frontier) {
      const keys = new Set<Key>([...st.held, ...g.gardener.map(c => c.key)]), found = new Set<Key>(), completed = new Set(st.completed), reached: string[] = [];
      for (const level of g.levels) {
        if (!level.entry.some(all => all.every(k => holds(keys, k)))) continue;
        const r = reachable(level, keys); reached.push(`${level.tier} ${r.size}/${level.nodes.length}`);
        for (const p of level.placements) if (r.has(p.node)) {
          if (p.kind === "storyKey" && !st.held.has(p.key as Key)) found.add(p.key as Key);
          if (p.kind === "seal") completed.add(p.key);
        }
      }
      const trail = [...st.trail, { generation: gen, held: [...st.held], reached, found: [...found] }];
      if (completed.has("hard")) return { generations: gen, banked: [...st.held], completed: [...completed], log: trail.map(t => `G${t.generation}: ${t.reached.join(", ")}`), spheres: trail };
      for (const k of found) {
        const held = new Set([...st.held, k]), id = [...held].sort().join("|");
        if (!seen.has(id)) { seen.add(id); next.push({ held, completed, trail }); }
      }
    }
    frontier = next;
  }
  return { generations: maxGenerations, banked: [], completed: [], log: [], spheres: [], problem: "keys before gates" };
}
