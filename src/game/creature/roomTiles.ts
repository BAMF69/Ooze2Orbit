// ---------------------------------------------------------------------------
// roomTiles.ts (creature)
// Purpose : Choose the illustrated rock tile for every solid cell of a Water room, from the SAME collision test
//           the physics uses, so art can never disagree with collision. Wooden structures (log sluice, exit and
//           arena barriers) are reported separately: they stay state-drawn by waterView.
// Usage   : roomTileGrid(solid, special, cols = 40) -> (index | -1)[] of cols x 23 (hubs are wider); tileIndex(material, variant, mask).
// Notes   : Pure and import-free (bake.mjs loads it through Node's type stripping). Mask bits mark exposed sides
//           (1 top, 2 right, 4 bottom, 8 left); off-grid neighbours count as rock so screen edges stay uninked.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------

export type TerrainMaterial = "floor" | "ledge" | "ceiling";
export const TERRAIN_MATERIALS: readonly TerrainMaterial[] = ["floor", "ledge", "ceiling"];
export const ROOM_COLS = 40, ROOM_ROWS = 23;
/** 48 px cells (16 px tiles at 3x); 16 columns (one per mask), rows = material x variant. */
export const WATER_TILES = { key: "creatureHd_waterTiles", path: "assets/art/creature_hd_water_tiles_v1.webp", cell: 48, tile: 16, columns: 16, variants: 2 } as const;
export const WATER_BG = { key: "creatureHd_waterBg", path: "assets/art/creature_hd_water_bg_v1.webp", width: 1280, height: 720 } as const;
/** Open-air forest backdrop for the walkable overworld (the Water shoreline reuses WATER_BG). */
export const OVERWORLD_BG = { key: "creatureHd_overworldBg", path: "assets/art/creature_hd_overworld_bg_v1.webp", width: 1280, height: 720 } as const;

export const tileIndex = (material: TerrainMaterial, variant: number, mask: number): number =>
  (TERRAIN_MATERIALS.indexOf(material) * WATER_TILES.variants + variant) * WATER_TILES.columns + mask;
export const tileCount = (): number => TERRAIN_MATERIALS.length * WATER_TILES.variants * WATER_TILES.columns;

export const materialAt = (y: number): TerrainMaterial => y >= 19 ? "floor" : y <= 5 ? "ceiling" : "ledge";
const variantAt = (x: number, y: number): number => ((x * 7 + y * 13) >>> 0) % 3 === 0 ? 1 : 0;

/**
 * Tile indices, row-major, -1 where there is no rock. `solid` is the collision test; `special` marks solid
 * cells drawn as wood instead (they are excluded and count as exposed edges for neighbouring rock).
 */
export function roomTileGrid(solid: (x: number, y: number) => boolean, special: (x: number, y: number) => boolean = () => false, cols = ROOM_COLS, rows = ROOM_ROWS): number[] {
  const rock = (x: number, y: number): boolean =>
    x < 0 || y < 0 || x >= cols || y >= rows ? true : solid(x, y) && !special(x, y);
  const out: number[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!rock(x, y) || x < 0) { out.push(-1); continue; }
    const mask = (rock(x, y - 1) ? 0 : 1) | (rock(x + 1, y) ? 0 : 2) | (rock(x, y + 1) ? 0 : 4) | (rock(x - 1, y) ? 0 : 8);
    out.push(tileIndex(materialAt(y), variantAt(x, y), mask));
  }
  return out;
}
