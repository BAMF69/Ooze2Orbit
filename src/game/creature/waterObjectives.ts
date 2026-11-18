// Purpose: Physical sluice puzzles and unbanked expedition rewards. No menu can substitute for route solving.
// Notes: State is life-local; banked lineage/world changes remain in the existing generation checkpoint.
//        Which puzzle a room holds comes from its spec (levelgen/roomSpec.ts), never from its ID.
// Authored: Written with Codex (GPT-6); moved onto the room model with Claude (Fable 5.1).
import { completeLevel, discover } from "./expedition";
import type { Garden } from "./generations";
import type { Adaptation, Difficulty, WaterRoom } from "./waterWorld";
import { roomSpec } from "./levelgen/roomSpec";
import { holds, type Key } from "./levelgen/keys";
export interface RoomObjective { first: boolean; open: boolean; remaining: number; arenaActive?: boolean; arenaCleared?: boolean;
  rigging?: boolean; netArmed?: boolean; netCaught?: number; verticalOpen?: boolean; keyOpen?: boolean; bonusOpen?: boolean }
export interface Cargo { samples: Adaptation[]; clears: Difficulty[] }
export interface Valve { x: number; y: number; text: string }
export const SEAL_TILES = [3, 35] as const, EXIT_TILE = 35;
export const newObjective = (): RoomObjective => ({ first: false, open: false, remaining: 0 });
export const newCargo = (): Cargo => ({ samples: [], clears: [] });
export const valves = (r: WaterRoom): Valve[] => roomSpec(r).controls.map(({ x, y, text }) => ({ x, y, text }));
export const leftExit = (r: WaterRoom): boolean => roomSpec(r).leftHatch !== null;
export const objectiveBarrier = (r: WaterRoom, o: RoomObjective, tx: number): boolean =>
  !!o.arenaActive && !o.arenaCleared && (tx === SEAL_TILES[0] || tx === SEAL_TILES[1]) || tx === EXIT_TILE && (leftExit(r) || !o.open);
export const drainedRoom = (r: WaterRoom, o: RoomObjective): boolean => roomSpec(r).puzzle === "drain" && o.first && !o.open;
export const canClaimSeal = (o: RoomObjective): boolean => o.open && o.remaining >= 0;
export function emergencyRelease(r: WaterRoom, o: RoomObjective, x: number): RoomObjective {
  return roomSpec(r).puzzle === "pressure" && !o.open && x > 565 ? { ...o, open: true, remaining: -1 } : o;
}
export function tickObjective(o: RoomObjective, dt: number): RoomObjective {
  if (o.remaining <= 0) return o;
  const remaining = Math.max(0, o.remaining - dt);
  return { ...o, remaining, open: remaining > 0 };
}
export function useValve(r: WaterRoom, o: RoomObjective, x: number, y: number): { state: RoomObjective; message: string; used: boolean } {
  const s = roomSpec(r), targets = s.controls, i = targets.findIndex(v => Math.abs(x - v.x) < 28 && Math.abs(y - v.y) < 25);
  if (i < 0) return { state: o, message: "", used: false };
  if (targets.length === 2) {
    if (i === 1 && !o.first) return { state: o, used: true, message: "The latch is under pressure. Find control 1 first; follow the numbered markers." };
    if (i === 0) return { state: { ...o, first: true }, used: true,
      message: s.puzzle === "drain" ? "Water drained. Return LEFT to the upper release; breach-jump from the surface or approach the ledge from land." : s.puzzle === "pressure" ? "Pressure charged. Return LEFT to the raised release wheel, then cross the vent before the gate closes." : "Relay primed. Dive through the far gallery to the lower latch, then return LEFT to the exit hatch." };
  }
  const timed = s.puzzle === "pressure";
  return { state: { ...o, first: true, open: true, remaining: timed ? s.timed : 0 }, used: true,
    message: timed ? `Pressure gate opens for ${s.timed} active seconds. Cross the vent safely before it closes; the wheel can be reset.` : leftExit(r) ? "Lower latch released. The onward hatch is back LEFT at the entrance, above the floor. Retrace the shaft." : "Sluice unbarred. The route is open in both directions for this life." };
}
/** A keyed control (class door, vault shaft) opens only for a lineage holding one of its key sets. */
export function useKeyed(r: WaterRoom, o: RoomObjective, x: number, y: number, keys: ReadonlySet<Key>): { state: RoomObjective; message: string; used: boolean } {
  const k = roomSpec(r).keyed;
  if (!k || Math.abs(x - k.x) >= 28 || Math.abs(y - k.y) >= 25) return { state: o, message: "", used: false };
  if (o[k.opens]) return { state: o, message: "Already open for this life.", used: true };
  if (!k.requires.some(all => all.every(key => holds(keys, key)))) return { state: o, message: k.locked, used: true };
  return { state: { ...o, [k.opens]: true }, message: k.text, used: true };
}
export function bankCargo(g: Garden, cargo: Cargo): Garden {
  for (const sample of cargo.samples) g = discover(g, sample);
  for (const tier of cargo.clears) g = completeLevel(g, tier);
  return g;
}
