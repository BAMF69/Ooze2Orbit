import { describe, expect, it } from "vitest";
import { creatureFromLineage, maxHp } from "../src/game/aquatic/creature";
import { newSisterColony, seedSisters, sisterIntent, stepSisters, type SisterPlayer } from "../src/game/aquatic/sisters";
import { packRun, unpackRun, type AqRun } from "../src/game/aquatic/runSave";
import { AQ, MAPS } from "../src/game/aquatic/tuning";

const body = (diet = "herbivore") => ({ ...creatureFromLineage(null, diet), form: 2 });
const origin = { x: 600, y: 600, z: 60 };
const player = (): SisterPlayer => ({ x: 1500, y: 1500, z: 60, vx: 0, vy: 0, vz: 0, body: body(), dashing: false });
const colony = (diet = "herbivore", home = 0) => {
  const c = newSisterColony(); seedSisters(c, [body(diet)], home, origin, () => 0); return c;
};

describe("map-bound sister ecology", () => {
  it("inherits real variants and keeps family identity and permanent home map", () => {
    const c = newSisterColony();
    const variant = { ...body("carnivore"), parts: ["jaws"] as ("jaws")[], uniques: ["endurance"] as ("endurance")[],
      ups: { attack: 12, speed: 4, defense: 2, mobility: 1, health: 3 } };
    const born = seedSisters(c, [variant, body()], 1, { x: -100, y: 99999, z: 999 }, () => 0);
    expect(born).toHaveLength(2);
    expect(born[0].body.ups).toEqual(variant.ups);
    expect(born[0].body.parts).toEqual(["jaws"]);
    expect(born[0].body.uniques).toEqual(["endurance"]);
    expect(born[0].family).not.toBe(born[1].family);
    expect(born.every(s => s.home === 1 && s.x >= 0 && s.y <= MAPS[1].width && s.z < MAPS[1].surface)).toBe(true);
    expect(variant.form).toBe(2);
  });
  it("seeks only edible shared food and protects newborns from immediate aggression", () => {
    const c = colony(), s = c.members[0];
    const p = { ...player(), x: s.x + 20, y: s.y };
    const foods = [{ ...s, id: 1, food: "meat" as const, base: 2 }, { id: 2, x: s.x + 40, y: s.y, z: s.z, food: "algae" as const, base: 1 }];
    expect(sisterIntent(s, foods, p).food?.id).toBe(2);
    s.body.diet = "carnivore";
    expect(sisterIntent(s, [], p).intent).toBe("wander");
    s.grace = 0;
    expect(sisterIntent(s, [], p).intent).toBe("hunt");
  });
  it("removes a shared food item once even when two sisters reach it together", () => {
    const c = colony(); seedSisters(c, [body()], 0, origin, () => 0);
    Object.assign(c.members[1], { x: c.members[0].x, y: c.members[0].y, z: c.members[0].z });
    const food = { ...c.members[0], id: 7, food: "algae" as const, base: 1 };
    const events = stepSisters(c, 0, [food], player(), 0, () => 0);
    expect(events.eaten).toEqual([7]);
    expect(c.members.reduce((sum, s) => sum + s.body.food, 0)).toBe(1);
  });
  it("grows and replaces a fed sister with three inherited descendants on the same map", () => {
    const c = colony(), mother = c.members[0];
    mother.body.food = AQ.forms.foodToEvolve[1] - 1;
    const food = { ...mother, id: 1, food: "algae" as const, base: 1 };
    const events = stepSisters(c, 0, [food], player(), 0, () => 0);
    expect(events.births).toBe(3);
    expect(c.members).toHaveLength(3);
    expect(c.members.every(s => s.parent === mother.id && s.family === mother.family && s.generation === 1 && s.home === 0 && s.body.form === 3)).toBe(true);
    expect(new Set(c.members.map(s => s.body.diet)).size).toBe(3);
    expect(c.members.some(s => s.id === mother.id)).toBe(false);
  });
  it("lets full-grown sisters reproduce again without growing a fifth form", () => {
    const c = colony(), mother = c.members[0];
    mother.body.form = 4; mother.body.food = AQ.sisters.adultFood - 1;
    const events = stepSisters(c, 0, [{ ...mother, id: 1, food: "algae", base: 1 }], player(), 0, () => 0);
    expect(events.births).toBe(3);
    expect(c.members.every(s => s.body.form === 4)).toBe(true);
  });
  it("holds a full meter when crowded and divides once enough space becomes available", () => {
    const c = newSisterColony();
    seedSisters(c, Array.from({ length: AQ.sisters.maxPerMap - AQ.sisters.founderReserve }, () => body()), 0, origin, () => 0);
    c.members[0].ready = true;
    expect(stepSisters(c, 0, [], player(), 0, () => 0).births).toBe(0);
    expect(c.members[0].ready).toBe(true);
    c.members.splice(1, 2);
    expect(stepSisters(c, 0, [], player(), 0, () => 0).births).toBe(3);
    expect(c.members).toHaveLength(AQ.sisters.maxPerMap - AQ.sisters.founderReserve);
    expect(seedSisters(c, [body(), body()], 0, origin, () => 0)).toHaveLength(2);
  });
  it("does not advance or move populations on an inactive map", () => {
    const c = colony("omnivore", 0), before = JSON.parse(JSON.stringify(c));
    stepSisters(c, 2, [], player(), 10, () => 0);
    expect(c).toEqual(before);
  });
});

describe("readable sister combat", () => {
  it("warns before a bite and respects recovery time between hits", () => {
    const c = colony("carnivore"), s = c.members[0];
    s.grace = 0;
    const p = { ...player(), x: s.x + 1, y: s.y, z: s.z };
    expect(stepSisters(c, 0, [], p, 0, () => 0).hits).toHaveLength(0);
    expect(s.windup).toBe(AQ.sisters.attackWindupS);
    const hit = stepSisters(c, 0, [], p, AQ.sisters.attackWindupS, () => 0);
    expect(hit.hits).toHaveLength(1);
    expect(hit.hits[0].bite).toBe(true);
    expect(hit.hits[0].damage).toBeGreaterThan(0);
    expect(stepSisters(c, 0, [], p, 0, () => 0).hits).toHaveLength(0);
  });
  it("cancels a telegraphed attack when the player escapes and suppresses newborn damage", () => {
    const c = colony("carnivore"), s = c.members[0];
    const p = { ...player(), x: s.x, y: s.y, z: s.z };
    expect(stepSisters(c, 0, [], p, 0, () => 0).hits).toHaveLength(0);
    expect(s.windup).toBe(0);
    s.grace = 0; stepSisters(c, 0, [], p, 0, () => 0);
    stepSisters(c, 0, [], player(), 0.1, () => 0);
    expect(s.windup).toBe(0);
  });
  it("lets the player ram a sister to death and frees its population slot", () => {
    const c = colony(), s = c.members[0]; s.grace = 0; s.body.hp = 1;
    const p = { ...player(), x: s.x - 5, y: s.y, z: s.z, vx: 100, dashing: true };
    const events = stepSisters(c, 0, [], p, 0, () => 0);
    expect(events.deaths).toHaveLength(1);
    expect(events.deaths[0].byPlayer).toBe(true);
    expect(c.members).toHaveLength(0);
  });
});

describe("saved sister habitats", () => {
  const run = (): AqRun => ({ map: 1, me: body(), tempC: 14, pop: { generation: 0, thickness: [0.5] },
    causes: [], temper: { aggressive: 0, cautious: 0, adaptable: 0 }, kills: 0, deaths: 0, breaches: 0 });
  it("keeps every home map, lineage, health, growth and unique ID through Continue/export data", () => {
    const c = colony(); seedSisters(c, [body("carnivore")], 2, origin, () => 0);
    c.members[0].body.ups.health = 17; c.members[0].body.hp = maxHp(c.members[0].body);
    c.members[0].body.food = 27; c.members[0].generation = 8;
    const packed = packRun({ ...run(), sisters: c });
    const restored = unpackRun(JSON.parse(JSON.stringify(packed))).run!.sisters!;
    expect(restored.members.map(s => s.home)).toEqual([0, 2]);
    expect(restored.members[0].body.ups.health).toBe(17);
    expect(restored.members[0].body.food).toBe(27);
    expect(restored.members[0].generation).toBe(8);
    expect(restored.nextId).toBe(c.nextId);
    c.members[0].x = 0;
    expect((packed.sisters as typeof c).members[0].x).not.toBe(0);
    expect(unpackRun(packRun(run())).run?.sisters).toBeUndefined();
  });
  it("drops invalid maps, duplicate IDs and dead bodies, and bounds imported positions and populations", () => {
    const c = colony(), s = c.members[0];
    const packed = packRun({ ...run(), sisters: { nextId: 1, members: [s, { ...s }, { ...s, id: 2, home: 99 },
      { ...s, id: 3, body: { ...s.body, hp: 0 } }, { ...s, id: 4, x: -999, y: 99999 }] } });
    const restored = unpackRun(packed).run!.sisters!;
    expect(restored.members.map(s => s.id)).toEqual([1, 4]);
    expect(restored.members[1].x).toBe(0);
    expect(restored.members[1].y).toBe(MAPS[0].width);
    expect(restored.nextId).toBe(5);
  });
});
