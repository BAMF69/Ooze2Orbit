// ---------------------------------------------------------------------------
// lineage.test.ts
// Purpose : Locks the temperament maths of the handoff contract (src/core/lineage.ts): the cell stage sets
//           temperament freely, every later stage can move it at most STAGE_SHIFT_CAP (BAMF69 2026-11-08), and
//           temperament only comes from the cause log.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import {
  STAGE_SHIFT_CAP, lineageProblems, shipSpecialty, stageRange, stageTemperament, temperamentOf, balancedTemperament,
  type Influence, type StageId, type Temperament,
} from "../src/core/lineage";

const cause = (stage: StageId, effect: Partial<Temperament>): Influence => ({ stage, cause: "test", effect });

describe("the per-stage shift cap", () => {
  it("is 50 %", () => {
    expect(STAGE_SHIFT_CAP).toBe(0.5);
  });

  it("BAMF69's example: 100 % aggressive cell, at least 50 % after aquatic, can reach 0 % after the creature stage", () => {
    const cell = [cause("cell", { aggressive: 1 })];
    expect(temperamentOf(cell).aggressive).toBe(1);
    const afterAquatic = [...cell, cause("aquatic", { aggressive: -1 })]; // pushes as hard as it can the other way
    expect(temperamentOf(afterAquatic).aggressive).toBe(0.5);
    const afterLand = [...afterAquatic, cause("creature", { aggressive: -1 })];
    expect(temperamentOf(afterLand).aggressive).toBe(0);
  });

  it("caps upward moves the same way", () => {
    const log = [cause("cell", { cautious: 0.1, aggressive: 0.9 }), cause("aquatic", { cautious: 9 })];
    expect(temperamentOf(log).cautious).toBeCloseTo(0.6);
  });

  it("normalizes cell evidence, with balanced fallback for no positive evidence", () => {
    expect(stageTemperament(null, [cause("cell", { adaptable: 0.7 }), cause("cell", { adaptable: 0.9 })]).adaptable).toBe(1);
    expect(stageTemperament(null, [cause("cell", { adaptable: -0.4 })])).toEqual(balancedTemperament());
  });

  it("adds up several causes in one stage before capping", () => {
    const log = [cause("cell", { aggressive: 0.2, cautious: 0.8 }), cause("aquatic", { aggressive: 0.2 }), cause("aquatic", { aggressive: 0.2 })];
    expect(temperamentOf(log).aggressive).toBeCloseTo(3 / 7);
  });

  it("leaves temperament alone through a stage with no causes", () => {
    const log = [cause("cell", { aggressive: 1 }), cause("creature", { aggressive: -1 })]; // aquatic had none
    expect(temperamentOf(log).aggressive).toBe(0.5); // the creature stage can still only move it 50 %
  });

  it("makes temperaments compete for a single 100% total", () => {
    const t = temperamentOf([cause("cell", { aggressive: 1, cautious: 0.8 })]);
    expect(t.cautious).toBeCloseTo(4 / 9); expect(t.aggressive).toBeCloseTo(5 / 9); expect(t.adaptable).toBe(0);
  });

  it("reports the range the next stage may reach", () => {
    const r = stageRange({ cautious: 0.2, aggressive: 0.8, adaptable: 0 });
    expect(r.cautious).toEqual({ min: 0, max: 0.7 });
    expect(r.aggressive.min).toBeCloseTo(0.3); expect(r.aggressive.max).toBe(1);
    expect(r.adaptable).toEqual({ min: 0, max: 0.5 });
  });

  it("is order-safe: entries are grouped by stage, not by position in the log", () => {
    const a = [cause("cell", { aggressive: 1 }), cause("aquatic", { aggressive: -1 })];
    expect(temperamentOf([...a].reverse())).toEqual(temperamentOf(a));
  });
});

describe("ship specialty", () => {
  it("follows the strongest temperament: cautious shields, aggressive weapons, adaptable engines", () => {
    expect(shipSpecialty({ cautious: 0.9, aggressive: 0.2, adaptable: 0.1 }).tech).toBe("shields");
    expect(shipSpecialty({ cautious: 0.1, aggressive: 0.9, adaptable: 0.2 }).tech).toBe("weapons");
    expect(shipSpecialty({ cautious: 0.1, aggressive: 0.2, adaptable: 0.9 }).tech).toBe("engines");
  });

  it("an empty log is balanced", () => {
    expect(temperamentOf([])).toEqual(balancedTemperament());
  });
});

describe("lineage shape check", () => {
  it("names what is wrong", () => {
    expect(lineageProblems(null)).toEqual(["not an object"]);
    expect(lineageProblems({ schemaVersion: 9, lastStage: "moon", species: [] })).toEqual([
      "schemaVersion 9 (expected 1)", "lastStage moon", "no species",
    ]);
  });
});

describe("writing a later stage (BAMF69 2026-11-09)", async () => {
  const { writeStage, defaultLineage, temperamentOf: tOf } = await import("../src/core/lineage");
  it("adds the stage's causes and block, sets lastStage and harshness; replaying replaces them", () => {
    const start = defaultLineage();
    let l = writeStage(start, "aquatic", [{ cause: "Hunted 20 creatures", effect: { aggressive: 0.2 } }, { cause: "nothing", effect: {} }], { kills: 20 }, 0.3);
    expect(l.lastStage).toBe("aquatic");
    expect(l.gardener.harshness).toBe(0.3);
    expect(l.species[0].influence).toHaveLength(1); // a cause with no effect is dropped
    expect(l.species[0].stages.aquatic).toEqual({ kills: 20 });
    l = writeStage(l, "aquatic", [{ cause: "Hunted 5 creatures", effect: { aggressive: 0.05 } }], { kills: 5 });
    expect(l.species[0].influence.map((e) => e.cause)).toEqual(["Hunted 5 creatures"]);
    expect(l.gardener.harshness).toBe(0.3); // kept when not given
    expect(start.species[0].influence).toHaveLength(0); // pure
  });
  it("a bad lineage starts fresh; the shift cap still applies", () => {
    const l = writeStage("garbage", "creature", [{ cause: "Fought everything", effect: { aggressive: 2 } }], {});
    expect(l.species[0].origin).toBe("default");
    expect(tOf(l.species[0].influence).aggressive).toBeLessThanOrEqual(1);
  });
});
