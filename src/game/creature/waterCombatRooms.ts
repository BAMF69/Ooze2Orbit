// Purpose: Selected sealed encounters and guarded switch operations, independent of Phaser.
import type { WaterRoom } from "./waterWorld";
import type { RoomObjective } from "./waterObjectives";
import { ENEMIES, type WaterEnemy } from "./waterEncounters";
import { roomSpec } from "./levelgen/roomSpec";
export const arenaRoom = (r: WaterRoom): boolean => roomSpec(r).sealed;
export const activeThreat = (e: WaterEnemy): boolean => e.hp > 0 && !e.incapacitated;
export function encounterLock(r: WaterRoom, o: RoomObjective, enemies: WaterEnemy[], x: number): RoomObjective {
  if (!arenaRoom(r) || o.arenaCleared) return o;
  if (!o.arenaActive && (x <= 96 || x >= 550)) return o;
  return { ...o, arenaActive: true, arenaCleared: enemies.every(e => !activeThreat(e)) };
}
export const sealedEncounter = (o: RoomObjective): boolean => !!o.arenaActive && !o.arenaCleared;
export const guardedControl = (r: WaterRoom, index: number): boolean => roomSpec(r).controls[index]?.guarded ?? false;
export const CONTROL_SECONDS = 2;
export interface Operation { x: number; y: number; hp: number; elapsed: number }
export function advanceOperation(op: Operation, x: number, y: number, hp: number, enemies: WaterEnemy[], dt: number): Operation | null {
  if (Math.abs(op.x - x) > 8 || Math.abs(op.y - y) > 12 || hp < op.hp ||
      enemies.some(e => activeThreat(e) && e.phase !== "recover" && Math.hypot(e.x - x, e.y - (y - 16)) < 76)) return null;
  return { ...op, elapsed: op.elapsed + dt };
}
export const canIncapacitate = (e: WaterEnemy, x: number, y: number): boolean => activeThreat(e) &&
  e.phase === "recover" && e.hp <= Math.ceil(ENEMIES[e.kind].hp / 2) && Math.hypot(e.x - x, e.y - (y - 16)) < 36;
