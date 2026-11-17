// Purpose: Reject the reported D+Shift exploit; prove physical puzzle routes and safe reward banking.
// Authored: Written with Codex (GPT-6).
import { describe, it, expect } from "vitest";
import { generateWater, WATER } from "../src/game/creature/waterWorld";
import { newBody } from "../src/game/creature/physics";
import { stepWaterBody } from "../src/game/creature/waterPhysics";
import { newGarden, offspring, evidence } from "../src/game/creature/generations";
import { attachExpedition, freshExpedition } from "../src/game/creature/expedition";
import { newObjective, useValve, tickObjective, objectiveBarrier, canClaimSeal, emergencyRelease, bankCargo, newCargo, valves } from "../src/game/creature/waterObjectives";

describe("Water must be solved rather than sprinted through", () => {
  const traits = { ...newGarden().traits, strength: 20, vitality: 20, fins: true, gills: true };
  it("blocks D + Shift in every room, even with maximum traits and all Gardener benefits", () => {
    let blocked = 0;
    for (const seed of [0, 1, 7, 42, 99, 255, 1001, 0xffffffff]) for (const r of generateWater(seed).rooms) {
      const b = newBody(48, WATER.floor), o = newObjective(), e = { ...freshExpedition(seed), basinRaised: true, torrentDiverted: true };
      for (let n = 0; n < 900; n++) stepWaterBody(b, r, e, traits, { dir: 1, vertical: 0, jump: false, crouch: false, sprint: true }, 1 / 60, o);
      expect(b.x, `D+Shift escaped seed ${seed}, room ${r.id}`).toBeLessThan(560);
      expect(o.open).toBe(false); blocked++;
    }
    console.log(`D+Shift exploit regression: ${blocked}/88 rooms blocked at maximum inherited power`);
  });
  it("requires numbered controls in order and actual height/proximity", () => {
    const r = generateWater(42).rooms[4], o = newObjective();
    expect(useValve(r, o, 200, 236).state.open).toBe(false);
    expect(useValve(r, o, 480, 224).used).toBe(false);
    const lower = useValve(r, o, 480, 288).state;
    expect(lower.first).toBe(true); expect(lower.open).toBe(false);
    expect(useValve(r, lower, 200, 236).state.open).toBe(true);
  });
  it("lets an unevolved starting creature reach every Easy upper lever", () => {
    for (const seed of [0, 1, 7, 42, 99, 255, 1001, 0xffffffff]) for (const r of generateWater(seed).rooms.filter(r => r.tier === "easy")) {
      const v = valves(r)[0], b = newBody(v.x - 40, 290), e = { ...freshExpedition(seed), basinRaised: true };
      let o = newObjective();
      for (let n = 0; n < 600 && !o.open; n++) {
        stepWaterBody(b, r, e, newGarden().traits, { dir: Math.abs(b.x - v.x) > 3 ? Math.sign(v.x - b.x) : 0,
          vertical: -1, jump: n % 40 === 0, crouch: false, sprint: false }, 1 / 60, o);
        o = useValve(r, o, b.x, b.y).state;
      }
      expect(o.open, `Easy lever unreachable: seed ${seed}, room ${r.id}`).toBe(true);
    }
  });
  it("allows the real controller to solve the drained chamber and return through it", () => {
    for (const seed of [0, 1, 7, 42, 99, 255, 1001, 0xffffffff]) for (const id of [4, 8]) {
    const r = generateWater(seed).rooms[id], b = newBody(48, 304), e = { ...freshExpedition(seed), basinRaised: true, torrentDiverted: true };
    let o = newObjective();
    function drive(x: number, y: number, leap = false) {
      for (let n = 0; n < 1800; n++) {
        const dir = Math.abs(b.x - x) < 3 ? 0 : Math.sign(x - b.x);
        stepWaterBody(b, r, e, traits, { dir, vertical: b.y > y + 3 ? -1 : b.y < y - 3 ? 1 : 0,
          jump: leap && n % 40 === 0, crouch: false, sprint: false }, 1 / 60, o);
        if (Math.abs(b.x - x) < 5 && Math.abs(b.y - y) < 20) return;
      }
      throw Error(`Route failed at ${b.x},${b.y}; wanted ${x},${y}`);
    }
    drive(480, 288); o = useValve(r, o, b.x, b.y).state;
    drive(140, 304); drive(200, 236, true); o = useValve(r, o, b.x, b.y).state;
    expect(o.open).toBe(true); drive(600, 288); drive(48, 304);
    expect(b.x).toBeLessThan(55);
    }
  });
  it("keeps the switchback's right wall closed and opens its left onward hatch", () => {
    const r = generateWater(42).rooms[5]; let o = useValve(r, newObjective(), 280, 228).state;
    o = useValve(r, o, 496, 288).state;
    expect(o.open).toBe(true); expect(objectiveBarrier(r, o, 35)).toBe(true);
  });
  it("freezes pressure with gameplay and provides a non-rewarding emergency return latch", () => {
    const r = generateWater(42).rooms[6];
    let o = useValve(r, newObjective(), 480, 288).state; o = useValve(r, o, 192, 236).state;
    expect(o.remaining).toBe(12); expect(tickObjective(o, 0)).toEqual(o);
    o = tickObjective(o, 12); expect(o.open).toBe(false);
    const released = emergencyRelease(r, o, 600);
    expect(released.open).toBe(true); expect(canClaimSeal(released)).toBe(false);
    const reset = useValve(r, released, 192, 236).state; expect(canClaimSeal(reset)).toBe(true);
  });
  it("only banked samples affect daughters; discarded cargo cannot unlock an adaptation", () => {
    const g = attachExpedition(newGarden(), 42, []), cargo = { samples: ["gills" as const], clears: ["easy" as const] };
    expect(offspring(g, evidence())[1].traits.gills).toBe(false);
    expect(bankCargo(g, newCargo()).expedition!.unlocked).toEqual([]);
    const banked = bankCargo(g, cargo);
    expect(offspring(banked, evidence())[1].traits.gills).toBe(true);
    expect(banked.expedition!.completed).toEqual(["easy"]);
    expect(g.expedition!.unlocked).toEqual([]);
  });
});
