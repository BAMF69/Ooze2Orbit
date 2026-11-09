// ---------------------------------------------------------------------------
// aquaticRiver.test.ts
// Purpose : Locks the river runs and the maps (BAMF69 2026-11-08): every obstacle row has a way through, the unique
//           part is there once, runs are repeatable by seed; maps grow bigger, deeper and deadlier and open by form;
//           the shark look follows aggression; the river parts do their jobs.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { aggression, bodyLook, creatureFromLineage, lookScores, movement, sharkTier } from "../src/game/aquatic/creature";
import { mulberry32 } from "../src/game/aquatic/population";
import { OBSTACLE_R, hitAt, makeRiver, newRiverBody, riverJump, riverStep } from "../src/game/aquatic/river";
import { AQ, MAPS, RIVERS } from "../src/game/aquatic/tuning";

const BODY = 12; // a small swimmer's radius

describe("river runs", () => {
  for (const [i, spec] of RIVERS.entries()) {
    it(`river ${i + 1}: every row has a way through`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const run = makeRiver(spec, mulberry32(seed));
        for (const row of run.rows) {
          let free = false;
          for (let x = -spec.width / 2 + BODY; x <= spec.width / 2 - BODY && !free; x += 6) {
            for (let z = BODY; z <= spec.depth - BODY && !free; z += 6) free = !hitAt(run, row.s, x, z, BODY);
          }
          expect(free, `seed ${seed} row at s=${row.s} (${row.type})`).toBe(true);
        }
      }
    });
    it(`river ${i + 1}: its unique part is there exactly once, past halfway`, () => {
      const run = makeRiver(spec, mulberry32(3));
      const parts = run.things.filter((t) => t.kind === "part");
      expect(parts.length).toBe(1);
      expect(parts[0].s).toBeGreaterThan(spec.length * 0.5);
      expect(hitAt(run, parts[0].s, parts[0].x, parts[0].z, 4)).toBeNull(); // reachable: not inside a rock
    });
  }
  it("the same seed gives the same river", () => {
    expect(makeRiver(RIVERS[0], mulberry32(9)).things).toEqual(makeRiver(RIVERS[0], mulberry32(9)).things);
  });
  it("each river has a different part, found nowhere else", () => {
    expect(new Set(RIVERS.map((r) => r.part)).size).toBe(RIVERS.length);
  });
});

describe("maps", () => {
  it("pond, lake, ocean: bigger, deeper, deadlier", () => {
    expect(MAPS.map((m) => m.id)).toEqual(["pond", "lake", "ocean"]);
    for (let i = 1; i < MAPS.length; i++) {
      expect(MAPS[i].width).toBeGreaterThan(MAPS[i - 1].width);
      expect(MAPS[i].surface).toBeGreaterThan(MAPS[i - 1].surface);
      expect(MAPS[i].mult.bite).toBeGreaterThan(MAPS[i - 1].mult.bite);
      expect(MAPS[i].counts.deepmaw).toBeGreaterThan(MAPS[i - 1].counts.deepmaw);
    }
  });
  it("the pond keeps today's depth; form 2 opens the first river, form 3 the second", () => {
    expect(MAPS[0].surface).toBe(AQ.water.surface);
    expect(MAPS.map((m) => m.exitForm)).toEqual([2, 3, null]);
  });
});

describe("the shark look", () => {
  const c = creatureFromLineage(null, "carnivore");
  it("a gentle creature looks like itself; aggression makes it more shark-like, step by step", () => {
    expect(sharkTier(aggression(0, c, 0))).toBe(0);
    expect(sharkTier(aggression(1, { ...c, ups: { ...c.ups, attack: 10 } }, 20))).toBe(3);
    const tiers = [0, 0.3, 0.6, 1].map((a) => sharkTier(aggression(a, { ...c, ups: { ...c.ups, attack: Math.round(a * 10) } }, a * 20)));
    expect([...tiers].sort()).toEqual(tiers); // never less shark-like as aggression grows
  });
});

describe("river parts", () => {
  const c = creatureFromLineage(null, "omnivore");
  it("the torrent tail dashes faster and more often", () => {
    const t = { ...c, parts: ["torrent" as const] };
    expect(movement(t).dashCdS).toBeLessThan(movement(c).dashCdS);
    expect(movement(t).dashSpeed).toBeGreaterThan(movement(c).dashSpeed);
  });
});

describe("swimming a river run", () => {
  const spec = RIVERS[0];
  const still = { turn: 0, push: 0, rise: 0 };
  it("the current carries you; W speeds you up, S holds you back", () => {
    const b = newRiverBody(spec), w = newRiverBody(spec), s = newRiverBody(spec);
    for (let i = 0; i < 60; i++) { riverStep(b, still, 0.05, spec, 0); riverStep(w, { ...still, push: 1 }, 0.05, spec, 0); riverStep(s, { ...still, push: -1 }, 0.05, spec, 0); }
    expect(b.s).toBeGreaterThan(spec.current * 2);
    expect(w.s).toBeGreaterThan(b.s);
    expect(s.s).toBeLessThan(b.s);
    expect(s.s).toBeGreaterThan(0);
  });
  it("steering stops at the banks; rising stops at the top", () => {
    const b = newRiverBody(spec);
    for (let i = 0; i < 100; i++) riverStep(b, { turn: 1, push: 0, rise: 1 }, 0.05, spec, 0);
    expect(b.x).toBeLessThanOrEqual(spec.width / 2);
    expect(b.z).toBe(spec.depth);
  });
  it("a jump at the top clears a floating log, then lands", () => {
    const b = { ...newRiverBody(spec), z: spec.depth };
    expect(riverJump(b, spec, AQ.water.breachSpeed)).toBe(true);
    let peak = 0, landed = false;
    for (let i = 0; i < 200 && !landed; i++) { landed = riverStep(b, still, 0.02, spec, 0); peak = Math.max(peak, b.z); }
    expect(peak).toBeGreaterThan(spec.depth - 16 + OBSTACLE_R + 12); // above the log's top
    expect(landed).toBe(true);
    expect(riverJump({ ...newRiverBody(spec), z: 20 }, spec, 300)).toBe(false); // not from the bottom
  });
});

describe("the body's look from all three temperaments (2026-11-08)", () => {
  const c = creatureFromLineage(null, "omnivore");
  const t = (cautious: number, aggressive: number, adaptable: number) => ({ cautious, aggressive, adaptable });
  it("the strongest temperament picks the family, its strength the step", () => {
    expect(bodyLook(lookScores(t(0, 0, 0), c, 0, 0))).toMatchObject({ tier: 0, row: "0" });
    expect(bodyLook(lookScores(t(0, 1, 0), c, 0, 0))).toMatchObject({ family: "aggressive", row: "2" });
    expect(bodyLook(lookScores(t(1, 0, 0), c, 0, 0))).toMatchObject({ family: "cautious", row: "c2" });
    expect(bodyLook(lookScores(t(0, 0, 1), c, 0, 0))).toMatchObject({ family: "adaptable", row: "a2" });
  });
  it("how you live counts too: defense and plates make it armoured, speed and breaches streamlined", () => {
    const tank = { ...c, ups: { ...c.ups, defense: 10, health: 10 }, parts: ["plates" as const] };
    expect(bodyLook(lookScores(t(1, 0, 0), tank, 0, 0)).row).toBe("c3");
    const racer = { ...c, ups: { ...c.ups, speed: 10, mobility: 10 } };
    expect(bodyLook(lookScores(t(1, 0, 1), racer, 0, 10)).family).toBe("adaptable");
  });
});
