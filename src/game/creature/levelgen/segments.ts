// ---------------------------------------------------------------------------
// segments.ts (creature/levelgen)
// Purpose : The segment library for the stitcher (CREATURE_LEVELGEN.md §7a step 2): hand-built one-screen pieces
//           of a room's open band (rows 6-18), described as rock rectangles, an optional water span and named
//           slots, never as pixels. Edge profiles and ports are COMPUTED from the rock, so two segments join only
//           where their open rows really meet, and a mirrored copy is derived, never drawn twice.
// Usage   : SEGMENTS (library) ; variants() (library plus mirrors) ; profile(seg, "L") ; ports(seg, "R")
// Notes   : Coordinates are segment-local tiles: x 0-39, y 0-12 (y 0 is room row 6, y 12 is room row 18, the row
//           the body stands in; the floor below is solid). Body 14x18 px, jump about 89 px (5.5 tiles). Each
//           segment declares which ports and slots connect (`links`); tests/creatureSegments.test.ts proves every
//           declaration with the search solver, so the stitcher can compose rooms without searching at runtime.
// Authored: Written with Claude (Opus 5.5). The shaft pillar and drain shelf shapes come from the v1 templates.
// ---------------------------------------------------------------------------
import type { Biome } from "./ladder";
import type { EnemyKind } from "../waterEncounters";

export const SEG = { cols: 40, rows: 13, firstRow: 6 } as const;
/** Inclusive rock rectangle in segment tiles. */
export interface Rect { x0: number; x1: number; y0: number; y1: number }
export type Port = string; // "L0", "R1": edge and index, counted from the bottom lane up; "C" is the control slot
export interface Link { from: Port; to: Port }
export interface Segment {
  id: string; biome: Biome; rating: number;
  /** What the segment is for: "entry"/"exit" need a clear floor lane at that edge; "control", "guard", "cache" and
   *  "channel" mark what it can host; "near"/"far" are a channel's fixed climbs; "torrent" is a forced water
   *  crossing with no dry way around (a current room needs one, and the segment test proves it holds the torrent). */
  tags: string[];
  rock: Rect[];
  water?: [number, number]; // tile columns of the water span; surface heights come from the room
  food: number[];           // tile columns (at least two per segment so a stitched room always has four)
  reeds?: number[];
  control?: { x: number; y: number }; // tile of the air cell the body stands in to operate it
  enemies?: { kind: EnemyKind; x: number }[];
  net?: { rig: number; frame: number }; // tile columns
  cache?: { x: number; y: number };
  links: Link[];
  mirrored?: boolean;
}

const rect = (x0: number, x1: number, y0: number, y1: number): Rect => ({ x0, x1, y0, y1 });
const both = (a: Port, b: Port): Link[] => [{ from: a, to: b }, { from: b, to: a }];

export const SEGMENTS: readonly Segment[] = [
  { id: "floor", biome: "water", rating: 1, tags: ["entry", "exit"], rock: [], food: [8, 28], links: both("L0", "R0") },
  { id: "pool", biome: "water", rating: 1, tags: ["torrent", "entry", "exit", "channel"], rock: [], water: [6, 33], food: [10, 24], reeds: [18], links: both("L0", "R0") },
  // Three ledges; the lever stands on the middle one (row 12 top), reached from the first (row 15).
  { id: "steps", biome: "water", rating: 2, tags: ["control", "entry", "exit"], rock: [rect(8, 11, 9, 9), rect(15, 19, 6, 6), rect(24, 27, 9, 9)],
    food: [4, 32], control: { x: 17, y: 5 }, links: [...both("L0", "R0"), ...both("L0", "C"), ...both("R0", "C")] },
  // A low roof over water: swim or walk the 96 px passage underneath.
  { id: "lowroof", biome: "water", rating: 2, tags: ["torrent", "channel"], rock: [rect(10, 29, 0, 6)], water: [4, 35], food: [6, 34], links: both("L0", "R0") },
  { id: "guardpost", biome: "water", rating: 2, tags: ["guard"], rock: [], food: [4, 34], enemies: [{ kind: "charger", x: 30 }], net: { rig: 10, frame: 22 }, links: both("L0", "R0") },
  { id: "guardpool", biome: "water", rating: 3, tags: ["torrent", "guard"], rock: [], water: [4, 35], food: [6, 34], enemies: [{ kind: "swimmer", x: 26 }], net: { rig: 8, frame: 22 }, links: both("L0", "R0") },
  { id: "dropperhall", biome: "water", rating: 2, tags: ["guard"], rock: [], food: [6, 34], enemies: [{ kind: "dropper", x: 20 }], net: { rig: 8, frame: 20 }, links: both("L0", "R0") },
  // The v1 shaft's rock pillar: dive or crawl the 48 px gap under it.
  { id: "pillar", biome: "water", rating: 3, tags: ["torrent", "channel"], rock: [rect(17, 21, 0, 9)], water: [4, 35], food: [8, 32], links: both("L0", "R0") },
  // Kelp maze: alternating hanging and standing rock; over the low ones, under the hanging ones.
  { id: "stalactites", biome: "water", rating: 3, tags: ["torrent", "channel"], rock: [rect(8, 9, 0, 6), rect(16, 17, 9, 12), rect(24, 25, 0, 6), rect(31, 32, 9, 12)],
    water: [3, 36], food: [12, 28], links: both("L0", "R0") },
  // The v1 drain's shelf and an upper release on it.
  { id: "shelf", biome: "water", rating: 3, tags: ["control"], rock: [rect(15, 17, 9, 9), rect(20, 26, 6, 6)], water: [5, 34], food: [4, 30],
    control: { x: 23, y: 5 }, links: [...both("L0", "R0"), ...both("L0", "C"), ...both("R0", "C")] },
  // An upper walkway joins from the right; a step lets the lower lane climb onto it.
  { id: "merge", biome: "water", rating: 3, tags: ["control"], rock: [rect(10, 39, 4, 5), rect(4, 6, 8, 8)], food: [2, 26], control: { x: 30, y: 3 },
    links: [...both("L0", "R0"), ...both("L0", "R1"), ...both("L0", "C"), ...both("R1", "C")] },
  // A two-lane corridor: the walkway on top, the flooded lane beneath, joined only at the segments either side.
  { id: "twolane", biome: "water", rating: 4, tags: [], rock: [rect(0, 39, 4, 5)], water: [0, 39], food: [8, 30], links: [...both("L0", "R0"), ...both("L1", "R1")] },
  // Air pockets in a flooded tunnel (rows 6-13 rock except two shafts to breathe in).
  { id: "airpocket", biome: "water", rating: 4, tags: ["torrent", "channel"], rock: [rect(3, 11, 0, 7), rect(16, 25, 0, 7), rect(30, 36, 0, 7)], water: [0, 39], food: [6, 34], links: both("L0", "R0") },
  { id: "cachehall", biome: "water", rating: 2, tags: ["cache"], rock: [rect(18, 22, 8, 8)], food: [6, 34], cache: { x: 20, y: 7 }, links: both("L0", "R0") },
  // A food cache on a ledge in a flooded hall: recovery and a torrent crossing in one screen (Hard galleries are short).
  { id: "cachepool", biome: "water", rating: 3, tags: ["cache", "torrent"], rock: [rect(18, 22, 8, 8)], water: [4, 35], food: [8, 30], cache: { x: 20, y: 7 }, links: both("L0", "R0") },
  // A channel's fixed climbs: two ledges under the hatch (near: hatch tiles 19-21; far: hatch tiles 36-37).
  { id: "channel-near", biome: "water", rating: 1, tags: ["near"], rock: [rect(0, 1, 0, 12), rect(22, 23, 9, 9), rect(19, 20, 5, 5)], water: [28, 39], food: [6, 30], links: both("H", "R0") },
  { id: "channel-far", biome: "water", rating: 1, tags: ["far"], rock: [rect(38, 39, 0, 12), rect(34, 35, 9, 9), rect(36, 37, 5, 5)], water: [0, 30], food: [6, 26], links: both("L0", "H") },
];

/** Open rows of an edge column, as a string of '.' (open) and '#' (rock), top to bottom. */
export function profile(s: Segment, edge: "L" | "R"): string {
  const x = edge === "L" ? 0 : SEG.cols - 1;
  let out = "";
  for (let y = 0; y < SEG.rows; y++) out += s.rock.some(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) ? "#" : ".";
  return out;
}
/** The edge's ports: contiguous open runs, counted from the bottom lane up (L0 is the floor lane). */
export function ports(s: Segment, edge: "L" | "R"): { name: Port; rows: [number, number] }[] {
  const p = profile(s, edge), runs: [number, number][] = [];
  for (let y = SEG.rows - 1; y >= 0; y--) if (p[y] === "." && (y === SEG.rows - 1 || p[y + 1] === "#")) {
    let top = y; while (top > 0 && p[top - 1] === ".") top--; runs.push([top, y]);
  }
  return runs.map((rows, i) => ({ name: `${edge}${i}`, rows }));
}
const flip = (p: Port): Port => p[0] === "L" ? `R${p.slice(1)}` : p[0] === "R" ? `L${p.slice(1)}` : p;
/** The same segment seen in a mirror: x -> 39 - x, left ports become right ports. */
export function mirror(s: Segment): Segment {
  const mx = (x: number) => SEG.cols - 1 - x;
  return { ...s, id: `${s.id}~`, mirrored: true, rock: s.rock.map(r => ({ ...r, x0: mx(r.x1), x1: mx(r.x0) })),
    water: s.water && [mx(s.water[1]), mx(s.water[0])], food: s.food.map(mx).sort((a, b) => a - b), reeds: s.reeds?.map(mx),
    control: s.control && { ...s.control, x: mx(s.control.x) }, enemies: s.enemies?.map(e => ({ ...e, x: mx(e.x) })),
    net: s.net && { rig: mx(s.net.rig), frame: mx(s.net.frame) }, cache: s.cache && { ...s.cache, x: mx(s.cache.x) },
    links: s.links.map(l => ({ from: flip(l.from), to: flip(l.to) })) };
}
/** The library plus every mirrored copy, except a channel's fixed climbs (their side is fixed by the hatch). */
export const variants = (lib: readonly Segment[] = SEGMENTS): Segment[] =>
  lib.flatMap(s => s.tags.includes("near") || s.tags.includes("far") ? [s] : [s, mirror(s)]);
/** Tile columns of everything a player must reach in the segment (lever, rigging, net frame, cache, enemies). */
export const slotColumns = (s: Segment): number[] =>
  [s.control?.x, s.cache?.x, s.net?.rig, s.net?.frame, ...(s.enemies ?? []).map(e => e.x)].filter((x): x is number => x !== undefined);
/** A clear floor lane (rows 15-18) in the given columns: where a room can spawn a body or hold its exit wall. */
export const clearFloor = (s: Segment, x0: number, x1: number): boolean =>
  !s.rock.some(r => r.x1 >= x0 && r.x0 <= x1 && r.y1 >= 9);
