// Purpose: Creature-owned progression, Gardener mutations, adaptation causes and backward-compatible saves.
// Usage: attachExpedition at entry; discover/completeLevel/intervene during a life; offspring reads unlocks.
// Notes: Persistent terrain differs from temporary weather. Unknown save fields survive all updates.
// Authored: Written with Codex (GPT-6).
import type { Garden, Traits, Climate } from "./generations";
import { WATER, DIFFICULTIES, ADAPTATIONS, type Adaptation, type Difficulty } from "./waterWorld";
export interface Expedition {
  version: 1; seed: number; unlocked: Adaptation[]; completed: Difficulty[]; visited: number[];
  basinRaised: boolean; torrentDiverted: boolean; interventions: string[];
}
export const freshExpedition = (seed: number): Expedition => ({ version: 1, seed: seed >>> 0,
  unlocked: [], completed: [], visited: [], basinRaised: false, torrentDiverted: false, interventions: [] });

export function validExpedition(v: unknown): v is Expedition {
  if (!v || typeof v !== "object") return false;
  const e = v as Expedition;
  return e.version === 1 && Number.isInteger(e.seed) && e.seed >= 0 && e.seed <= 0xffffffff &&
    typeof e.basinRaised === "boolean" && typeof e.torrentDiverted === "boolean" &&
    Array.isArray(e.unlocked) && e.unlocked.every(a => ADAPTATIONS.includes(a)) &&
    Array.isArray(e.completed) && e.completed.every(a => DIFFICULTIES.includes(a)) &&
    Array.isArray(e.visited) && e.visited.every(id => Number.isInteger(id) && id >= 0 && id < 11) &&
    Array.isArray(e.interventions) && e.interventions.every(s => typeof s === "string");
}

/** A migrated Toy 2 garden retains stats/history. Only a genuinely new world takes aquatic starting parts. */
export function attachExpedition(g: Garden, seed: number, aquaticParts: unknown): Garden {
  if (g.expedition) return g;
  const parts = Array.isArray(aquaticParts) ? aquaticParts.filter(p => typeof p === "string") : [];
  return { ...g, expedition: freshExpedition(seed), traits: { ...g.traits,
    gills: g.traits.gills || parts.includes("gills"), fins: g.traits.fins || parts.includes("fins") || parts.includes("torrent") } };
}
export function levelLock(tier: Difficulty, t: Traits): string | null {
  if (tier !== "easy" && !t.gills) return "Needs inherited gills. Discover them at the end of Easy, then choose Tidefoot at the nest.";
  if (tier === "hard" && !t.fins) return "Needs inherited swimming fins. Explore Easy's nursery branch, then choose Reedheart at the nest.";
  return null;
}
const DISCOVERY_TEXT: Record<Adaptation, string> = { gills: "the breathing reef; gills", fins: "the ripplefin nursery; swimming fins",
  fullArmor: "a hidden grotto; full armor plating", iceBreath: "a hidden grotto; ice breath" };
export function discover(g: Garden, adaptation: Adaptation): Garden {
  const e = g.expedition!;
  if (e.unlocked.includes(adaptation)) return g;
  return { ...g, expedition: { ...e, unlocked: [...e.unlocked, adaptation] },
    history: [...g.history, `G${g.generation}: explored ${DISCOVERY_TEXT[adaptation]} can now appear in daughters.`] };
}
export function completeLevel(g: Garden, tier: Difficulty): Garden {
  const e = g.expedition!;
  return e.completed.includes(tier) ? g : { ...g, expedition: { ...e, completed: [...e.completed, tier] },
    history: [...g.history, `G${g.generation}: completed Water ${tier}.`] };
}
export type Intervention = "raise" | "divert";
export function interventionLock(g: Garden, intervention: Intervention): string | null {
  const e = g.expedition!;
  if (intervention === "raise") return e.basinRaised ? "The basin is already raised." : null;
  if (!e.basinRaised) return "Raise the basin before diverting its torrent.";
  return e.torrentDiverted ? "The spillway is already diverted." : null;
}
export function intervene(g: Garden, intervention: Intervention): Garden {
  if (interventionLock(g, intervention)) return g;
  const e = g.expedition!, cause = intervention === "raise" ? "Gardener raised the basin: log sluices float open and swimming routes fill." : "Gardener diverted the torrent: upstream passages become swimmable with fins.";
  return { ...g, expedition: { ...e, basinRaised: e.basinRaised || intervention === "raise",
    torrentDiverted: e.torrentDiverted || intervention === "divert", interventions: [...e.interventions, cause] },
    history: [...g.history, `G${g.generation}: ${cause}`] };
}
export interface Weather { climate: Climate; remaining: number }
export const weatherEvent = (climate: Climate): Weather => ({ climate, remaining: WATER.weatherSeconds });
export function stepWeather(weather: Weather, dt: number): Weather {
  return { ...weather, remaining: Math.max(0, weather.remaining - dt) };
}
export function effectiveClimate(g: Garden, w: Weather): Climate { return w.remaining > 0 ? w.climate : g.climate; }
export function waterOffspring(g: Garden, heirs: import("./generations").Heir[]): import("./generations").Heir[] {
  const e = g.expedition; if (!e) return heirs;
  const [jaw, foot, heart] = heirs;
  return [jaw, { ...foot, name: "Tidefoot", traits: { ...foot.traits, gills: !!g.traits.gills || e.unlocked.includes("gills") },
    cause: foot.cause + (e.unlocked.includes("gills") ? " Breathing-reef discovery favors gills: this daughter can breathe underwater." : g.traits.gills ? " Retains ancestral gills." : " Explore Easy's breathing reef to unlock gills.") },
  { ...heart, name: "Reedheart", traits: { ...heart.traits, fins: !!g.traits.fins || e.unlocked.includes("fins") },
    cause: heart.cause + (e.unlocked.includes("fins") ? " Nursery exploration favors swimming fins: this daughter can push upstream." : g.traits.fins ? " Retains ancestral fins." : " Explore Easy's nursery branch to unlock swimming fins.") }];
}
