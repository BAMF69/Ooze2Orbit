// Purpose: Save-boundary orchestration, shared by the scene and failure/reload tests. No engine imports.
import type { SaveLoadResult } from "../../core/saveStore";
import { writeStage, refreshLineage } from "../../core/lineage";
import { MODES, type Launch } from "./battlefields";
import { acceptVictory, campaignComplete, campaignRecord, campaignSource, CAMPAIGN_SLOT, newCampaign, nextSlot, readCampaign, type CivCampaign, type VictoryRecord, type BattleSlot } from "./campaign";
/** Missing files are normal on first launch; damaged/newer data must never be silently replaced. */
export function checkpointData(loaded: SaveLoadResult): unknown {
  if (!loaded.envelope && loaded.problems.some(p => !p.endsWith(": missing"))) throw new Error(loaded.problems.join("; "));
  return loaded.envelope?.data;
}
export interface ProgressStore { load(slot: string): unknown; save(slot: string, value: unknown): void; now?(): number }
export class CivProgress {
  campaign: CivCampaign | null = null;
  active: BattleSlot | null = null;
  error = "";
  saved = false;
  constructor(readonly launch: Launch, private store: ProgressStore, seed: number) {
    if (launch.error) { this.error = launch.error; return; }
    if (launch.standalone) return;
    try {
      const lineage = store.load("lineage"), loaded = readCampaign(store.load(CAMPAIGN_SLOT));
      if (loaded.error) throw new Error(loaded.error);
      this.campaign = loaded.campaign ?? newCampaign(lineage, seed);
      if (this.campaign.sourceKey !== campaignSource(lineage)) throw new Error("This campaign belongs to a different creature lineage. Its save was preserved; use a standalone battle for practice.");
      if (!loaded.campaign) { this.campaign.savedAt = store.now?.() ?? 0; store.save(CAMPAIGN_SLOT, this.campaign); }
      this.active = nextSlot(this.campaign) ?? null;
      if (campaignComplete(this.campaign)) { this.finish(); this.saved = true; }
    } catch (e) { this.error = String(e); }
  }
  get config() { return this.active ? { difficulty: this.active.difficulty, seed: this.active.seed } : { difficulty: this.launch.difficulty, seed: this.launch.seed }; }
  get unavailable(): boolean { return !!this.error || (!!this.active && !MODES[this.active.mode].available); }
  get completed(): boolean { return !!this.campaign && campaignComplete(this.campaign); }
  /** Mark saved only after all required writes. A retry cannot duplicate an accepted result. */
  record(record: VictoryRecord): void {
    this.saved = false;
    if (this.launch.standalone) { this.saved = true; return; }
    if (!this.campaign || !this.active) throw new Error("No active campaign battle.");
    const next = { ...acceptVictory(this.campaign, this.active.id, record), savedAt: this.store.now?.() ?? 0 };
    this.store.save(CAMPAIGN_SLOT, next);
    this.campaign = next;
    if (campaignComplete(next)) this.finish();
    this.saved = true;
  }
  advance(): boolean {
    if (!this.saved || !this.campaign || this.completed) return false;
    this.active = nextSlot(this.campaign) ?? null; this.saved = false;
    return !!this.active;
  }
  private finish(): void {
    const previous = this.store.load("lineage");
    if (!this.campaign || campaignSource(previous) !== this.campaign.sourceKey) throw new Error("Creature lineage changed; campaign completion was preserved without overwriting it.");
    const record = campaignRecord(this.campaign), old = refreshLineage(previous)?.species[0].stages.civ ?? {};
    this.store.save("lineage", writeStage(previous, "civ", record.causes, { ...old, ...record.block }));
  }
}
