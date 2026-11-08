// ---------------------------------------------------------------------------
// pilot.ts
// Purpose : The ?autoplay pilot's decisions, without Phaser: what to swim at and what to buy. It exists so
//           `dev.py smoke --drive play:N --query autoplay` can play every diet unattended and capture it.
// Usage   : const t = pilotTarget(creature, player, { orbs, food, cells }); const stat = pilotBuy(creature)
// Notes   : Deliberately simple, not a good player. Order: a part when a slot is free -> edible food close by ->
//           a cell to fight (always for a carnivore, it needs meat; others once they have food to lose) -> the
//           nearest edible food anywhere. Tested in tests/cellPilot.test.ts.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { buyUpgrade, type Creature } from "./rules";
import { nearest } from "./steer";
import { UPGRADE_STATS, type UpgradeStat } from "./tuning";

type Pt = { x: number; y: number };
const CLOSE_FOOD = 150; // px: grab food this close before anything else
const FIGHT_FOOD = 4; // non-carnivores pick fights only with at least this much food

export function pilotTarget(c: Creature, me: Pt, w: { orbs: readonly Pt[]; food: readonly Pt[]; cells: readonly Pt[] }): Pt | null {
  if (c.parts.length < c.form) {
    const o = nearest(me, w.orbs);
    if (o) return o;
  }
  const f = nearest(me, w.food);
  if (f && Math.hypot(f.x - me.x, f.y - me.y) < CLOSE_FOOD) return f;
  if (c.diet === "carnivore" || c.food >= FIGHT_FOOD) {
    const cell = nearest(me, w.cells);
    if (cell) return cell;
  }
  return f;
}

/** The first upgrade (panel order) the creature can afford, or null. */
export function pilotBuy(c: Creature): UpgradeStat | null {
  return UPGRADE_STATS.find((s) => buyUpgrade(c, s).ok) ?? null;
}
