// ---------------------------------------------------------------------------
// relations.ts (creature/levelgen)
// Purpose : The §3.4 relation rules of CREATURE_LEVELGEN.md as Problem functions, plus a threat-zone model, so that
//           "a trap needs preparation and a lure lane", "a guarded switch needs a way to create an opening", "a ceiling
//           enemy needs room to dodge", "a pit needs a feasible crossing", "a sealed arena needs a net-only solution"
//           and "enemies cannot simply be walked past" are testable on any room, generated or stitched.
// Usage   : relationProblems(room, reach) -> string[] ; threatZone(room) -> (x, y) => boolean ; demandsSolution(room)
// Notes   : Pure. `reach` is the set of positions the search solver reached (search.ts with `collect`). The enemy
//           numbers mirror waterEncounters.ts (detect ranges, strike bands) and waterTraps.ts (net catch box).
// Authored: Written with Claude (Opus 5.5).
// ---------------------------------------------------------------------------
import type { WaterRoom } from "../waterWorld";
import { ENEMIES } from "../waterEncounters";
import { NET } from "../waterTraps";
import { guardedControl } from "../waterCombatRooms";
import { roomSpec, roomGeometry } from "./roomSpec";
import { regionAt, sealTiles, exitTile, floorY, topEdgeY, type RoomGeometry } from "./geometry";
import { guardWatches } from "./search";
import type { EnemySpawn } from "./roomSpec";

type Pt = { x: number; y: number };
const near = (reach: readonly Pt[], x: number, y: number, dx: number, dy: number): boolean => reach.some(p => Math.abs(p.x - x) < dx && Math.abs(p.y - y) < dy);

/** Can this enemy be lured into the room's net while healthy? Its committed strike, aimed at a player standing beyond
 *  the frame on either side, must reach the frame: within one strike's travel, inside the enemy's own bounds. */
export function lureLane(r: WaterRoom, en: EnemySpawn): boolean {
  const s = roomSpec(r), g = roomGeometry(r), f = s.net.frame, catchY = f.y - NET.catchAbove, t = ENEMIES[en.kind];
  if (en.kind === "dropper") return Math.abs(en.x - f.x) < NET.radius && floorY(g) - 16 - catchY < NET.catchHalfHeight; // it falls in place
  const reach = t.speed * t.strike; // px travelled by one committed strike
  if (en.kind === "swimmer") { const w = regionAt(g, en.x); return !!w && w === regionAt(g, f.x) && f.x > w.x0 + 8 && f.x < w.x1 - 8 && Math.abs(f.x - en.x) < reach && Math.abs(en.y - catchY) < NET.catchHalfHeight + 30; }
  return f.x > g.enemyMinX && f.x < g.enemyMaxX && Math.abs(f.x - en.x) < reach && Math.abs(en.y - catchY) < NET.catchHalfHeight;
}

/** The named relation problems of one room. Empty means every rule holds. */
export function relationProblems(r: WaterRoom, reach: readonly Pt[]): string[] {
  const s = roomSpec(r), g = roomGeometry(r), bad = new Set<string>();
  const foes = s.enemies;
  if (foes.length) {
    if (!near(reach, s.net.rig.x, s.net.rig.y, 18, 25) || !near(reach, s.net.frame.x, s.net.frame.y, 25, 30)) bad.add("net unreachable");
    if (foes.some(en => !lureLane(r, en))) bad.add("lure lane");
  }
  // A guarded control needs a readable way to create an opening: here, luring its guard into the net.
  s.controls.forEach((c, i) => {
    if (!guardedControl(r, i) || !guardWatches(r, c)) return;
    const guards = foes.filter(en => en.kind !== "dropper" && Math.hypot(en.x - c.x, en.y - (c.y - 16)) < 76);
    if (!guards.every(en => lureLane(r, en))) bad.add("guard opening");
  });
  // A ceiling dropper needs room to dodge: two clear, standable tiles beside its shadow on at least one side.
  for (const en of foes.filter(en => en.kind === "dropper")) if (!dodgeLane(g, reach, en.x)) bad.add("dodge lane");
  // A pit needs a feasible crossing: the far side must be reached.
  for (const p of s.pits) if (!reach.some(q => q.x > (p.tiles[1] + 1) * 16 + 8 && q.y > topEdgeY(g))) bad.add("pit crossing");
  // A sealed arena must be clearable without biting: the net inside the seal, and every enemy lurable.
  if (s.sealed) {
    const [l] = sealTiles(g), inside = (x: number) => x > (l + 1) * 16 && x < exitTile(g) * 16;
    if (!foes.length || !inside(s.net.rig.x) || !inside(s.net.frame.x) || foes.some(en => !lureLane(r, en))) bad.add("arena net-only");
  }
  // A branch needs a visible reason to explore it.
  for (const op of s.openings) if (!op.label.text.trim()) bad.add("branch reason");
  return [...bad];
}
function dodgeLane(g: RoomGeometry, reach: readonly Pt[], x: number): boolean {
  const floor = floorY(g);
  return [-1, 1].some(side => reach.some(p => Math.abs(p.y - floor) < 4 && side * (p.x - x) > 24 + 8 && side * (p.x - x) < 24 + 40));
}

/** Where an enemy hurts: its committed strike band (land rush, ambush lunge, swimmer lunge, dropper column). */
export function threatZone(r: WaterRoom): (x: number, y: number) => boolean {
  const g = roomGeometry(r), foes = roomSpec(r).enemies;
  return (x, y) => foes.some(en => {
    const t = ENEMIES[en.kind];
    if (en.kind === "dropper") return Math.abs(x - en.x) < 24 && y > en.y;
    if (en.kind === "swimmer") { const w = regionAt(g, en.x); return !!w && x >= w.x0 && x <= w.x1 && Math.abs(x - en.x) < t.detect && Math.abs(y - en.y) < 32; }
    return Math.abs(x - en.x) < t.detect && Math.abs(y - en.y) < 23; // rushes and lunges travel along the floor band
  });
}
/** Roles whose obstacle is a threat that has to be dealt with: sealed arenas and controls an active guard watches. */
export function demandsSolution(r: WaterRoom): boolean {
  const s = roomSpec(r);
  return s.sealed || s.controls.some((c, i) => guardedControl(r, i) && guardWatches(r, c));
}
