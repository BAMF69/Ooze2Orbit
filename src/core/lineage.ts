// ---------------------------------------------------------------------------
// lineage.ts
// Purpose : The lineage file every stage reads and writes (docs/HANDOFF_CONTRACT.md): the species, their temperament
//           and the cause log that explains it, plus the temperament maths, including the per-stage shift cap.
// Usage   : const t = temperamentOf(species.influence)            // what the cause log adds up to, cap applied
//           const r = stageRange(t)                                // how far the next stage may move it
//           shipSpecialty(t)                                       // "shields" | "weapons" | "engines"
// Notes   : No Phaser import (Vitest runs it). Shared by all stages, so it lives in core, not under one stage.
//           Temperament only changes through the cause log (contract rule 1): nothing here sets it directly.
//           The shift cap (BAMF69 2026-11-08): the first stage (cell) sets each temperament freely, 0 to 1; every
//           later stage can move it at most STAGE_SHIFT_CAP away from where the stage before left it. A 100 %
//           aggressive cell can be 50 % aggressive at the end of the aquatic stage at the least, 0 % after the creature stage.
//
// Pseudocode (temperamentOf):
//   t = null
//   for each stage in order: entries = that stage's causes
//     cell: t = clamp01(sum of entries)
//     later stage that has entries: t = clamp(t + sum, t - cap .. t + cap, then 0 .. 1)
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

/** Contract version: bump it and add a migration when the shape below changes. */
export const LINEAGE_SCHEMA = 1;
/** Most one stage can move a temperament from where the stage before left it (0..1 scale). */
export const STAGE_SHIFT_CAP = 0.5;

export const STAGES = ["cell", "aquatic", "creature", "civ", "space"] as const; // "creature" was "land" until 2026-11-09
export type StageId = (typeof STAGES)[number];

export const TEMPERAMENTS = ["cautious", "aggressive", "adaptable"] as const;
export type TemperamentKind = (typeof TEMPERAMENTS)[number];
export type Temperament = Record<TemperamentKind, number>;

/** What each temperament builds in the space stage (approved by BAMF69 2026-11-08). */
export const SHIP_TECH: Readonly<Record<TemperamentKind, "shields" | "weapons" | "engines">> = {
  cautious: "shields", aggressive: "weapons", adaptable: "engines",
};

/** One line of the cause log: why a temperament moved, in words the player can read. */
export interface Influence {
  stage: StageId;
  cause: string;
  effect: Partial<Temperament>;
}

export interface Species {
  id: string;
  name: string;
  world: string;
  origin: "played" | "default" | "generated";
  status: "alive" | "extinct";
  diet: string;
  branches: unknown[];
  stages: Partial<Record<StageId, Record<string, unknown>>>;
  influence: Influence[];
  /** Cached from the cause log for readers in other engines; temperamentOf(influence) is the truth. */
  temperament: Temperament;
  [extra: string]: unknown; // contract rule 3: keep what you do not understand
}

export interface Lineage {
  schemaVersion: number;
  lastStage: StageId;
  gardener: { harshness: number };
  species: Species[];
  [extra: string]: unknown;
}

export const zeroTemperament = (): Temperament => ({ cautious: 0, aggressive: 0, adaptable: 0 });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The lowest and highest each temperament may reach by the end of the next stage. */
export function stageRange(from: Temperament): Record<TemperamentKind, { min: number; max: number }> {
  const out = {} as Record<TemperamentKind, { min: number; max: number }>;
  for (const k of TEMPERAMENTS) {
    out[k] = { min: clamp(from[k] - STAGE_SHIFT_CAP, 0, 1), max: clamp(from[k] + STAGE_SHIFT_CAP, 0, 1) };
  }
  return out;
}

/** One stage's result: `from` is where the stage before left it (null for the first stage), `entries` this stage's causes. */
export function stageTemperament(from: Temperament | null, entries: readonly Influence[]): Temperament {
  const sum = zeroTemperament();
  for (const e of entries) for (const k of TEMPERAMENTS) sum[k] += e.effect[k] ?? 0;
  const out = zeroTemperament();
  if (from === null) {
    for (const k of TEMPERAMENTS) out[k] = clamp(sum[k], 0, 1);
    return out;
  }
  const range = stageRange(from);
  for (const k of TEMPERAMENTS) out[k] = clamp(from[k] + sum[k], range[k].min, range[k].max);
  return out;
}

/** The temperament the whole cause log adds up to, stage by stage, with the shift cap applied at each stage. */
export function temperamentOf(influence: readonly Influence[]): Temperament {
  let t: Temperament | null = null;
  for (const stage of STAGES) {
    const entries = influence.filter((e) => e.stage === stage);
    if (t !== null && entries.length === 0) continue; // a stage with no causes leaves it where it was
    t = stageTemperament(t, entries);
  }
  return t ?? zeroTemperament();
}

/** The strongest temperament and the ship tech it builds (ties: cautious, then aggressive, then adaptable). */
export function shipSpecialty(t: Temperament): { kind: TemperamentKind; tech: (typeof SHIP_TECH)[TemperamentKind] } {
  let kind: TemperamentKind = TEMPERAMENTS[0];
  for (const k of TEMPERAMENTS) if (t[k] > t[kind]) kind = k;
  return { kind, tech: SHIP_TECH[kind] };
}

/** "cautious 20 %, aggressive 100 %, adaptable 35 %": for logs and the ?debug readout. */
export function describeTemperament(t: Temperament): string {
  return TEMPERAMENTS.map((k) => `${k} ${Math.round(t[k] * 100)} %`).join(", ");
}

/** Light shape check for a lineage read back from a save (fail loudly with what is wrong). */
export function lineageProblems(v: unknown): string[] {
  const p: string[] = [];
  if (typeof v !== "object" || v === null) return ["not an object"];
  const l = v as Partial<Lineage>;
  if (l.schemaVersion !== LINEAGE_SCHEMA) p.push(`schemaVersion ${String(l.schemaVersion)} (expected ${LINEAGE_SCHEMA})`);
  if (!STAGES.includes(l.lastStage as StageId)) p.push(`lastStage ${String(l.lastStage)}`);
  if (!Array.isArray(l.species) || l.species.length === 0) p.push("no species");
  else for (const s of l.species) if (!Array.isArray(s?.influence)) p.push(`species ${String(s?.id)} has no influence log`);
  return p;
}
