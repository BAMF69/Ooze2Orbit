// Pure aquatic inheritance: food evidence biases three distinct bonus stats; one daughter per diet.
import { maxHp, maxStamina, slots, type AqCreature, type Diet } from "./creature";
import { AQ, AQ_STATS, type AqPart, type AqStat } from "./tuning";

export interface AqDaughter { creature: AqCreature; stat: AqStat; gain: number; cause: string; bonusPart?: AqPart }
const DIETS: readonly Diet[] = ["herbivore", "carnivore", "omnivore"];

export function aquaticDaughters(grown: AqCreature, random: () => number): AqDaughter[] {
  const e = grown.growthEvidence ?? { algae: 0, meat: 0 };
  const weight = (n: number) => 1 + Math.min(AQ.division.evidenceCap, Math.sqrt(Math.max(0, n))) * AQ.division.evidenceWeight;
  const weights: Record<AqStat, number> = {
    attack: weight(e.meat), speed: weight(e.meat), defense: weight(e.algae),
    mobility: weight(e.algae), health: weight(e.algae + e.meat),
  };
  const available: AqStat[] = [...AQ_STATS];
  return DIETS.map(diet => {
    let roll = random() * available.reduce((sum, stat) => sum + weights[stat], 0);
    let stat = available[available.length - 1];
    for (const s of available) { roll -= weights[s]; if (roll < 0) { stat = s; break; } }
    available.splice(available.indexOf(stat), 1);
    const gain = AQ.division.statGain;
    const part: AqPart = ({ attack: "jaws", speed: "gills", defense: "plates", mobility: "fins", health: "gills" } as const)[stat];
    const bonusPart = !grown.parts.includes(part) && grown.parts.length < slots(grown) ? part : undefined;
    const food = stat === "attack" || stat === "speed" ? e.meat : stat === "health" ? e.algae + e.meat : e.algae;
    const cause = (food > 0 ? `Your feeding favored ${stat}.` : `A chance variation in ${stat}.`) +
      (bonusPart ? ` Grows ${bonusPart}.` : "");
    const { divisionSeed: _pending, ...inherited } = grown;
    void _pending;
    let creature: AqCreature = { ...inherited, diet, parts: bonusPart ? [...grown.parts, bonusPart] : [...grown.parts],
      uniques: [...grown.uniques], points: { ...grown.points }, ups: { ...grown.ups, [stat]: grown.ups[stat] + gain },
      growthEvidence: { algae: 0, meat: 0 }, selections: [...(grown.selections ?? []),
        { form: grown.form, diet, stat, gain, cause, ...(bonusPart ? { bonusPart } : {}) }] };
    creature = { ...creature, hp: maxHp(creature), stamina: Math.min(creature.stamina, maxStamina(creature)) };
    return { creature, stat, gain, cause, ...(bonusPart ? { bonusPart } : {}) };
  });
}
