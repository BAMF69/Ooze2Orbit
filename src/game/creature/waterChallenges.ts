// Purpose: Medium's submerged switchback forces a readable dive/rise/dive instead of a flat corridor.
// Notes: Shared by rendering, actual controller and validation. Added content leaves seed-v1 room identities intact.
// Authored: Written with Codex (GPT-6).
import { roomSolid, type WaterRoom } from "./waterWorld";
import { objectiveBarrier, type RoomObjective } from "./waterObjectives";
import { pitRoom, verticalOpening } from "./waterRoutes";
export const switchback = (r: WaterRoom): boolean => r.id === 5 || r.id === 9;
export function challengeSolid(r: WaterRoom, raised: boolean, x: number, y: number, objective?: RoomObjective): boolean {
  if (objective) {
    if (verticalOpening(r.id, objective, x, y)) return false;
    if (pitRoom(r.id) && x >= 7 && x <= 8 && y >= 19) return false;
    if (r.id === 1 && (y === 15 && x >= 5 && x <= 6 || y === 11 && x >= 7 && x <= 8)) return true;
    if (r.id === 5 && objective.verticalOpen && y === 10 && x >= 16 && x <= 17) return true;
  }
  if ((r.id === 4 || r.id === 8 || r.id === 6 || r.id === 10) && y === 15 && x >= 11 && x <= 13) return true;
  if ((r.id === 5 || r.id === 9) && y === 15 && x >= 7 && x <= 9) return true;
  // Puzzle ledges replace the seed's decorative perch; overlapping heights can
  // otherwise trap a standing body between the two platform edges.
  if (!switchback(r)) return roomSolid([4, 6, 8, 10].includes(r.id) ? { ...r, platforms: [], gate: r.id === 8 ? false : r.gate } : r, raised, x, y);
  if (roomSolid({ ...r, tunnel: false, platforms: [] }, raised, x, y)) return true;
  if ((x >= 10 && x <= 14 || x >= 26 && x <= 29) && y <= 15) return true;
  return x >= 19 && x <= 21 && y >= 16;
}
export function clearWaterLine(r: WaterRoom, raised: boolean, x0: number, y0: number, x1: number, y1: number, objective?: RoomObjective): boolean {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8);
  for (let n = 1; n < steps; n++) {
    const x = Math.floor((x0 + (x1 - x0) * n / steps) / 16), y = Math.floor((y0 + (y1 - y0) * n / steps) / 16);
    if (objective && objectiveBarrier(r, objective, x) || challengeSolid(r, raised, x, y, objective)) return false;
  }
  return true;
}
