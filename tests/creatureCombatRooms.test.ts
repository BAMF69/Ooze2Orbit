// Purpose: Encounter seals cannot be evaded; guarded controls require an uninterrupted opening.
import { describe, it, expect } from "vitest";
import { generateWater } from "../src/game/creature/waterWorld";
import { spawnEncounters, stepEnemy } from "../src/game/creature/waterEncounters";
import { newObjective, objectiveBarrier, useValve } from "../src/game/creature/waterObjectives";
import { arenaRoom, activeThreat, encounterLock, sealedEncounter, advanceOperation, canIncapacitate, CONTROL_SECONDS } from "../src/game/creature/waterCombatRooms";
import { stepWaterBody } from "../src/game/creature/waterPhysics";
import { newBody } from "../src/game/creature/physics";
import { freshExpedition } from "../src/game/creature/expedition";
import { newGarden } from "../src/game/creature/generations";
const world = generateWater(42);
describe("Water sealed encounters", () => {
  it("warns before commitment, then seals both exits even if the lever was opened", () => {
    for (const r of world.rooms.filter(arenaRoom)) {
      const foes = spawnEncounters(r), initial = { ...newObjective(), open: true };
      expect(sealedEncounter(encounterLock(r, initial, foes, 48))).toBe(false);
      const locked = encounterLock(r, initial, foes, 100);
      expect(sealedEncounter(locked)).toBe(true);
      expect(objectiveBarrier(r, locked, 3)).toBe(true); expect(objectiveBarrier(r, locked, 35)).toBe(true);
      foes.forEach(e => e.passed = true);
      expect(sealedEncounter(encounterLock(r, locked, foes, 540))).toBe(true);
    }
  });
  it("requires every threat defeated or subdued, and stays cleared on return", () => {
    const r = world.rooms[10], foes = spawnEncounters(r); let o = encounterLock(r, newObjective(), foes, 100);
    foes[0].hp = 0; foes[1].incapacitated = true;
    expect(sealedEncounter(encounterLock(r, o, foes, 300))).toBe(true);
    foes[2].incapacitated = true; o = encounterLock(r, o, foes, 300);
    expect(o.arenaCleared).toBe(true); expect(objectiveBarrier(r, o, 3)).toBe(false);
    expect(encounterLock(r, o, spawnEncounters(r), 100)).toBe(o);
    expect(useValve(r, { ...o, first: true }, 192, 236).state.arenaCleared).toBe(true);
  });
  it("leaves traversal encounters open to retreat/evasion", () => {
    for (const r of world.rooms.filter(r => !arenaRoom(r))) expect(encounterLock(r, newObjective(), spawnEncounters(r), 300)).toEqual(newObjective());
  });
  it("offers subdual only when wounded, nearby, and recovering; subdued enemies cannot attack", () => {
    const e = spawnEncounters(world.rooms[2])[0];
    e.phase = "recover"; e.timer = 1;
    expect(canIncapacitate(e, e.x, e.y + 16)).toBe(false);
    e.hp = 1; expect(canIncapacitate(e, e.x, e.y + 16)).toBe(true);
    expect(canIncapacitate(e, e.x + 100, e.y + 16)).toBe(false);
    e.phase = "strike"; expect(canIncapacitate(e, e.x, e.y + 16)).toBe(false);
    e.incapacitated = true; expect(activeThreat(e)).toBe(false);
    const before = { ...e }; expect(stepEnemy(e, { x: e.x, y: e.y, hidden: false, submerged: true }, 1, false, 72)).toBe(false);
    expect(e).toEqual(before);
  });
  it("physically contains the actual controller at both seals", () => {
    const r = world.rooms[7], o = encounterLock(r, { ...newObjective(), open: true }, spawnEncounters(r), 100);
    for (const dir of [-1, 1]) {
      const b = newBody(300, 290);
      for (let n = 0; n < 1200; n++) stepWaterBody(b, r, { ...freshExpedition(42), basinRaised: true }, { ...newGarden().traits, fins: true },
        { dir, vertical: n % 120 < 60 ? -1 : 1, jump: n % 40 === 0, sprint: true, crouch: false }, 1 / 60, o);
      expect(b.x).toBeGreaterThan(64); expect(b.x).toBeLessThan(560);
    }
  });
});
describe("Water guarded controls", () => {
  const op = { x: 480, y: 288, hp: 6, elapsed: 0 };
  it("cannot finish instantly; progress freezes at dt zero", () => {
    expect(advanceOperation(op, 480, 288, 6, [], 0)).toEqual(op);
    expect(advanceOperation(op, 480, 288, 6, [], 1)!.elapsed).toBeLessThan(CONTROL_SECONDS);
    expect(advanceOperation(op, 480, 288, 6, [], 2)!.elapsed).toBe(CONTROL_SECONDS);
  });
  it("loses progress on movement, injury or an active nearby guard", () => {
    expect(advanceOperation(op, 489, 288, 6, [], 1)).toBeNull();
    expect(advanceOperation(op, 480, 288, 5, [], 1)).toBeNull();
    const e = spawnEncounters(world.rooms[4])[1]; e.x = 480;
    expect(advanceOperation(op, 480, 288, 6, [e], 1)).toBeNull();
    e.phase = "recover"; expect(advanceOperation(op, 480, 288, 6, [e], 1)).not.toBeNull();
    e.phase = "patrol"; e.incapacitated = true; expect(advanceOperation(op, 480, 288, 6, [e], 2)!.elapsed).toBe(2);
  });
  it("can brace at a submerged control against buoyancy and the diverted current", () => {
    const b = newBody(480, 288), e = { ...freshExpedition(42), basinRaised: true, torrentDiverted: true };
    for (let n = 0; n < 180; n++) stepWaterBody(b, world.rooms[8], e, { ...newGarden().traits, fins: true }, { dir: 0, vertical: 0, jump: false, crouch: false, sprint: false, braced: true }, 1 / 60);
    expect(b.x).toBe(480); expect(b.y).toBe(288);
  });
});
