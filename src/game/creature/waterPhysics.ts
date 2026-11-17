// Purpose: Swimming and opposing-current rules layered on the existing creature collision controller.
// Usage: stepWaterBody(body, room, expedition, traits, intent, dt); pure, also used by traversal bots.
// Notes: Feet remain the collision anchor. Current beats ordinary swimming; diversion AND fins are necessary.
// Authored: Written with Codex (GPT-6).
import { stepBody, type Body } from "./physics";
import { CR } from "./tuning";
import { WATER, type WaterRoom } from "./waterWorld";
import { challengeSolid } from "./waterChallenges";
import type { Expedition } from "./expedition";
import type { Traits } from "./generations";
import { drainedRoom, objectiveBarrier, type RoomObjective } from "./waterObjectives";
export const waterline = (e: Expedition): number => e.basinRaised ? 224 : 288;
export function inWater(b: Body, e: Expedition): boolean { return b.x >= 144 && b.x <= 544 && b.y > waterline(e); }
export function stepWaterBody(b: Body, room: WaterRoom, e: Expedition, traits: Traits,
  intent: { dir: number; vertical: number; jump: boolean; crouch: boolean; sprint: boolean; braced?: boolean; stunned?: boolean }, dt: number, objective?: RoomObjective): void {
  if (objective && drainedRoom(room, objective)) e = { ...e, basinRaised: false };
  const wet = inWater(b, e), speed = traits.fins ? WATER.finSpeed : WATER.swimSpeed;
  const breach = wet && intent.jump && b.y <= waterline(e) + 8;
  b.h = intent.crouch && !wet ? CR.body.crouchH : CR.body.h;
  let dir = intent.dir, wantedSpeed: number = intent.crouch ? CR.move.crouchSpeed : intent.sprint ? CR.move.sprintSpeed : CR.move.runSpeed;
  if (wet && !intent.stunned) {
    const current = room.current ? e.torrentDiverted ? WATER.divertedCurrent : WATER.current : 0;
    const wanted = intent.braced ? 0 : dir * speed - current;
    if (intent.braced) b.vx = 0; // Gripping a control resists buoyancy/current; movement releases it.
    dir = Math.sign(wanted); wantedSpeed = Math.abs(wanted);
    // stepBody integrates gravity once; cancel it for controlled, gently buoyant swimming.
    b.vy = breach ? -CR.move.jumpSpeed * 0.9 : (intent.braced ? 0 : intent.vertical ? intent.vertical * speed : -18) - CR.move.gravity * dt;
  }
  stepBody(b, { dir, speed: wantedSpeed, jump: intent.jump && !wet }, dt, (x, y) =>
    !!objective && objectiveBarrier(room, objective, x) || challengeSolid(room, e.basinRaised, x, y, objective));
  // Swimming at the surface must not oscillate between falling and full jumping.
  if (wet && !breach && b.x >= 144 && b.x <= 544 && b.y < waterline(e) + 2) { b.y = waterline(e) + 2; b.vy = 0; }
}
