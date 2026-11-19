// Purpose: Pure nine-battle progress, defensive checkpoints and legacy-compatible final heritage.
// A slot accepts one victory. Mid-battle state is intentionally not a checkpoint.
import { defaultLineage, refreshLineage, type StageCause } from "../../core/lineage";
import { GENERATOR_VERSION, TERRAIN, type Difficulty, type ModeId } from "./battlefields";
import { SENDS, TOWERS } from "./warsTuning";
export const CAMPAIGN_SLOT = "civ_campaign";
export const CAMPAIGN_VERSION = 1;
export const CAMPAIGN_TUNING = { recordLimit: 1e9, causeLimit: 40, stringLimit: 400, technologyLimit: 100 };
export interface VictoryRecord { causes: StageCause[]; block: Record<string, unknown> }
export interface BattleSlot { id: string; mode: ModeId; difficulty: Difficulty; seed: number; result?: VictoryRecord; [key: string]: unknown }
export interface CivCampaign {
  kind: "civ_campaign"; version: number; generatorVersion: number; id: string;
  sourceKey: string; seed: number; slots: BattleSlot[]; [key: string]: unknown;
}
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const uint = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= TERRAIN.seedMax;
const finiteCount = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= CAMPAIGN_TUNING.recordLimit;
const canonical = (v: unknown): string => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : obj(v) ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}` : JSON.stringify(v) ?? "null";
/** Ignore civ/space caches; upstream creature identity/history determines campaign ownership. */
export function campaignSource(lineage: unknown): string {
  const home = (refreshLineage(lineage) ?? defaultLineage()).species[0];
  return canonical({ id: home.id, diet: home.diet, creature: home.stages.creature ?? null, influence: home.influence.filter(i => i.stage !== "civ" && i.stage !== "space") });
}
export function newCampaign(lineage: unknown, seed: number): CivCampaign {
  const sourceKey = campaignSource(lineage), value = seed >>> 0;
  const slots: BattleSlot[] = [];
  for (const difficulty of ["easy", "medium", "hard"] as const) for (const mode of ["tower", "hero", "tug"] as const) {
    slots.push({ id: `${mode}-${difficulty}`, mode, difficulty, seed: (value + Math.imul(slots.length, 2654435761)) >>> 0 });
  }
  return { kind: "civ_campaign", version: CAMPAIGN_VERSION, generatorVersion: GENERATOR_VERSION, id: `civ-${value}`, sourceKey, seed: value, slots };
}
export const nextSlot = (campaign: CivCampaign) => campaign.slots.find(s => !s.result);
export const campaignComplete = (campaign: CivCampaign) => !nextSlot(campaign);
export function validVictory(raw: unknown): raw is VictoryRecord {
  if (!obj(raw) || !obj(raw.block) || !Array.isArray(raw.causes) || raw.causes.length > CAMPAIGN_TUNING.causeLimit) return false;
  const b = raw.block;
  if (!["base_destroyed", "economic_supremacy"].includes(String(b.victory))) return false;
  if (!["sends", "defenses", "mazeLength", "baselineLength", "heroHits", "kills"].every(k => finiteCount(b[k]))) return false;
  if (!["machines", "towers"].every(k => Array.isArray(b[k]) && (b[k] as unknown[]).length <= CAMPAIGN_TUNING.technologyLimit && (b[k] as unknown[]).every(v => typeof v === "string" && v.length <= CAMPAIGN_TUNING.stringLimit))) return false;
  if (!obj(b.sentKinds) || !Object.keys(SENDS).every(k => finiteCount((b.sentKinds as Record<string, unknown>)[k]))) return false;
  if (!obj(b.towerCounts) || !Object.keys(TOWERS).every(k => finiteCount((b.towerCounts as Record<string, unknown>)[k]))) return false;
  return raw.causes.every(c => obj(c) && typeof c.cause === "string" && c.cause.length <= CAMPAIGN_TUNING.stringLimit && obj(c.effect) && Object.entries(c.effect).every(([k, v]) => ["cautious", "aggressive", "adaptable"].includes(k) && typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= .5));
}
/** Never repair/drop a bad or newer campaign: callers must preserve it and report the reason. */
export function readCampaign(raw: unknown): { campaign: CivCampaign | null; error?: string } {
  if (raw === undefined || raw === null) return { campaign: null };
  const invalid = (error = "Civilization campaign is damaged; export your saves before replacing it.") => ({ campaign: null, error });
  if (!obj(raw) || raw.kind !== "civ_campaign") return invalid();
  if (raw.version !== CAMPAIGN_VERSION || raw.generatorVersion !== GENERATOR_VERSION) return invalid("Civilization campaign version is unsupported; its save was preserved.");
  if (!uint(raw.seed) || typeof raw.sourceKey !== "string" || typeof raw.id !== "string" || !Array.isArray(raw.slots)) return invalid();
  const expected = newCampaign(null, raw.seed).slots;
  if (raw.slots.length !== expected.length) return invalid();
  let pending = false;
  for (const [i, slot] of raw.slots.entries()) {
    const e = expected[i];
    if (!obj(slot) || slot.id !== e.id || slot.mode !== e.mode || slot.difficulty !== e.difficulty || slot.seed !== e.seed) return invalid();
    if (slot.result !== undefined) {
      if (pending || !validVictory(slot.result)) return invalid();
      if (slot.result.block.mode !== slot.mode || slot.result.block.difficulty !== slot.difficulty || slot.result.block.seed !== slot.seed) return invalid();
    } else pending = true;
  }
  return { campaign: clone(raw) as unknown as CivCampaign };
}
export function acceptVictory(campaign: CivCampaign, slotId: string, record: VictoryRecord): CivCampaign {
  const slot = campaign.slots.find(s => s.id === slotId);
  if (slot?.result) return campaign; // saving/retrying a previously accepted slot is idempotent
  if (!slot || nextSlot(campaign)?.id !== slotId || !validVictory(record) || record.block.mode !== slot.mode || record.block.difficulty !== slot.difficulty || record.block.seed !== slot.seed) throw new Error("Victory does not match the active campaign battle.");
  const next = clone(campaign); next.slots.find(s => s.id === slotId)!.result = clone(record); return next;
}

/** Average per-battle evidence, then let core apply ONE civilization-wide shift cap. */
export function campaignRecord(campaign: CivCampaign, live?: VictoryRecord): VictoryRecord {
  const records = campaign.slots.flatMap(s => s.result ? [s.result] : []);
  if (live) records.push(live);
  const sum = (key: string) => records.reduce((n, r) => n + (typeof r.block[key] === "number" ? r.block[key] as number : 0), 0);
  const counts = (field: string, keys: string[]) => Object.fromEntries(keys.map(k => [k, records.reduce((n, r) => n + Number((r.block[field] as Record<string, number> | undefined)?.[k] ?? 0), 0)]));
  const towerCounts = counts("towerCounts", Object.keys(TOWERS)), sentKinds = counts("sentKinds", Object.keys(SENDS));
  const usage = { ...towerCounts, ...sentKinds }, machines = Object.keys(usage).filter(k => usage[k] > 0).sort((a, b) => usage[b] - usage[a] || a.localeCompare(b));
  const baseWins = records.filter(r => r.block.victory === "base_destroyed").length;
  const causes = records.flatMap((r, i) => r.causes.map(c => ({ cause: `Battle ${i + 1}: ${c.cause}`, effect: Object.fromEntries(Object.entries(c.effect).map(([k, v]) => [k, (v ?? 0) / campaign.slots.length])) })));
  return { causes, block: { victory: baseWins > records.length - baseWins ? "base_destroyed" : "economic_supremacy", machines,
    towers: Object.keys(towerCounts).filter(k => towerCounts[k] > 0), towerCounts, sentKinds, sends: sum("sends"), defenses: sum("defenses"), mazeLength: sum("mazeLength"), heroHits: sum("heroHits"), kills: sum("kills"),
    tookT0Tech: records.some(r => r.block.tookT0Tech === true), campaignId: campaign.id, battles: clone(campaign.slots), campaignComplete: campaignComplete(campaign) } };
}
