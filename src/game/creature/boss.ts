// ---------------------------------------------------------------------------
// boss.ts (creature)
// Purpose : The Old Horn, the creature stage's first boss, as pure rules (BAMF69 2026-11-09: "a boss battle").
//           It roams its den; when it sees you it paws the ground (windup), then charges in a straight line until
//           it hits a wall, which stuns it. Three ways to beat it, one per temperament:
//             fight   - bite it; bites while it is stunned do double damage
//             puzzle  - drop the hanging rocks on it from the levers (big damage, and it is stunned)
//             stealth - ambush it: a bite from behind while it has not seen you does triple damage
//           The way that did the most damage is how you beat it (ways.ts).
// Usage   : b = bossStep(b, { sees, hitWall, dt }); const { amount, way } = biteDamage(b, base, behind)
// Notes   : Pure, tested in tests/creature.test.ts. Numbers: CR.boss.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import type { Way } from "./level";
import { CR } from "./tuning";

export type BossMode = "roam" | "windup" | "charge" | "stunned" | "down";

export interface BossMind {
  mode: BossMode;
  t: number; // seconds left in windup or stunned
  aware: number; // seconds it still remembers seeing you (no ambush while it does)
  hp: number;
}

export function newBossMind(): BossMind {
  return { mode: "roam", t: 0, aware: 0, hp: CR.boss.hp };
}

/** One step of its mind. sees: it can see you now; hitWall: its charge ran into a wall. */
export function bossStep(b: BossMind, c: { sees: boolean; hitWall: boolean; dt: number }): BossMind {
  if (b.mode === "down") return b;
  const aware = c.sees ? CR.boss.awareS : Math.max(0, b.aware - c.dt);
  const t = Math.max(0, b.t - c.dt);
  switch (b.mode) {
    case "roam": return c.sees ? { ...b, mode: "windup", t: CR.boss.windupS, aware } : { ...b, aware };
    case "windup": return t <= 0 ? { ...b, mode: "charge", t: 0, aware } : { ...b, t, aware };
    case "charge": return c.hitWall ? { ...b, mode: "stunned", t: CR.boss.stunS, aware } : { ...b, aware };
    case "stunned": return t <= 0 ? { ...b, mode: "roam", t: 0, aware } : { ...b, t, aware };
  }
}

/** What one of your bites does: doubled while it is stunned, tripled from behind while it has not seen you. */
export function biteDamage(b: BossMind, base: number, behind: boolean): { amount: number; way: Way } {
  if (b.mode === "stunned") return { amount: base * CR.boss.stunnedMult, way: "fight" };
  if (behind && b.aware <= 0 && b.mode === "roam") return { amount: base * CR.boss.ambushMult, way: "stealth" };
  return { amount: base, way: "fight" };
}

/** Take damage; a falling rock also stuns it. Returns the new mind (down at 0 hp). */
export function hurtBoss(b: BossMind, amount: number, stun: boolean): BossMind {
  if (b.mode === "down") return b;
  const hp = Math.max(0, b.hp - amount);
  if (hp <= 0) return { ...b, hp, mode: "down", t: 0 };
  return stun ? { ...b, hp, mode: "stunned", t: CR.boss.stunS } : { ...b, hp };
}
