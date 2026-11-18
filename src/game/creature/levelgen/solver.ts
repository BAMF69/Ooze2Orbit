// ---------------------------------------------------------------------------
// solver.ts (creature/levelgen)
// Purpose : Physical validation through the real controller (CREATURE_LEVELGEN.md §5 invariants 11 to 13):
//           drive stepWaterBody along a template's solution script, operate its controls with the same pure
//           rules the scene uses, respawn from pits like the scene does, and report where it failed. Also the
//           sprint-only bot (D + Shift) that must fail wherever a room demands a solution.
// Usage   : runScript(room, world, script, traits, keys) ; sprintThrough(room, world, traits)
// Notes   : Engine-free. Enemies are not simulated here: encounter rules have their own tests; timers are real.
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
import { newBody, type Body } from "../physics";
import { stepWaterBody, inWater, waterlineAt } from "../waterPhysics";
import { WATER, type WaterRoom } from "../waterWorld";
import { newObjective, initialObjective, useValve, useKeyed, tickObjective, canClaimSeal, type RoomObjective } from "../waterObjectives";
import { verticalArrival } from "../waterRoutes";
import type { Expedition } from "../expedition";
import type { Traits } from "../generations";
import { roomSpec, roomGeometry } from "./roomSpec";
import { leftEdgeX, rightEdgeX, bottomEdgeY, goalX } from "./geometry";
import type { Step } from "./templates";
import type { Key } from "./keys";

export interface RunResult { ok: boolean; step: number; reason: string; frames: number; falls: number; objective: RoomObjective; body: Body; log: string[] }
const DT = 1 / 60, FRAMES_PER_STEP = 1800;

const REACH = { x: 28, y: 25 }; // useValve / useKeyed proximity (waterObjectives.ts)
export function runScript(r: WaterRoom, e: Expedition, script: Step[], traits: Traits, keys: ReadonlySet<Key>, start: { x: number; y: number } = roomSpec(r).start ?? { x: WATER.spawn, y: WATER.floor }, objective = initialObjective(r)): RunResult {
  const s = roomSpec(r), g = roomGeometry(r), b = newBody(start.x, start.y); let o = objective, frames = 0, falls = 0; const log: string[] = [];
  const fail = (step: number, reason: string): RunResult => ({ ok: false, step, reason, frames, falls, objective: o, body: b, log });
  const settled = (): boolean => (b.onGround || inWater(b, e, r)) && Math.abs(b.vx) < 25; // momentum would carry the next move
  // The control a step means is the one at its target point, never whichever control happens to be nearest.
  const inReach = (step: Step): boolean => {
    const c = step.use === "valve" ? s.controls.find(v => Math.abs(step.to[0] - v.x) < REACH.x && Math.abs(step.to[1] - v.y) < REACH.y) : step.use === "keyed" ? s.keyed : null;
    return !!c && Math.abs(b.x - c.x) < REACH.x && Math.abs(b.y - c.y) < REACH.y;
  };
  const edge = (step: Step): boolean => step.use === "top" ? !!verticalArrival(r, b.x, b.y, o) : step.use === "left" ? b.x < leftEdgeX(g) : step.use === "right" ? b.x > rightEdgeX(g) : false;
  for (const [i, step] of script.entries()) {
    // A `via` point is the approach (e.g. under a platform); it is skipped when the control is already in reach.
    const phases: [number, number][] = step.via && !inReach(step) ? [step.via, step.to] : [step.to];
    for (const [p, [x, y]] of phases.entries()) {
      const last = p === phases.length - 1, uses = step.use === "valve" || step.use === "keyed";
      let arrived = last && uses && inReach(step) && settled();
      for (let n = 0; n < FRAMES_PER_STEP && !arrived; n++, frames++) {
        // Swimming stops in about 13 px from full speed: brake early in water so a point near a gap is not overshot.
        const dir = Math.abs(b.x - x) < (inWater(b, e, r) && Math.abs(b.vx) > 60 ? 16 : 3) ? 0 : Math.sign(x - b.x);
        stepWaterBody(b, r, e, traits, { dir, vertical: step.jumpOnce ? 0 : b.y > y + 3 ? -1 : b.y < y - 3 ? 1 : 0, jump: !!step.leap && n % 40 === 0 || !!step.jumpOnce && n === 0, crouch: false, sprint: !!step.sprint }, DT, o);
        o = tickObjective(o, DT);
        if (s.pits.length && b.y > bottomEdgeY(g)) { falls++; b.x = s.pits[0].recoverX; b.y = WATER.floor; b.vx = 0; b.vy = 0; if (falls > 3) return fail(i, "fell into the pit repeatedly"); }
        if (step.use === "right" && !o.open && b.x > goalX(g) + 10) return fail(i, "crossed the exit wall while closed");
        if (last && ["top", "left", "right"].includes(step.use ?? "")) arrived = edge(step);
        else if (last && uses) arrived = inReach(step) && settled();
        else if (step.surface) arrived = Math.abs(b.x - x) < 5 && b.y <= waterlineAt(r, e, b.x) + 8 && inWater(b, e, r); // a breach jump needs the surface
        else arrived = Math.abs(b.x - x) < 5 && (step.xOnly || Math.abs(b.y - y) < 20) && settled() || uses && inReach(step) && settled(); // a via point is dropped once the control is in reach
      }
      if (!arrived) return fail(i, `could not reach ${x},${y} (at ${b.x.toFixed(0)},${b.y.toFixed(0)})`);
    }
    if (step.use === "valve") { const v = useValve(r, o, b.x, b.y); if (!v.used) return fail(i, `no control at ${b.x.toFixed(0)},${b.y.toFixed(0)}`); o = v.state; log.push(v.message); }
    if (step.use === "keyed") { const k = useKeyed(r, o, b.x, b.y, keys); if (!k.used || k.state === o) return fail(i, `keyed control refused: ${k.message}`); o = k.state; }
    if (step.use === "hatch") { if (!s.leftHatch || !o.open || Math.abs(b.x - s.leftHatch.x) >= REACH.x || Math.abs(b.y - s.leftHatch.y) >= REACH.y) return fail(i, `hatch not usable at ${b.x.toFixed(0)},${b.y.toFixed(0)} open=${o.open}`); }
    if (step.use === "reward" && !(r.reward && b.x > goalX(g))) return fail(i, "reward not in reach");
    // Past the exit wall of a goal room the player claims the seal, which latches a timed gate open (scene interact()).
    if ((step.use === "right" || step.use === "claim") && r.goal && canClaimSeal(o)) { o = { ...o, remaining: 0 }; log.push("seal claimed"); }
    if (step.use === "claim" && !(r.goal && b.x > goalX(g) && o.open)) return fail(i, `seal not claimable at ${b.x.toFixed(0)} open=${o.open}`);
    // Leaving through the top and coming back arrives at the shaft's top entry; stand in for the branch visit.
    if (step.use === "top") { b.y = 100; b.vy = 0; b.vx = 0; }
  }
  return { ok: true, step: script.length, reason: "", frames, falls, objective: o, body: b, log };
}
/** The rejected exploit: hold right and sprint. Must not pass the exit wall or open anything. */
export function sprintThrough(r: WaterRoom, e: Expedition, traits: Traits, frames = 900): { x: number; open: boolean } {
  const s = roomSpec(r), g = roomGeometry(r), b = newBody(WATER.spawn, WATER.floor), o = newObjective();
  for (let n = 0; n < frames; n++) {
    stepWaterBody(b, r, e, traits, { dir: 1, vertical: 0, jump: false, crouch: false, sprint: true }, DT, o);
    if (s.pits.length && b.y > bottomEdgeY(g)) { b.x = s.pits[0].recoverX; b.y = WATER.floor; b.vx = 0; b.vy = 0; }
  }
  return { x: b.x, open: o.open };
}
