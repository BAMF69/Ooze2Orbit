// ---------------------------------------------------------------------------
// creatureIcons.ts (creature)
// Purpose : Inked SVG symbols for the creature stage's equipped traits and banked discoveries, drawn in the same
//           style as the shared uiIcons.ts (80x80 view box, dark outline, flat fills) so the HUD rack matches the
//           cell stage's equipment row (BAMF69 2026-11-17: "parts icons in the top right like the previous stages").
// Usage   : creatureIcon("gills") -> SVGSVGElement ; equipmentRows(traits, expedition) -> what the rack shows
// Notes   : Creature-local so the shared icon module stays untouched; the class "ui-symbol" reuses its sizing CSS.
// Authored: Written with Claude (Opus 5.5).
// ---------------------------------------------------------------------------
import type { Traits } from "./generations";
import type { Expedition } from "./expedition";

export type CreatureIcon = "gills" | "fins" | "climb" | "roar" | "burrow" | "tool" | "fullArmor" | "iceBreath";
const paths: Record<CreatureIcon, string> = {
  gills: '<ellipse cx="40" cy="40" rx="28" ry="24" fill="#75c8bd"/><path fill="none" d="M30 26Q38 40 30 54M41 24Q49 40 41 56M52 27Q59 40 52 53"/>',
  fins: '<path fill="#82ccdc" d="M10 52Q24 14 64 12Q52 30 70 50Q42 46 10 52Z"/><path fill="none" d="M22 46Q34 30 54 20M30 49Q42 38 60 32"/>',
  climb: '<path fill="#b1e5ba" d="M14 64Q20 30 40 22Q60 30 66 64Z"/><path fill="#f5e5af" d="M22 26L18 8L32 22M38 20L40 4L46 20M54 22L64 8L60 28"/>',
  roar: '<path fill="#e3a46b" d="M12 30H30L52 12V68L30 50H12Z"/><path fill="none" d="M60 26Q70 40 60 54M66 18Q80 40 66 62"/>',
  burrow: '<path fill="#a98c62" d="M8 66Q12 40 40 36Q68 40 72 66Z"/><ellipse cx="40" cy="56" rx="14" ry="10" fill="#3a2a22"/><path fill="none" d="M24 30L30 18M40 26V10M56 30L50 18"/>',
  tool: '<path fill="#c79c62" d="M14 60L52 22L60 30L22 68Z"/><path fill="#9fd0c4" d="M50 12Q66 6 70 22L62 30L50 18Z"/>',
  fullArmor: '<path fill="#9aa9b6" d="M40 8L68 18V40Q62 64 40 74Q18 64 12 40V18Z"/><path fill="none" d="M40 14V68M16 32H64M18 48H62"/>',
  iceBreath: '<path fill="#bfe8f2" d="M40 6L48 30L72 32L52 46L60 72L40 56L20 72L28 46L8 32L32 30Z"/><path fill="none" d="M40 22V54M28 38H52"/>',
};
export function creatureIcon(name: CreatureIcon): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 80 80");
  svg.setAttribute("aria-hidden", "true"); svg.classList.add("ui-symbol");
  svg.innerHTML = `<g stroke="#0a2634" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</g>`;
  return svg;
}
export interface RackItem { icon: CreatureIcon; label: string }
const INFO: Record<CreatureIcon, string> = {
  gills: "Gills · breathe underwater without running out of air. Opens Medium.",
  fins: "Swimming fins · swim fast enough to beat the diverted torrent. With gills, opens Hard.",
  climb: "Climbing claws · inherited from an earlier lineage.",
  roar: "Roar (aggressive class) · shatters calcite seals.", burrow: "Burrow (cautious class) · digs through silt dens.",
  tool: "Tool use (adaptable class) · levers driftwood across chasms.",
  fullArmor: "Full armor plating (banked) · a fun part found in a grotto. Its ability comes in a later update.",
  iceBreath: "Ice breath (banked) · a fun part found in a grotto. Its ability comes in a later update.",
};
/** Equipped: what this body expresses now. Banked: discovered for daughters but not in this body yet. */
export function equipmentRows(t: Traits, e: Expedition): { equipped: RackItem[]; banked: RackItem[] } {
  const equipped: RackItem[] = [];
  if (t.gills) equipped.push({ icon: "gills", label: INFO.gills });
  if (t.fins) equipped.push({ icon: "fins", label: INFO.fins });
  if (t.climb) equipped.push({ icon: "climb", label: INFO.climb });
  for (const c of t.classSkills ?? []) equipped.push({ icon: c, label: INFO[c] });
  const banked: RackItem[] = [];
  for (const a of e.unlocked) {
    if ((a === "gills" || a === "fins") && t[a]) continue;
    banked.push({ icon: a, label: a === "gills" || a === "fins" ? `${INFO[a].split(" · ")[0]} (banked) · choose ${a === "gills" ? "Tidefoot" : "Reedheart"} at the nest to express it.` : INFO[a] });
  }
  return { equipped, banked };
}
