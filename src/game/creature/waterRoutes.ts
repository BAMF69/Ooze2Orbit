// Purpose: Reciprocal vertical entrances and marked hazards over the stable seed-v1 room graph.
import type { RoomObjective } from "./waterObjectives";
export interface Arrival { room: number; x: number; y: number; facing: number; vy?: number }
export const pitRoom = (id: number): boolean => id === 7 || id === 10;
export function verticalOpening(id: number, o: RoomObjective, tx: number, ty: number): boolean {
  if (id === 1 && tx >= 7 && tx <= 8 && ty < 6) return true;
  if (id === 3 && tx >= 7 && tx <= 8 && ty >= 19) return true;
  if (id === 4 && o.open && tx >= 19 && tx <= 21 && ty >= 19) return true;
  return id === 5 && !!o.verticalOpen && tx >= 16 && tx <= 18 && ty < 6;
}
export function verticalArrival(id: number, x: number, y: number, o: RoomObjective): Arrival | null {
  if (id === 1 && x >= 119 && x <= 137 && y < 96) return { room: 3, x: 152, y: 298, facing: 1 };
  if (id === 3 && x >= 119 && x <= 137 && y > 338) return { room: 1, x: 128, y: 116, facing: 1 };
  if (id === 4 && o.open && x >= 311 && x <= 345 && y > 338) return { room: 5, x: 280, y: 116, facing: 1 };
  if (id === 5 && o.verticalOpen && x >= 263 && x <= 291 && y < 96) return { room: 4, x: 328, y: 298, facing: -1, vy: -220 };
  return null;
}
/** A left-side onward hatch returns through that hatch, never the chamber's sealed right wall. */
export function horizontalReturn(from: number, to: number): Arrival {
  if (from === 3) return { room: to, x: 126, y: 304, facing: 1 };
  if (to === 5 || to === 9) return { room: to, x: 128, y: 236, facing: -1 };
  return { room: to, x: 600, y: 304, facing: -1 };
}
