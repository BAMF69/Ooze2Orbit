// ---------------------------------------------------------------------------
// tuning.ts (creature)
// Purpose : Every number of the creature stage's Toy 1 in one place (docs/stages/03-creature.md): the sidescroller's
//           physics, what your creature can do, the foes, the parts, how much each way through an obstacle moves a
//           temperament. Feel lives here, not in the scene.
// Usage   : import { CR } from "./tuning"; CR.move.runSpeed
// Notes   : Units: pixels, seconds. Tiles are CR.tile px square; the screen is 640 x 360 (src/main.ts).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

export const CR = {
  tile: 16,
  move: {
    gravity: 900,
    runSpeed: 105, // px/s on foot
    sprintSpeed: 165, // holding Shift (BAMF69 2026-11-09): faster, longer jumps, and loud
    crouchSpeed: 45, // creeping: slow, quiet, low
    mudMult: 0.5, // the drained basin's mud
    accel: 900, // px/s^2 toward the wanted speed on the ground
    airAccel: 500,
    jumpSpeed: 400, // about 5.5 tiles high: enough for every ledge in Fernwood
    maxFall: 520,
    coyoteS: 0.1, // a jump still works this long after running off a ledge
    bufferS: 0.12, // a jump pressed this early before landing still happens
  },
  body: { w: 14, h: 18, crouchH: 11 }, // standing needs 2 tiles of room; crouched fits a 1-tile tunnel
  hearts: 3,
  hurtS: 1.0, // no more damage this long after a hit
  knock: { x: 160, y: 220 },
  bite: { damage: 1, reach: 14, cooldownS: 0.35, clawsMult: 2 }, // F (or J): your bite; claws double it
  boulder: { size: 24, push: 55 }, // size matches the drawn 24 px stone (creature_props.py); push: px/s it rolls
  foes: {
    stalker: { hp: 5, patrol: 38, chase: 92, sight: 7 * 16, coneDeg: 38, sightUp: 3 * 16, loseS: 3, bite: 1, biteCdS: 1.1, stunS: 0.5 },
    brute: { hp: 8, chase: 70, wakeNoise: 1.6, hearRange: 5 * 16, bite: 1, biteCdS: 1.3, stunS: 0.4 },
  },
  stealth: { crouchSightMult: 0.5, camoSightMult: 0.5, noiseWalk: 1, noiseRun: 2.5, noiseDecay: 0.6 },
  trap: { radius: 2.2 * 16, fallS: 0.35, resetS: 4 }, // the hanging log: catches a foe this close to where it lands
  // the Old Horn (boss.ts): beaten by biting it stunned (fight), dropping rocks on it (puzzle), or ambush (stealth)
  boss: {
    hp: 30, roam: 40, charge: 230, sight: 10 * 16, windupS: 0.7, stunS: 2.4, awareS: 3,
    stunnedMult: 2, ambushMult: 3, rockDamage: 7, contact: 1, biteCdS: 1.4, knock: 280,
  },
  bramble: { hp: 3 }, // bites to break one bramble tile (claws: 2 at a time)
  tree: { hp: 4 },
  // what one obstacle passed a given way adds to that temperament (the 50 % stage cap still applies, core/lineage)
  temperPerObstacle: 0.04,
  camera: { lerp: 6, lookAhead: 40 },
} as const;
