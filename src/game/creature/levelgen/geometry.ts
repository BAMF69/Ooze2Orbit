// ---------------------------------------------------------------------------
// geometry.ts (creature/levelgen)
// Purpose : A Water room's size and the numbers that follow from it (CREATURE_LEVELGEN.md step 1, "size-agnostic
//           engine"). Until now every room was one 640x360 screen and some twenty literals assumed it: exits at
//           x 20 / 625, the goal past x 550, water from x 144 to 544, seal walls at tiles 3 and 35, shaft edges at
//           y 96 / 338. Rooms now carry a geometry; V1_GEOMETRY reproduces those numbers exactly, so every existing
//           room behaves identically (tests/creatureLegacyRooms.test.ts) while larger rooms become possible.
// Usage   : roomGeometry(room) (roomSpec.ts) -> RoomGeometry; then exitTile(g), goalX(g), regionAt(g, x) ...
// Notes   : Pure and import-free at runtime (type imports only), so waterWorld.ts can use it without a cycle.
//           Pixels: tiles are 16 px. Rows count from the top of the room; the open band is openTop..floorRow-1.
// Authored: Written with Claude (Opus 5.5).
// ---------------------------------------------------------------------------

/** A body of water: its horizontal span and the surface height with the basin low or raised. */
export interface WaterRegion { x0: number; x1: number; low: number; raised: number }
export interface RoomGeometry {
  cols: number; rows: number;        // tile grid (the art layer and collision probe size)
  width: number; height: number;     // pixels: camera bounds
  openTop: number; floorRow: number; // first open row and first floor row of the base band
  water: WaterRegion[];
  enemyMinX: number; enemyMaxX: number; // land enemies stay inside these (swimmers stay inside their water)
}
export const TILE = 16;
export const V1_GEOMETRY: RoomGeometry = Object.freeze({
  cols: 40, rows: 23, width: 640, height: 360, openTop: 6, floorRow: 19,
  water: Object.freeze([Object.freeze({ x0: 144, x1: 544, low: 288, raised: 224 })]) as WaterRegion[],
  enemyMinX: 72, enemyMaxX: 580,
});
/** A wider or taller room with the same band and edge margins as v1; water spans keep v1's insets. */
export function sizedGeometry(cols: number, rows = V1_GEOMETRY.rows, water?: WaterRegion[]): RoomGeometry {
  const width = cols * TILE;
  return { ...V1_GEOMETRY, cols, rows, width, height: rows === V1_GEOMETRY.rows ? V1_GEOMETRY.height : rows * TILE,
    water: water ?? [{ x0: 144, x1: width - 96, low: 288, raised: 224 }], enemyMaxX: width - 60 };
}

// Edges and zones, each derived from size the way the v1 literals were (640 - 15 = 625, and so on).
export const leftEdgeX = (_g: RoomGeometry): number => 20;
export const rightEdgeX = (g: RoomGeometry): number => g.width - 15;
export const exitTile = (g: RoomGeometry): number => g.cols - 5;
export const sealTiles = (g: RoomGeometry): [number, number] => [3, g.cols - 5];
export const goalX = (g: RoomGeometry): number => g.width - 90;
export const emergencyX = (g: RoomGeometry): number => g.width - 75;
export const topEdgeY = (g: RoomGeometry): number => g.openTop * TILE;
export const bottomEdgeY = (g: RoomGeometry): number => g.height - 22;
export const floorY = (g: RoomGeometry): number => g.floorRow * TILE;
/** Arrivals keep this far from the side edges, so they never trigger an immediate exit. */
export const arrivalMinX = (_g: RoomGeometry): number => 24;
export const arrivalMaxX = (g: RoomGeometry): number => g.width - 24;

/** The water region containing x, if any. */
export const regionAt = (g: RoomGeometry, x: number): WaterRegion | undefined => g.water.find(w => x >= w.x0 && x <= w.x1);
export const surfaceY = (w: WaterRegion, raised: boolean): number => raised ? w.raised : w.low;

/** A control is usable with the body's feet within this many pixels of its point (waterObjectives.ts useValve). */
export const CONTROL_REACH_Y = 25;
/** Where a control is drawn: on the surface beneath it when standing there reaches it, otherwise hanging at its own
 *  point. Until 2026-11-18 every lever was drawn on the surface below, so the mid-water shaft relay (y 228) appeared on
 *  the floor (y 304), out of reach of where it was drawn (BAMF69 playtest, seed 7). */
export function controlAnchor(_g: RoomGeometry, y: number, surface: number): { ground: number; hanging: boolean } {
  return surface - y < CONTROL_REACH_Y ? { ground: surface, hanging: false } : { ground: y + 6, hanging: true };
}
