// ---------------------------------------------------------------------------
// predator.ts
// Purpose : The gulper's mind, without Phaser: a small state machine (SOP-14: an FSM is the simplest technique
//           that fits). It hunts whatever is tastiest nearby (you, or the small cells, which it slightly prefers, so
//           it gets distracted), sticks to its choice, rests after eating, and tires of chasing you.
// Usage   : brain = think(brain, me, seen, dt, TUNING.gulper)   // every frame; seen = what it can perceive
//           brain = ate(brain, TUNING.gulper)                    // when it swallows a small cell
//           brain.targetId: the id to swim at (PLAYER_ID for you), or null (wander)
// Notes   : Layers (SOP-14): perception = the scene's list of nearby creatures; decision = this file; movement = the
//           scene's swim(). Re-decides every thinkS, not every frame. Readability: "hunt" on the player shows a
//           warning toast; "sated" and "tired" swim slowly. Tested in tests/cellPredator.test.ts.
//           Playtest 2026-11-07 (BAMF69): "make it so the gulpers can get distracted by other creatures instead of
//           exclusively chasing the player".
//
// Pseudocode:
//   timers tick -> sated/tired over? back to wander
//   hunting you too long? -> tired (a chase that never ends makes any mistake fatal, SOP-14)
//   current target gone or out of sight? -> wander
//   time to think and not resting: score each seen creature = distance x weight (you: playerWeight, prey:
//   preyWeight; tuning.ts says which one wins at equal distance); keep the current target unless the best is clearly better
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

export const PLAYER_ID = -1;

export type GulperState = "wander" | "hunt" | "sated" | "tired";

export interface GulperBrain {
  readonly state: GulperState;
  readonly targetId: number | null;
  readonly timer: number; // seconds left in sated/tired
  readonly chasedPlayer: number; // seconds spent hunting the player in this chase
  readonly thinkIn: number; // seconds until the next decision
}

export interface Seen {
  id: number; // PLAYER_ID for the player
  x: number;
  y: number;
}

export interface GulperParams {
  sight: number; // px: it notices creatures this close
  loseSight: number; // px: it gives up a target that gets this far away
  thinkS: number; // seconds between decisions
  playerWeight: number; // distance multiplier when scoring the player (lower = more attractive)
  preyWeight: number; // the same for small cells: it gets distracted by prey clearly closer than you
  stickiness: number; // a new target must score this many times better to switch
  huntPlayerMaxS: number; // it tires after chasing you this long
  tiredS: number;
  satedS: number;
}

export function newBrain(thinkIn = 0): GulperBrain {
  return { state: "wander", targetId: null, timer: 0, chasedPlayer: 0, thinkIn };
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const score = (me: { x: number; y: number }, s: Seen, p: GulperParams) =>
  dist(me, s) * (s.id === PLAYER_ID ? p.playerWeight : p.preyWeight);

/** One step of the gulper's mind. Pure: returns the next brain. */
export function think(b: GulperBrain, me: { x: number; y: number }, seen: readonly Seen[], dt: number, p: GulperParams): GulperBrain {
  let { state, targetId, timer, chasedPlayer, thinkIn } = b;
  timer = Math.max(0, timer - dt);
  thinkIn -= dt;

  if ((state === "sated" || state === "tired") && timer <= 0) state = "wander";
  if (state === "sated" || state === "tired") return { state, targetId: null, timer, chasedPlayer: 0, thinkIn };

  if (state === "hunt" && targetId === PLAYER_ID) {
    chasedPlayer += dt;
    if (chasedPlayer >= p.huntPlayerMaxS) return { state: "tired", targetId: null, timer: p.tiredS, chasedPlayer: 0, thinkIn };
  }

  const current = targetId === null ? undefined : seen.find((s) => s.id === targetId);
  if (state === "hunt" && (!current || dist(me, current) > p.loseSight)) {
    state = "wander";
    targetId = null;
    chasedPlayer = 0;
    thinkIn = 0; // look around at once
  }

  if (thinkIn > 0) return { state, targetId, timer, chasedPlayer, thinkIn };
  thinkIn = p.thinkS;

  let best: Seen | null = null;
  let bestScore = Infinity;
  for (const s of seen) {
    if (dist(me, s) > p.sight) continue;
    const sc = score(me, s, p);
    if (sc < bestScore) { bestScore = sc; best = s; }
  }
  if (!best) return { state: "wander", targetId: null, timer, chasedPlayer: 0, thinkIn };

  // keep the current target unless the best one scores under stickiness x the current score
  const keep = state === "hunt" && current && bestScore >= score(me, current, p) * p.stickiness;
  const next = keep && current ? current : best;
  if (next.id !== targetId) chasedPlayer = 0;
  return { state: "hunt", targetId: next.id, timer, chasedPlayer, thinkIn };
}

/** It swallowed a small cell: rest, ignoring everything, for satedS. */
export function ate(b: GulperBrain, p: GulperParams): GulperBrain {
  return { ...b, state: "sated", targetId: null, timer: p.satedS, chasedPlayer: 0 };
}
