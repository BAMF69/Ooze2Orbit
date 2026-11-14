import { describe, expect, it } from "vitest";
import { aquaticDaughters } from "../src/game/aquatic/division";
import { creatureFromLineage, buyUpgrade, dieAndCarryOn, eatFood, maxHp, type AqCreature } from "../src/game/aquatic/creature";
import { mulberry32 } from "../src/game/aquatic/population";
import { aquaticRecord } from "../src/game/aquatic/record";
import { packRun, unpackRun, type AqRun } from "../src/game/aquatic/runSave";

const grown = () => ({ ...creatureFromLineage(null, "omnivore"), form: 2, thickness: 0.5, points: { algae: 20, meat: 30 } });
const save = (me: AqCreature = grown()): AqRun => ({ map: 0, me, pop: { generation: 0, thickness: [0.5] }, tempC: 15,
  causes: [], temper: { cautious: 0, aggressive: 0, adaptable: 0 }, kills: 0, deaths: 0, breaches: 0 });

describe("aquatic daughters", () => {
  it("offers three diets, distinct stat bonuses and inherited progress without mutating the parent", () => {
    const parent = { ...grown(), parts: ["fins"] as const, uniques: ["endurance"] as const };
    const mutable = { ...parent, parts: [...parent.parts], uniques: [...parent.uniques] };
    const offers = aquaticDaughters(mutable, () => 0);
    expect(offers.map(d => d.creature.diet)).toEqual(["herbivore", "carnivore", "omnivore"]);
    expect(new Set(offers.map(d => d.stat)).size).toBe(3);
    for (const d of offers) {
      expect(d.creature.points).toEqual(parent.points);
      expect(d.creature.parts).toContain("fins");
      expect(d.creature.uniques).toEqual(["endurance"]);
      expect(d.creature.ups[d.stat]).toBe(2);
      expect(d.creature.selections).toHaveLength(1);
      expect(d.creature.hp).toBe(maxHp(d.creature));
    }
    expect(mutable.ups.attack).toBe(0);
    expect(mutable.parts).toEqual(["fins"]);
  });
  it("grants full bonus levels past the purchase cap and does not sell more levels", () => {
    const parent = { ...grown(), ups: { attack: 10, speed: 10, defense: 10, mobility: 10, health: 10 } };
    const offers = aquaticDaughters(parent, () => 0);
    expect(offers.every(d => d.creature.ups[d.stat] === 12)).toBe(true);
    expect(offers.every(d => !buyUpgrade(d.creature, d.stat).ok)).toBe(true);
    const health = aquaticDaughters(parent, () => 0.999)[0];
    expect(health.stat).toBe("health");
    expect(health.creature.hp).toBe(maxHp(health.creature));
  });
  it("fills only a free normal part slot and never grants a river-only part", () => {
    const parent = { ...grown(), parts: ["fins", "plates"] as ("fins" | "plates")[] };
    expect(aquaticDaughters(parent, () => 0).every(d => d.bonusPart === undefined)).toBe(true);
    const free = aquaticDaughters(grown(), () => 0);
    expect(free[0].bonusPart).toBe("jaws");
    expect(free.every(d => !d.creature.uniques.length)).toBe(true);
  });
  it("tracks this form's feeding evidence, resets it on selection and retains selection history after death", () => {
    const fed = eatFood(grown(), "meat", 4).creature;
    expect(fed.growthEvidence?.meat).toBe(2);
    const first = aquaticDaughters(fed, () => 0)[0].creature;
    expect(first.growthEvidence).toEqual({ algae: 0, meat: 0 });
    const second = aquaticDaughters({ ...first, form: 3 }, () => 0)[0].creature;
    expect(second.selections?.map(p => p.form)).toEqual([2, 3]);
    const afterDeath = dieAndCarryOn(second).creature;
    expect(afterDeath.selections).toEqual(second.selections);
    expect(afterDeath.ups).toEqual(second.ups);
  });
  it("credits purchased and selected levels once each in the final cause log", () => {
    const selected = aquaticDaughters(grown(), () => 0)[0].creature;
    const r = aquaticRecord({ form: 2, parts: selected.parts, diet: selected.diet,
      kills: 0, deaths: 0, breaches: 0, temps: [], selections: selected.selections, upgrades: selected.ups,
      upsGained: { attack: 3, speed: 0, defense: 0, mobility: 0, health: 0 } }, 0);
    expect(r.causes.map(c => c.cause)).toContain("Grew attack 1 time in the water");
    expect(r.causes.reduce((sum, c) => sum + (c.effect.aggressive ?? 0), 0)).toBeCloseTo(0.09);
    expect(r.block.selections).toEqual(selected.selections);
  });
});

describe("aquatic daughter persistence", () => {
  it("restores the exact pending offers from the saved seed and feeding evidence", () => {
    const pending = { ...grown(), divisionSeed: 123456, growthEvidence: { algae: 6, meat: 20 } };
    const restored = unpackRun(JSON.parse(JSON.stringify(packRun(save(pending))))).run!.me;
    expect(restored.divisionSeed).toBe(pending.divisionSeed);
    expect(aquaticDaughters(restored, mulberry32(restored.divisionSeed!))).toEqual(aquaticDaughters(pending, mulberry32(pending.divisionSeed)));
  });
  it("keeps selected history and levels over ten through Continue without reopening the choice", () => {
    const pending = { ...grown(), divisionSeed: 123, ups: { attack: 11, speed: 10, defense: 10, mobility: 10, health: 10 } };
    const selected = aquaticDaughters(pending, () => 0)[0].creature;
    expect(selected.divisionSeed).toBeUndefined();
    const restored = unpackRun(JSON.parse(JSON.stringify(packRun(save(selected))))).run!.me;
    expect(restored.ups.attack).toBe(13);
    expect(restored.selections).toEqual(selected.selections);
    expect(restored.divisionSeed).toBeUndefined();
  });
  it("drops malformed selection metadata and a seed that would repeat a confirmed choice", () => {
    const selected = aquaticDaughters(grown(), () => 0)[0].creature;
    const raw = packRun(save(selected));
    const me = raw.me as Record<string, unknown>;
    me.divisionSeed = 12;
    me.selections = [...selected.selections!, { form: 2, diet: "rocks", stat: "laser", gain: 999, cause: "bad" }];
    const restored = unpackRun(raw).run!.me;
    expect(restored.selections).toHaveLength(1);
    expect(restored.divisionSeed).toBeUndefined();
  });
});
