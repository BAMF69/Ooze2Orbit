// Purpose: Reciprocal vertical entrances and marked hazards, read from each room's spec openings and pits.
// Notes: Every opening names its destination entrance, elevation and facing; returns enter at the edge used.
// Authored: Written with Codex (GPT-6); moved onto the room model with Claude (Fable 5.1).
import type { RoomObjective } from "./waterObjectives";
import type { WaterRoom } from "./waterWorld";
import { roomSpec, openingRect, conditionMet, type Arrival, type Opening } from "./levelgen/roomSpec";
export type { Arrival };
export const pitRoom = (r: WaterRoom): boolean => roomSpec(r).pits.length > 0;
const openNow = (op: Opening, o: RoomObjective): boolean => conditionMet(op.when, o);
export function verticalOpening(r: WaterRoom, o: RoomObjective, tx: number, ty: number): boolean {
  return roomSpec(r).openings.some(op => { const q = openingRect(op); return openNow(op, o) && tx >= q.x0 && tx <= q.x1 && ty >= q.y0 && ty <= q.y1; });
}
/** Crossing the top edge (y < 96) or bottom edge (y > 338) over an open shaft arrives in the linked room. */
export function verticalArrival(r: WaterRoom, x: number, y: number, o: RoomObjective): Arrival | null {
  for (const op of roomSpec(r).openings) {
    const edge = op.side === "top" ? y < 96 : y > 338;
    if (openNow(op, o) && x >= op.probe[0] && x <= op.probe[1] && edge) return { ...op.to };
  }
  return null;
}
/** A left-side onward hatch returns through that hatch, never the chamber's sealed right wall. */
export function horizontalReturn(from: WaterRoom, to: WaterRoom): Arrival {
  const back = roomSpec(from).returnArrival;
  return back ? { room: to.id, ...back } : { room: to.id, ...roomSpec(to).arriveFromRight };
}
