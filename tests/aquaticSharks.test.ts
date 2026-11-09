// ---------------------------------------------------------------------------
// aquaticSharks.test.ts
// Purpose : Locks the sharks' rules (BAMF69 2026-11-08): hunt on sight until you breach or get far away; relentless
//           below half health (lake medium, coast large); merciful below half health unless you are close (coast
//           mediums); a bite makes it peel off; the medium is faster and deadlier than the deepmaw, the large slower
//           and deadlier still.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { newSharkBrain, sharkBit, sharkThink, type SharkBrain } from "../src/game/aquatic/sharks";
import { KINDS, MAPS, SHARKS, SHARK_MIND } from "../src/game/aquatic/tuning";

const M = SHARKS.medium;
const lake = { relentlessLow: true, mercyLow: false };
const coastMedium = { relentlessLow: false, mercyLow: true };
const me = { x: 0, y: 0, z: 100 };
const you = (x: number, hpFrac = 1, airborne = false) => ({ x, y: 0, z: 100, airborne, hpFrac });
const step = (b: SharkBrain, x: number, rules = lake, hp = 1, air = false) => sharkThink(b, me, you(x, hp, air), 0.1, M, rules, SHARK_MIND);

describe("shark mind", () => {
  it("roams until it notices you, then hunts", () => {
    expect(step(newSharkBrain(), M.sight + 50).mode).toBe("roam");
    expect(step(newSharkBrain(), M.sight - 50).mode).toBe("hunt");
  });
  it("a hunt ends when you breach, or get far away", () => {
    const hunting: SharkBrain = { mode: "hunt", timer: 0 };
    expect(step(hunting, 300, lake, 1, true).mode).toBe("rest");
    expect(step(hunting, M.loseDist + 10).mode).toBe("roam");
    expect(step(hunting, M.loseDist - 10).mode).toBe("hunt");
  });
  it("relentless below half health: it hunts you from anywhere and never gives up", () => {
    expect(step(newSharkBrain(), 5000, lake, 0.4).mode).toBe("hunt");
    expect(step({ mode: "hunt", timer: 0 }, 5000, lake, 0.4).mode).toBe("hunt");
  });
  it("merciful below half health: it leaves you alone unless you get too close", () => {
    expect(step(newSharkBrain(), M.sight - 50, coastMedium, 0.4).mode).toBe("roam");
    expect(step({ mode: "hunt", timer: 0 }, M.closeDist + 20, coastMedium, 0.4).mode).toBe("roam");
    expect(step(newSharkBrain(), M.closeDist - 20, coastMedium, 0.4).mode).toBe("hunt");
  });
  it("after a bite it peels off for a moment, then roams", () => {
    let b = sharkBit({ mode: "hunt", timer: 0 }, SHARK_MIND);
    expect(step(b, 100).mode).toBe("rest");
    for (let i = 0; i < SHARK_MIND.biteRestS * 10 + 2; i++) b = step(b, 100);
    expect(b.mode).not.toBe("rest");
  });
});

describe("shark numbers and placement", () => {
  it("the medium shark is bigger and faster than the lake's deepmaw; the large one slower but deadliest", () => {
    const lakeMap = MAPS.find((m) => m.id === "lake")!;
    expect(M.size).toBeGreaterThan(KINDS.deepmaw.size * lakeMap.mult.size);
    expect(M.speed).toBeGreaterThan(KINDS.deepmaw.speed);
    expect(M.bite).toBeGreaterThan(KINDS.deepmaw.bite * lakeMap.mult.bite); // more dangerous than the lake's deepmaw
    expect(SHARKS.large.speed).toBeLessThan(M.speed);
    expect(SHARKS.large.bite).toBeGreaterThan(M.bite * 2);
  });
  it("one medium shark in the lake; several mediums and one large on the coast; none in the pond", () => {
    const [pond, lakeMap, ocean] = MAPS;
    expect(pond.sharks.length).toBe(0);
    expect(lakeMap.sharks).toEqual([{ kind: "medium", count: 1, ...lake }]);
    const med = ocean.sharks.find((s) => s.kind === "medium")!;
    expect(med).toMatchObject(coastMedium);
    expect(med.count).toBeGreaterThan(1);
    expect(ocean.sharks.find((s) => s.kind === "large")).toMatchObject({ count: 1, ...lake });
  });
});
