// ---------------------------------------------------------------------------
// keys.ts (creature/levelgen)
// Purpose : The key vocabulary and the material table (CREATURE_LEVELGEN.md §2.2, §2.3, §3.1): what a lineage can
//           hold, and which keys open which obstacle. A critical material may only list story keys and Gardener
//           terrain, so skills and fun parts can never bypass a story lock.
// Usage   : opens(MATERIALS.sluice, keys) ; statKey("strength", 8) ; isCritical("torrent")
// Notes   : "play" is the pseudo-key for obstacles solved by playing (controls, timing, lures): always held.
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
export type Stat = "strength" | "vitality" | "agility" | "intellect" | "armor";
export const STATS: readonly Stat[] = ["strength", "vitality", "agility", "intellect", "armor"];
export type ClassSkill = "roar" | "burrow" | "tool";
export const CLASS_SKILLS: readonly ClassSkill[] = ["roar", "burrow", "tool"];
export type StoryKey = "gills" | "fins" | "climb" | `class:${ClassSkill}`;
export type TerrainKey = "gardener:raise" | "gardener:divert";
export type StatKey = `stat:${Stat}>=${number}`;
export type SkillKey = `skill:${Stat}:20` | `skill:${Stat}:30`;
export type FunPart = "fullArmor" | "iceBreath";
export const FUN_PARTS: readonly FunPart[] = ["fullArmor", "iceBreath"];
export type PartKey = `part:${FunPart}`;
export type Key = "play" | StoryKey | TerrainKey | StatKey | SkillKey | PartKey;
export type KeySet = ReadonlySet<Key>;

/** A material opens when ANY inner list is fully held (disjunctive normal form). */
export interface Material { id: MaterialId; opens: Key[][]; critical: boolean }
export type MaterialId = "open" | "controls" | "sluice" | "deepWater" | "torrent" | "classDoor" | "vaultStrength" | "vaultVitality" | "vaultAgility" | "vaultIntellect";
export const statKey = (stat: Stat, n: number): StatKey => `stat:${stat}>=${n}`;
export const MATERIALS: Record<MaterialId, Material> = {
  open: { id: "open", opens: [["play"]], critical: false },
  controls: { id: "controls", opens: [["play"]], critical: true },
  sluice: { id: "sluice", opens: [["gardener:raise"]], critical: true },
  deepWater: { id: "deepWater", opens: [["gills"]], critical: true },
  torrent: { id: "torrent", opens: [["gardener:divert", "fins"]], critical: true },
  classDoor: { id: "classDoor", opens: CLASS_SKILLS.map(c => [`class:${c}` as Key]), critical: true },
  // Vault thresholds are rewritten per level tier by the generator (statKey); these are the shapes.
  vaultStrength: { id: "vaultStrength", opens: [[statKey("strength", 8)], ["skill:strength:30"]], critical: false },
  vaultVitality: { id: "vaultVitality", opens: [[statKey("vitality", 8)], ["skill:vitality:30"]], critical: false },
  vaultAgility: { id: "vaultAgility", opens: [[statKey("agility", 8)], ["skill:agility:30"]], critical: false },
  vaultIntellect: { id: "vaultIntellect", opens: [[statKey("intellect", 8)], ["skill:intellect:20"]], critical: false },
};
export const isStoryOrTerrain = (k: Key): boolean => k === "gills" || k === "fins" || k === "climb" || k.startsWith("class:") || k.startsWith("gardener:");
/** Stat keys are ordered: holding strength 12 satisfies stat:strength>=8. */
export function holds(keys: KeySet, k: Key): boolean {
  if (k === "play" || keys.has(k)) return true;
  const m = /^stat:(\w+)>=(\d+)$/.exec(k); if (!m) return false;
  for (const held of keys) { const h = /^stat:(\w+)>=(\d+)$/.exec(held); if (h && h[1] === m[1] && Number(h[2]) >= Number(m[2])) return true; }
  return false;
}
export const opens = (m: Material, keys: KeySet): boolean => m.opens.some(all => all.every(k => holds(keys, k)));
export const isCritical = (id: MaterialId): boolean => MATERIALS[id].critical;
/** The key set a creature holds, from its traits (stats as thresholds, parts and skills as flags). */
export function keysOf(t: { stats?: Partial<Record<Stat, number>>; gills?: boolean; fins?: boolean; climb?: boolean; classSkills?: ClassSkill[]; parts?: FunPart[] },
  world: { basinRaised: boolean; torrentDiverted: boolean }, lesser = 20, ultimate = 30): Set<Key> {
  const keys = new Set<Key>(["play"]);
  if (t.gills) keys.add("gills"); if (t.fins) keys.add("fins"); if (t.climb) keys.add("climb");
  for (const c of t.classSkills ?? []) keys.add(`class:${c}`);
  for (const p of t.parts ?? []) keys.add(`part:${p}`);
  for (const s of STATS) { const n = t.stats?.[s] ?? 0; keys.add(statKey(s, n)); if (n >= lesser) keys.add(`skill:${s}:20`); if (n >= ultimate) keys.add(`skill:${s}:30`); }
  if (world.basinRaised) keys.add("gardener:raise"); if (world.torrentDiverted) keys.add("gardener:divert");
  return keys;
}
