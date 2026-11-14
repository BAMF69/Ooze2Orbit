// ---------------------------------------------------------------------------
// cellDivision.test.ts
// Purpose : Verify inheritance, bounded behavioral bias and selection history in the aquatic handoff.
// Usage   : python tools/dev.py test
// Notes   : Engine-free, deterministic random inputs.
// Authored: Written with Codex (GPT-6)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { daughters, newEvidence, variationWeights } from "../src/game/cell/division";
import { buyUpgrade, bumpFoodLoss, newCreature, type Creature } from "../src/game/cell/rules";
import { cellInfluence, cellLineage, newCellRecord } from "../src/game/cell/record";
import { foodSenseRadius, grantPerk, perkLevel, tickJet } from "../src/game/cell/perks";
import { creatureFromLineage, buyUpgrade as buyAquaticUpgrade } from "../src/game/aquatic/creature";

describe("cell division", () => {
  it("offers distinct inherited variations without mutating the parent or spending points", () => {
    const parent = { ...newCreature("carnivore"), form: 2, food: 3 };
    const offers = daughters(parent, newEvidence(), () => 0);
    expect(new Set(offers.map(d => d.stat)).size).toBe(3);
    expect(parent.ups.attack).toBe(0);
    expect(offers[0].creature).toMatchObject({ form: 2, food: 3, diet: "herbivore", ups: { attack: 2 }, parts: ["spikes"], points: { algae: 0, meat: 0 } });
    expect(offers.map(d => d.creature.diet)).toEqual(["herbivore", "carnivore", "omnivore"]);
    expect(offers.find(d => d.creature.diet === "carnivore")?.creature.parts).not.toContain("mouth");
  });
  it("keeps inherited stats and compatible parts when daughter diets differ", () => {
    const parent = { ...newCreature("herbivore"), form: 3, parts: ["mouth", "shell"] as const };
    const offers = daughters(parent, newEvidence(), () => 0.999);
    const meatEater = offers.find(d => d.creature.diet === "carnivore")!;
    expect(meatEater.creature.parts).not.toContain("mouth");
    expect(meatEater.creature.parts).toContain("shell");
    expect(meatEater.cause).toContain("Sheds the filter mouth");
    expect(offers.filter(d => d.creature.diet !== "carnivore").every(d => d.creature.parts.includes("mouth"))).toBe(true);
    expect(parent.parts).toEqual(["mouth", "shell"]);
  });
  it("biases variation with bounded evidence, while leaving other traits possible", () => {
    const weights = variationWeights({ ...newEvidence(), rams: 100000 });
    expect(weights.attack).toBeGreaterThan(weights.defense);
    expect(weights.attack).toBeLessThanOrEqual(5);
    expect(weights.defense).toBeGreaterThan(0);
    const low = daughters({ ...newCreature(), form: 2 }, { ...newEvidence(), rams: 10 }, () => 0);
    const high = daughters({ ...newCreature(), form: 2 }, { ...newEvidence(), rams: 10 }, () => 0.999);
    expect(low[0].stat).toBe("attack");
    expect(high[0].stat).toBe("mobility");
  });
  it("adds full daughter bonuses beyond the purchase cap and retains earlier traits", () => {
    const first = daughters({ ...newCreature(), form: 2 }, newEvidence(), () => 0)[0];
    const second = daughters({ ...first.creature, form: 3 }, newEvidence(), () => 0)[0];
    const third = daughters({ ...second.creature, form: 4 }, newEvidence(), () => 0)[0];
    expect(third.creature.ups.attack).toBe(6);
    expect(third.gain).toBe(2);
    expect(third.creature.parts).toContain("spikes");
  });
  it("exports chosen daughters and their causes without revealing temperament during cell play", () => {
    const d = daughters({ ...newCreature(), form: 2 }, { ...newEvidence(), rams: 3 }, () => 0)[0];
    const record = { ...newCellRecord(), selections: [{ form: 2, stat: d.stat, gain: d.gain, cause: d.cause }] };
    const lineage = cellLineage(d.creature, record);
    expect(lineage.species[0].stages.cell?.upgrades).toEqual(d.creature.ups);
    expect(lineage.species[0].stages.cell?.selections).toEqual(record.selections);
    expect(lineage.species[0].influence.some(e => e.cause.includes(d.cause))).toBe(true);
  });
  it("keeps purchased levels, compatible parts and unspent points across division", () => {
    const rich = { ...newCreature(), form: 2, points: { algae: 30, meat: 30 }, parts: ["shell"] as const };
    const purchase = buyUpgrade(rich, "attack");
    expect(purchase.ok).toBe(true);
    if (!purchase.ok) throw new Error("purchase should succeed");
    const offers = daughters(purchase.creature, newEvidence(), () => 0);
    for (const d of offers) {
      expect(d.creature.points).toEqual(purchase.creature.points);
      expect(d.creature.parts).toContain("shell");
      expect(d.creature.ups.attack).toBeGreaterThanOrEqual(1);
    }
    expect(offers[0].creature.ups.attack).toBe(3);
  });
  it("offers three distinct perks even when all stats have been purchased to the cap", () => {
    const parent = { ...newCreature(), form: 3, ups: { attack: 5, defense: 5, mobility: 5, speed: 5 } };
    const offers = daughters(parent, newEvidence(), () => 0);
    expect(new Set(offers.map(d => d.perk)).size).toBe(3);
    expect(offers.every(d => d.gain === 2 && d.creature.ups[d.stat] === 7)).toBe(true);
    expect(offers.every(d => !buyUpgrade({ ...d.creature, points: { algae: 1000, meat: 1000 } }, d.stat).ok)).toBe(true);
    expect(offers.every(d => perkLevel(d.creature, d.perk) === 1)).toBe(true);
    expect(parent.perks).toBeUndefined();
  });
  it("keeps capped stats eligible and preserves earlier perks", () => {
    const parent = grantPerk({ ...newCreature(), ups: { attack: 5, speed: 5, defense: 4, mobility: 5 } }, "jetBurst");
    const offers = daughters(parent, newEvidence(), () => 0);
    expect(offers[0].stat).toBe("attack");
    expect(offers[0].gain).toBe(2);
    expect(offers[0].creature.ups.attack).toBe(7);
    expect(offers.every(d => perkLevel(d.creature, "jetBurst") >= 1)).toBe(true);
    expect(perkLevel(offers[1].creature, "jetBurst")).toBe(2);
  });
  it("credits purchased and daughter levels once each in the lineage", () => {
    const c = { ...newCreature(), ups: { attack: 3, defense: 0, speed: 0, mobility: 0 } };
    const r = { ...newCellRecord(), selections: [{ form: 2, stat: "attack" as const, gain: 2, cause: "Stronger jaws" }] };
    const influences = cellInfluence(c, r);
    expect(influences.map(i => i.cause)).toContain("Your ancestor grew its attack to level 1");
    expect(influences.reduce((sum, i) => sum + (i.effect.aggressive ?? 0), 0)).toBeCloseTo(0.3);
    const evolved = grantPerk(c, "jetBurst");
    expect(cellLineage(evolved, r).species[0].stages.cell?.perks).toEqual({ jetBurst: 1 });
  });
  it("stacks three bonuses above level five and preserves level eleven in aquatic", () => {
    let parent = { ...newCreature(), ups: { attack: 5, speed: 0, defense: 0, mobility: 0 } };
    for (const form of [2, 3, 4]) {
      parent = daughters({ ...parent, form }, newEvidence(), () => 0)[0].creature;
    }
    expect(parent.ups.attack).toBe(11);
    expect(buyUpgrade({ ...parent, points: { algae: 1000, meat: 1000 } }, "attack")).toEqual({ ok: false, reason: "max" });
    const saved = cellLineage(parent, newCellRecord()).species[0].stages.cell;
    const aquatic = creatureFromLineage(saved, parent.diet);
    expect(aquatic.ups.attack).toBe(11);
    expect(buyAquaticUpgrade({ ...aquatic, points: { algae: 1000, meat: 1000 } }, "attack")).toEqual({ ok: false, reason: "max" });
  });
});

describe("daughter-exclusive perks", () => {
  it("does not grant perks through purchases and lets repeated choices improve them", () => {
    const c = { ...newCreature(), points: { algae: 100, meat: 100 } };
    const purchase = buyUpgrade(c, "mobility");
    expect(purchase.ok && purchase.creature.perks).toBeUndefined();
    const first = grantPerk(c, "foodSense");
    const second = grantPerk(first, "foodSense");
    expect(foodSenseRadius(second)).toBeGreaterThan(foodSenseRadius(first));
    expect(foodSenseRadius(c)).toBe(0);
    expect(perkLevel(grantPerk(grantPerk(second, "foodSense"), "foodSense"), "foodSense")).toBe(3);
  });
  it("reduces actual bump food loss without removing the stakes", () => {
    const c = { ...newCreature(), food: 30 };
    const protectedCell = grantPerk(c, "softLanding");
    expect(bumpFoodLoss(protectedCell, "gulper")).toBeLessThan(bumpFoodLoss(c, "gulper"));
    expect(bumpFoodLoss(protectedCell, "gulper")).toBeGreaterThan(0);
  });
  it("requires Jet Burst, starts on press, respects recharge and improves with rank", () => {
    const state = { remaining: 0, cooldown: 0 };
    expect(tickJet(newCreature(), state, 0, true)).toEqual(state);
    const c: Creature = grantPerk(newCreature(), "jetBurst");
    const start = tickJet(c, state, 0, true);
    expect(start.remaining).toBeGreaterThan(0);
    expect(start.cooldown).toBeGreaterThan(start.remaining);
    const spent = tickJet(c, start, start.remaining + 0.1, true);
    expect(spent.remaining).toBe(0);
    const ready = tickJet(c, spent, start.cooldown, false);
    expect(ready).toEqual(state);
    expect(tickJet(c, ready, 0, true).remaining).toBeGreaterThan(0);
    expect(tickJet(grantPerk(c, "jetBurst"), state, 0, true).cooldown).toBeLessThan(start.cooldown);
  });
});
