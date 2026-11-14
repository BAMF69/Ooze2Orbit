// ---------------------------------------------------------------------------
// division.ts
// Purpose : Seeded variation, inheritance and plain-word causes for cell daughters.
// Usage   : daughters(parentAfterGrowth, evidence, rng); record the chosen result.
// Notes   : PROTOTYPE: inherit collected parts, bought stats and unspent points; add division-only perks.
// Authored: Written with Codex (GPT-6)
// ---------------------------------------------------------------------------
import { changeDiet, type Creature } from "./rules";
import { grantPerk, PERKS, type Perk } from "./perks";
import { DIETS, TUNING, UPGRADE_STATS, type PartKind, type UpgradeStat } from "./tuning";

export interface Evidence { algae: number; meat: number; rams: number; escapes: number; lures: number }
export const newEvidence = (): Evidence => ({ algae: 0, meat: 0, rams: 0, escapes: 0, lures: 0 });
export interface Daughter { creature: Creature; stat: UpgradeStat; gain: number; cause: string; perk: Perk }

/** Bound each behavior's contribution so repetition never guarantees an outcome. */
export function variationWeights(e: Evidence): Record<UpgradeStat, number> {
  const w = (n: number) => 1 + Math.min(TUNING.division.evidenceCap, Math.sqrt(Math.max(0, n))) * TUNING.division.evidenceWeight;
  return { attack: w(e.meat + e.rams), defense: w(e.algae + e.escapes), speed: w(e.meat + e.escapes), mobility: w(e.algae + e.lures) };
}

/** Pseudocode: weight all stats -> sample without replacement -> offer one of each diet, inherit compatible parts, vary one stat.
 * Distinct offers keep the choice meaningful; each trait remains possible regardless of behavior. */
export function daughters(parent: Creature, e: Evidence, random: () => number): Daughter[] {
  const weights = variationWeights(e);
  const available: UpgradeStat[] = [...UPGRADE_STATS];
  const reasons: Record<UpgradeStat, string> = {
    attack: e.rams + e.meat > 0 ? "You fought or ate meat; stronger jaws were likelier." : "A chance variation in jaw strength.",
    defense: e.algae + e.escapes > 0 ? "You grazed or escaped hunters; protection was likelier." : "A chance variation in protection.",
    speed: e.meat + e.escapes > 0 ? "Meat and escapes favored faster swimmers." : "A chance variation in swimming speed.",
    mobility: e.algae + e.lures > 0 ? "Grazing and luring hunters favored nimble swimmers." : "A chance variation in handling.",
  };
  return DIETS.map((diet, daughterIndex) => {
    const { creature: inherited, dropped } = changeDiet(parent, diet);
    // Division rewards can exceed the purchase cap; all stats remain eligible.
    const pool = available;
    let roll = random() * pool.reduce((sum, s) => sum + weights[s], 0);
    let stat = pool[pool.length - 1];
    for (const candidate of pool) { roll -= weights[candidate]; if (roll < 0) { stat = candidate; break; } }
    available.splice(available.indexOf(stat), 1);
    const gain = TUNING.division.statGain;
    const part: PartKind | undefined = ({ attack: "spikes", defense: "shell", mobility: "mouth" } as Partial<Record<UpgradeStat, PartKind>>)[stat];
    const growsPart = part && !inherited.parts.includes(part) && inherited.parts.length < Math.min(parent.form, TUNING.maxSlots) && !(part === "mouth" && diet === "carnivore");
    const parts = growsPart ? [...inherited.parts, part] : inherited.parts;
    const perk = PERKS[daughterIndex];
    const creature = grantPerk({ ...inherited, parts, ups: { ...parent.ups, [stat]: parent.ups[stat] + gain } }, perk);
    return { stat, gain, perk, cause: reasons[stat] +
      (growsPart ? ` Grows ${part}.` : "") + (dropped.length ? " Sheds the filter mouth for meat diet." : ""), creature };
  });
}
