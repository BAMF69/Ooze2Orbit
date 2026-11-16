// ---------------------------------------------------------------------------
// stageSaves.ts
// Purpose : Pick up where you left off in the space stage (BAMF69 2026-11-10: "the space stage should be able to restore
//           in that star system with all your progress"): the whole campaign (credits, fit, fleet, what T0|▼| has
//           learned, the Lattice lock and streaks) and the star system you are in. Saves are stamped (savedAt) so the
//           main menu's Continue picks the most recently played stage (aquatic or space). The creature stage keeps
//           its own garden save (creature/generations.ts, slot creature_generations) and resumes on its own.
// Usage   : saves.save(STAGE_SLOT.space, packSpace(run, Date.now())); const r = unpackSpace(raw, startCampaign(...))
// Notes   : Pure, tested in tests/stageSaves.test.ts. Unpacking never trusts the data: it checks the shape and the ids
//           and merges over a fresh campaign (`base`), so fields added later default and a bad save is refused with a
//           reason instead of breaking the stage.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import type { TemperamentKind } from "../core/lineage";
import { ESCORT_IDS, SYSTEMS, type Campaign } from "./space/campaign";
import { HULL_IDS, PART_IDS } from "./space/fit";

export const STAGE_SLOT = { space: "space_run" } as const;
export const STAGE_V = 1;

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** When this save was made (0 if unknown or finished): the main menu continues the most recent stage. */
export const savedAt = (raw: unknown): number => (isObj(raw) && raw.finished !== true ? num(raw.savedAt, 0, 1e15, 0) : 0);

export interface SpaceRun { campaign: Campaign; temper: Record<TemperamentKind, number> }

export function packSpace(r: SpaceRun, now: number): Json {
  return { kind: STAGE_SLOT.space, v: STAGE_V, savedAt: now, ...clone(r) };
}

export function unpackSpace(raw: unknown, base: Campaign): { run: SpaceRun | null; problems: string[] } {
  if (raw === null || raw === undefined) return { run: null, problems: [] };
  if (!isObj(raw) || raw.kind !== STAGE_SLOT.space) return { run: null, problems: ["not a space save"] };
  if (typeof raw.v !== "number" || raw.v > STAGE_V) return { run: null, problems: ["space save from a newer build"] };
  const c = isObj(raw.campaign) ? raw.campaign : null;
  if (!c || !isObj(c.fit)) return { run: null, problems: ["space save is damaged"] };
  const fit = c.fit as Json;
  if (!HULL_IDS.includes(fit.hull as never) || !Array.isArray(fit.parts) || !fit.parts.every((p) => PART_IDS.includes(p as never))) return { run: null, problems: ["space save has an unknown hull or part"] };
  const systems = SYSTEMS.map((s) => s.id);
  const campaign: Campaign = {
    ...clone(base),
    ...(clone(c) as Partial<Campaign>),
    system: systems.includes(c.system as never) ? (c.system as Campaign["system"]) : "hearth",
    fleet: (Array.isArray(c.fleet) ? c.fleet : []).filter((e) => ESCORT_IDS.includes(e as never)) as Campaign["fleet"],
    credits: num(c.credits, 0, 1e9, base.credits),
    learned: { ...base.learned, ...(isObj(c.learned) ? (clone(c.learned) as Campaign["learned"]) : {}) },
  };
  const t = isObj(raw.temper) ? raw.temper : {};
  return { run: { campaign, temper: { cautious: num(t.cautious, 0, 1, 0), aggressive: num(t.aggressive, 0, 1, 0), adaptable: num(t.adaptable, 0, 1, 0) } }, problems: [] };
}
