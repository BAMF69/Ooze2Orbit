// Purpose: Protect readable attacks, stealth, recovery counterplay and distinct Medium challenges.
// Authored: Written with Codex (GPT-6).
import { describe, it, expect } from "vitest";
import { spawnEncounters, stepEnemy, ENEMIES, biteDamage, ventPhase, encounterKinds, evasion, trapCanHit, reedCover } from "../src/game/creature/waterEncounters";
import { generateWater } from "../src/game/creature/waterWorld";
import { challengeSolid, clearWaterLine } from "../src/game/creature/waterChallenges";
const world = generateWater(42), target = { x: 350, y: 288, hidden: false, submerged: true };
describe("Water encounter counterplay", () => {
  it("counts escaping onto dry shore as evasion, and only pays for it once", () => {
    const e = spawnEncounters(world.rooms[5])[0];
    expect(evasion(e, 540, 288, false)).toBeNull();
    expect(evasion(e, 575, 288, false)).toBe("route");
    e.passed = true; expect(evasion(e, 575, 288, false)).toBeNull();
  });
  it("a hanging stone cannot clear swimmers or distant shore predators", () => {
    const shore = spawnEncounters(world.rooms[1])[0], swimmer = spawnEncounters(world.rooms[5])[0];
    expect(trapCanHit(shore)).toBe(true); expect(trapCanHit(swimmer)).toBe(false);
    shore.x = 200; expect(trapCanHit(shore)).toBe(false);
  });
  it("teaches single enemy types in Easy and combines distinct behaviors in Medium", () => {
    expect(encounterKinds(world.rooms[1])).toEqual(["charger"]);
    expect(encounterKinds(world.rooms[2])).toEqual(["ambusher"]);
    expect(encounterKinds(world.rooms[4])).toEqual(["charger", "ambusher"]);
    expect(encounterKinds(world.rooms[5])).toEqual(["swimmer"]);
    expect(encounterKinds(world.rooms[6])).toEqual(["dropper", "swimmer"]);
  });
  it("always warns before a charger can damage the player and commits to its facing", () => {
    const e = spawnEncounters(world.rooms[1])[0];
    expect(stepEnemy(e, target, 0.1, false, 72)).toBe(false); expect(e.phase).toBe("tell");
    const facing = e.facing;
    stepEnemy(e, { ...target, x: e.x + 100 }, ENEMIES.charger.tell, false, 72);
    expect(e.phase).toBe("strike"); expect(e.facing).toBe(facing);
    for (let n = 0; n < 50; n++) stepEnemy(e, target, 1 / 60, false, 72);
    expect(e.phase).toBe("recover"); expect(biteDamage(e, 2)).toBe(4);
  });
  it("lets concealment prevent the ambusher trigger", () => {
    const e = spawnEncounters(world.rooms[2])[0];
    expect(reedCover(world.rooms[2], e.home)).toBe(true); expect(reedCover(world.rooms[2], 50)).toBe(false);
    for (let n = 0; n < 60; n++) stepEnemy(e, { ...target, x: e.x - 20, hidden: true }, 1 / 60, true, 72);
    expect(e.phase).toBe("patrol");
    stepEnemy(e, { ...target, x: e.x - 20 }, 0.1, false, 72); expect(e.phase).toBe("tell");
  });
  it("swimmers patrol water and only target submerged prey", () => {
    const e = spawnEncounters(world.rooms[5])[0], x = e.x;
    stepEnemy(e, { ...target, x: e.x - 30, submerged: false }, 0.2, false, 152);
    expect(e.phase).toBe("patrol"); expect(e.x).not.toBe(x);
    stepEnemy(e, { ...target, x: e.x - 30, y: 270 }, 0.1, false, 152); expect(e.phase).toBe("tell");
  });
  it("terrain stops charging bodies and creates a recovery window", () => {
    const e = spawnEncounters(world.rooms[1])[0]; e.phase = "strike"; e.timer = 0.6;
    const x = e.x; stepEnemy(e, target, 0.1, false, 72, () => true);
    expect(e.x).toBe(x); expect(e.phase).toBe("recover");
  });
  it("dt zero freezes enemy and vent clocks", () => {
    const e = spawnEncounters(world.rooms[1])[0]; e.phase = "tell"; e.timer = 0.7;
    const before = structuredClone(e); stepEnemy(e, target, 0, false, 72); expect(e).toEqual(before);
    expect(ventPhase(0.5)).toBe("tell"); expect(ventPhase(1.3)).toBe("active"); expect(ventPhase(2.5)).toBe("quiet");
  });
  it("the switchback has a dive, open rise shaft, rock sill and second dive", () => {
    const r = world.rooms[5];
    expect(challengeSolid(r, true, 12, 15)).toBe(true);
    expect(challengeSolid(r, true, 17, 15)).toBe(false);
    expect(challengeSolid(r, true, 20, 17)).toBe(true);
    expect(challengeSolid(r, true, 20, 14)).toBe(false);
    expect(challengeSolid(r, true, 27, 15)).toBe(true);
    expect(clearWaterLine(r, true, 280, 280, 380, 280)).toBe(false);
  });
  it("a tell-reading dodge bot avoids hits while standing still loses across varied encounters", () => {
    let careless = 0, careful = 0;
    for (let seed = 0; seed < 16; seed++) for (const dodge of [false, true]) {
      const e = spawnEncounters(generateWater(seed).rooms[1])[0];
      let damage = 0, grace = 0;
      for (let n = 0; n < 1200; n++) {
        grace = Math.max(0, grace - 1 / 60);
        const airborne = dodge && (e.phase === "tell" && e.timer < 0.5 || e.phase === "strike");
        if (stepEnemy(e, { ...target, y: airborne ? 220 : 288 }, 1 / 60, false, 72) && grace === 0) { damage++; grace = 1.2; }
      }
      if (dodge) careful += damage; else careless += damage;
    }
    expect(careful).toBe(0); expect(careless).toBeGreaterThanOrEqual(32);
    console.log(`Charger scenario pair: dodge ${careful} hits, stationary ${careless} hits across 16 seeds`);
  });
});
