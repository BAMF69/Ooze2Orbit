// ---------------------------------------------------------------------------
// level.ts (creature)
// Purpose : The creature stage's levels (docs/stages/03-creature.md) as pure data: a tile grid, the things in it
//           (boulders, plates, levers, logs and rocks, foes, the boss, parts, checkpoints) and its obstacles, each
//           with a fight, a puzzle and a stealth way through. Three levels are courses built from three reusable
//           pieces, and the fourth is the boss's den:
//             barrier  - a wall with three openings: a bramble plug to smash (fight), a gate a boulder on a plate
//                        opens (puzzle; the plate sits in a dip the boulder settles into), a root tunnel to creep
//                        through (stealth)
//             guarded  - a stretch a stalker patrols: fight it, drop a log on it with a lever (puzzle), or pass
//                        unseen in the tall grass (stealth)
//             crossing - water: smash the dead tree into a bridge (fight), pull the lever for the rope bridge
//                        (puzzle), creep the root ledge under the thorns (stealth). With the lake drained on the
//                        world map, it is a mud basin with a sleeping brute instead of the root ledge.
//             den      - the Old Horn's arena: beat it by biting it while it is stunned (fight), dropping the rocks
//                        on it from the levers (puzzle), or ambushing it from behind, unseen (stealth).
//           solidAt() answers "is this tile solid right now" from the level plus its changing state.
// Usage   : const lv = buildLevel("mirefen", drained); solidAt(lv, state, tx, ty)
// Notes   : Pure (no Phaser), tested in tests/creature.test.ts. Tile coordinates; rows grow downward; the ground's
//           top is row GROUND. An entity's (x, y) is the tile it stands in, feet on the top of row y + 1.
//           Fernwood, Mirefen, the Ridge (BAMF69 2026-11-09: "generate 2 more levels like this and then a boss").
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

export const enum Tile { Air = 0, Rock = 1, Bramble = 2, Gate = 3, Water = 4, Mud = 5, Grass = 6, Tree = 7, Bridge = 8, Thorn = 9 }

export type Way = "fight" | "puzzle" | "stealth";
export type LevelId = "fernwood" | "mirefen" | "ridge" | "den";

export interface Rect { x0: number; y0: number; x1: number; y1: number } // tiles, inclusive

export type Entity =
  | { kind: "start" | "checkpoint" | "finish"; x: number; y: number }
  | { kind: "boulder"; id: string; x: number; y: number }
  | { kind: "plate"; x: number; y: number; gate: string } // two tiles wide (x, x + 1), in a dip
  | { kind: "lever"; x: number; y: number; does: { log: string } | { bridge: string } }
  | { kind: "log"; id: string; x: number; hangY: number; groundY: number; rock?: boolean } // rock: the den's falling stones
  | { kind: "stalker"; id: string; x: number; y: number; from: number; to: number }
  | { kind: "brute"; id: string; x: number; y: number }
  | { kind: "boss"; id: string; x: number; y: number; from: number; to: number }
  | { kind: "part"; part: "claws" | "camo"; x: number; y: number };

export interface Obstacle {
  id: string;
  name: string;
  x0: number; // where it starts (tiles)
  exit: number; // passing this column clears it
  zones: Partial<Record<Way, Rect>>; // where each way physically goes through
  foe?: string; // a guard: how you dealt with it decides the way
  boss?: boolean; // the way is the one that did the most damage
}

/** A level's look (placeholder art, GDD "lit and moody"): sky bands, silhouettes, rock, moss, water. */
export interface Theme {
  sky: number[];
  far: number;
  mid: number;
  midKind: "trees" | "reeds" | "pines" | "cave";
  rock: number;
  rockL: number;
  moss: number;
  mossL: number;
  water: number;
}

export interface Level {
  id: LevelId;
  name: string;
  w: number;
  h: number;
  tiles: Tile[][]; // [y][x]
  links: Record<string, string>; // "x,y" -> gate, bridge or tree id
  entities: Entity[];
  obstacles: Obstacle[];
  drained: boolean;
  theme: Theme;
}

export interface LevelState {
  open: Set<string>; // gates open, bridges built, trees felled, by id
  broken: Set<string>; // bramble tiles smashed ("x,y")
}

export const GROUND = 18;
export const LEVEL_H = 22;
const key = (x: number, y: number) => `${x},${y}`;

export const THEMES: Record<LevelId, Theme> = {
  fernwood: { sky: [0x0e1424, 0x141c30, 0x1c2638, 0x24303e, 0x2c3a40], far: 0x18222a, mid: 0x121a1c, midKind: "trees", rock: 0x3a2e26, rockL: 0x52423a, moss: 0x4e6a34, mossL: 0x6e8c44, water: 0x1e3c5c },
  mirefen: { sky: [0x0c1614, 0x12201c, 0x182a24, 0x1e3428, 0x26402e], far: 0x16241e, mid: 0x0e1a14, midKind: "reeds", rock: 0x2e3226, rockL: 0x444a36, moss: 0x56703a, mossL: 0x7a9446, water: 0x1c3a30 },
  ridge: { sky: [0x140e20, 0x221630, 0x30203c, 0x3e2a44, 0x4c3448], far: 0x241a2e, mid: 0x16101e, midKind: "pines", rock: 0x3a3440, rockL: 0x544c5a, moss: 0x5a6a4a, mossL: 0x7a8a5e, water: 0x262c48 },
  den: { sky: [0x0a0606, 0x120a08, 0x1a0e0a, 0x22120c, 0x2a160e], far: 0x1a0e0a, mid: 0x120806, midKind: "cave", rock: 0x3a241a, rockL: 0x523426, moss: 0x5a3a24, mossL: 0x7a5232, water: 0x2a2220 },
};

type Piece = { kind: "barrier" | "guarded" | "crossing"; id: string; name: string; drainedName?: string };

const COURSES: Record<Exclude<LevelId, "den">, { name: string; pieces: Piece[] }> = {
  fernwood: { name: "Fernwood", pieces: [
    { kind: "barrier", id: "bramble", name: "the Bramble Wall" },
    { kind: "guarded", id: "stalker", name: "the Stalker's Run" },
    { kind: "crossing", id: "lake", name: "the Lake Crossing", drainedName: "the Mud Basin" },
    { kind: "barrier", id: "rockfall", name: "the Rockfall" },
    { kind: "guarded", id: "ridge", name: "the Ridge Path" },
  ] },
  mirefen: { name: "Mirefen", pieces: [
    { kind: "guarded", id: "reeds", name: "the Reed Hunter" },
    { kind: "crossing", id: "pool", name: "the Black Pool", drainedName: "the Dry Pool" },
    { kind: "barrier", id: "snarl", name: "the Root Snarl" },
    { kind: "crossing", id: "fen", name: "the Fen Channel", drainedName: "the Cracked Fen" },
    { kind: "guarded", id: "sentinel", name: "the Sentinel" },
  ] },
  ridge: { name: "the Ridge", pieces: [
    { kind: "barrier", id: "scree", name: "the Scree Wall" },
    { kind: "guarded", id: "watcher", name: "the Watcher's Ledge" },
    { kind: "crossing", id: "gorge", name: "the Gorge", drainedName: "the Dry Gorge" },
    { kind: "barrier", id: "pines", name: "the Fallen Pines" },
    { kind: "guarded", id: "summit", name: "the Summit Trail" },
  ] },
};

/** The level's grid and the helpers every builder shares. */
function grid(w: number) {
  const h = LEVEL_H;
  const tiles: Tile[][] = Array.from({ length: h }, () => Array<Tile>(w).fill(Tile.Air));
  const links: Record<string, string> = {};
  const fill = (x0: number, x1: number, y0: number, y1: number, t: Tile, link?: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { tiles[y][x] = t; if (link) links[key(x, y)] = link; }
  };
  fill(0, w - 1, GROUND, h - 1, Tile.Rock);
  fill(0, 0, 0, GROUND - 1, Tile.Rock);
  fill(w - 1, w - 1, 0, GROUND - 1, Tile.Rock);
  return { w, h, tiles, links, fill };
}

const STAND = GROUND - 1; // the row an entity on the ground stands in

/** One of the three courses: a start ledge with the claws, five pieces, a checkpoint after each, the finish. */
function buildCourse(id: Exclude<LevelId, "den">, drained: boolean): Level {
  const course = COURSES[id];
  const width = 6 + course.pieces.reduce((s, p) => s + (p.kind === "barrier" ? 19 : p.kind === "guarded" ? 23 : 27) + 3, 0) + 14;
  const g = grid(width);
  const { fill, h } = g;
  const entities: Entity[] = [];
  const obstacles: Obstacle[] = [];
  let camoPlaced = false;

  const barrier = (x: number, p: Piece): number => {
    const bx = x + 12;
    fill(bx, bx + 1, 0, GROUND - 1, Tile.Rock);
    fill(bx, bx + 1, 16, 17, Tile.Bramble); // fight: smash the plug
    fill(bx, bx + 1, 10, 11, Tile.Gate, `gate_${p.id}`); // puzzle: the upper gate
    fill(bx - 7, bx - 6, 15, 15, Tile.Rock); // steps up to it
    fill(bx - 3, bx - 1, 12, 12, Tile.Rock);
    fill(bx + 2, bx + 4, 12, 12, Tile.Rock); // and down the far side
    // the plate sits in a two-tile dip: a pushed boulder settles on it and stays (BAMF69 2026-11-09)
    fill(bx - 5, bx - 4, GROUND, GROUND, Tile.Air);
    entities.push({ kind: "plate", x: bx - 5, y: GROUND, gate: `gate_${p.id}` });
    entities.push({ kind: "boulder", id: `boulder_${p.id}`, x: bx - 10, y: STAND });
    fill(bx - 1, bx - 1, GROUND, GROUND, Tile.Air); // stealth: a root tunnel under the wall, its entrance by the wall
    fill(bx - 1, bx + 4, GROUND + 1, GROUND + 1, Tile.Air);
    fill(bx + 4, bx + 4, GROUND, GROUND, Tile.Air);
    obstacles.push({
      id: p.id, name: p.name, x0: bx - 11, exit: bx + 5,
      zones: { fight: { x0: bx, y0: 16, x1: bx + 1, y1: 17 }, puzzle: { x0: bx, y0: 10, x1: bx + 1, y1: 11 }, stealth: { x0: bx, y0: GROUND + 1, x1: bx + 1, y1: GROUND + 1 } },
    });
    return bx + 7;
  };

  const guarded = (x: number, p: Piece): number => {
    const x0 = x + 4, x1 = x0 + 16;
    const mid = Math.round((x0 + x1) / 2);
    fill(x0 + 4, x0 + 7, 16, 17, Tile.Grass);
    fill(mid + 2, mid + 5, 16, 17, Tile.Grass);
    fill(x0 - 3, x0, 13, 13, Tile.Rock); // the lever ledge
    entities.push({ kind: "lever", x: x0 - 1, y: 12, does: { log: `log_${p.id}` } });
    entities.push({ kind: "log", id: `log_${p.id}`, x: mid, hangY: 6, groundY: STAND });
    entities.push({ kind: "stalker", id: `stalker_${p.id}`, x: mid, y: STAND, from: x0 + 2, to: x1 - 1 });
    obstacles.push({ id: p.id, name: p.name, x0: x0 - 2, exit: x1 + 1, zones: {}, foe: `stalker_${p.id}` });
    return x1 + 3;
  };

  const crossing = (x: number, p: Piece): number => {
    const x0 = x + 10, x1 = x0 + 12;
    fill(x0 - 9, x0 - 7, 15, 15, Tile.Rock); // a step up toward the lever ledge
    if (!camoPlaced) { entities.push({ kind: "part", part: "camo", x: x0 - 8, y: 14 }); camoPlaced = true; }
    fill(x0 - 2, x0 - 2, 11, GROUND - 1, Tile.Tree, `tree_${p.id}`); // the dead tree (you bite it; it does not block)
    fill(x0 - 1, x1 + 1, 13, 13, Tile.Bridge, `tree_${p.id}`); // where it falls: a bridge (fight)
    fill(x0 - 2, x1 + 1, 10, 10, Tile.Bridge, `rope_${p.id}`); // the rope bridge (puzzle)
    fill(x0 - 5, x0 - 3, 10, 10, Tile.Rock); // the lever ledge
    entities.push({ kind: "lever", x: x0 - 4, y: 9, does: { bridge: `rope_${p.id}` } });
    fill(x1 + 1, x1 + 3, 13, 13, Tile.Rock); // the far landing
    const zones: Obstacle["zones"] = { fight: { x0, y0: 11, x1, y1: 12 }, puzzle: { x0, y0: 8, x1, y1: 9 } };
    const name = drained && p.drainedName ? p.drainedName : p.name;
    if (!drained) {
      fill(x0, x1, GROUND + 1, h - 1, Tile.Water); // deep water under a mat of roots
      fill(x0, x1, 16, 16, Tile.Thorn); // thorns over the root ledge: creep under them (stealth)
      zones.stealth = { x0, y0: 17, x1, y1: 17 };
      obstacles.push({ id: p.id, name, x0: x0 - 6, exit: x1 + 4, zones });
    } else {
      fill(x0, x1, GROUND, h - 2, Tile.Air); // the drained basin
      fill(x0, x1, h - 1, h - 1, Tile.Mud);
      entities.push({ kind: "brute", id: `brute_${p.id}`, x: Math.round((x0 + x1) / 2), y: h - 2 });
      zones.stealth = { x0, y0: GROUND + 1, x1, y1: h - 2 };
      obstacles.push({ id: p.id, name, x0: x0 - 6, exit: x1 + 4, zones, foe: `brute_${p.id}` });
    }
    return x1 + 5;
  };

  entities.push({ kind: "start", x: 3, y: STAND }, { kind: "checkpoint", x: 3, y: STAND });
  fill(7, 11, 14, 14, Tile.Rock); // the start ledge, with the claws on it
  entities.push({ kind: "part", part: "claws", x: 9, y: 13 });
  let x = 14;
  for (const p of course.pieces) {
    x = p.kind === "barrier" ? barrier(x, p) : p.kind === "guarded" ? guarded(x, p) : crossing(x, p);
    entities.push({ kind: "checkpoint", x: x + 1, y: STAND });
    x += 3;
  }
  entities.push({ kind: "finish", x: x + 4, y: STAND });
  return { id, name: course.name, w: g.w, h, tiles: g.tiles, links: g.links, entities, obstacles, drained, theme: THEMES[id] };
}

/** The Old Horn's den: one arena, one boss, three ways to beat it. The far gate opens when it is down. */
function buildDen(drained: boolean): Level {
  const g = grid(64);
  const { fill } = g;
  const entities: Entity[] = [];
  entities.push({ kind: "start", x: 3, y: STAND }, { kind: "checkpoint", x: 4, y: STAND });
  fill(10, 10, 0, 15, Tile.Rock); // the near pillar: the Old Horn charges into it (you slip under it, rows 16-17)
  fill(55, 55, 0, GROUND - 1, Tile.Rock); // the far wall...
  fill(55, 55, 16, 17, Tile.Gate, "gate_boss"); // ...with the way out, shut until the Old Horn is beaten
  fill(14, 17, 16, 17, Tile.Grass); // tall grass at both ends: hide, then ambush (stealth)
  fill(46, 49, 16, 17, Tile.Grass);
  fill(20, 23, 13, 13, Tile.Rock); // two ledges with levers: each drops a hanging rock (puzzle)
  fill(39, 42, 13, 13, Tile.Rock);
  entities.push({ kind: "lever", x: 21, y: 12, does: { log: "rock_a" } }, { kind: "lever", x: 40, y: 12, does: { log: "rock_b" } });
  entities.push({ kind: "log", id: "rock_a", x: 28, hangY: 3, groundY: STAND, rock: true }, { kind: "log", id: "rock_b", x: 34, hangY: 3, groundY: STAND, rock: true });
  entities.push({ kind: "boss", id: "boss_oldhorn", x: 38, y: STAND, from: 11, to: 53 });
  entities.push({ kind: "finish", x: 59, y: STAND });
  const obstacles: Obstacle[] = [{ id: "oldhorn", name: "the Old Horn", x0: 10, exit: 56, zones: {}, foe: "boss_oldhorn", boss: true }];
  return { id: "den", name: "the Old Horn's Den", w: g.w, h: g.h, tiles: g.tiles, links: g.links, entities, obstacles, drained, theme: THEMES.den };
}

export function buildLevel(id: LevelId, drained: boolean): Level {
  return id === "den" ? buildDen(drained) : buildCourse(id, drained);
}

/** The first level (kept for the tests and old call sites). */
export const buildFernwood = (drained: boolean) => buildLevel("fernwood", drained);

export function newLevelState(): LevelState {
  return { open: new Set(), broken: new Set() };
}

export function tileAt(lv: Level, tx: number, ty: number): Tile {
  if (ty < 0) return Tile.Air;
  if (tx < 0 || tx >= lv.w || ty >= lv.h) return Tile.Rock;
  return lv.tiles[ty][tx];
}

/** Solid right now? Brambles until smashed, gates until open, bridges once built. (Trees are bitten, not walked into.) */
export function solidAt(lv: Level, st: LevelState, tx: number, ty: number): boolean {
  const t = tileAt(lv, tx, ty);
  switch (t) {
    case Tile.Rock: case Tile.Mud: case Tile.Thorn: return true;
    case Tile.Bramble: return !st.broken.has(key(tx, ty));
    case Tile.Gate: return !st.open.has(lv.links[key(tx, ty)]);
    case Tile.Bridge: return st.open.has(lv.links[key(tx, ty)]);
    default: return false;
  }
}

export const inRect = (r: Rect, tx: number, ty: number) => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;
export const tileKey = key;
