// ---------------------------------------------------------------------------
// lineageChain.test.ts
// Purpose : Locks the lineage carrying every stage's decisions (BAMF69 2026-11-09): the aquatic, creature and
//           civilization stages each write their causes, and the opening screen of the next stage shows them.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { defaultLineage, temperamentOf, writeStage } from "../src/core/lineage";
import { aquaticRecord } from "../src/game/aquatic/record";
import { revealFrom } from "../src/game/aquatic/reveal";
import { CIV, civRecord, newGame } from "../src/game/civ/rules";
import { creatureRecord } from "../src/game/creature/record";

const noUps = { attack: 0, speed: 0, defense: 0, mobility: 0, health: 0 };

describe("each stage's record", () => {
  it("aquatic: hunting, breaching, losses and upgrades lean their ways; extreme water makes the Gardener harsher", () => {
    const mild = aquaticRecord({ kills: 10, breaches: 2, deaths: 1, upsGained: { ...noUps, defense: 2 }, temps: [14, 14], form: 3, parts: [], diet: "carnivore" }, 0);
    expect(mild.causes.map((c) => c.cause)).toEqual(expect.arrayContaining(["Hunted 10 creatures in the water", "Leapt from the water 2 times"]));
    expect(mild.harshness).toBe(0);
    const harsh = aquaticRecord({ kills: 0, breaches: 0, deaths: 0, upsGained: noUps, temps: [2, 2], form: 1, parts: [], diet: "omnivore" }, 0.1);
    expect(harsh.harshness).toBeGreaterThan(0.1);
  });
  it("creature: a level leans by its obstacles, the boss counts triple, parts used often become traits", () => {
    const r = creatureRecord({
      fernwood: { cause: "Cleared Fernwood: 3 of 5 obstacles by stealth", counts: { fight: 1, puzzle: 1, stealth: 3, rushed: 0 }, boss: false },
      den: { cause: "Beat the Old Horn mostly by puzzles", counts: { fight: 0, puzzle: 1, stealth: 0, rushed: 0 }, boss: true },
    }, { claws: 4, camo: 1 }, 0, 0.1);
    expect(r.traits).toEqual(["claws"]);
    const den = r.causes.find((c) => c.cause.startsWith("Beat"))!;
    const fern = r.causes.find((c) => c.cause.startsWith("Cleared"))!;
    expect(den.effect.adaptable).toBeCloseTo(3 * fern.effect.adaptable!);
    expect(r.harshness).toBeCloseTo(0.1);
  });
  it("civilization: one cause per region taken, and the victory", () => {
    let s = newGame("aggressive", 0);
    s = { ...s, regions: s.regions.map((x) => (x.id === "saltcoast" ? { ...x, owner: "you" as const, method: "trade" as const } : x)) };
    const r = civRecord(s, { cautious: 0, aggressive: 0, adaptable: 0 });
    expect(r.causes).toEqual([{ cause: "Took the Salt Coast by trade", effect: { adaptable: CIV.temperPerRegion } }]);
    expect(r.block.victory).toBe("trade");
  });
});

describe("the whole chain", () => {
  it("the civilization stage's opening screen shows decisions from the water and the land", () => {
    let l = writeStage(defaultLineage(), "cell", [{ cause: "Your ancestor chose to eat anything 1 time", effect: { adaptable: 0.05 } }], {});
    l = writeStage(l, "aquatic", aquaticRecord({ kills: 25, breaches: 0, deaths: 0, upsGained: noUps, temps: [], form: 4, parts: [], diet: "carnivore" }, 0).causes, {});
    l = writeStage(l, "creature", creatureRecord({ den: { cause: "Beat the Old Horn mostly by fighting", counts: { fight: 1, puzzle: 0, stealth: 0, rushed: 0 }, boss: true } }, {}, 0, 0).causes, {});
    const r = revealFrom(l, 3, "civ");
    const aggressive = r.rows.find((x) => x.kind === "aggressive")!;
    expect(aggressive.causes).toEqual(expect.arrayContaining(["Hunted 25 creatures in the water", "Beat the Old Horn mostly by fighting"]));
    expect(temperamentOf(l.species[0].influence).aggressive).toBeGreaterThan(0.3);
    expect(r.leaning).toMatch(/aggressive/);
  });
});
