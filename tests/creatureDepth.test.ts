// Purpose: Healthy enemies can be trapped without bites; reciprocal edge routes use real collision.
import { describe, it, expect } from "vitest";
import { generateWater } from "../src/game/creature/waterWorld";
import { spawnEncounters, stepEnemy, ENEMIES } from "../src/game/creature/waterEncounters";
import { newObjective } from "../src/game/creature/waterObjectives";
import { useNet, netCatches } from "../src/game/creature/waterTraps";
import { verticalArrival, horizontalReturn, verticalOpening } from "../src/game/creature/waterRoutes";
import { stepWaterBody } from "../src/game/creature/waterPhysics";
import { newBody } from "../src/game/creature/physics";
import { freshExpedition } from "../src/game/creature/expedition";
import { newGarden } from "../src/game/creature/generations";
const world = generateWater(42);
describe("Water danger and trap alternatives", () => {
  it("makes basic charger hits a two-hit threat and stuns shorter than damage grace", () => {
    expect(ENEMIES.charger.damage).toBe(3); expect(ENEMIES.charger.stun).toBe(0.75);
    expect(ENEMIES.charger.stun).toBeLessThan(1.2);
    expect(ENEMIES.ambusher.damage).toBe(2); expect(ENEMIES.swimmer.damage).toBe(2);
  });
  it("requires rigging before arming, and does not catch merely nearby idle enemies", () => {
    const r = world.rooms[7];
    expect(useNet(r, newObjective(), 368, 288)!.state.netArmed).toBeUndefined();
    const o = useNet(r, useNet(r, newObjective(), 104, 304)!.state, 368, 288)!.state;
    const e = spawnEncounters(r)[0]; e.x = 368;
    expect(netCatches(r, o, e)).toBe(false); e.phase = "strike"; expect(netCatches(r, o, e)).toBe(true);
    expect(netCatches(r, { ...o, netArmed: false }, e)).toBe(false);
  });
  it("a lure bot traps every enemy type at full health without any bite; an unarmed frame cannot", () => {
    const sources = [world.rooms[7], world.rooms[2], world.rooms[5], world.rooms[6]];
    for (const r of sources) {
      const e = spawnEncounters(r)[0], hp = e.hp;
      const o = useNet(r, useNet(r, newObjective(), 104, 304)!.state, 368, 288)!.state;
      let caught = false;
      for (let n = 0; n < 1500 && !caught; n++) {
        stepEnemy(e, { x: n < 2 ? e.home - 30 : 330, y: 272, hidden: false, submerged: true }, 1 / 60, false, 72);
        expect(netCatches(r, newObjective(), e)).toBe(false);
        caught = netCatches(r, o, e);
      }
      expect(caught, `${e.kind} could not be lured into a net`).toBe(true); expect(e.hp).toBe(hp);
    }
    // The remote Hard swimmer must keep its gained ground instead of snapping back home.
    for (const seed of [0, 1, 7, 42, 99, 255, 1001, 0xffffffff]) for (const flood of [false, true]) {
      const r = generateWater(seed).rooms[10], e = spawnEncounters(r)[2], hp = e.hp;
      const o = { ...newObjective(), netArmed: true };
      let caught = false;
      for (let n = 0; n < 1500 && !caught; n++) {
        stepEnemy(e, { x: n < 2 ? e.home - 30 : 330, y: 272, hidden: false, submerged: true }, 1 / 60, flood, 152);
        caught = netCatches(r, o, e);
      }
      expect(caught, `remote swimmer seed ${seed}, flood ${flood}`).toBe(true); expect(e.hp).toBe(hp);
    }
    console.log("Noncombat traps: 4/4 types plus 16 remote-swimmer seed/climate cases, zero bites");
  });
  it("droppers warn, fall vertically without tracking, recover, and freeze with dt zero", () => {
    const e = spawnEncounters(world.rooms[6])[0]; expect(e.kind).toBe("dropper"); expect(e.y).toBe(128);
    const target = { x: e.x, y: 272, hidden: false, submerged: true };
    stepEnemy(e, target, 1 / 60, false, 72); expect(e.phase).toBe("tell");
    const before = { ...e }; stepEnemy(e, target, 0, false, 72); expect(e).toEqual(before);
    for (let n = 0; n < 59; n++) stepEnemy(e, { ...target, x: 330 }, 1 / 60, false, 72);
    expect(e.phase).toBe("strike"); const x = e.x;
    for (let n = 0; n < 40; n++) stepEnemy(e, { ...target, x: 330 }, 1 / 60, false, 72);
    expect(e.x).toBe(x); expect(e.y).toBe(288); expect(e.phase).toBe("recover");
  });
});
describe("Water vertical routes and arrivals", () => {
  it("climbs the actual starter ledges and crosses the top edge into the nursery", () => {
    for (const seed of [0, 1, 7, 42, 99, 255, 1001, 0xffffffff]) {
    const r = generateWater(seed).rooms[1], b = newBody(64, 304), e = { ...freshExpedition(42), basinRaised: true }, o = newObjective();
    for (const [x, y] of [[96, 240], [128, 176], [128, 92]]) {
      let reached = false;
      for (let n = 0; n < 1800; n++) {
        stepWaterBody(b, r, e, newGarden().traits, { dir: Math.abs(b.x - x) > 3 ? Math.sign(x - b.x) : 0, vertical: -1,
          jump: n % 40 === 0, crouch: false, sprint: false }, 1 / 60, o);
        if (Math.abs(b.x - x) < 5 && (y < 100 ? b.y < 96 : Math.abs(b.y - y) < 7 && b.onGround)) { reached = true; break; }
      }
      expect(reached, `ledge ${x},${y}; body ${b.x},${b.y}`).toBe(true);
    }
    const a = verticalArrival(r, b.x, b.y, o)!; expect(a.room).toBe(3); expect(a.y).toBeGreaterThan(280);
    const landing = newBody(a.x, a.y);
    for (let n = 0; n < 120; n++) stepWaterBody(landing, world.rooms[3], e, newGarden().traits,
      { dir: 0, vertical: 0, jump: false, crouch: false, sprint: false }, 1 / 60, o);
    expect(landing.y).toBeLessThan(305); expect(landing.x).toBeGreaterThan(144);
    const back = verticalArrival(world.rooms[3], 128, 340, o)!; expect(back.room).toBe(1); expect(back.y).toBeLessThan(140);
    }
  });
  it("keeps the lower gallery route closed until the drain room is solved", () => {
    const [drain, gallery] = [world.rooms[4], world.rooms[5]];
    expect(verticalArrival(drain, 328, 340, newObjective())).toBeNull();
    expect(verticalOpening(drain, newObjective(), 20, 19)).toBe(false);
    const a = verticalArrival(drain, 328, 340, { ...newObjective(), open: true })!;
    expect(a).toMatchObject({ room: 5, x: 280, y: 116 });
    expect(verticalArrival(gallery, 280, 80, newObjective())).toBeNull();
    expect(verticalArrival(gallery, 280, 80, { ...newObjective(), verticalOpen: true })).toMatchObject({ room: 4, x: 328, y: 298 });
  });
  it("crosses the gallery's top opening from its actual return ledge", () => {
    const b = newBody(280, 160), o = { ...newObjective(), verticalOpen: true }, e = { ...freshExpedition(42), basinRaised: true };
    for (let n = 0; n < 90 && b.y >= 86; n++) stepWaterBody(b, world.rooms[5], e, newGarden().traits,
      { dir: 0, vertical: -1, jump: n % 40 === 0, crouch: false, sprint: false }, 1 / 60, o);
    expect(verticalArrival(world.rooms[5], b.x, b.y, o)?.room).toBe(4);
  });
  it("uses the corresponding arrival side, height and facing on backtracking", () => {
    const r = (id: number) => world.rooms[id];
    expect(horizontalReturn(r(2), r(1))).toMatchObject({ x: 600, facing: -1 });
    expect(horizontalReturn(r(6), r(5))).toMatchObject({ x: 128, y: 236, facing: -1 });
    expect(horizontalReturn(r(10), r(9))).toMatchObject({ x: 128, y: 236, facing: -1 });
    expect(horizontalReturn(r(3), r(1))).toMatchObject({ x: 126, facing: 1 });
  });
});
