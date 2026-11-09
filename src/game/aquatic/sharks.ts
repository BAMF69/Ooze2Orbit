// ---------------------------------------------------------------------------
// sharks.ts
// Purpose : The sharks' mind (BAMF69 2026-11-08), as pure rules. A shark roams until it notices you, then hunts you
//           until you breach (leave the water: it loses you) or get far enough away. Two rule switches per shark:
//           relentlessLow (below half health it hunts you anywhere and never gives up: the lake's medium shark, the
//           coast's large shark) and mercyLow (below half health it leaves you alone unless you get too close: the
//           coast's medium sharks). After a bite it peels off for a moment (pillar 1: no chain bites).
// Usage   : brain = sharkThink(brain, shark, you, dt, SHARKS.medium, placement, SHARK_MIND); brain.mode === "hunt"
//           brain = sharkBit(brain, SHARK_MIND)
// Notes   : Pure. Tested in tests/aquaticSharks.test.ts. The scene moves them (pursue / wander / swim away).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
//
// Pseudocode
//   rest (after a bite or your breach) -> roam when the timer runs out
//   you breached while it hunted -> rest
//   low and relentless -> hunt (anywhere);  low and merciful and not too close -> roam
//   hunting: too far -> roam;  roaming: you are in sight -> hunt

export interface SharkBrain {
  mode: "roam" | "hunt" | "rest";
  timer: number;
}

export interface SharkSees {
  x: number;
  y: number;
  z: number;
  airborne: boolean; // you are mid-breach, out of the water
  hpFrac: number; // your health, 0..1
}

export interface SharkSpecLite {
  sight: number;
  loseDist: number;
  closeDist: number;
}

export interface SharkRules {
  relentlessLow: boolean;
  mercyLow: boolean;
}

export interface SharkMind {
  breachRestS: number;
  biteRestS: number;
}

export function newSharkBrain(): SharkBrain {
  return { mode: "roam", timer: 0 };
}

export function sharkThink(
  b: SharkBrain, me: { x: number; y: number; z: number }, you: SharkSees, dt: number,
  spec: SharkSpecLite, rules: SharkRules, mind: SharkMind,
): SharkBrain {
  const timer = Math.max(0, b.timer - dt);
  if (b.mode === "rest") return timer > 0 ? { mode: "rest", timer } : { mode: "roam", timer: 0 };
  const dist = Math.hypot(you.x - me.x, you.y - me.y, you.z - me.z);
  const low = you.hpFrac < 0.5;
  if (you.airborne) return b.mode === "hunt" ? { mode: "rest", timer: mind.breachRestS } : { mode: "roam", timer }; // you left the water
  if (low && rules.relentlessLow) return { mode: "hunt", timer };
  if (low && rules.mercyLow && dist > spec.closeDist) return { mode: "roam", timer };
  if (b.mode === "hunt") return dist > spec.loseDist ? { mode: "roam", timer } : { mode: "hunt", timer };
  return dist < spec.sight ? { mode: "hunt", timer } : { mode: "roam", timer };
}

/** It bit you: it peels off for a moment. */
export function sharkBit(b: SharkBrain, mind: SharkMind): SharkBrain {
  return { ...b, mode: "rest", timer: mind.biteRestS };
}
