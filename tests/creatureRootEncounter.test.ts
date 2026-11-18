import { describe, expect, it } from "vitest";
import { biteSnapfrond, ROOT_LANE, rootEncounter, SNAPFROND, stepRootEncounter, setRootBait, grabbedPosition, nearRootBees } from "../src/game/creature/rootEncounter";

import { newBody, stepBody } from "../src/game/creature/physics";
import { evidence, newGarden, offspring } from "../src/game/creature/generations";

describe("Root Lane Snapfrond", () => {
  const player = (x: number, crouch = false, y = 304) => ({ x, y, crouch });
  it("keeps the entrance safe and the bait station inside the strike across seeds", () => {
    for (let seed = 0; seed < 500; seed++) {
      const e = rootEncounter(seed);
      expect(rootEncounter(seed)).toEqual(e);
      expect(e.x - ROOT_LANE.entry).toBeGreaterThan(SNAPFROND.detect);
      expect(e.x - ROOT_LANE.baitX).toBeLessThan(SNAPFROND.length);
      expect(e.x).toBeGreaterThan(ROOT_LANE.baitX);
    }
  });
  it("locks the marked lane, misses a jump and allows a recovery bite", () => {
    const e = rootEncounter(7);
    stepRootEncounter(e, player(e.x - 40), 0.02, false);
    expect(e.phase).toBe("tell");
    expect(biteSnapfrond(e, e.x, 304, 2)).toBe(false);
    expect(stepRootEncounter(e, player(e.x - 30, false, 255), SNAPFROND.tell, false)).toBe(0);
    stepRootEncounter(e, player(e.x + 20, false, 255), SNAPFROND.strike, false);
    expect(e.grab).toBe(0);
    expect(biteSnapfrond(e, e.x + 20, 304, 2)).toBe(true);
    expect(e.verdict).toBe("fight");
  });
  it("seals a healthy enemy with honeycomb and supports a complete covered crossing", () => {
    const e = rootEncounter(7);
    expect(setRootBait(e, "honeycomb")).toBe(true);
    stepRootEncounter(e, player(ROOT_LANE.baitX), 0.02, false);
    expect(stepRootEncounter(e, player(ROOT_LANE.baitX), SNAPFROND.tell, false)).toBe(0);
    expect(e.verdict).toBe("trap");
    expect(e.hp).toBe(SNAPFROND.hp);
    expect(nearRootBees(e, e.x, 304)).toBe(true);
    expect(nearRootBees(e, e.x, 240)).toBe(false);
    expect(nearRootBees(e, e.x + 80, 304)).toBe(false);
    expect(stepRootEncounter(e, player(e.x), 30, false)).toBe(0);
    expect(e.stuck).toBe(true);
    const sneak = rootEncounter(7);
    for (let x = ROOT_LANE.coverStart; x <= ROOT_LANE.passX; x++) stepRootEncounter(sneak, player(x, true), 0.02, false);
    expect(sneak.verdict).toBe("sneak");
  });
  it.each([-1, 1])("catches from side %i, pulls to center, holds and releases", side => {
    const e = rootEncounter(7);
    const x = e.x + side * 50;
    stepRootEncounter(e, player(e.x - 40), 0.02, false);
    expect(stepRootEncounter(e, player(x), SNAPFROND.tell, false)).toBe(SNAPFROND.damage);
    expect(grabbedPosition(e)).toBe(x);
    expect(stepRootEncounter(e, player(x), SNAPFROND.pull + 0.01, false)).toBe(0);
    expect(grabbedPosition(e)).toBe(e.x);
    expect(e.grab).toBeGreaterThan(0);
    expect(stepRootEncounter(e, player(x), SNAPFROND.hold, false)).toBe(0);
    expect(e.grab).toBe(0);
    expect(e.phase).toBe("recover");
  });
  it.each([-1, 1])("lets a running jump clear the marked swarm from side %i", direction => {
    const e = rootEncounter(7);
    setRootBait(e, "honeycomb");
    stepRootEncounter(e, player(ROOT_LANE.baitX), 0.02, false);
    stepRootEncounter(e, player(ROOT_LANE.baitX), SNAPFROND.tell, false);
    const body = newBody(e.x - direction * 46, 304);
    body.onGround = true;
    body.vx = direction * 165;
    for (let frame = 0; frame < 48; frame++) {
      stepBody(body, { dir: direction, jump: frame === 0, speed: 165 }, 1 / 60, (_x, y) => y >= 19);
      expect(nearRootBees(e, body.x, body.y)).toBe(false);
    }
    expect((body.x - e.x) * direction).toBeGreaterThan(SNAPFROND.beeRadius);
  });
  it("takes damage from a rock, recovers from stun, and cannot be worn down with unlimited rocks", () => {
    const e = rootEncounter(7);
    expect(setRootBait(e, "rock")).toBe(true);
    stepRootEncounter(e, player(ROOT_LANE.baitX), 0.02, false);
    expect(stepRootEncounter(e, player(ROOT_LANE.baitX), SNAPFROND.tell, false)).toBe(0);
    expect(e.hp).toBe(SNAPFROND.hp - SNAPFROND.rockDamage);
    expect(e.verdict).toBeNull();
    expect(e.phase).toBe("recover");
    expect(e.remaining).toBe(SNAPFROND.rockStun);
    expect(setRootBait(e, "rock")).toBe(false);
    stepRootEncounter(e, player(e.x), SNAPFROND.rockStun, false);
    expect(e.phase).toBe("watch");
  });
  it("denies sprinting through or crouching only on the far side", () => {
    const e = rootEncounter(7);
    for (let x = ROOT_LANE.entry; x <= ROOT_LANE.exit; x += 3) stepRootEncounter(e, player(x), 0.02, false);
    stepRootEncounter(e, player(ROOT_LANE.passX, true), 3, false);
    expect(e.verdict).toBeNull();
  });
  it("credits each Root Lane tactic on the relevant daughter offer", () => {
    const garden = newGarden();
    const fight = offspring(garden, { ...evidence(), fights: 1, rootVerdict: "fight" });
    const sneak = offspring(garden, { ...evidence(), sneaks: 1, rootVerdict: "sneak" });
    const trap = offspring(garden, { ...evidence(), solves: 1, rootVerdict: "trap" });
    expect(fight[0].traits.strength).toBe(garden.traits.strength + 3);
    expect(fight[0].cause).toContain("recovery bite");
    expect(sneak[2].cause).toContain("crossed Root Lane unseen");
    expect(trap[2].cause).toContain("Stopping Snapfrond with bait");
  });
});
