// Purpose: Rig -> arm -> lure an attacking enemy into a net, without biting it first.
import type { RoomObjective } from "./waterObjectives";
import type { WaterEnemy } from "./waterEncounters";
export const NET = { rigX: 104, x: 368, y: 288, radius: 28 };
export function useNet(o: RoomObjective, x: number, y: number): { state: RoomObjective; message: string } | null {
  if (Math.abs(x - NET.rigX) < 18 && Math.abs(y - 304) < 25)
    return { state: { ...o, rigging: true }, message: "Net rigging collected. E at the net frame in the water to arm it. Lure a rushing or diving enemy through the amber frame; no bites needed." };
  if (Math.abs(x - NET.x) < 25 && Math.abs(y - NET.y) < 30)
    return o.rigging ? { state: { ...o, netArmed: true }, message: "Net armed. Move to its other side, provoke an attack, then dodge. It catches one healthy enemy; rearm for another." } :
      { state: o, message: "Net frame needs rigging. Collect the coil marked E near the entrance first." };
  return null;
}
export const netCatches = (o: RoomObjective, e: WaterEnemy): boolean => !!o.netArmed && e.hp > 0 && !e.incapacitated &&
  (e.phase === "strike" || e.kind === "dropper" && e.phase === "recover") && Math.abs(e.x - NET.x) < NET.radius && Math.abs(e.y - 272) < 42;
