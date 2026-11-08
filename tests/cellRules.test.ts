// ---------------------------------------------------------------------------
// cellRules.test.ts
// Purpose : Locks the cell stage's rules (src/game/cell/rules.ts): growth, the two evolutions, part slots and
//           replacement, the parts' effects, diets, points and upgrades, and that a bump never punishes below zero.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import {
  accel, addPart, cellHitDamage, deathMeat, nextSpool, spoolTime, thrustAt, cellsWanted, heaviness, changeDiet, bumpDamage, drag, bumpFoodLoss, buyUpgrade, canEat, dropKinds, eat, eatFood, evolveNeed, foodValue,
  knockbackTaken, loseFood, upgradeTier, maxSpeed, newCreature, pullRadius, setDiet, spriteRow, upgradeCost, type Creature,
} from "../src/game/cell/rules";
import { TUNING, type Diet } from "../src/game/cell/tuning";

const at = (form: number, food = 0, parts: Creature["parts"] = [], diet: Diet = "herbivore"): Creature =>
  ({ ...newCreature(diet), form, food, parts });

describe("growth and evolution", () => {
  it("starts as form 1 with nothing", () => {
    const c = newCreature("carnivore");
    expect(c).toMatchObject({ form: 1, food: 0, parts: [], diet: "carnivore", points: { algae: 0, meat: 0 } });
    expect(Object.values(c.ups)).toEqual([0, 0, 0, 0]);
  });

  it("evolves when the meter reaches the need and keeps the leftover", () => {
    const need = TUNING.evolveFood[0];
    const r = eat(at(1, need - 1), 3);
    expect(r.evolved).toBe(true);
    expect(r.creature.form).toBe(2);
    expect(r.creature.food).toBe(2);
    expect(r.creature.diet).toBe("herbivore"); // evolving keeps everything else
  });

  it("evolves exactly twice, then stops", () => {
    let c = newCreature();
    let evolutions = 0;
    for (let i = 0; i < 500; i++) {
      const r = eat(c, 1);
      c = r.creature;
      if (r.evolved) evolutions++;
    }
    expect(evolutions).toBe(2);
    expect(c.form).toBe(TUNING.maxForm);
    expect(evolveNeed(c)).toBe(Infinity);
  });

  it("refuses negative food", () => {
    expect(() => eat(newCreature(), -1)).toThrow();
  });
});

describe("parts", () => {
  it("adds into a free slot", () => {
    const r = addPart(newCreature(), "spikes");
    expect(r.kind).toBe("added");
    expect(r.creature.parts).toEqual(["spikes"]);
  });

  it("replaces the oldest part when slots are full", () => {
    const r = addPart(at(2, 0, ["spikes", "shell"]), "mouth");
    expect(r.kind).toBe("replaced");
    if (r.kind === "replaced") expect(r.lost).toBe("spikes");
    expect(r.creature.parts).toEqual(["shell", "mouth"]);
  });

  it("turns a part you already have into food", () => {
    const r = addPart(at(1, 0, ["shell"]), "shell");
    expect(r.kind).toBe("duplicate");
    expect(r.creature.parts).toEqual(["shell"]);
  });

  it("form 3 holds all three parts", () => {
    let c = at(3);
    for (const p of ["spikes", "shell", "mouth"] as const) c = addPart(c, p).creature;
    expect(c.parts).toHaveLength(3);
    expect(spriteRow(c)).toEqual({ pose: "form3", direction: "s1h1m1" });
  });
});

describe("what parts do", () => {
  it("filter mouth doubles algae and pulls food in, but only if you can eat algae", () => {
    expect(foodValue(at(1), "algae", 1)).toBe(1);
    expect(foodValue(at(1, 0, ["mouth"]), "algae", 1)).toBe(TUNING.mouthFoodMult);
    expect(pullRadius(at(1))).toBe(0);
    expect(pullRadius(at(1, 0, ["mouth"]))).toBeGreaterThan(0);
    expect(pullRadius(at(1, 0, ["mouth"], "carnivore"))).toBe(0);
  });

  it("spikes and bigger forms hit harder", () => {
    expect(bumpDamage(at(1, 0, ["spikes"]))).toBeGreaterThan(bumpDamage(at(1)));
    expect(bumpDamage(at(3))).toBeGreaterThan(bumpDamage(at(1)));
  });

  it("the shell keeps food in", () => {
    expect(bumpFoodLoss(at(1, 10, ["shell"]), "snail")).toBeLessThan(bumpFoodLoss(at(1, 10), "snail"));
  });

  it("a bump never takes more food than you have, and never undoes a form", () => {
    expect(bumpFoodLoss(at(2, 1), "prickle")).toBe(1);
    expect(loseFood(at(2, 1), 5)).toEqual(at(2, 0));
  });
});

describe("diets", () => {
  it("herbivore eats only algae, carnivore only meat, omnivore both at half", () => {
    expect([canEat(at(1), "algae"), canEat(at(1), "meat")]).toEqual([true, false]);
    const carn = at(1, 0, [], "carnivore");
    expect([canEat(carn, "algae"), canEat(carn, "meat")]).toEqual([false, true]);
    const omni = at(1, 0, [], "omnivore");
    expect(foodValue(omni, "algae", 2)).toBe(1);
    expect(foodValue(omni, "meat", 2)).toBe(1);
  });

  it("food the diet cannot eat is left alone", () => {
    const r = eatFood(at(1, 5), "meat", 2, true);
    expect(r.eaten).toBe(false);
    expect(r.creature).toEqual(at(1, 5));
  });

  it("fresh food earns points of its kind, food knocked out of you does not", () => {
    const fresh = eatFood(at(1, 0, [], "omnivore"), "meat", 2, true);
    expect(fresh.creature.points).toEqual({ algae: 0, meat: 1 });
    expect(fresh.creature.food).toBe(1);
    const back = eatFood(at(1, 0, [], "omnivore"), "meat", 1, false);
    expect(back.creature.points).toEqual({ algae: 0, meat: 0 });
    expect(back.creature.food).toBe(0.5);
  });

  it("switching diet keeps form, food, parts and points", () => {
    const c = { ...at(2, 7, ["shell"]), points: { algae: 3, meat: 4 } };
    expect(setDiet(c, "carnivore")).toEqual({ ...c, diet: "carnivore" });
  });

  it("carnivores cannot take the filter mouth, and drop it when they switch", () => {
    const carn = at(1, 0, [], "carnivore");
    expect(addPart(carn, "mouth").kind).toBe("refused");
    expect(addPart(carn, "spikes").kind).toBe("added");
    const r = changeDiet(at(2, 0, ["mouth", "shell"], "omnivore"), "carnivore");
    expect(r.dropped).toEqual(["mouth"]);
    expect(r.creature.parts).toEqual(["shell"]);
  });

  it("a bump drops food you can eat", () => {
    expect(dropKinds(at(1), 2)).toEqual(["algae", "algae"]);
    expect(dropKinds(at(1, 0, [], "carnivore"), 1)).toEqual(["meat"]);
    expect(dropKinds(at(1, 0, [], "omnivore"), 3)).toEqual(["algae", "meat", "algae"]);
  });
});

describe("upgrades", () => {
  const rich = (c: Creature): Creature => ({ ...c, points: { algae: 100, meat: 100 } });

  it("meat buys attack and speed, algae buys defense and mobility", () => {
    const c = { ...at(1), points: { algae: 10, meat: 0 } };
    expect(buyUpgrade(c, "attack")).toEqual({ ok: false, reason: "points" });
    const r = buyUpgrade(c, "defense");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.creature.ups.defense).toBe(1);
      expect(r.creature.points.algae).toBe(10 - TUNING.upgradeCost[0]);
    }
  });

  it("costs rise per level and stop at the max level", () => {
    let c = rich(at(1));
    for (let i = 0; i < TUNING.upgradeCost.length; i++) {
      expect(upgradeCost(c, "speed")).toBe(TUNING.upgradeCost[i]);
      const r = buyUpgrade(c, "speed");
      if (!r.ok) throw new Error("expected to afford it");
      c = r.creature;
    }
    expect(upgradeCost(c, "speed")).toBeNull();
    expect(buyUpgrade(c, "speed")).toEqual({ ok: false, reason: "max" });
  });

  it("each upgrade changes its stat", () => {
    const base = at(1, 20);
    const up = (stat: "attack" | "speed" | "defense" | "mobility") => {
      const r = buyUpgrade(rich(base), stat);
      if (!r.ok) throw new Error("expected to afford it");
      return r.creature;
    };
    expect(bumpDamage(up("attack"))).toBe(bumpDamage(base) + TUNING.attackPerLevel);
    expect(maxSpeed(up("speed"))).toBeGreaterThan(maxSpeed(base));
    expect(accel(up("mobility"))).toBeGreaterThan(accel(base));
    expect(knockbackTaken(up("mobility"))).toBeLessThan(knockbackTaken(base));
    expect(drag(up("speed"))).toBeLessThan(drag(base));
    expect(drag(up("mobility"))).toBeGreaterThan(drag(base));
    const d = { ...up("defense"), ups: { ...up("defense").ups, defense: 5 } };
    expect(bumpFoodLoss(d, "snail")).toBeLessThan(bumpFoodLoss(base, "snail"));
  });
});

describe("upgrades are dramatic (playtest 2026-11-07)", () => {
  const maxed = (stat: "speed" | "mobility"): Creature => ({ ...at(1), ups: { ...at(1).ups, [stat]: TUNING.upgradeCost.length } });

  it("speed 5 doubles top speed, and drag no longer caps it", () => {
    const c = maxed("speed");
    expect(maxSpeed(c)).toBeCloseTo(2 * maxSpeed(at(1)));
    expect(accel(c) / drag(c)).toBeGreaterThan(maxSpeed(c)); // terminal velocity is above the cap
  });

  it("mobility 5 doubles acceleration at form 1", () => {
    expect(accel(maxed("mobility"))).toBeCloseTo(2 * accel(at(1)));
  });
});

describe("momentum (playtest 2026-11-08)", () => {
  const form = (f: number, mobility = 0): Creature => ({ ...at(f), ups: { ...at(f).ups, mobility } });
  const max = TUNING.upgradeCost.length;

  it("bigger forms are heavier: slower to start, stop and turn", () => {
    const h = [1, 2, 3].map((f) => heaviness(form(f)));
    expect(h[0]).toBeGreaterThan(1);
    expect(h[1]).toBeGreaterThan(h[0]);
    expect(h[2]).toBeGreaterThan(h[1]);
    expect(accel(form(3))).toBeLessThan(accel(form(1)));
    expect(drag(form(3))).toBeLessThan(drag(form(1)));
  });

  it("each mobility level lightens the cell", () => {
    for (let l = 1; l <= max; l++) expect(heaviness(form(2, l))).toBeLessThan(heaviness(form(2, l - 1)));
  });

  it("full mobility gives the snappy base handling at every form", () => {
    for (const f of [1, 2, 3]) {
      expect(heaviness(form(f, max))).toBe(1);
      expect(accel(form(f, max))).toBe(TUNING.player.accel);
      expect(drag(form(f, max))).toBe(TUNING.player.drag);
    }
  });

  it("momentum keeps top speed: terminal speed stays above the cap at every form", () => {
    for (const f of [1, 2, 3]) expect(accel(form(f)) / drag(form(f))).toBeGreaterThan(maxSpeed(form(f)));
  });
});

describe("upgrade looks", () => {
  it("levels 1, 3 and 5 grow the look; level 0 shows nothing", () => {
    expect([0, 1, 2, 3, 4, 5].map(upgradeTier)).toEqual([0, 1, 1, 2, 2, 3]);
  });
});

describe("predators (playtest 2026-11-07)", () => {
  it("gulpers multiply as you evolve; the small cells stay steady", () => {
    expect([1, 2, 3].map((f) => cellsWanted("gulper", f))).toEqual([1, 2, 3]);
    expect([1, 2, 3].map((f) => cellsWanted("snail", f))).toEqual([3, 3, 3]);
  });

  it("a gulper bite takes far more food than a small cell, and the shell still helps", () => {
    expect(bumpFoodLoss(at(1, 40), "gulper")).toBeGreaterThan(3 * bumpFoodLoss(at(1, 40), "snail"));
    expect(bumpFoodLoss(at(1, 40, ["shell"]), "gulper")).toBeLessThan(bumpFoodLoss(at(1, 40), "gulper"));
  });
});

describe("ramming (smoke 2026-11-07)", () => {
  it("being bitten only hurts the biter through your spikes", () => {
    expect(bumpDamage(at(3), false)).toBe(0);
    expect(bumpDamage(at(1, 0, ["spikes"]), false)).toBe(TUNING.spikeDamageBonus);
    expect(bumpDamage(at(1), true)).toBeGreaterThan(0);
  });
});

describe("pond cells bump each other (playtest 2026-11-08)", () => {
  it("a cell hits another for half of what its bump costs an unarmoured player", () => {
    const bare = newCreature("herbivore");
    const fed: Creature = { ...bare, food: 999 }; // so the food-loss cap does not hide the full bite
    for (const k of ["prickle", "snail", "sipper", "gulper"] as const) {
      expect(cellHitDamage(k)).toBeCloseTo((TUNING.bumpFoodLoss * TUNING.cell.kinds[k].bumpMult) / 2);
      expect(Math.round(cellHitDamage(k) * 2)).toBe(bumpFoodLoss(fed, k));
    }
  });

  it("a gulper outweighs the small cells, and the small cells cannot pop it in one bump", () => {
    expect(cellHitDamage("gulper")).toBeGreaterThan(cellHitDamage("prickle"));
    expect(cellHitDamage("prickle")).toBeLessThan(TUNING.cell.kinds.gulper.hp);
  });
});

describe("too easy (playtest 2026-11-08)", () => {
  const form = (f: number, mobility = 0): Creature => ({ ...at(f), ups: { ...at(f).ups, mobility } });
  const max = TUNING.upgradeCost.length;

  it("thrust builds up over spoolTime while you push, and resets when you let go", () => {
    const s = spoolTime(form(1));
    let spool = 0;
    for (let t = 0; t < s - 0.05; t += 0.01) spool = nextSpool(spool, true, 0.01, s);
    expect(spool).toBeLessThan(1);
    expect(thrustAt(0)).toBe(TUNING.player.spoolMinThrust);
    for (let i = 0; i < 10; i++) spool = nextSpool(spool, true, 0.01, s);
    expect(spool).toBe(1);
    expect(thrustAt(spool)).toBe(1);
    expect(nextSpool(spool, false, 0.01, s)).toBe(0);
  });

  it("bigger forms build up slower; full mobility is instant at every form", () => {
    expect(spoolTime(form(3))).toBeGreaterThan(spoolTime(form(1)));
    for (const f of [1, 2, 3]) expect(nextSpool(0, true, 0.001, spoolTime(form(f, max)))).toBe(1);
  });

  it("cells killed by the pond drop half their meat (at least 1); your kills drop it all", () => {
    expect(deathMeat("prickle", true)).toBe(TUNING.cell.kinds.prickle.meat);
    expect(deathMeat("prickle", false)).toBe(1);
    expect(deathMeat("gulper", false)).toBe(2);
  });
});
