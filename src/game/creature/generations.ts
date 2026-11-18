// Creature Toy 2: engine-free inheritance, persistent exploration and climate rules.
// PROTOTYPE: handmade rooms and guaranteed contrasting heirs keep the first playtest readable.
import { validExpedition, waterOffspring, validClassSkills, type Expedition } from "./expedition";
import type { RootVerdict } from "./rootEncounter";
import { refreshLineage } from "../../core/lineage";
export const GEN = { strengthGate: 4, maxStat: 20, health: 6, hungerSeconds: 150, foodHeal: 1,
  roomWidth: 640, floor: 304, biteReach: 48, biteCooldown: 0.4, damageGrace: 1.2, foeSpeed: 38 };
export type Climate = "drought" | "flood";
export interface Traits { strength: number; vitality: number; climb: boolean; diet: string; gills?: boolean; fins?: boolean; classSkills?: ("roar" | "burrow" | "tool")[] }
export interface Evidence { fights: number; sneaks: number; solves: number; jumps: number; plants: number; meat: number; cliff: boolean; rootVerdict?: RootVerdict }
export interface Heir { name: string; traits: Traits; cause: string }
export interface Garden { generation: number; traits: Traits; climate: Climate; opened: number[]; visited: number[]; history: string[]; source?: string; expedition?: Expedition }
export const ROOMS = [
  { name: "Shore nest", color: 0x193c45, left: -1, right: 1, branch: -1, hint: "E at the nest: rest and raise the next generation." },
  { name: "Fern crossroads", color: 0x203d30, left: 0, right: 2, branch: 4, hint: "E at the vine arch: take the upper trail. Walk east for the stone passage." },
  { name: "Stone passage", color: 0x393c36, left: 1, right: 3, branch: -1, hint: "Bite the cracked wall: strength 4. Open passages remain open across lives." },
  { name: "Sunken orchard", color: 0x214955, left: 2, right: 5, branch: -1, hint: "The orchard loops around to the crown. Floods shelter grazers here." },
  { name: "Claw ascent", color: 0x384333, left: 1, right: 5, branch: -1, hint: "The high wall needs inherited climbing claws. Hold W against it to climb." },
  { name: "Crown clearing", color: 0x49402e, left: 3, right: -1, branch: 4, hint: "Reach the ancient seed at the far right. Fight, hide or use the hanging stone." },
] as const;
export function evidence(): Evidence { return { fights: 0, sneaks: 0, solves: 0, jumps: 0, plants: 0, meat: 0, cliff: false }; }
export function newGarden(diet = "omnivore"): Garden {
  return { generation: 1, traits: { strength: 2, vitality: 0, climb: false, diet }, climate: "flood", opened: [], visited: [0], history: [] };
}
export function offspring(g: Garden, e: Evidence): Heir[] {
  const cap = (n: number) => Math.min(GEN.maxStat, n);
  const t = g.traits;
  const jawGain = 2 + (e.fights >= 3 || e.rootVerdict === "fight" ? 1 : 0);
  const enduranceGain = 2 + (e.sneaks > 0 || e.plants >= 3 ? 1 : 0);
  return waterOffspring(g, [
    { name: "Stonejaw", traits: { ...t, strength: cap(t.strength + jawGain) }, cause: `Strong-jaw variation: +${jawGain} strength${e.rootVerdict === "fight" ? "; defeating Snapfrond with a recovery bite added +1" : e.fights >= 3 ? "; repeated biting added +1" : "; 3 successful bites would add +1"}.` },
    { name: "Vinefoot", traits: { ...t, climb: t.climb || e.cliff || e.jumps >= 3, vitality: cap(t.vitality + 1) }, cause: e.cliff || e.jumps >= 3 || t.climb ? "Cliff exploration and leaping favored climbing claws; +1 vitality." : "Explore the cliff or make 3 jumps to favor climbing claws; +1 vitality." },
    { name: "Mossheart", traits: { ...t, vitality: cap(t.vitality + enduranceGain), strength: cap(t.strength + (e.solves > 0 ? 1 : 0)) }, cause: `+${enduranceGain} vitality: ${e.sneaks} unseen passages, ${e.plants} plants.${e.rootVerdict === "sneak" ? " You crossed Root Lane unseen." : ""}${e.rootVerdict === "trap" ? " Stopping Snapfrond with bait adds +1 strength." : e.solves > 0 ? " Trap-solving adds +1 strength." : " Solve a trap for +1 strength."}` },
  ]);
}
export function inherit(g: Garden, heir: Heir, climate: Climate): Garden {
  return { ...g, generation: g.generation + 1, traits: { ...heir.traits }, climate,
    history: [...g.history, `Generation ${g.generation + 1}: ${heir.name}. ${heir.cause} Gardener chose ${climate}.`] };
}
export function edible(diet: string, meat: boolean): boolean { return diet === "omnivore" || (meat ? diet === "carnivore" : diet === "herbivore"); }
/** Resume only the same incoming lineage. Legacy checkpoints retain progress when their diet agrees. */
export function resumeGarden(saved: unknown, diet: string, source: string): Garden {
  const old = readGarden(saved);
  // Toy 2 encoded an absent standalone home as null/undefined. Its own hero write materializes
  // the default home, which must not be mistaken for a different upstream lineage.
  const legacyStandalone = JSON.stringify([null, diet, null, null, null]);
  const migrateStandalone = old?.source === legacyStandalone && source === creatureSource(undefined, diet);
  const matches = old && old.traits.diet === diet && (old.source === undefined || old.source === source || migrateStandalone);
  return { ...(matches ? old : newGarden(diet)), source };
}
/** Only upstream biology identifies a world; default-home materialization and this stage's hero are irrelevant. */
export function creatureSource(previous: unknown, diet: string): string {
  const home = refreshLineage(previous)?.species[0];
  return JSON.stringify([home?.id ?? "home", diet, home?.stages.cell ?? null, home?.stages.aquatic ?? null,
    home?.influence.filter(e => e.stage === "cell" || e.stage === "aquatic") ?? []]);
}
/** Defensive parser: malformed prototype saves safely start a fresh garden. */
export function readGarden(v: unknown): Garden | null {
  if (!v || typeof v !== "object") return null;
  const g = v as Garden;
  if (g.expedition !== undefined && !validExpedition(g.expedition)) return null;
  if (g.traits && [g.traits.gills, g.traits.fins].some(v => v !== undefined && typeof v !== "boolean")) return null;
  if (g.traits && !validClassSkills(g.traits.classSkills)) return null;
  if (g.source !== undefined && typeof g.source !== "string") return null;
  if (!Number.isInteger(g.generation) || g.generation < 1 || !g.traits || !["drought", "flood"].includes(g.climate)) return null;
  if (![g.traits.strength, g.traits.vitality].every(n => Number.isInteger(n) && n >= 0 && n <= GEN.maxStat) || typeof g.traits.climb !== "boolean" || !["herbivore", "carnivore", "omnivore"].includes(g.traits.diet)) return null;
  if (![g.opened, g.visited].every(a => Array.isArray(a) && a.every(n => Number.isInteger(n) && n >= 0 && n < ROOMS.length)) || !Array.isArray(g.history) || !g.history.every(s => typeof s === "string")) return null;
  return structuredClone(g);
}
// ---------------------------------------------------------------------------
