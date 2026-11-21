// Purpose: Rig -> arm -> lure an attacking enemy into a net, without biting it first.
// Notes: Rigging and frame positions come from the room spec so generated rooms can place them by relation.
// Authored: Written with Codex (GPT-6); moved onto the room model with Claude (Fable 5.1).
import type { RoomObjective } from "./waterObjectives";
import type { WaterEnemy } from "./waterEncounters";
import type { WaterRoom } from "./waterWorld";
import { roomSpec, type Point } from "./levelgen/roomSpec";
export const NET = { radius: 28, catchAbove: 16, catchHalfHeight: 42 };
export const netRig = (r: WaterRoom): Point => roomSpec(r).net.rig;
export const netFrame = (r: WaterRoom): Point => roomSpec(r).net.frame;
export function useNet(r: WaterRoom, o: RoomObjective, x: number, y: number): { state: RoomObjective; message: string } | null {
  const rig = netRig(r), frame = netFrame(r);
  if (Math.abs(x - rig.x) < 18 && Math.abs(y - rig.y) < 25)
    return { state: { ...o, rigging: true }, message: "Net rigging collected. E at the net frame in the water to arm it. Lure a rushing or diving enemy through the amber frame; no bites needed." };
  if (Math.abs(x - frame.x) < 25 && Math.abs(y - frame.y) < 30)
    return o.rigging ? { state: { ...o, netArmed: true }, message: "Net armed. Move to its other side, provoke an attack, then dodge. It catches one healthy enemy; rearm for another." } :
      { state: o, message: "Net frame needs rigging. Collect the coil marked E near the entrance first." };
  return null;
}
export const netCatches = (r: WaterRoom, o: RoomObjective, e: WaterEnemy): boolean => !!o.netArmed && e.hp > 0 && !e.incapacitated &&
  (e.phase === "strike" || e.kind === "dropper" && e.phase === "recover") && Math.abs(e.x - netFrame(r).x) < NET.radius && Math.abs(e.y - (netFrame(r).y - NET.catchAbove)) < NET.catchHalfHeight;
