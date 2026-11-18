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
import { roomGeometry } from "./levelgen/roomSpec";
import { V1_GEOMETRY, regionAt, surfaceY, type RoomGeometry } from "./levelgen/geometry";
/** The v1 surface height (one water region); rooms with their own water use waterlineAt. */
export const waterline = (e: Expedition): number => surfaceY(V1_GEOMETRY.water[0], e.basinRaised);
const geom = (room?: WaterRoom): RoomGeometry => room ? roomGeometry(room) : V1_GEOMETRY;
/** Surface height of the water at x in this room (or of its first region when x is outside every region). */
export const waterlineAt = (room: WaterRoom | undefined, e: Expedition, x: number): number => {
  const g = geom(room); return surfaceY(regionAt(g, x) ?? g.water[0] ?? V1_GEOMETRY.water[0], e.basinRaised);
};
export function inWater(b: Body, e: Expedition, room?: WaterRoom): boolean {
  const w = regionAt(geom(room), b.x); return !!w && b.y > surfaceY(w, e.basinRaised);
}
export function stepWaterBody(b: Body, room: WaterRoom, e: Expedition, traits: Traits,
  intent: { dir: number; vertical: number; jump: boolean; crouch: boolean; sprint: boolean; braced?: boolean; stunned?: boolean }, dt: number, objective?: RoomObjective): void {
  if (objective && drainedRoom(room, objective)) e = { ...e, basinRaised: false };
  const wet = inWater(b, e, room), speed = traits.fins ? WATER.finSpeed : WATER.swimSpeed, line = waterlineAt(room, e, b.x);
  const current = room.current ? e.torrentDiverted ? WATER.divertedCurrent : WATER.current : 0;
  // No breach against a current you cannot out-swim (BAMF69 2026-11-18): chained breach hops otherwise skipped the
  // current entirely, since it stops acting on an airborne body (found by the search solver, levelgen/search.ts).
  const breach = wet && intent.jump && b.y <= line + 8 && (current === 0 || speed > current);
  b.h = intent.crouch && !wet ? CR.body.crouchH : CR.body.h;
  let dir = intent.dir, wantedSpeed: number = intent.crouch ? CR.move.crouchSpeed : intent.sprint ? CR.move.sprintSpeed : CR.move.runSpeed;
  if (wet && !intent.stunned) {
    const wanted = intent.braced ? 0 : dir * speed - current;
    if (intent.braced) b.vx = 0; // Gripping a control resists buoyancy/current; movement releases it.
    dir = Math.sign(wanted); wantedSpeed = Math.abs(wanted);
    // stepBody integrates gravity once; cancel it for controlled, gently buoyant swimming.
    b.vy = breach ? -CR.move.jumpSpeed * 0.9 : (intent.braced ? 0 : intent.vertical ? intent.vertical * speed : -18) - CR.move.gravity * dt;
  }
  stepBody(b, { dir, speed: wantedSpeed, jump: intent.jump && !wet }, dt, (x, y) =>
    !!objective && objectiveBarrier(room, objective, x) || challengeSolid(room, e.basinRaised, x, y, objective));
  // Swimming at the surface must not oscillate between falling and full jumping.
  if (wet && !breach && regionAt(geom(room), b.x) && b.y < waterlineAt(room, e, b.x) + 2) { b.y = waterlineAt(room, e, b.x) + 2; b.vy = 0; }
}
