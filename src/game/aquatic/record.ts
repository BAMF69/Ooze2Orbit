// ---------------------------------------------------------------------------
// record.ts (aquatic)
// Purpose : What the aquatic stage writes into the lineage when your creature leaves the water (BAMF69 2026-11-09:
//           the later stages' opening screens show the decisions that shaped the lineage). Your play becomes causes:
//           hunting builds Aggressive, breaching builds Adaptable, losing relatives builds Cautious, each upgrade
//           leans its way, and how far the Gardener pushed the water from mild makes the Gardener harsher.
// Usage   : const { causes, block, harshness } = aquaticRecord(run, prevHarshness); writeStage(prev, "aquatic", causes, block, harshness)
// Notes   : Pure, tested in tests/aquatic.test.ts. Numbers: AQ_RECORD below. The 50 % stage cap is applied by
//           core/lineage.ts temperamentOf().
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import type { StageCause, TemperamentKind } from "../../core/lineage";
import { AQ, AQ_STATS, type AqStat } from "./tuning";

export const AQ_RECORD = {
  perKill: 0.01, killCap: 0.3,
  perBreach: 0.02, breachCap: 0.2,
  perDeath: 0.03, deathCap: 0.15,
  perUpgrade: 0.03,
  harshFromWater: 0.3, // harshness added at the most extreme average temperature
};

const UPGRADE_LEAN: Record<AqStat, TemperamentKind> = { attack: "aggressive", speed: "aggressive", defense: "cautious", health: "cautious", mobility: "adaptable" };

export interface AquaticRun {
  kills: number;
  breaches: number;
  deaths: number;
  upsGained: Record<AqStat, number>; // levels bought in this stage
  temps: number[]; // the water temperature at each generation
  form: number;
  parts: string[];
  diet: string;
}

export function aquaticRecord(r: AquaticRun, prevHarshness: number): { causes: StageCause[]; block: Record<string, unknown>; harshness: number } {
  const c = AQ_RECORD;
  const causes: StageCause[] = [];
  if (r.kills) causes.push({ cause: `Hunted ${r.kills} creatures in the water`, effect: { aggressive: Math.min(c.killCap, r.kills * c.perKill) } });
  if (r.breaches) causes.push({ cause: `Leapt from the water ${r.breaches} times`, effect: { adaptable: Math.min(c.breachCap, r.breaches * c.perBreach) } });
  if (r.deaths) causes.push({ cause: `Lost ${r.deaths} relatives to the deep and learned caution`, effect: { cautious: Math.min(c.deathCap, r.deaths * c.perDeath) } });
  for (const s of AQ_STATS) {
    const n = r.upsGained[s] ?? 0;
    if (n > 0) causes.push({ cause: `Grew ${s} ${n} time${n === 1 ? "" : "s"} in the water`, effect: { [UPGRADE_LEAN[s]]: n * c.perUpgrade } });
  }
  const span = Math.max(AQ.lens.tempMax - AQ.population.neutralTemp, AQ.population.neutralTemp - AQ.lens.tempMin);
  const extreme = r.temps.length ? r.temps.reduce((a, t) => a + Math.abs(t - AQ.population.neutralTemp), 0) / r.temps.length / span : 0;
  const harshness = Math.max(0, Math.min(1, prevHarshness + extreme * c.harshFromWater));
  const block = { form: r.form, parts: [...r.parts], diet: r.diet, kills: r.kills, breaches: r.breaches, deaths: r.deaths, generations: r.temps.length, upsGained: { ...r.upsGained } };
  return { causes, block, harshness };
}
