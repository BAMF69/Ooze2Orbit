// Purpose: Physical sluice puzzles and unbanked expedition rewards. No menu can substitute for route solving.
// Notes: State is life-local; banked lineage/world changes remain in the existing generation checkpoint.
// Authored: Written with Codex (GPT-6).
import { completeLevel, discover } from "./expedition";
import type { Garden } from "./generations";
import type { Adaptation, Difficulty, WaterRoom } from "./waterWorld";
export interface RoomObjective { first: boolean; open: boolean; remaining: number; arenaActive?: boolean; arenaCleared?: boolean;
  rigging?: boolean; netArmed?: boolean; netCaught?: number; verticalOpen?: boolean }
export interface Cargo { samples: Adaptation[]; clears: Difficulty[] }
export interface Valve { x: number; y: number; text: string }
export const newObjective = (): RoomObjective => ({ first: false, open: false, remaining: 0 });
export const newCargo = (): Cargo => ({ samples: [], clears: [] });
export function valves(r: WaterRoom): Valve[] {
  if (r.id === 4 || r.id === 8) return [{ x: 480, y: 288, text: "1 · Drain control" }, { x: 200, y: 236, text: "2 · Upper release" }];
  if (r.id === 5 || r.id === 9) return [{ x: 280, y: 228, text: "1 · Shaft relay" }, { x: 496, y: 288, text: "2 · Lower latch" }];
  if (r.id === 6 || r.id === 10) return [{ x: 480, y: 288, text: "1 · Charge pressure" }, { x: 192, y: 236, text: "2 · Timed release" }];
  const p = r.platforms[0];
  return [{ x: p ? p.x + p.width / 2 : 224, y: 236, text: "Upper sluice lever" }];
}
export const leftExit = (r: WaterRoom): boolean => r.id === 5 || r.id === 9;
export const objectiveBarrier = (r: WaterRoom, o: RoomObjective, tx: number): boolean =>
  !!o.arenaActive && !o.arenaCleared && (tx === 3 || tx === 35) || tx === 35 && (leftExit(r) || !o.open);
export const drainedRoom = (r: WaterRoom, o: RoomObjective): boolean => (r.id === 4 || r.id === 8) && o.first && !o.open;
export const canClaimSeal = (o: RoomObjective): boolean => o.open && o.remaining >= 0;
export function emergencyRelease(r: WaterRoom, o: RoomObjective, x: number): RoomObjective {
  return (r.id === 6 || r.id === 10) && !o.open && x > 565 ? { ...o, open: true, remaining: -1 } : o;
}
export function tickObjective(o: RoomObjective, dt: number): RoomObjective {
  if (o.remaining <= 0) return o;
  const remaining = Math.max(0, o.remaining - dt);
  return { ...o, remaining, open: remaining > 0 };
}
export function useValve(r: WaterRoom, o: RoomObjective, x: number, y: number): { state: RoomObjective; message: string; used: boolean } {
  const targets = valves(r), i = targets.findIndex(v => Math.abs(x - v.x) < 28 && Math.abs(y - v.y) < 25);
  if (i < 0) return { state: o, message: "", used: false };
  if (targets.length === 2) {
    if (i === 1 && !o.first) return { state: o, used: true, message: "The latch is under pressure. Find control 1 first; follow the numbered markers." };
    if (i === 0) return { state: { ...o, first: true }, used: true,
      message: drainedRoom(r, { ...o, first: true }) ? "Water drained. Return LEFT to the upper release; breach-jump from the surface or approach the ledge from land." : r.id === 6 || r.id === 10 ? "Pressure charged. Return LEFT to the raised release wheel, then cross the vent before the gate closes." : "Relay primed. Dive through the far gallery to the lower latch, then return LEFT to the exit hatch." };
  }
  const timed = r.id === 6 || r.id === 10;
  return { state: { ...o, first: true, open: true, remaining: timed ? 12 : 0 }, used: true,
    message: timed ? "Pressure gate opens for 12 active seconds. Cross the vent safely before it closes; the wheel can be reset." : leftExit(r) ? "Lower latch released. The onward hatch is back LEFT at the entrance, above the floor. Retrace the shaft." : "Sluice unbarred. The route is open in both directions for this life." };
}
export function bankCargo(g: Garden, cargo: Cargo): Garden {
  for (const sample of cargo.samples) g = discover(g, sample);
  for (const tier of cargo.clears) g = completeLevel(g, tier);
  return g;
}
