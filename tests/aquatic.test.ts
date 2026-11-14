// ---------------------------------------------------------------------------
// aquatic.test.ts
// Purpose : Locks the aquatic Toy's pure core: the behind-view projection and view choice, the behind-you warning,
//           avatar physics (momentum, rising and sinking, breach, kick, dash), the population drifting with
//           temperature, and the temperament reveal. Stats and parts: tests/aquaticCreature.test.ts.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { dash, jump, newAvatar, steerAvatar } from "../src/game/aquatic/avatar";
import { creatureFromLineage, movement } from "../src/game/aquatic/creature";
import { average, fitness, mulberry32, newPopulation, nextGeneration } from "../src/game/aquatic/population";
import { revealFrom } from "../src/game/aquatic/reveal";
import { AQ } from "../src/game/aquatic/tuning";
import { cameraBehind, hiddenThreat, project, viewOf, wrapAngle } from "../src/game/aquatic/view";
import type { Lineage } from "../src/core/lineage";

const W = 640, H = 360, C = AQ.camera;

describe("behind-view projection", () => {
  const me = { x: 1000, y: 1000, z: 10, heading: 0 }; // facing +x, near the seabed
  const cam = cameraBehind(me, C);

  it("puts the camera behind the avatar, at its height plus the eye", () => {
    expect(cam.x).toBeCloseTo(1000 - C.back);
    expect(cam.y).toBeCloseTo(1000);
    expect(cam.z).toBeCloseTo(10 + C.eye);
  });

  it("a floor point straight ahead lands on the centre line, below the horizon", () => {
    const p = project(cam, 1300, 1000, 0, W, H, C);
    expect(p).not.toBeNull();
    expect(p!.sx).toBeCloseTo(W / 2);
    expect(p!.sy).toBeGreaterThan(H * C.horizon);
  });

  it("farther things are smaller and closer to the horizon", () => {
    const near = project(cam, 1100, 1000, 0, W, H, C)!;
    const far = project(cam, 1700, 1000, 0, W, H, C)!;
    expect(far.scale).toBeLessThan(near.scale);
    expect(far.sy).toBeLessThan(near.sy);
  });

  it("higher things are higher on screen; the surface is above the horizon from below", () => {
    const low = project(cam, 1300, 1000, 0, W, H, C)!;
    const high = project(cam, 1300, 1000, 120, W, H, C)!;
    expect(high.sy).toBeLessThan(low.sy);
    expect(project(cam, 1300, 1000, AQ.water.surface, W, H, C)!.sy).toBeLessThan(H * C.horizon);
  });

  it("right of the heading is right on screen (y grows downward on the lake)", () => {
    expect(project(cam, 1300, 1100, 0, W, H, C)!.sx).toBeGreaterThan(W / 2);
    expect(project(cam, 1300, 900, 0, W, H, C)!.sx).toBeLessThan(W / 2);
  });

  it("does not draw what is behind the camera or past the draw distance", () => {
    expect(project(cam, 800, 1000, 0, W, H, C)).toBeNull();
    expect(project(cam, cam.x + C.far + 10, 1000, 0, W, H, C)).toBeNull();
  });
});

describe("which side of a creature you see", () => {
  it("back when it swims away, front when it comes at you, side when it crosses", () => {
    expect(viewOf(0, 0).view).toBe("back");
    expect(viewOf(Math.PI, 0).view).toBe("front");
    expect(viewOf(Math.PI / 2, 0)).toEqual({ view: "side", flip: false });
    expect(viewOf(-Math.PI / 2, 0)).toEqual({ view: "side", flip: true });
  });
  it("wraps angles", () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-3 * Math.PI / 2)).toBeCloseTo(Math.PI / 2);
  });
});

describe("the behind-you warning (pillar 1)", () => {
  const me = { x: 0, y: 0, z: 100, heading: 0 };
  const R = AQ.warn.range, V = AQ.warn.viewHalfAngle, P = AQ.warn.viewHalfPitch;
  it("ignores threats in view or out of range", () => {
    expect(hiddenThreat(me, [{ x: 200, y: 0, z: 100 }], R, V, P)).toBeNull();
    expect(hiddenThreat(me, [{ x: -R - 10, y: 0, z: 100 }], R, V, P)).toBeNull();
  });
  it("names the edge a hidden threat comes from, stronger when closer", () => {
    expect(hiddenThreat(me, [{ x: -200, y: 0, z: 100 }], R, V, P)!.edge).toBe("behind");
    expect(hiddenThreat(me, [{ x: 0, y: 200, z: 100 }], R, V, P)!.edge).toBe("right");
    expect(hiddenThreat(me, [{ x: 0, y: -200, z: 100 }], R, V, P)!.edge).toBe("left");
    const far = hiddenThreat(me, [{ x: -300, y: 0, z: 100 }], R, V, P)!.strength;
    const close = hiddenThreat(me, [{ x: -100, y: 0, z: 100 }], R, V, P)!.strength;
    expect(close).toBeGreaterThan(far);
  });
  it("in front but far above or below the view counts too", () => {
    expect(hiddenThreat(me, [{ x: 60, y: 0, z: 260 }], R, V, P)!.edge).toBe("above");
    expect(hiddenThreat(me, [{ x: 60, y: 0, z: -60 }], R, V, P)!.edge).toBe("below");
  });
  it("warns about the nearest hidden threat", () => {
    expect(hiddenThreat(me, [{ x: -300, y: 0, z: 100 }, { x: 0, y: 150, z: 100 }], R, V, P)!.edge).toBe("right");
  });
});

describe("avatar physics", () => {
  const M = movement(creatureFromLineage(null, "omnivore"));
  const Wt = AQ.water;
  const still = { turn: 0, push: 0, rise: 0 };
  it("thrust builds up, so starting is slow and speed grows to the cap", () => {
    const a = newAvatar(0, 0, 50, 0);
    steerAvatar(a, { ...still, push: 1 }, 0.1, M, Wt);
    const early = a.vx;
    for (let i = 0; i < 40; i++) steerAvatar(a, { ...still, push: 1 }, 0.1, M, Wt);
    expect(a.vx).toBeGreaterThan(early * 5);
    expect(a.vx).toBeLessThanOrEqual(M.maxSpeed + 1e-6);
  });
  it("turning changes the heading at the turn rate", () => {
    const a = newAvatar(0, 0, 50, 0);
    steerAvatar(a, { ...still, turn: 1 }, 0.5, M, Wt);
    expect(a.heading).toBeCloseTo(M.turnRate * 0.5);
  });
  it("rises and sinks between the seabed and the surface, never out of the water by swimming", () => {
    const a = newAvatar(0, 0, 50, 0);
    for (let i = 0; i < 100; i++) steerAvatar(a, { ...still, rise: 1 }, 0.05, M, Wt);
    expect(a.z).toBe(Wt.surface);
    for (let i = 0; i < 200; i++) steerAvatar(a, { ...still, rise: -1 }, 0.05, M, Wt);
    expect(a.z).toBe(Wt.floorZ);
  });
  it("jump at the surface breaches: out of the water in an arc, then a splash back in", () => {
    const a = newAvatar(0, 0, Wt.surface, 0);
    expect(jump(a, Wt)).toBe("breach");
    let peak = 0, splash = false;
    for (let i = 0; i < 200 && !splash; i++) {
      splash = steerAvatar(a, still, 0.02, M, Wt) === "splash";
      peak = Math.max(peak, a.z);
    }
    expect(peak).toBeGreaterThan(Wt.surface + 50);
    expect(splash).toBe(true);
    expect(a.airborne).toBe(false);
  });
  it("jump underwater is a short kick up, on a cooldown", () => {
    const a = newAvatar(0, 0, 40, 0);
    expect(jump(a, Wt)).toBe("kick");
    expect(a.vz).toBeGreaterThan(0);
    expect(jump(a, Wt)).toBeNull();
  });
  it("dash bursts past top speed, then waits for its cooldown", () => {
    const a = newAvatar(0, 0, 50, 0);
    expect(dash(a, M)).toBe(true);
    for (let i = 0; i < 5; i++) steerAvatar(a, still, 0.05, M, Wt);
    expect(a.vx).toBeGreaterThan(M.maxSpeed);
    expect(dash(a, M)).toBe(false);
    for (let i = 0; i < 80; i++) steerAvatar(a, still, 0.05, M, Wt);
    expect(dash(a, M)).toBe(true);
  });
});

describe("population drifts with the water (Toy 3)", () => {
  const P = AQ.population;
  const run = (temp: number, gens: number) => {
    const rng = mulberry32(42);
    let pop = newPopulation(P, rng);
    const start = average(pop);
    let cause = "";
    for (let i = 0; i < gens; i++) ({ population: pop, cause } = nextGeneration(pop, temp, P, rng));
    return { start, end: average(pop), cause, generation: pop.generation };
  };
  it("cold water favours thick bodies, warm water slender ones", () => {
    expect(fitness(0.9, 4, P)).toBeGreaterThan(fitness(0.1, 4, P));
    expect(fitness(0.1, 24, P)).toBeGreaterThan(fitness(0.9, 24, P));
    expect(run(AQ.lens.tempMin, 12).end).toBeGreaterThan(run(AQ.lens.tempMax, 12).end + 0.2);
  });
  it("every generation names its cause (pillar 2)", () => {
    expect(run(4, 1).cause).toMatch(/cold \(4 °C\): thicker bodies/);
    expect(run(24, 1).cause).toMatch(/warm \(24 °C\): slender bodies/);
    expect(run(P.neutralTemp, 1).cause).toMatch(/mild/);
    expect(run(4, 3).generation).toBe(3);
  });
  it("never claims the water won when chance did (pillar 2)", () => {
    const pop = { generation: 0, thickness: [0.5, 0.5] };
    const flat = () => 0.25; // gaussian with u = 0.25: cos(pi / 2) = 0, so no mutation
    const r = nextGeneration(pop, 4, P, flat);
    expect(r.cause).toMatch(/too small to see/);
    let seed = 0;
    for (; seed < 200; seed++) { // find a cold generation where the average fell, and check the line admits it
      const rng = mulberry32(seed);
      const g = nextGeneration(newPopulation(P, rng), 4, P, rng);
      if (g.after < g.before - 0.01) { expect(g.cause).toMatch(/chance went the other way/); break; }
    }
    expect(seed).toBeLessThan(200);
  });

  it("the same seed gives the same lake", () => {
    expect(run(8, 5).end).toBe(run(8, 5).end);
  });
});

describe("temperament reveal (Toy 2)", () => {
  const lineage: Lineage = {
    schemaVersion: 1, lastStage: "cell", gardener: { harshness: 0 },
    species: [{
      id: "home", name: "", world: "home", origin: "played", status: "alive", diet: "carnivore", branches: [], stages: {},
      temperament: { cautious: 0, aggressive: 0, adaptable: 0 },
      influence: [
        { stage: "cell", cause: "Picked carnivore 3 times", effect: { aggressive: 0.3 } },
        { stage: "cell", cause: "Bought attack level 5", effect: { aggressive: 0.5 } },
        { stage: "cell", cause: "Escaped the gulpers 2 times", effect: { cautious: 0.1 } },
      ],
    }],
  };
  it("shows each temperament from the cause log, biggest causes first", () => {
    const r = revealFrom(lineage);
    expect(r.fromSave).toBe(true);
    const ag = r.rows.find((x) => x.kind === "aggressive")!;
    expect(ag.pct).toBe(89);
    expect(r.rows.reduce((sum, row) => sum + row.pct, 0)).toBe(100);
    expect(ag.causes).toEqual(["Bought attack level 5", "Picked carnivore 3 times"]);
    expect(r.leaning).toMatch(/aggressive/);
    expect(r.diet).toBe("carnivore");
  });
  it("no save: the default lineage, explained", () => {
    const r = revealFrom(null);
    expect(r.fromSave).toBe(false);
    expect(r.rows.reduce((sum, row) => sum + row.pct, 0)).toBe(100);
    expect(r.rows.every((x) => x.pct >= 33 && x.pct <= 34)).toBe(true);
    expect(r.problems).toEqual([]);
    expect(r.diet).toBe("omnivore");
  });
  it("a broken save is reported, never a crash", () => {
    const r = revealFrom({ schemaVersion: 99 });
    expect(r.fromSave).toBe(false);
    expect(r.problems.length).toBeGreaterThan(0);
  });
});

describe("the same opening for the later stages (BAMF69 2026-11-09)", () => {
  it("each stage words its title and leaning; the default lineage says so", () => {
    const creature = revealFrom(null, 3, "creature"), civ = revealFrom(null, 3, "civ");
    expect(creature.leaning).toMatch(/land will decide/);
    expect(civ.leaning).toMatch(/your people will decide/);
    expect(revealFrom(null).leaning).not.toMatch(/land/);
  });
});
