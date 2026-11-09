// ---------------------------------------------------------------------------
// aquaticGardener.test.ts
// Purpose : Locks what the Gardener's water temperature does (BAMF69 2026-11-08): the body your kin evolve is a real
//           trade-off (thick: health and toughness, slower; slender: speed and turning, less health), and the water
//           changes the lake now (warm: more food, faster and keener hunters; cold: less food, everyone slower, your
//           stamina refills slower). Medium bodies and mild water change nothing. Every effect has words.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { creatureFromLineage, damageTaken, maxHp, movement, stepStamina } from "../src/game/aquatic/creature";
import { bodyTraits, describeBody, describeWater, waterEffects } from "../src/game/aquatic/gardener";
import { AQ } from "../src/game/aquatic/tuning";

const { tempMin, tempMax } = AQ.lens;
const mild = AQ.population.neutralTemp;

describe("the body your kin evolve", () => {
  it("medium changes nothing", () => {
    expect(bodyTraits(0.5)).toEqual({ hp: 1, bite: 1, speed: 1, turn: 1 });
    expect(describeBody(0.5)).toMatch(/no edge/);
  });
  it("thick: more health, bites hurt less, slower", () => {
    const b = bodyTraits(1);
    expect(b.hp).toBeGreaterThan(1);
    expect(b.bite).toBeLessThan(1);
    expect(b.speed).toBeLessThan(1);
    expect(describeBody(1)).toMatch(/\+40 % health/);
  });
  it("slender: faster and turns better, less health", () => {
    const b = bodyTraits(0);
    expect(b.speed).toBeGreaterThan(1);
    expect(b.turn).toBeGreaterThan(1);
    expect(b.hp).toBeLessThan(1);
  });
  it("the creature uses it: health, bites, speed, turning", () => {
    const c = creatureFromLineage(null, "omnivore");
    const thick = { ...c, thickness: 1 }, slim = { ...c, thickness: 0 };
    expect(maxHp(thick)).toBeGreaterThan(maxHp(c));
    expect(damageTaken(thick, 20)).toBeLessThan(damageTaken(c, 20));
    expect(movement(slim).maxSpeed).toBeGreaterThan(movement(c).maxSpeed);
    expect(movement(slim).turnRate).toBeGreaterThan(movement(c).turnRate);
    expect(movement(thick).maxSpeed).toBeLessThan(movement(c).maxSpeed);
  });
});

describe("what the water does to the lake now", () => {
  it("mild water changes nothing", () => {
    const w = waterEffects(mild);
    for (const v of Object.values(w)) expect(v).toBeCloseTo(1);
    expect(describeWater(mild)).toMatch(/mild/);
  });
  it("warm: more food, faster and keener hunters", () => {
    const w = waterEffects(tempMax);
    expect(w.food).toBeGreaterThan(1);
    expect(w.hunterSpeed).toBeGreaterThan(1);
    expect(w.hunterSight).toBeGreaterThan(1);
    expect(describeWater(tempMax)).toMatch(/^warm/);
  });
  it("cold: less food, slower hunters and prey, slower stamina", () => {
    const w = waterEffects(tempMin);
    expect(w.food).toBeLessThan(1);
    expect(w.hunterSpeed).toBeLessThan(1);
    expect(w.preySpeed).toBeLessThan(1);
    expect(w.staminaRegen).toBeLessThan(1);
    expect(describeWater(tempMin)).toMatch(/^cold/);
  });
  it("stamina refills slower in cold water", () => {
    const c = { ...creatureFromLineage(null, "omnivore"), stamina: 10 };
    expect(stepStamina(c, "still", 1, waterEffects(tempMin).staminaRegen).stamina).toBeLessThan(stepStamina(c, "still", 1).stamina);
  });
});
