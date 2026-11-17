// ---------------------------------------------------------------------------
// guidance.ts (creature)
// Purpose : Plain-language guidance for the two playtest confusions of 2026-11-17 (BAMF69, seeds pt7 and pt15):
//           a current room that the creature cannot swim against, and a Hard gate still locked after choosing
//           Reedheart. Each message names exactly what is missing and how the lineage gets it: one adaptation per
//           daughter, kept by every later daughter, so Hard takes a Tidefoot generation and a Reedheart one.
// Usage   : currentAdvice(room, traits, expedition) ; levelAdvice(tier, traits, expedition) ;
//           heirNote(heir, garden) ; generationPlan(garden)
// Notes   : Pure. Gates themselves stay in expedition.ts (levelLock) and waterPhysics.ts; this only explains them.
// Authored: Written with Claude (Opus 5.5).
// ---------------------------------------------------------------------------
import type { Difficulty, WaterRoom } from "./waterWorld";
import type { Expedition } from "./expedition";
import type { Garden, Heir, Traits } from "./generations";

/** Why the creature cannot push upstream here, or null when it can (or the room has no current). */
export function currentAdvice(r: WaterRoom, t: Traits, e: Expedition): string | null {
  if (!r.current) return null;
  const fins = !!t.fins, diverted = e.torrentDiverted;
  if (fins && diverted) return null;
  if (!fins && !diverted) return `The torrent is too strong. Two things are needed: the Gardener must divert it (${e.basinRaised ? "Gardener → Divert torrent" : "raise the basin first, then divert the torrent"}), and your creature needs swimming fins. ${finsRoute(e)}`;
  if (!diverted) return `Your fins are not enough against the wild torrent. Open the Gardener: ${e.basinRaised ? "Divert torrent" : "raise the basin, then divert the torrent"}.`;
  return `The torrent is diverted, but this creature has no swimming fins, so the current still wins. ${finsRoute(e)}`;
}
function finsRoute(e: Expedition): string {
  return e.unlocked.includes("fins")
    ? "Fins are banked: return to the nest and choose Reedheart. She keeps every adaptation this lineage already has."
    : "Study the ripplefins in Easy's nursery, carry the sample home alive, then choose Reedheart.";
}
const LABEL = { gills: "gills", fins: "swimming fins" } as const;
/** What a level needs that this creature lacks, as one guiding message; null when the level is open. */
export function levelAdvice(tier: Difficulty, t: Traits, e: Expedition): string | null {
  const need = tier === "easy" ? [] : tier === "medium" ? ["gills"] as const : ["gills", "fins"] as const;
  const missing = need.filter(k => !t[k]);
  if (!missing.length) return null;
  const has = need.filter(k => t[k]).map(k => LABEL[k]);
  const steps = missing.map(k => e.unlocked.includes(k)
    ? `${LABEL[k]} are banked: choose ${k === "gills" ? "Tidefoot" : "Reedheart"} at the nest`
    : `discover ${LABEL[k]} in Easy (${k === "gills" ? "the reef at its end" : "the nursery up the shaft"}), carry the sample home alive, then choose ${k === "gills" ? "Tidefoot" : "Reedheart"}`);
  return `${tier[0].toUpperCase()}${tier.slice(1)} needs ${need.map(k => LABEL[k]).join(" and ")}.${has.length ? ` Your creature has ${has.join(" and ")}.` : ""} ` +
    `Next: ${steps.join("; then ")}.${missing.length > 1 ? " Each daughter adds one adaptation and keeps the ones before, so this takes two generations." : ""}`;
}
/** One line under a daughter card saying what she will and will not express. */
export function heirNote(h: Heir, g: Garden): string | null {
  const e = g.expedition; if (!e) return null;
  const k = h.name === "Tidefoot" ? "gills" : h.name === "Reedheart" ? "fins" : null;
  if (!k || g.traits[k]) return null;
  return h.traits[k] ? `She will express ${LABEL[k]}.` : `She will NOT have ${LABEL[k]}: the ${k === "gills" ? "reef" : "nursery"} sample was never carried home.`;
}
/** Shown at the nest when banked adaptations still need more generations to all appear in one body. */
export function generationPlan(g: Garden): string | null {
  const e = g.expedition; if (!e) return null;
  const pending = (["gills", "fins"] as const).filter(k => e.unlocked.includes(k) && !g.traits[k]);
  if (!pending.length) return null;
  const order = pending.map(k => k === "gills" ? "Tidefoot (gills)" : "Reedheart (fins)");
  return pending.length > 1
    ? `PLAN YOUR LINEAGE: both adaptations are banked, but each daughter adds only one and keeps the rest. Choose ${order[0]} now and ${order[1]} next generation; Hard needs both.`
    : `PLAN YOUR LINEAGE: ${order[0]} adds the last banked adaptation, and every later daughter keeps it.`;
}
