// ---------------------------------------------------------------------------
// aquaticRunSave.test.ts
// Purpose : Locks "pick up where you left off" (BAMF69 2026-11-09): a run survives a round trip, odd data is
//           clamped or dropped rather than trusted, a finished run offers no Continue, and the export file carries
//           the lineage and the run, refusing files that are not ours or come from a newer build.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { addPart, creatureFromLineage, type AqCreature } from "../src/game/aquatic/creature";
import { EXPORT_FORMAT, RUN_SLOT, packBundle, packRun, unpackBundle, unpackRun, type AqRun } from "../src/game/aquatic/runSave";

const run = (): AqRun => {
  let me: AqCreature = { ...creatureFromLineage(null, "carnivore"), form: 3, food: 42, points: { algae: 3, meat: 17 }, thickness: 0.7 };
  me = addPart(addPart(me, "jaws").creature, "endurance").creature;
  return {
    map: 1, me, tempC: 8, pop: { generation: 4, thickness: [0.4, 0.6, 0.7] }, causes: ["cold"],
    temper: { cautious: 0.2, aggressive: 0.5, adaptable: 0.3 }, kills: 9, deaths: 2, breaches: 1,
  };
};

describe("the aquatic run as a save", () => {
  it("survives a round trip", () => {
    const back = unpackRun(JSON.parse(JSON.stringify(packRun(run()))));
    expect(back.problems).toEqual([]);
    expect(back.run).toEqual(run());
  });
  it("nothing saved: no run, no complaint", () => {
    expect(unpackRun(undefined)).toEqual({ run: null, problems: [] });
  });
  it("a finished run (the lineage left the water) offers no Continue", () => {
    expect(unpackRun({ kind: "aquatic_run", v: 1, finished: true }).run).toBeNull();
  });
  it("clamps and drops odd data instead of trusting it", () => {
    const r = unpackRun({ kind: "aquatic_run", v: 1, map: 99, tempC: 500, me: { form: 9, diet: "rocks", parts: ["jaws", "jaws", "laser", "torrent"], uniques: ["jaws", "torrent"], ups: { attack: 50 } } }).run!;
    expect(r.map).toBe(2);
    expect(r.tempC).toBe(26);
    expect(r.me.form).toBe(4);
    expect(r.me.diet).toBe("omnivore");
    expect(r.me.parts).toEqual(["jaws"]);
    expect(r.me.uniques).toEqual(["torrent"]);
    expect(r.me.ups.attack).toBe(17); // valid inherited + aquatic daughter levels
    expect(r.pop.thickness.length).toBeGreaterThan(0);
  });
  it("refuses a run from a newer build", () => {
    expect(unpackRun({ kind: "aquatic_run", v: 99 }).run).toBeNull();
  });
});

describe("the export file", () => {
  it("carries the lineage and the run, and reads back", () => {
    const text = packBundle({ lineage: { species: [] }, [RUN_SLOT]: packRun(run()) }, "2026-11-09");
    const b = unpackBundle(text);
    expect(b.problems).toEqual([]);
    expect(Object.keys(b.slots).sort()).toEqual(["aquatic_run", "lineage"]);
    expect(unpackRun(b.slots.aquatic_run).run).toEqual(run());
  });
  it("refuses what is not ours, unreadable, newer, empty or damaged", () => {
    expect(unpackBundle("{oops").problems.length).toBe(1);
    expect(unpackBundle(JSON.stringify({ format: "other" })).problems.length).toBe(1);
    expect(unpackBundle(JSON.stringify({ format: EXPORT_FORMAT, v: 99, slots: {} })).problems.length).toBe(1);
    expect(unpackBundle(JSON.stringify({ format: EXPORT_FORMAT, v: 1, slots: {} })).problems.length).toBe(1);
    expect(unpackBundle(JSON.stringify({ format: EXPORT_FORMAT, v: 1, slots: { aquatic_run: { kind: "nope" } } })).problems.length).toBe(1);
  });
});
