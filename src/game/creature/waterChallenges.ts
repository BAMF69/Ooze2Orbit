// Purpose: Shared objective-aware collision and line of sight for play, rendering, bots and validation.
// Notes: The tile answer comes from specSolid (levelgen/roomSpec.ts); this module keeps the public names.
// Authored: Written with Codex (GPT-6); moved onto the room model with Claude (Fable 5.1).
import type { WaterRoom } from "./waterWorld";
import { objectiveBarrier, type RoomObjective } from "./waterObjectives";
import { roomSpec, specSolid } from "./levelgen/roomSpec";
export const switchback = (r: WaterRoom): boolean => roomSpec(r).switchback;
export const challengeSolid = (r: WaterRoom, raised: boolean, x: number, y: number, objective?: RoomObjective): boolean =>
  specSolid(r, raised, x, y, objective);
export function clearWaterLine(r: WaterRoom, raised: boolean, x0: number, y0: number, x1: number, y1: number, objective?: RoomObjective): boolean {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8);
  for (let n = 1; n < steps; n++) {
    const x = Math.floor((x0 + (x1 - x0) * n / steps) / 16), y = Math.floor((y0 + (y1 - y0) * n / steps) / 16);
    if (objective && objectiveBarrier(r, objective, x) || challengeSolid(r, raised, x, y, objective)) return false;
  }
  return true;
}
