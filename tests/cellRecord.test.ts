// ---------------------------------------------------------------------------
// cellRecord.test.ts
// Purpose : Locks the cell stage's recording (src/game/cell/record.ts): what it counts, how gulper decisions read,
//           how the finished creature becomes cause-log entries, and the lineage it hands to the aquatic stage.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { lineageProblems, shipSpecialty } from "../src/core/lineage";
import { PLAYER_ID, newBrain, type GulperBrain } from "../src/game/cell/predator";
import { bump, cellInfluence, cellLineage, cellTemperament, gulperEvent, newCellRecord, recordDiet, type CellRecord } from "../src/game/cell/record";
import { newCreature, type Creature } from "../src/game/cell/rules";
import { TUNING, type Diet } from "../src/game/cell/tuning";

const creature = (over: Partial<Creature> = {}): Creature => ({ ...newCreature("omnivore"), form: 3, ...over });
const diets = (...ds: Diet[]): CellRecord => ds.reduce(recordDiet, newCellRecord());
const brain = (over: Partial<GulperBrain>): GulperBrain => ({ ...newBrain(), ...over });

describe("counting", () => {
  it("starts empty and counts without changing the old record", () => {
    const r0 = newCellRecord();
    const r1 = bump(bump(r0, "cellsRammed"), "cellsPopped", 3);
    expect(r0.behavior.cellsRammed).toBe(0);
    expect(r1.behavior).toMatchObject({ cellsRammed: 1, cellsPopped: 3, timesBitten: 0 });
  });

  it("keeps every diet choice in order", () => {
    expect(diets("omnivore", "carnivore", "carnivore").dietHistory).toEqual(["omnivore", "carnivore", "carnivore"]);
  });
});

describe("reading the gulper's decisions", () => {
  const hunting = brain({ state: "hunt", targetId: PLAYER_ID });
  it("tired of chasing you, or lost you: an escape", () => {
    expect(gulperEvent(hunting, brain({ state: "tired" }))).toBe("escape");
    expect(gulperEvent(hunting, brain({ state: "wander", targetId: null }))).toBe("escape");
  });
  it("turned to other prey: a lure", () => {
    expect(gulperEvent(hunting, brain({ state: "hunt", targetId: 7 }))).toBe("lure");
  });
  it("still after you, or never after you: nothing", () => {
    expect(gulperEvent(hunting, hunting)).toBeNull();
    expect(gulperEvent(brain({ state: "hunt", targetId: 7 }), brain({ state: "tired" }))).toBeNull();
    expect(gulperEvent(brain({}), brain({ state: "hunt", targetId: PLAYER_ID }))).toBeNull();
  });
});

describe("temperament from the cell stage", () => {
  it("a maxed-attack carnivore that keeps its spikes is 100 % aggressive, even without fighting", () => {
    const c = creature({ diet: "carnivore", parts: ["spikes"], ups: { attack: 5, speed: 0, defense: 0, mobility: 0 } });
    const t = cellTemperament(c, diets("carnivore", "carnivore", "carnivore"));
    expect(t.aggressive).toBe(1);
    expect(shipSpecialty(t).tech).toBe("weapons");
  });

  it("a shelled, defended herbivore that escapes gulpers leans cautious: shields", () => {
    let r = diets("herbivore", "herbivore", "herbivore");
    r = bump(r, "gulperEscapes", 4);
    const c = creature({ diet: "herbivore", parts: ["shell", "mouth"], ups: { attack: 0, speed: 0, defense: 4, mobility: 1 } });
    const t = cellTemperament(c, r);
    expect(t.cautious).toBeCloseTo((4 + TUNING.temperament.shellKept + 4 * TUNING.temperament.escape) / TUNING.temperament.full);
    expect(shipSpecialty(t).tech).toBe("shields");
  });

  it("switching diets and moving fast leans adaptable: engines", () => {
    const c = creature({ ups: { attack: 0, speed: 3, defense: 0, mobility: 3 } });
    const t = cellTemperament(c, diets("herbivore", "omnivore", "carnivore"));
    expect(shipSpecialty(t).tech).toBe("engines");
  });

  it("caps behavior so grinding one action cannot max a temperament alone", () => {
    const t = cellTemperament(creature(), bump(newCellRecord(), "cellsRammed", 1000));
    expect(t.aggressive).toBeCloseTo(TUNING.temperament.ramMax / TUNING.temperament.full);
  });

  it("every cause log entry says why, and nothing is logged for causes that did not happen", () => {
    const log = cellInfluence(creature({ ups: { attack: 2, speed: 0, defense: 0, mobility: 0 } }), bump(diets("carnivore"), "cellsRammed", 3));
    expect(log.map((e) => e.cause)).toEqual([
      "Your ancestor grew its attack to level 2",
      "Your ancestor chose to eat meat 1 time",
      "Your ancestor rammed 3 cells",
    ]);
    expect(log.every((e) => e.stage === "cell")).toBe(true);
  });

  it("the filter mouth feeds the diet, not temperament", () => {
    expect(cellInfluence(creature({ parts: ["mouth"] }), newCellRecord())).toEqual([]);
  });
});

describe("the lineage handed to the aquatic stage", () => {
  it("passes the contract's shape check and carries the cell block", () => {
    const c = creature({ diet: "carnivore", parts: ["spikes", "shell"], ups: { attack: 3, speed: 1, defense: 2, mobility: 0 } });
    const r = bump(diets("omnivore", "carnivore", "carnivore"), "gulperEscapes", 2);
    const l = cellLineage(c, r);
    expect(lineageProblems(l)).toEqual([]);
    expect(l.lastStage).toBe("cell");
    expect(l.species).toHaveLength(1);
    const home = l.species[0];
    expect(home).toMatchObject({ id: "home", world: "home", origin: "played", status: "alive", diet: "carnivore" });
    expect(home.stages.cell).toEqual({
      finalForm: 3, diet: "carnivore", dietHistory: ["omnivore", "carnivore", "carnivore"], parts: ["spikes", "shell"],
      upgrades: { attack: 3, speed: 1, defense: 2, mobility: 0 },
      behavior: { cellsRammed: 0, cellsPopped: 0, timesBitten: 0, gulperEscapes: 2, gulpersLured: 0 },
    });
    expect(home.temperament).toEqual(cellTemperament(c, r));
  });

  it("survives a JSON round trip unchanged (it is saved as JSON)", () => {
    const l = cellLineage(creature(), diets("omnivore"));
    expect(JSON.parse(JSON.stringify(l))).toEqual(l);
  });
});
