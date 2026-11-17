// ---------------------------------------------------------------------------
// legacyWater.ts (creature/levelgen)
// Purpose : The seed-v1 Water world's room-ID tables, gathered from seven modules into one projection so an
//           existing saved world keeps playing exactly as before (CREATURE_LEVELGEN.md §7 step 0 and save rule).
//           This is the ONLY file that may branch on a v1 room ID. tests/creatureLegacyRooms.test.ts pins it.
// Usage   : legacySpec(room) -> RoomSpec, called by roomSpec() when a room carries no generated spec.
// Notes   : Keep the quirks (dead hint branches dropped, nets present in every room) until v1 worlds retire.
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
import type { WaterRoom } from "../waterWorld";
import type { EnemyKind } from "../waterEncounters";
import type { RoomSpec, CollisionRule, Opening } from "./roomSpec";

const KINDS: Record<number, EnemyKind[]> = { 1: ["charger"], 2: ["ambusher"], 4: ["charger", "ambusher"], 5: ["swimmer"], 6: ["dropper", "swimmer"],
  7: ["charger"], 8: ["charger", "swimmer"], 9: ["swimmer", "swimmer"], 10: ["charger", "dropper", "swimmer"] };
const GUARDED = [4, 6, 8, 9, 10], SEALED = [2, 7, 10], PITS = [7, 10];
const HINTS = {
  drain: "Find the lower drain control 1, then backtrack to upper release 2. E operates controls. Carry rewards home alive.",
  pressure: "Charge lower control 1, return to raised wheel 2, then cross before pressure expires. The seal must come home alive.",
  nursery: "Nursery branch: open the upper lever, then study the ripplefins. Carry their sample home alive to unlock fins for daughters.",
  shaft: "Dive beneath the roof to upper relay 1, then over the rock to lower latch 2. The onward hatch is back LEFT; retrace the shaft.",
  lever: "Find the raised gold sluice lever; jump or swim UP to reach it and press E. Open the route, then bring discoveries back to the nest alive.",
};

export function legacySpec(r: WaterRoom): RoomSpec {
  const id = r.id, drain = id === 4 || id === 8, shaft = id === 5 || id === 9, pressure = id === 6 || id === 10;
  const puzzle = drain ? "drain" : shaft ? "shaft" : pressure ? "pressure" : "lever";
  const p = r.platforms[0], guarded = GUARDED.includes(id);
  const controls: [number, number, string][] = drain ? [[480, 288, "1 · Drain control"], [200, 236, "2 · Upper release"]] :
    shaft ? [[280, 228, "1 · Shaft relay"], [496, 288, "2 · Lower latch"]] :
    pressure ? [[480, 288, "1 · Charge pressure"], [192, 236, "2 · Timed release"]] :
    [[p ? p.x + p.width / 2 : 224, 236, "Upper sluice lever"]];
  const kinds = KINDS[id] ?? [];
  const enemies = kinds.map((kind, n) => ({ kind, x: kind === "dropper" ? 368 : 416 + n * 48 + r.variant * 8, y: kind === "dropper" ? 128 : kind === "swimmer" ? 268 : 288 }));
  const collision: CollisionRule[] = [];
  if (id === 1) collision.push({ solid: true, stateOnly: true, x0: 5, x1: 6, y0: 15, y1: 15 }, { solid: true, stateOnly: true, x0: 7, x1: 8, y0: 11, y1: 11 });
  if (id === 5) collision.push({ solid: true, stateOnly: true, when: "verticalOpen", x0: 16, x1: 17, y0: 10, y1: 10 });
  if (drain || pressure) collision.push({ solid: true, x0: 11, x1: 13, y0: 15, y1: 15 });
  if (shaft) collision.push({ solid: true, x0: 7, x1: 9, y0: 15, y1: 15 },
    { solid: true, x0: 10, x1: 14, y0: -99, y1: 15 }, { solid: true, x0: 26, x1: 29, y0: -99, y1: 15 }, { solid: true, x0: 19, x1: 21, y0: 16, y1: 99 });
  const openings: Opening[] = [];
  if (id === 1) openings.push({ side: "top", tiles: [7, 8], probe: [119, 137], to: { room: 3, x: 152, y: 298, facing: 1 }, label: { text: "↑ NURSERY", always: true } });
  if (id === 3) openings.push({ side: "bottom", tiles: [7, 8], probe: [119, 137], to: { room: 1, x: 128, y: 116, facing: 1 }, label: { text: "↓ REED SHAFT", always: true } });
  if (id === 4) openings.push({ side: "bottom", tiles: [19, 21], probe: [311, 345], when: "open", to: { room: 5, x: 280, y: 116, facing: 1 }, label: { text: "↓ GALLERY DRAIN\nOpens with sluice", always: true } });
  if (id === 5) openings.push({ side: "top", tiles: [16, 18], probe: [263, 291], when: "verticalOpen", to: { room: 4, x: 328, y: 298, facing: -1, vy: -220 }, label: { text: "↑ DRAIN CHAMBER", always: false } });
  return {
    puzzle, timed: pressure ? 12 : 0,
    controls: controls.map(([x, y, text], n) => ({ x, y, text, guarded: guarded && n === 0 })),
    leftHatch: shaft ? { x: 128, y: 236 } : null, sealed: SEALED.includes(id),
    enemies, reeds: [r.cover + 48, ...enemies.filter(e => e.kind === "ambusher").map(e => e.x)],
    net: { rig: { x: 104, y: 304 }, frame: { x: 368, y: 288 } },
    vent: pressure ? { x: 384, y: 300 } : null, cache: shaft ? { x: 280, y: 228 } : null,
    pits: PITS.includes(id) ? [{ tiles: [7, 8], recoverX: 96 }] : [], switchback: shaft,
    collision, base: shaft ? { platforms: false, tunnel: false, gate: true } : drain || pressure ? { platforms: false, tunnel: true, gate: id !== 8 } : { platforms: true, tunnel: true, gate: true },
    openings, verticalOpenFrom: id === 5 ? 4 : null,
    returnArrival: id === 3 ? { x: 126, y: 304, facing: 1 } : null, arriveFromRight: shaft ? { x: 128, y: 236, facing: -1 } : { x: 600, y: 304, facing: -1 },
    branchArchX: r.branch >= 0 ? 126 : null,
    hint: { priority: drain ? HINTS.drain : pressure ? HINTS.pressure : id === 3 ? HINTS.nursery : null, fallback: shaft ? HINTS.shaft : HINTS.lever },
    keyed: null,
  };
}
