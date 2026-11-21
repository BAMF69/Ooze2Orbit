// Purpose: Creature HD Water terrain: autotile masks, wood exclusion, and art-equals-collision on real rooms.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
import { describe, it, expect } from "vitest";
import { sheetSize } from "./helpers/artSize";
import { roomTileGrid, tileIndex, tileCount, materialAt, ROOM_COLS, ROOM_ROWS, WATER_TILES, WATER_BG, PAINTED_WATER_TILES, WATER_BACKDROPS, paintedAtlasCount, paintedSurfaceTile, paintedVariantAt } from "../src/game/creature/roomTiles";
import { terrainSolid, woodColumn } from "../src/game/creature/waterView";
import { generateWater } from "../src/game/creature/waterWorld";
import { roomGeometry } from "../src/game/creature/levelgen/roomSpec";
import { generateWaterV2 } from "../src/game/creature/levelgen/world";
import { freshExpedition } from "../src/game/creature/expedition";
import { newObjective, type RoomObjective } from "../src/game/creature/waterObjectives";
import { OVERWORLD, hubSolid } from "../src/game/creature/overworld";

const at = (grid: number[], x: number, y: number) => grid[y * ROOM_COLS + x];
const maskOf = (i: number) => i % WATER_TILES.columns;

describe("autotile masks", () => {
  it("marks exposed sides and keeps screen edges uninked", () => {
    // A 3x1 ledge at row 10 plus the full floor rows 19-22.
    const solid = (x: number, y: number) => y >= 19 || y === 10 && x >= 4 && x <= 6;
    const g = roomTileGrid(solid);
    expect(maskOf(at(g, 4, 10))).toBe(1 | 4 | 8);
    expect(maskOf(at(g, 5, 10))).toBe(1 | 4);
    expect(maskOf(at(g, 6, 10))).toBe(1 | 2 | 4);
    expect(maskOf(at(g, 0, 19))).toBe(1); // left screen edge is not an exposed side
    expect(maskOf(at(g, 10, 22))).toBe(0); // bottom screen edge neither
    expect(at(g, 5, 9)).toBe(-1);
  });
  it("uses the material for the row", () => {
    expect([materialAt(0), materialAt(5), materialAt(6), materialAt(18), materialAt(19)]).toEqual(["ceiling", "ceiling", "ledge", "ledge", "floor"]);
    expect(Math.floor(tileIndex("floor", 1, 0) / WATER_TILES.columns)).toBe(1);
    expect(tileIndex("ceiling", 1, 15)).toBe(tileCount() - 1);
  });
  it("leaves wood columns out and inks the rock beside them", () => {
    const g = roomTileGrid((_x, y) => y >= 6 && y <= 18 || y >= 19, (x, y) => x === 18 && y <= 18);
    expect(at(g, 18, 10)).toBe(-1);
    expect(maskOf(at(g, 17, 10)) & 2).toBe(2);
    expect(maskOf(at(g, 19, 10)) & 8).toBe(8);
  });
});

/** Every cell: a rock tile exactly where collision is solid and not wood. */
function expectArtMatchesCollision(rooms: Parameters<typeof terrainSolid>[0][], label: string) {
  const states: [boolean, RoomObjective][] = [[false, newObjective()], [true, newObjective()], [true, { ...newObjective(), first: true, open: true, arenaActive: true }]];
  for (const room of rooms) for (const [raised, o] of states) {
    const e = { ...freshExpedition(0), basinRaised: raised };
    const { cols, rows } = roomGeometry(room);
    const solid = (x: number, y: number) => terrainSolid(room, e, o, x, y);
    const wood = (x: number, y: number) => woodColumn(room, e, o, x, y) !== null;
    const g = roomTileGrid(solid, wood, cols, rows, true);
    const rock = (x: number, y: number) => x < 0 || y < 0 || x >= cols || y >= rows || solid(x, y) && !wood(x, y);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const index = g[y * cols + x];
      const mask = Number(!rock(x, y - 1)) | Number(!rock(x + 1, y)) * 2 | Number(!rock(x, y + 1)) * 4 | Number(!rock(x - 1, y)) * 8;
      const want = rock(x, y) ? tileIndex(materialAt(y), paintedVariantAt(x, y), mask, PAINTED_WATER_TILES.variants) : -1;
      if (index !== want) throw new Error(`${label} room ${room.id} raised=${raised} (${x},${y}): art ${index} vs expected ${want}`);
    }
  }
}
describe("terrain art follows real collision", () => {
  it("seed-0 v1 world, all objective states", () => expectArtMatchesCollision(generateWater(0).rooms, "v1"));
  it("generated v2 worlds", () => { for (const seed of [1, 7, 42, 999]) expectArtMatchesCollision(generateWaterV2(seed).rooms, `v2 seed ${seed}`); });
});

describe("hub terrain follows hub collision", () => {
  for (const water of [false, true]) it(water ? "Water shoreline" : "overworld", () => {
    const cols = OVERWORLD.width / 16, width = (water ? OVERWORLD.waterWidth : OVERWORLD.width) / 16;
    const solid = (x: number, y: number) => x < width && y >= 6 && hubSolid(water, x, y);
    const g = roomTileGrid(solid, () => false, cols);
    for (let y = 0; y < ROOM_ROWS; y++) for (let x = 0; x < width; x++)
      expect(g[y * cols + x] >= 0, `(${x},${y})`).toBe(y >= 6 && hubSolid(water, x, y));
    expect(g.slice(0, 6 * cols).every(i => i === -1)).toBe(true); // open sky, never a ceiling
  });
});

describe("baked terrain sheets", () => {
  const size = sheetSize;
  it("tileset slices into every material x variant x mask", () => {
    expect(size(WATER_TILES.path)).toEqual([WATER_TILES.columns * WATER_TILES.cell, tileCount() / WATER_TILES.columns * WATER_TILES.cell]);
  });
  it("ships the modular atlas and all three 2x Water backdrops", () => {
    const { columns, cell, path } = PAINTED_WATER_TILES;
    expect(size(path)).toEqual([columns * cell, Math.ceil(paintedAtlasCount() / columns) * cell]);
    for (const bg of Object.values(WATER_BACKDROPS)) expect(size(bg.path)).toEqual([bg.width, bg.height]);
  });
  it("uses all four deterministic rock variants in wide rooms", () => {
    const row = Array.from({ length: 200 }, (_, x) => paintedVariantAt(x, 10));
    expect(paintedSurfaceTile(199, 22)).toBe(paintedAtlasCount() - 1);
    expect(paintedSurfaceTile(40, 22)).toBe(paintedSurfaceTile(0, 22));
    expect(new Set(row)).toEqual(new Set([0, 1, 2, 3]));
    expect(Array.from({ length: 200 }, (_, x) => paintedVariantAt(x, 10))).toEqual(row);
    expect(Array.from({ length: 200 }, (_, x) => paintedVariantAt(x, 11))).not.toEqual(row);
  });
  it("background is the 2x frame", () => expect(size(WATER_BG.path)).toEqual([WATER_BG.width, WATER_BG.height]));
});
