// ---------------------------------------------------------------------------
// record.ts (creature)
// Purpose : What the creature stage writes into the lineage when the Old Horn falls (BAMF69 2026-11-09): each
//           level's result becomes a cause ("Cleared Fernwood: 3 of 5 obstacles by stealth", leaning each way by the
//           obstacles passed that way), the boss counts triple, and the parts used most become inherited traits
//           (docs/stages/03-creature.md "Parts: temporary powers that become traits").
// Usage   : const { causes, block, harshness } = creatureRecord(levels, parts, prevHarshness, mapHarshness)
// Notes   : Pure, tested in tests/creature.test.ts. Replaying a level replaces its result (the scene keeps the last).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import type { StageCause, Temperament } from "../../core/lineage";
import type { Way } from "./level";
import { CR } from "./tuning";
import { WAY_TEMPER, type Verdict } from "./ways";

export const CR_RECORD = { bossWeight: 3, traitUses: 3, traitLean: 0.02 };
const PART_LEAN: Record<string, keyof Temperament> = { claws: "aggressive", camo: "cautious" };

export interface LevelResult { cause: string; counts: Record<Verdict, number>; boss: boolean }

export function creatureRecord(levels: Record<string, LevelResult>, parts: Record<string, number>, prevHarshness: number, mapHarshness: number):
  { causes: StageCause[]; block: Record<string, unknown>; harshness: number; traits: string[] } {
  const causes: StageCause[] = [];
  for (const r of Object.values(levels)) {
    const effect: Partial<Temperament> = {};
    for (const w of ["fight", "puzzle", "stealth"] as Way[]) {
      const n = r.counts[w] * (r.boss ? CR_RECORD.bossWeight : 1);
      if (n) effect[WAY_TEMPER[w]] = (effect[WAY_TEMPER[w]] ?? 0) + n * CR.temperPerObstacle;
    }
    causes.push({ cause: r.cause, effect });
  }
  const traits = Object.entries(parts).filter(([, n]) => n >= CR_RECORD.traitUses).map(([p]) => p);
  for (const p of traits) causes.push({ cause: `Used ${p} ${parts[p]} times: ${p} are now inherited`, effect: PART_LEAN[p] ? { [PART_LEAN[p]]: CR_RECORD.traitLean } : {} });
  const harshness = Math.max(0, Math.min(1, prevHarshness + mapHarshness));
  return { causes, traits, harshness, block: { levels: Object.fromEntries(Object.entries(levels).map(([id, r]) => [id, r.counts])), traits, partsUsed: { ...parts } } };
}
