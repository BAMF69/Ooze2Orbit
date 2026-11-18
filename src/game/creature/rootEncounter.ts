// Purpose: Engine-free Snapfrond encounter for the authored Root Lane prototype.
import { makeRng } from "./levelgen/rng";

export const ROOT_LANE = {
  id: -3, width: 640, entry: 48, retreat: 24, coverStart: 184, coverEnd: 412,
  floodCover: 16, enemyX: 320, baitX: 260, exit: 576, reach: 24, attackHeight: 268,
  biteReach: 42, sneakStart: 206, passX: 366, seedSalt: 0x524f4f54, anchorStep: 8,
} as const;
export const SNAPFROND = { hp: 4, damage: 2, detect: 102, length: 84, tell: 1.1, strike: 0.35, recover: 1.65, pull: 0.22, hold: 0.8, rockDamage: 2, rockStun: 2.4, beeRadius: 27, beeHeight: 272, beeDamage: 1 } as const;

export type RootBait = "rock" | "honeycomb";
export type RootVerdict = "fight" | "sneak" | "trap";
export interface RootEncounter {
  x: number;
  phase: "watch" | "tell" | "strike" | "recover";
  remaining: number;
  grab: number;
  caughtX: number;
  hp: number;
  bait: RootBait | null;
  rockUsed: boolean;
  stuck: boolean;
  hit: boolean;
  sneaking: boolean;
  verdict: RootVerdict | null;
}
export function rootEncounter(seed: number): RootEncounter {
  const offset = makeRng(seed ^ ROOT_LANE.seedSalt).int(3) - 1;
  return { x: ROOT_LANE.enemyX + offset * ROOT_LANE.anchorStep, phase: "watch", remaining: 0,
    grab: 0, caughtX: 0, hp: SNAPFROND.hp, bait: null, rockUsed: false, stuck: false, hit: false, sneaking: false, verdict: null };
}

export function rootCovered(x: number, flood: boolean): boolean {
  const extra = flood ? ROOT_LANE.floodCover : 0;
  return x >= ROOT_LANE.coverStart - extra && x <= ROOT_LANE.coverEnd + extra;
}

export function snapLane(e: RootEncounter): [number, number] {
  return [e.x - SNAPFROND.length, e.x + SNAPFROND.length];
}

export function setRootBait(e: RootEncounter, bait: RootBait): boolean {
  if (e.verdict || e.grab > 0 || (bait === "rock" && e.rockUsed)) return false;
  e.bait = bait;
  return true;
}

export function grabbedPosition(e: RootEncounter): number {
  const progress = Math.min(1, (SNAPFROND.pull + SNAPFROND.hold - e.grab) / SNAPFROND.pull);
  return e.caughtX + (e.x - e.caughtX) * progress;
}

export function nearRootBees(e: RootEncounter, x: number, y: number): boolean {
  return e.stuck && Math.abs(x - e.x) <= SNAPFROND.beeRadius && y >= SNAPFROND.beeHeight;
}

export function stepRootEncounter(e: RootEncounter, player: { x: number; y: number; crouch: boolean },
  dt: number, flood: boolean): number {
  if (e.verdict || dt <= 0) return 0;
  if (e.grab > 0) {
    e.grab = Math.max(0, e.grab - dt);
    if (e.grab === 0) {
      e.phase = "recover";
      e.remaining = SNAPFROND.recover;
    }
    return 0;
  }
  const hidden = player.crouch && player.y >= ROOT_LANE.attackHeight && rootCovered(player.x, flood);
  if (!hidden || e.phase !== "watch") e.sneaking = false;
  else if (player.x <= ROOT_LANE.sneakStart) e.sneaking = true;
  if (e.sneaking && player.x >= ROOT_LANE.passX) {
    e.verdict = "sneak";
    return 0;
  }
  if (e.phase === "watch") {
    if (!hidden && player.y >= ROOT_LANE.attackHeight && Math.abs(player.x - e.x) <= SNAPFROND.detect) {
      e.phase = "tell";
      e.remaining = SNAPFROND.tell;
    }
    return 0;
  }
  e.remaining -= dt;
  if (e.phase === "tell" && e.remaining <= 0) {
    e.phase = "strike";
    e.remaining = SNAPFROND.strike;
    e.hit = false;
  }
  const [left, right] = snapLane(e);
  if (e.phase === "strike" && e.bait && ROOT_LANE.baitX >= left && ROOT_LANE.baitX <= right) {
    const bait = e.bait;
    e.bait = null;
    if (bait === "honeycomb") {
      e.stuck = true;
      e.verdict = "trap";
    } else {
      e.rockUsed = true;
      e.hp = Math.max(0, e.hp - SNAPFROND.rockDamage);
      e.phase = "recover";
      e.remaining = SNAPFROND.rockStun;
      if (!e.hp) e.verdict = "trap";
    }
    return 0;
  }
  if (e.phase === "strike" && player.y >= ROOT_LANE.attackHeight && player.x >= left && player.x <= right && !e.hit) {
    e.hit = true;
    e.caughtX = player.x;
    e.grab = SNAPFROND.pull + SNAPFROND.hold;
    return SNAPFROND.damage;
  }
  if (e.phase === "strike" && e.remaining <= 0) {
    e.phase = "recover";
    e.remaining = SNAPFROND.recover;
  } else if (e.phase === "recover" && e.remaining <= 0) {
    e.phase = "watch";
  }
  return 0;
}

export function biteSnapfrond(e: RootEncounter, x: number, y: number, strength: number): boolean {
  if (e.verdict || e.phase !== "recover" || y < ROOT_LANE.attackHeight || Math.abs(x - e.x) > ROOT_LANE.biteReach) return false;
  e.hp = Math.max(0, e.hp - Math.max(1, strength) * 2);
  if (!e.hp) e.verdict = "fight";
  return true;
}
