// Purpose: Campaign checkpoints, failure/reload safety, aggregate heritage and standalone isolation.
import { describe, expect, it } from "vitest";
import { SaveStore } from "../src/core/saveStore";
import { MemoryStore } from "../src/core/textStore";
import { defaultLineage, writeStage } from "../src/core/lineage";
import { acceptVictory, campaignComplete, campaignRecord, campaignSource, CAMPAIGN_SLOT, newCampaign, nextSlot, readCampaign, type VictoryRecord } from "../src/game/civ/campaign";
import { CivProgress, checkpointData, type ProgressStore } from "../src/game/civ/progress";
import { parseLaunch } from "../src/game/civ/battlefields";
import { newBattle, warsRecord } from "../src/game/civ/wars";
import { packBundle, unpackBundle } from "../src/game/aquatic/runSave";
import { latestRun } from "../src/shell/saveFiles";
import { startCampaign } from "../src/game/space/campaign";
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function record(slot: { mode: string; difficulty: "easy" | "medium" | "hard"; seed: number }, base = true): VictoryRecord {
  const b = newBattle({}, "raider", slot); b.status = base ? "base" : "economy";
  b.tally.sends = 400; b.tally.sentKinds.runner = 8; b.tally.heroHits = 12;
  const r = warsRecord(b); r.block.mode = slot.mode; return r;
}
function memory(): { store: ProgressStore; data: Record<string, unknown>; fail: string } {
  const m = { data: { lineage: defaultLineage() } as Record<string, unknown>, fail: "", store: {} as ProgressStore };
  m.store = { load: k => m.data[k] ? copy(m.data[k]) : undefined, save: (k, v) => { if (m.fail === k) throw Error("disk full"); m.data[k] = copy(v); } }; return m;
}
describe("civilization campaign", () => {
  it("starts on a real empty SaveStore and refuses corrupted files", () => {
    const disk = new MemoryStore(), saves = new SaveStore(disk);
    const store: ProgressStore = { load: k => checkpointData(saves.load(k)), save: (k, data) => saves.save(k, data as Parameters<typeof saves.save>[1]) };
    const p = new CivProgress(parseLaunch(""), store, 15);
    expect(p.error).toBe(""); expect(p.active?.id).toBe("tower-easy"); expect(p.config.seed).toBe(15);
    p.record(record(p.active!)); expect(new CivProgress(parseLaunch(""), store, 99).active?.id).toBe("hero-easy");
    disk.write("save_civ_campaign.json", "broken"); disk.write("save_civ_campaign.json.bak", "broken");
    expect(new CivProgress(parseLaunch(""), store, 15).error).toContain("unreadable");
    expect(disk.read("save_civ_campaign.json")).toBe("broken");
  });
  it("creates nine deterministic slots in the approved order and resumes the unfinished seed", () => {
    const c = newCampaign(null, 77);
    expect(c.slots.map(s => s.id)).toEqual(["tower-easy", "hero-easy", "tug-easy", "tower-medium", "hero-medium", "tug-medium", "tower-hard", "hero-hard", "tug-hard"]);
    expect(readCampaign(c).campaign).toEqual(c);
    const m = memory(), p = new CivProgress(parseLaunch(""), m.store, 77);
    const reloaded = new CivProgress(parseLaunch(""), m.store, 999);
    expect(reloaded.config).toEqual(p.config); expect(reloaded.active?.id).toBe("tower-easy");
  });
  it("accepts one result per slot, prevents out-of-order credit and retains unknown checkpoint data", () => {
    const c = newCampaign(null, 1); c.future = { keep: true }; c.slots[0].future = "keep";
    expect(() => acceptVictory(c, c.slots[1].id, record(c.slots[1]))).toThrow();
    const n = acceptVictory(c, c.slots[0].id, record(c.slots[0]));
    expect(c.slots[0].result).toBeUndefined(); expect(n.future).toEqual(c.future); expect(n.slots[0].future).toBe("keep");
    expect(acceptVictory(n, n.slots[0].id, record(n.slots[0], false))).toBe(n);
    expect(nextSlot(n)?.id).toBe("hero-easy");
  });
  it("refuses unsupported, malformed, forged or non-prefix checkpoints without repairing them", () => {
    const original = newCampaign(null, 5);
    for (const mutate of [
      (c: typeof original) => { c.version = 2; },
      (c: typeof original) => { c.generatorVersion = 2; },
      (c: typeof original) => { c.slots[0].seed++; },
      (c: typeof original) => { c.slots[1].result = record(c.slots[1]); },
      (c: typeof original) => { c.slots[0].result = record(c.slots[1]); },
      (c: typeof original) => { c.slots[0].result = record(c.slots[0]); c.slots[0].result.block.kills = Infinity; },
    ]) { const c = copy(original); mutate(c); const before = JSON.stringify(c); expect(readCampaign(c).error).toBeTruthy(); expect(JSON.stringify(c)).toBe(before); }
  });
  it("isolates standalone matches, validates URL values and refuses unimplemented modes", () => {
    const m = memory();
    const p = new CivProgress(parseLaunch("?mode=tower&difficulty=hard&seed=4294967295"), m.store, 5);
    expect(p.config).toEqual({ difficulty: "hard", seed: 4294967295 });
    p.record(record({ ...p.config, mode: "tower" }));
    expect(m.data).toEqual({ lineage: defaultLineage() }); expect(p.saved).toBe(true);
    for (const query of ["?mode=tug", "?mode=hero", "?mode=__proto__", "?difficulty=impossible", "?seed=-1&mode=tower", "?mode=tower&seed=1e3", "?mode=tower&seed=4294967296"]) expect(parseLaunch(query).error).toBeTruthy();
  });
  it("does not advance on failed save; retry/reload never counts a victory twice", () => {
    const m = memory(), p = new CivProgress(parseLaunch(""), m.store, 5);
    m.fail = CAMPAIGN_SLOT;
    expect(() => p.record(record(p.active!))).toThrow("disk full"); expect(p.saved).toBe(false); expect(p.advance()).toBe(false);
    expect(readCampaign(m.data[CAMPAIGN_SLOT]).campaign?.slots[0].result).toBeUndefined();
    m.fail = ""; p.record(record(p.active!)); p.record(record(p.active!));
    expect(p.campaign?.slots.filter(s => s.result)).toHaveLength(1);
    const loaded = new CivProgress(parseLaunch(""), m.store, 999);
    expect(loaded.active?.id).toBe("hero-easy"); expect(loaded.unavailable).toBe(true);
    expect(m.data.lineage).toEqual(defaultLineage()); // one win does not complete civilization
  });
  it("preserves damaged/newer saves and refuses to apply progress to a different creature", () => {
    const m = memory(); m.data[CAMPAIGN_SLOT] = { ...newCampaign(null, 1), version: 999 };
    const before = copy(m.data); expect(new CivProgress(parseLaunch(""), m.store, 2).error).toBeTruthy(); expect(m.data).toEqual(before);
    m.data[CAMPAIGN_SLOT] = newCampaign(null, 1);
    const lineage = defaultLineage(); lineage.species[0].stages.creature = { hero: { strength: 9 } }; m.data.lineage = lineage;
    expect(new CivProgress(parseLaunch(""), m.store, 2).error).toContain("different creature");
    expect(campaignSource(lineage)).not.toBe(campaignSource(null));
  });
  it("aggregates the majority win and real technology usage; applies the stage cap once", () => {
    let c = newCampaign(null, 2);
    for (const [i, slot] of c.slots.entries()) c = acceptVictory(c, slot.id, record(slot, i < 5));
    expect(campaignComplete(c)).toBe(true);
    const aggregate = campaignRecord(c); expect(aggregate.block.victory).toBe("base_destroyed"); expect(aggregate.block.machines).toEqual(["runner"]);
    expect(aggregate.block.sends).toBe(3600); expect(aggregate.block.sentKinds).toMatchObject({ runner: 72 });
    const old = defaultLineage(); (old as unknown as Record<string, unknown>).future = { keep: 7 };
    old.species[0].stages.creature = { future: "keep" };
    const next = writeStage(old, "civ", aggregate.causes, aggregate.block);
    expect(next.species[0].stages.creature).toEqual(old.species[0].stages.creature);
    expect((next as unknown as Record<string, unknown>).future).toEqual({ keep: 7 });
    expect(Object.values(next.species[0].temperament).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    for (const key of ["aggressive", "cautious", "adaptable"] as const) expect(Math.abs(next.species[0].temperament[key] - old.species[0].temperament[key])).toBeLessThanOrEqual(.5);
    expect(startCampaign({ temper: next.species[0].temperament, civ: aggregate.block }).fit.parts).toContain("fin");
  });
  it("can retry the final write in the same session without replaying the battle", () => {
    const m = memory(); let c = newCampaign(m.data.lineage, 9);
    for (const slot of c.slots.slice(0, 8)) c = acceptVictory(c, slot.id, record(slot));
    m.data[CAMPAIGN_SLOT] = c;
    const p = new CivProgress(parseLaunch(""), m.store, 0), final = record(p.active!);
    m.fail = "lineage"; expect(() => p.record(final)).toThrow("disk full"); expect(p.completed).toBe(true); expect(p.saved).toBe(false);
    m.fail = ""; p.record(final); expect(p.saved).toBe(true); expect(p.campaign?.slots.filter(s => s.result)).toHaveLength(9);
  });
  it("retries final lineage failure after reload, preserving unknown stage fields", () => {
    const m = memory(); let c = newCampaign(m.data.lineage, 5);
    for (const slot of c.slots) c = acceptVictory(c, slot.id, record(slot, false));
    m.data[CAMPAIGN_SLOT] = c;
    const lineage = defaultLineage(); lineage.species[0].stages.civ = { future: { keep: 1 } }; m.data.lineage = lineage;
    m.fail = "lineage";
    const failed = new CivProgress(parseLaunch(""), m.store, 0); expect(failed.saved).toBe(false); expect(failed.error).toContain("disk full");
    expect(readCampaign(m.data[CAMPAIGN_SLOT]).campaign?.slots.filter(s => s.result)).toHaveLength(9);
    m.fail = ""; const loaded = new CivProgress(parseLaunch(""), m.store, 0);
    expect(loaded.saved).toBe(true); expect(loaded.completed).toBe(true);
    expect((m.data.lineage as ReturnType<typeof defaultLineage>).species[0].stages.civ).toMatchObject({ victory: "economic_supremacy", future: { keep: 1 } });
  });
  it("offers Continue for the newest civilization checkpoint", () => {
    const c = newCampaign(null, 7); c.savedAt = 50;
    const shell = { saves: { load: (slot: string) => ({ envelope: slot === CAMPAIGN_SLOT ? { data: c } : null }) } } as unknown as Parameters<typeof latestRun>[0];
    expect(latestRun(shell)).toBe("civ");
    c.version = 2; expect(latestRun(shell)).toBeNull();
  });
  it("exports/imports the campaign without breaking legacy bundles", () => {
    const campaign = newCampaign(null, 19); campaign.future = [1, 2];
    expect(unpackBundle(packBundle({ civ_campaign: campaign }, "2026-11-18")).slots.civ_campaign).toEqual(campaign);
    expect(unpackBundle(packBundle({ lineage: defaultLineage() }, "2026-11-18")).problems).toEqual([]);
    expect(unpackBundle(packBundle({ civ_campaign: { ...campaign, version: 2 } }, "2026-11-18")).problems).toContain("its civilization campaign is damaged or unsupported");
  });
});
