// ---------------------------------------------------------------------------
// aquaticCreature.test.ts
// Purpose : Locks the aquatic creature's rules (playtest 2026-11-08): five stats whose max doubles from the cell
//           stage (5 -> 10) and start at the cell's final levels; plant/meat points by diet; three forms; the new
//           parts; damage, defense and what dying costs.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import {
  addPart, buyUpgrade, canAbility, canGoFast, creatureFromLineage, outOfBreath, maxStamina, pay, paceSpeed, spendAbility, stepStamina, damageTaken, dieAndCarryOn, eatFood, heaviness, maxHp, maxLevel, movement,
  ramDamage, takeHit, upgradeCost, type AqCreature,
} from "../src/game/aquatic/creature";
import { critterIntent, homeZ, schoolTarget } from "../src/game/aquatic/critters";
import { seabedContact } from "../src/game/aquatic/seabed";
import { TUNING as CELL } from "../src/game/cell/tuning";
import { AQ, AQ_STATS, KINDS } from "../src/game/aquatic/tuning";

const fresh = (diet = "omnivore") => creatureFromLineage(null, diet);
const rich = (c: AqCreature): AqCreature => ({ ...c, points: { algae: 9999, meat: 9999 } });

describe("stats carry over and their max doubles", () => {
  it("the max is the cell stage's max times two", () => {
    expect(maxLevel()).toBe(CELL.upgradeCost.length * 2);
    expect(maxLevel()).toBe(10);
    expect(AQ.stats.upgradeCost.length).toBe(maxLevel());
  });
  it("starts at the cell's final upgrade levels; health is new and starts at 0", () => {
    const c = creatureFromLineage({ upgrades: { attack: 5, speed: 2, defense: 0, mobility: 3 } }, "carnivore");
    expect(c.ups).toEqual({ attack: 5, speed: 2, defense: 0, mobility: 3, health: 0 });
    expect(c.diet).toBe("carnivore");
    expect(c.hp).toBe(maxHp(c));
  });
  it("a default or broken lineage is a fresh omnivore", () => {
    expect(creatureFromLineage(null, "???").ups).toEqual(Object.fromEntries(AQ_STATS.map((s) => [s, 0])));
    expect(creatureFromLineage({ upgrades: { attack: 99 } }, "x").ups.attack).toBe(10);
  });
  it("buys up to level 10 with the right points, then stops", () => {
    let c = rich(fresh());
    for (let i = 0; i < 10; i++) {
      const r = buyUpgrade(c, "attack");
      expect(r.ok).toBe(true);
      if (r.ok) c = r.creature;
    }
    expect(c.ups.attack).toBe(10);
    expect(upgradeCost(c, "attack")).toBeNull();
    expect(buyUpgrade(c, "attack")).toEqual({ ok: false, reason: "max" });
    expect(buyUpgrade({ ...fresh(), points: { algae: 0, meat: 99 } }, "defense")).toEqual({ ok: false, reason: "points" });
  });
  it("health takes plant or meat or a mix; the bigger pool pays first", () => {
    const cost = AQ.stats.upgradeCost[0];
    expect(buyUpgrade({ ...fresh(), points: { algae: 0, meat: cost } }, "health").ok).toBe(true);
    expect(buyUpgrade({ ...fresh(), points: { algae: cost, meat: 0 } }, "health").ok).toBe(true);
    expect(buyUpgrade({ ...fresh(), points: { algae: 2, meat: cost - 2 } }, "health").ok).toBe(true);
    expect(buyUpgrade({ ...fresh(), points: { algae: 1, meat: cost - 2 } }, "health")).toEqual({ ok: false, reason: "points" });
    expect(pay({ algae: 3, meat: 10 }, "health", 5)).toEqual({ algae: 3, meat: 5 });
    expect(pay({ algae: 3, meat: 4 }, "health", 6)).toEqual({ algae: 1, meat: 0 });
    expect(pay({ algae: 9, meat: 9 }, "attack", 5)).toEqual({ algae: 9, meat: 4 });
  });
  it("health levels raise max health and heal", () => {
    const c = fresh();
    const r = buyUpgrade(rich(c), "health");
    if (!r.ok) throw new Error("expected to afford it");
    expect(maxHp(r.creature)).toBe(maxHp(c) + AQ.stats.hpPerLevel);
    expect(r.creature.hp).toBe(c.hp + AQ.stats.hpPerLevel);
  });
});

describe("eating, points and growing", () => {
  it("every food pickup heals 1 hp, up to the max", () => {
    const c = { ...fresh("omnivore"), hp: 10 };
    expect(eatFood(c, "algae", 1).creature.hp).toBe(10 + AQ.food.heal);
    expect(eatFood(fresh("omnivore"), "algae", 1).creature.hp).toBe(maxHp(fresh()));
    expect(eatFood({ ...fresh("carnivore"), hp: 10 }, "algae", 1).creature.hp).toBe(10); // could not eat it: no heal
  });
  it("the diet decides what counts, as in the cell stage", () => {
    expect(eatFood(fresh("herbivore"), "meat", 2).eaten).toBe(false);
    expect(eatFood(fresh("carnivore"), "algae", 1).eaten).toBe(false);
    const r = eatFood(fresh("omnivore"), "algae", 2);
    expect(r.creature.points.algae).toBe(1);
    expect(r.creature.food).toBe(1);
  });
  it("food grows you into the next form, with full health and a bigger body", () => {
    const r = eatFood({ ...fresh("herbivore"), food: AQ.forms.foodToEvolve[0] - 1 }, "algae", 1);
    expect(r.evolved).toBe(true);
    expect(r.creature.form).toBe(2);
    expect(r.creature.hp).toBe(maxHp(r.creature));
    expect(r.creature.hp).toBeGreaterThan(maxHp(fresh()));
  });
});

describe("parts (all new in the aquatic stage)", () => {
  it("slots grow with the form; a full set swaps out the oldest; a duplicate becomes food", () => {
    let c = fresh();
    c = addPart(c, "fins").creature;
    const r = addPart(c, "jaws");
    expect(r.kind).toBe("replaced");
    if (r.kind === "replaced") expect(r.lost).toBe("fins");
    const big = { ...fresh(), form: 3 };
    expect(addPart(addPart(big, "fins").creature, "jaws").creature.parts).toEqual(["fins", "jaws"]);
    expect(addPart(addPart(big, "fins").creature, "fins").kind).toBe("duplicate");
  });
  it("each part does its job", () => {
    const c = fresh();
    expect(ramDamage({ ...c, parts: ["jaws"] })).toBe(ramDamage(c) + AQ.parts.jawsDamage);
    expect(damageTaken({ ...c, parts: ["plates"] }, 20)).toBeLessThan(damageTaken(c, 20));
    expect(heaviness({ ...c, parts: ["fins"] })).toBeLessThan(heaviness(c));
    expect(movement({ ...c, parts: ["gills"] }).dashCdS).toBeLessThan(movement(c).dashCdS);
  });
});

describe("stats change how you play", () => {
  const at = (stat: (typeof AQ_STATS)[number], lvl: number) => ({ ...fresh(), ups: { ...fresh().ups, [stat]: lvl } });
  it("speed 10 doubles top speed; mobility 10 is the snappiest handling; defense 10 halves bites", () => {
    expect(movement(at("speed", 10)).maxSpeed).toBeCloseTo(2 * movement(fresh()).maxSpeed);
    expect(heaviness(at("mobility", 10))).toBe(1);
    expect(damageTaken(at("defense", 10), 20)).toBeCloseTo(10);
    expect(ramDamage(at("attack", 10))).toBe(ramDamage(fresh()) + 10 * AQ.stats.attackPerLevel);
  });
});

describe("critters (a fuller, deadlier lake)", () => {
  const you = { x: 0, y: 0, z: 100 };
  const near = (z = 100) => ({ x: 100, y: 0, z });
  const wander = { x: 0, y: 1 };
  it("darters and finrays flee you; spinefish chase you; shellbacks only once rammed", () => {
    expect(critterIntent(KINDS.darter, near(), you, false, wander).mode).toBe("flee");
    expect(critterIntent(KINDS.finray, near(180), { ...you, z: 180 }, false, wander).mode).toBe("flee");
    const spine = critterIntent(KINDS.spinefish, near(), you, false, wander);
    expect(spine.mode).toBe("chase");
    expect(spine.dir.x).toBeLessThan(0);
    expect(critterIntent(KINDS.shellback, near(10), { ...you, z: 10 }, false, wander).mode).toBe("wander");
    expect(critterIntent(KINDS.shellback, near(10), { ...you, z: 10 }, true, wander).mode).toBe("chase");
  });
  it("a hunter follows you up and down, but not far out of its band", () => {
    const i = critterIntent(KINDS.spinefish, near(), { ...you, z: 199 }, false, wander);
    expect(i.targetZ).toBeLessThanOrEqual(KINDS.spinefish.zMax + 30);
    expect(i.targetZ).toBeGreaterThan(KINDS.spinefish.zMax);
  });
  it("a darter school picks the nearest bigger fish in range, or nobody", () => {
    const centre = { x: 0, y: 0, z: 100 };
    const fish = [{ id: 1, x: 300, y: 0, z: 100 }, { id: 2, x: 120, y: 0, z: 100 }, { id: 3, x: 50, y: 0, z: 500 }];
    expect(schoolTarget(centre, fish, 320)?.id).toBe(2);
    expect(schoolTarget(centre, fish, 100)).toBeNull();
  });
  it("out of its band and calm, it drifts home", () => {
    expect(critterIntent(KINDS.shellback, { x: 900, y: 0, z: 120 }, you, false, wander).targetZ).toBe(homeZ(KINDS.shellback));
  });
});

describe("getting hurt and dying (stakes rise from the cell stage)", () => {
  it("bites cost health; at 0 you die", () => {
    const c = fresh();
    const r = takeHit(c, c.hp + 1);
    expect(r.died).toBe(true);
    expect(r.creature.hp).toBe(0);
    expect(takeHit(c, 5).died).toBe(false);
  });
  it("a relative carries on: full health, half the food progress and the newest part lost, upgrades and form kept", () => {
    const c: AqCreature = { ...fresh(), form: 2, food: 40, parts: ["fins", "jaws"], ups: { ...fresh().ups, attack: 4 }, hp: 0 };
    const r = dieAndCarryOn(c);
    expect(r.lostPart).toBe("jaws");
    expect(r.creature).toMatchObject({ form: 2, food: 20, parts: ["fins"], hp: maxHp(r.creature) });
    expect(r.creature.ups.attack).toBe(4);
  });
});

describe("stamina (BAMF69 2026-11-08)", () => {
  const S = AQ.stamina;
  it("full speed drains it fast, cruising refills it slowly, holding still refills it fast", () => {
    const c = fresh();
    expect(c.stamina).toBe(S.max);
    const drained = stepStamina(c, "fast", 1);
    expect(drained.stamina).toBeCloseTo(S.max - S.fastDrain);
    const low = { ...c, stamina: 10 };
    expect(stepStamina(low, "still", 1).stamina - 10).toBeGreaterThan(stepStamina(low, "cruise", 1).stamina - 10);
    expect(stepStamina(c, "still", 5).stamina).toBe(S.max); // never past the max
  });
  it("you cannot sprint on empty: full speed falls back to cruise", () => {
    expect(paceSpeed({ ...fresh(), stamina: 0 }, true, true)).toEqual({ pace: "cruise", mult: S.cruiseMult });
    expect(paceSpeed(fresh(), true, true)).toEqual({ pace: "fast", mult: 1 });
    expect(paceSpeed(fresh(), true, false).pace).toBe("still");
  });
  it("dash and breach need and use 50 stamina, even with the endurance muscle", () => {
    const c = fresh();
    expect(canAbility(c)).toBe(true);
    const after = spendAbility(c);
    expect(after.stamina).toBeCloseTo(S.max - S.abilityCost);
    expect(canAbility(after)).toBe(true);
    expect(canAbility(spendAbility(after))).toBe(false);
    const big = addPart(fresh(), "endurance").creature; // 200 stamina: four uses, not two
    expect(spendAbility(big).stamina).toBe(maxStamina(big) - S.abilityCost);
  });
  it("the endurance muscle doubles stamina", () => {
    const c = addPart(fresh(), "endurance").creature;
    expect(maxStamina(c)).toBe(S.max * 2);
    expect(c.stamina).toBe(S.max * 2);
  });
});

describe("river parts have their own slots", () => {
  it("on top of a full set of normal parts, and kept when you die", () => {
    let c: AqCreature = { ...fresh(), form: 3 };
    for (const p of ["fins", "jaws", "plates"] as const) c = addPart(c, p).creature;
    c = addPart(c, "endurance").creature;
    c = addPart(c, "torrent").creature;
    expect(c.parts).toEqual(["fins", "jaws", "plates"]);
    expect(c.uniques).toEqual(["endurance", "torrent"]);
    expect(addPart(c, "torrent").kind).toBe("duplicate");
    const r = dieAndCarryOn(c);
    expect(r.lostPart).toBe("plates");
    expect(r.creature.uniques).toEqual(["endurance", "torrent"]);
    expect(r.creature.stamina).toBe(maxStamina(r.creature));
  });
});

describe("stamina thresholds (BAMF69 2026-11-08)", () => {
  const S = AQ.stamina;
  it("below the minimum you are out of breath and cannot switch to full speed", () => {
    expect(outOfBreath({ ...fresh(), stamina: S.minFast - 1 })).toBe(true);
    expect(canGoFast({ ...fresh(), stamina: S.minFast - 1 })).toBe(false);
    expect(canGoFast({ ...fresh(), stamina: S.minFast })).toBe(true);
  });
  it("full speed drains half as fast as first built, cruising refills twice as fast", () => {
    expect(S.fastDrain).toBe(9);
    expect(S.cruiseRegen).toBe(10);
  });
  it("upgrades sit between the cheap and the first prices, nearer the cheap ones", () => {
    const first = [5, 9, 14, 20, 27, 35, 44, 54, 65, 77], cheap = [3, 5, 8, 11, 15, 19, 24, 30, 36, 43];
    const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
    const now = sum(AQ.stats.upgradeCost);
    expect(now).toBeGreaterThan(sum(cheap));
    expect(now).toBeLessThan((sum(first) + sum(cheap)) / 2);
    AQ.stats.upgradeCost.forEach((c, i) => expect(c).toBeGreaterThanOrEqual(cheap[i]));
  });
});

describe("seabed (BAMF69 2026-11-08)", () => {
  const T = AQ.seabed;
  const you = (x: number, z = 10) => ({ x, y: 0, z, size: 26 });
  it("a rock pushes you away from it, without damage; above it you pass", () => {
    const e = seabedContact(you(10), [{ kind: "rock", x: 0, y: 0 }], T);
    expect(e.push!.x).toBeGreaterThan(0);
    expect(seabedContact(you(10, T.rockHeight + 5), [{ kind: "rock", x: 0, y: 0 }], T).push).toBeNull();
    expect(seabedContact(you(300), [{ kind: "rock", x: 0, y: 0 }], T).push).toBeNull();
  });
  it("seaweed tangles you when you swim low through it", () => {
    expect(seabedContact(you(5), [{ kind: "weed", x: 0, y: 0 }], T).tangled).toBe(true);
    expect(seabedContact(you(5, T.weedHeight + 5), [{ kind: "weed", x: 0, y: 0 }], T).tangled).toBe(false);
  });
});

describe("bigger rewards (BAMF69 2026-11-08)", () => {
  it("large meat and plant pods are worth more than the small food; the big enemies drop the big chunks", () => {
    expect(AQ.food.meatL).toBeGreaterThan(AQ.food.meatM);
    expect(AQ.food.meatM).toBeGreaterThan(AQ.food.meat);
    expect(AQ.food.pod).toBeGreaterThan(AQ.food.algae);
    expect(KINDS.deepmaw.chunk).toBe("meatL");
    expect(KINDS.shellback.chunk).toBe("meatL");
    expect(KINDS.spinefish.chunk).toBe("meatM");
  });
});
