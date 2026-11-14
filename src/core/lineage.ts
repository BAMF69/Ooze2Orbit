// ---------------------------------------------------------------------------
// lineage.ts
// Purpose : The lineage file every stage reads and writes (docs/HANDOFF_CONTRACT.md): the species, their temperament
//           and the cause log that explains it, plus the temperament maths, including the per-stage shift cap.
// Usage   : const t = temperamentOf(species.influence)            // what the cause log adds up to, cap applied
//           const r = stageRange(t)                                // how far the next stage may move it
//           shipSpecialty(t)                                       // "shields" | "weapons" | "engines"
// Notes   : No Phaser import (Vitest runs it). Shared by all stages, so it lives in core, not under one stage.
//           Temperament only changes through the cause log (contract rule 1): nothing here sets it directly.
//           Shares sum to 1 (BAMF69 2026-11-13); the cell stage normalizes raw evidence. Every
//           later stage can move it at most STAGE_SHIFT_CAP away from where the stage before left it. A 100 %
//           aggressive cell can be 50 % aggressive at the end of the aquatic stage at the least, 0 % after the creature stage.
//
// Pseudocode (temperamentOf):
//   t = null
//   for each stage in order: entries = that stage's causes
//     cell: normalize positive evidence into three shares (no independent saturation)
//     later: normalize(previous + stage evidence), then limit the move to 50 percentage points
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

/** Contract version: bump it and add a migration when the shape below changes. */
export const LINEAGE_SCHEMA = 1;
/** Most a later stage can move one share: 0.5 = 50 percentage points. */
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

/** One line of evidence: pressures toward/away from shares, not guaranteed percentage-point gains. */
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
export const balancedTemperament = (): Temperament => ({ cautious: 1 / 3, aggressive: 1 / 3, adaptable: 1 / 3 });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Evidence is relative, not three independent meters. Zero evidence means a balanced lineage. */
export function normalizeTemperament(raw: Temperament): Temperament {
  const out = zeroTemperament();
  for (const k of TEMPERAMENTS) out[k] = Number.isFinite(raw[k]) ? Math.max(0, raw[k]) : 0;
  const largest = Math.max(...Object.values(out));
  if (!largest) return balancedTemperament();
  for (const k of TEMPERAMENTS) out[k] /= largest;
  const total = TEMPERAMENTS.reduce((n, k) => n + out[k], 0);
  for (const k of TEMPERAMENTS) out[k] /= total;
  return out;
}

/** Largest-remainder rounding makes the three displayed integer percentages total exactly 100. */
export function temperamentPercentages(t: Temperament): Temperament {
  const shares = normalizeTemperament(t), out = zeroTemperament();
  for (const k of TEMPERAMENTS) out[k] = Math.floor(shares[k] * 100);
  const order = [...TEMPERAMENTS].sort((a, b) => (shares[b] * 100 - out[b]) - (shares[a] * 100 - out[a]));
  const remainder = 100 - TEMPERAMENTS.reduce((n, k) => n + out[k], 0);
  for (let n = 0; n < remainder; n++) out[order[n % order.length]]++;
  return out;
}

/** The lowest and highest each temperament may reach by the end of the next stage. */
export function stageRange(from: Temperament): Record<TemperamentKind, { min: number; max: number }> {
  from = normalizeTemperament(from);
  const out = {} as Record<TemperamentKind, { min: number; max: number }>;
  for (const k of TEMPERAMENTS) {
    out[k] = { min: clamp(from[k] - STAGE_SHIFT_CAP, 0, 1), max: clamp(from[k] + STAGE_SHIFT_CAP, 0, 1) };
  }
  return out;
}

/** One stage's result: `from` is where the stage before left it (null for the first stage), `entries` this stage's causes. */
export function stageTemperament(from: Temperament | null, entries: readonly Influence[]): Temperament {
  const sum = zeroTemperament();
  for (const e of entries) for (const k of TEMPERAMENTS) {
    const v = e.effect[k] ?? 0; if (Number.isFinite(v)) sum[k] += v;
  }
  if (from === null) return normalizeTemperament(sum);
  const previous = normalizeTemperament(from), desired = zeroTemperament();
  for (const k of TEMPERAMENTS) desired[k] = previous[k] + sum[k];
  const target = normalizeTemperament(desired);
  // Interpolate the whole distribution together: independent clamps would break the 100% total.
  const largestMove = Math.max(...TEMPERAMENTS.map(k => Math.abs(target[k] - previous[k])));
  const fraction = largestMove > STAGE_SHIFT_CAP ? STAGE_SHIFT_CAP / largestMove : 1;
  for (const k of TEMPERAMENTS) desired[k] = previous[k] + (target[k] - previous[k]) * fraction;
  return desired;
}

/** The temperament the whole cause log adds up to, stage by stage, with the shift cap applied at each stage. */
export function temperamentOf(influence: readonly Influence[]): Temperament {
  let t: Temperament | null = null;
  for (const stage of STAGES) {
    const entries = influence.filter((e) => e.stage === stage);
    if (t !== null && entries.length === 0) continue; // a stage with no causes leaves it where it was
    t = stageTemperament(t, entries);
  }
  return t ?? balancedTemperament();
}

/** The strongest temperament and the ship tech it builds (ties: cautious, then aggressive, then adaptable). */
export function shipSpecialty(t: Temperament): { kind: TemperamentKind; tech: (typeof SHIP_TECH)[TemperamentKind] } {
  let kind: TemperamentKind = TEMPERAMENTS[0];
  for (const k of TEMPERAMENTS) if (t[k] > t[kind]) kind = k;
  return { kind, tech: SHIP_TECH[kind] };
}

/** One 100% distribution, for logs and the debug readout. */
export function describeTemperament(t: Temperament): string {
  const pct = temperamentPercentages(t);
  return TEMPERAMENTS.map((k) => `${k} ${pct[k]} %`).join(", ");
}

/** Light shape check for a lineage read back from a save (fail loudly with what is wrong). */
export function lineageProblems(v: unknown): string[] {
  const p: string[] = [];
  if (typeof v !== "object" || v === null) return ["not an object"];
  const l = v as Partial<Lineage>;
  if (l.schemaVersion !== LINEAGE_SCHEMA) p.push(`schemaVersion ${String(l.schemaVersion)} (expected ${LINEAGE_SCHEMA})`);
  if (!STAGES.includes(l.lastStage as StageId)) p.push(`lastStage ${String(l.lastStage)}`);
  if (!Array.isArray(l.species) || l.species.length === 0) p.push("no species");
  else for (const s of l.species) {
    if (!Array.isArray(s?.influence)) p.push(`species ${String(s?.id)} has no influence log`);
    else if (s.influence.some(e => !e || typeof e !== "object" || !STAGES.includes(e.stage) || !e.effect || typeof e.effect !== "object" ||
      TEMPERAMENTS.some(k => e.effect[k] !== undefined && (typeof e.effect[k] !== "number" || !Number.isFinite(e.effect[k]))))) p.push(`species ${String(s.id)} has invalid influence`);
  }
  return p;
}

/** Rebuild derived caches on old saves as well as new ones; never change evidence or unknown fields. */
export function refreshLineage(v: unknown): Lineage | null {
  if (lineageProblems(v).length) return null;
  const next = JSON.parse(JSON.stringify(v)) as Lineage;
  for (const s of next.species) s.temperament = temperamentOf(s.influence);
  return next;
}

// ---- writing a later stage into the lineage (BAMF69 2026-11-09: every stage's decisions shape the lineage) ----
export interface StageCause { cause: string; effect: Partial<Temperament> }

/** A lineage to start from when there is none (or it is unreadable): one default species, no causes. */
export function defaultLineage(): Lineage {
  const home: Species = {
    id: "home", name: "", world: "home", origin: "default", status: "alive", diet: "omnivore", branches: [],
    stages: {}, influence: [], temperament: balancedTemperament(),
  };
  return { schemaVersion: LINEAGE_SCHEMA, lastStage: "cell", gardener: { harshness: 0 }, species: [home] };
}

/**
 * Write one stage's result into the lineage: its block, its causes (replacing any it wrote before, so replaying a
 * stage does not count twice), the temperament they add up to (with the shift cap), lastStage, and the Gardener's
 * harshness (a value to set, 0..1, or undefined to keep it). Pure: returns a new lineage; a bad `prev` starts fresh.
 */
export function writeStage(prev: unknown, stage: StageId, causes: readonly StageCause[], block: Record<string, unknown>, harshness?: number): Lineage {
  const base: Lineage = lineageProblems(prev).length ? defaultLineage() : (JSON.parse(JSON.stringify(prev)) as Lineage);
  const home = base.species[0];
  const influence = [...home.influence.filter((e) => e.stage !== stage), ...causes.filter((c) => Object.values(c.effect).some((v) => (v ?? 0) !== 0)).map((c) => ({ stage, cause: c.cause, effect: c.effect }))];
  const diet = typeof block.diet === "string" && ["herbivore", "carnivore", "omnivore"].includes(block.diet) ? block.diet : home.diet;
  const species: Species = { ...home, diet, influence, stages: { ...home.stages, [stage]: block }, temperament: temperamentOf(influence) };
  const h = harshness === undefined ? base.gardener.harshness : clamp(harshness, 0, 1);
  return { ...base, lastStage: stage, gardener: { ...base.gardener, harshness: h }, species: [species, ...base.species.slice(1)] };
}
