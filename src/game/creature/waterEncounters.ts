// Purpose: Engine-free enemy tells, committed attacks and recovery windows for Water encounters.
// Notes: Attack direction locks after the tell. All clocks are advanced only by active scene dt.
// Authored: Written with Codex (GPT-6).
import type { WaterRoom } from "./waterWorld";
import { roomSpec } from "./levelgen/roomSpec";
export type EnemyKind = "charger" | "ambusher" | "swimmer" | "dropper";
export type EnemyPhase = "patrol" | "tell" | "strike" | "recover";
export interface WaterEnemy { kind: EnemyKind; x: number; y: number; home: number; hp: number; facing: number;
  phase: EnemyPhase; timer: number; aimY: number; passed: boolean; age: number; incapacitated?: boolean; trapped?: boolean; patrolX?: number }
export const ENCOUNTER = { trapX: 96, trapTarget: 464, trapRadius: 76, cacheX: 280, cacheY: 228, cacheHeal: 2,
  ventX: 384, ventPeriod: 4, ventTell: 1.1, ventActive: 0.65, ventRadius: 24 };
export const ENEMIES = {
  charger: { damage: 3, stun: 0.75, name: "Bristle charger", hp: 5, tell: 0.9, strike: 0.65, recover: 1.5, speed: 250, detect: 170, frame: 12, tint: 0xe3b17d },
  ambusher: { damage: 2, stun: 0, name: "Reed ambusher", hp: 3, tell: 1.05, strike: 0.4, recover: 1.8, speed: 210, detect: 112, frame: 0, tint: 0x92bd65 },
  swimmer: { damage: 2, stun: 0, name: "Needle swimmer", hp: 4, tell: 0.85, strike: 0.7, recover: 1.35, speed: 190, detect: 156, frame: 4, tint: 0x82cddc },
  dropper: { damage: 3, stun: 0, name: "Canopy dropper", hp: 4, tell: 0.95, strike: 1, recover: 1.8, speed: 310, detect: 64, frame: 8, tint: 0xc4a6db },
} as const;
export const encounterKinds = (r: WaterRoom): EnemyKind[] => roomSpec(r).enemies.map(e => e.kind);
export function spawnEncounters(r: WaterRoom): WaterEnemy[] {
  return roomSpec(r).enemies.map(({ kind, x, y }, n) => ({ kind, x, home: x, y, hp: ENEMIES[kind].hp,
    facing: -1, phase: "patrol", timer: 0, aimY: 0, passed: false, age: n }));
}
export const reedPatches = (r: WaterRoom): number[] => roomSpec(r).reeds;
export const reedCover = (r: WaterRoom, x: number): boolean => reedPatches(r).some(center => Math.abs(x - center) < 36);
export interface EnemyTarget { x: number; y: number; hidden: boolean; submerged: boolean }
/** `maxX` bounds land enemies and `swimMaxX` swimmers (defaults are the v1 room: 580 and the water edge less 8). */
export function stepEnemy(e: WaterEnemy, target: EnemyTarget, dt: number, flood: boolean, minX: number,
  blocked: (x: number, y: number) => boolean = () => false, bounds: { maxX: number; swimMaxX: number } = { maxX: 580, swimMaxX: 536 }): boolean {
  if (e.hp <= 0 || e.incapacitated || dt <= 0) return false;
  if (e.kind === "dropper") return stepDropper(e, target, dt, blocked);
  const oldX = e.x, oldY = e.y, t = ENEMIES[e.kind], maxX = e.kind === "swimmer" ? bounds.swimMaxX : bounds.maxX; e.age += dt;
  const eligible = !target.hidden && (e.kind !== "swimmer" || target.submerged) && Math.abs(target.y - e.y) < (e.kind === "swimmer" ? 90 : 45);
  if (e.phase === "patrol") {
    if (e.kind === "swimmer") { e.x = (e.patrolX ?? e.home) + Math.sin(e.age * 0.9) * 32; e.y = 266 + Math.sin(e.age * 1.3) * 13; }
    if (eligible && Math.abs(target.x - e.x) < t.detect) { e.phase = "tell"; e.timer = t.tell; e.facing = target.x >= e.x ? 1 : -1; }
  } else {
    e.timer = Math.max(0, e.timer - dt);
    if (e.phase === "tell" && e.timer === 0) {
      e.phase = "strike"; e.timer = t.strike;
      e.aimY = e.kind === "swimmer" ? Math.max(-0.65, Math.min(0.65, (target.y - e.y) / 100)) : 0;
    } else if (e.phase === "strike") {
      e.x += e.facing * t.speed * (flood ? 0.8 : 1) * dt;
      e.y = Math.max(242, Math.min(288, e.y + e.aimY * t.speed * dt));
      if (e.timer === 0 || e.x <= minX || e.x >= maxX) { if (e.kind === "swimmer") e.patrolX = Math.max(minX, Math.min(maxX, e.x)); e.phase = "recover"; e.timer = t.recover; }
    } else if (e.phase === "recover" && e.timer === 0) { e.phase = "patrol"; }
  }
  e.x = Math.max(minX, Math.min(maxX, e.x));
  if (blocked(e.x, e.y)) { if (e.kind === "swimmer") e.patrolX = oldX; e.x = oldX; e.y = oldY; e.phase = "recover"; e.timer = t.recover; }
  return e.phase === "strike" && Math.abs(target.x - e.x) < 24 && Math.abs(target.y - e.y) < 23;
}
export const biteDamage = (e: WaterEnemy, strength: number): number => strength * (e.phase === "recover" ? 2 : 1);
export function evasion(e: WaterEnemy, x: number, y: number, hidden: boolean): "stealth" | "route" | null {
  if (e.passed || x <= e.home + 44 || Math.abs(e.x - x) <= 38) return null;
  return hidden ? "stealth" : e.kind === "swimmer" && x > 560 || Math.abs(y - e.y) > 32 ? "route" : null;
}
export const trapCanHit = (e: WaterEnemy): boolean => e.hp > 0 && !e.incapacitated && e.kind !== "swimmer" && Math.abs(e.x - ENCOUNTER.trapTarget) < ENCOUNTER.trapRadius;
export const hasVent = (r: WaterRoom): boolean => roomSpec(r).vent !== null;
export function ventPhase(clock: number): "quiet" | "tell" | "active" {
  const t = clock % ENCOUNTER.ventPeriod;
  return t < ENCOUNTER.ventTell ? "tell" : t < ENCOUNTER.ventTell + ENCOUNTER.ventActive ? "active" : "quiet";
}

// The shadow/tell stays under the fixed ceiling perch; no tracking while falling.
function stepDropper(e: WaterEnemy, target: EnemyTarget, dt: number, blocked: (x: number, y: number) => boolean): boolean {
  const t = ENEMIES.dropper;
  if (e.phase === "patrol") {
    e.y = Math.max(128, e.y - 100 * dt);
    if (e.y === 128 && !target.hidden && target.y > 170 && Math.abs(target.x - e.x) < t.detect) { e.phase = "tell"; e.timer = t.tell; }
  } else {
    e.timer = Math.max(0, e.timer - dt);
    if (e.phase === "tell" && e.timer === 0) { e.phase = "strike"; e.timer = t.strike; }
    else if (e.phase === "strike") {
      const ny = Math.min(288, e.y + t.speed * dt);
      if (blocked(e.x, ny)) { e.phase = "recover"; e.timer = t.recover; }
      else e.y = ny;
      const hit = Math.abs(target.x - e.x) < 24 && Math.abs(target.y - e.y) < 24;
      if (e.y >= 288 || e.timer === 0) { e.phase = "recover"; e.timer = t.recover; }
      return hit;
    } else if (e.phase === "recover" && e.timer === 0) e.phase = "patrol";
  }
  return false;
}
