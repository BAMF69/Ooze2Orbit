// ---------------------------------------------------------------------------
// roomArt.ts (creature)
// Purpose : Illustrated terrain for every creature-stage place: Water rooms (C-0106) and the two walkable hubs
//           (overworld, Water shoreline). A backdrop plus a rock tile layer whose tiles are re-chosen from the
//           live collision test whenever it changes (sluice raised, drain, arena seal...).
// Usage   : const art = new RoomArt(scene); each draw: art.sync(room, expedition, objective) in a Water room, or
//           art.syncHub(waterTrail) in a hub. The scene's Graphics (waterView / overworldView) draws on top.
// Notes   : Tiles are 48 px cells shown at 16 px: nearest sampling at an exact 1/3 scale picks each cell's centre
//           texel, so atlas neighbours never bleed. Backdrops use linear filtering. Hub rows above the playable
//           band (y < 6) are open sky, not ceiling. Debug channel: "creature-room".
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { Log } from "../../core/log";
import type { WaterRoom } from "./waterWorld";
import type { Expedition } from "./expedition";
import type { RoomObjective } from "./waterObjectives";
import { roomTileGrid, ROOM_COLS, ROOM_ROWS, WATER_TILES, WATER_BG, OVERWORLD_BG, WATER_BACKDROPS, PAINTED_WATER_TILES, paintedSurfaceTile } from "./roomTiles";
import { terrainSolid, woodColumn } from "./waterView";
import { OVERWORLD, hubSolid } from "./overworld";
import { roomGeometry } from "./levelgen/roomSpec";

const TIER_TINT = { easy: 0xffffff, medium: 0xc9d6e6, hard: 0xd9cfe8 } as const;
const HUB_COLS = OVERWORLD.width / 16;

/** A rock tile layer that only re-tiles cells whose rock changed. */
class RockLayer {
  readonly layer: Phaser.Tilemaps.TilemapLayer;
  private readonly surface?: Phaser.Tilemaps.TilemapLayer;
  private last: number[] = [];
  constructor(scene: Phaser.Scene, readonly cols: number, name: string, readonly rows: number = ROOM_ROWS, private readonly painted = false) {
    const map = scene.make.tilemap({ tileWidth: WATER_TILES.cell, tileHeight: WATER_TILES.cell, width: cols, height: rows });
    const tileset = map.addTilesetImage("rock", painted ? PAINTED_WATER_TILES.key : WATER_TILES.key, WATER_TILES.cell, WATER_TILES.cell, 0, 0);
    const layer = tileset && map.createBlankLayer(name, tileset, 0, 0, cols, rows, WATER_TILES.cell, WATER_TILES.cell);
    if (!layer) throw new Error(`RoomArt: could not create the ${name} rock layer (tileset texture missing?)`);
    this.layer = layer.setScale(WATER_TILES.tile / WATER_TILES.cell).setDepth(-2);
    if (painted) {
      const surface = map.createBlankLayer("paintedRockSurface", tileset, 0, 0, cols, rows, WATER_TILES.cell, WATER_TILES.cell);
      if (!surface) throw new Error("RoomArt: could not create the painted rock surface");
      this.surface = surface.setScale(WATER_TILES.tile / WATER_TILES.cell).setDepth(-2.5);
    }
  }
  sync(solid: (x: number, y: number) => boolean, special: (x: number, y: number) => boolean, label: string): void {
    const grid = roomTileGrid(solid, special, this.cols, this.rows, this.painted);
    let changed = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === this.last[i]) continue;
      const x = i % this.cols, y = Math.floor(i / this.cols);
      if (grid[i] < 0) {
        this.layer.removeTileAt(x, y);
        this.surface?.removeTileAt(x, y);
      } else {
        this.layer.putTileAt(grid[i], x, y);
        this.surface?.putTileAt(paintedSurfaceTile(x, y), x, y);
      }
      changed++;
    }
    if (changed) Log.debug("creature-room", `${label}: ${changed} tiles updated`);
    this.last = grid;
  }
  setVisible(visible: boolean): void { this.layer.setVisible(visible); this.surface?.setVisible(visible); }
  destroy(): void { this.layer.tilemap.destroy(); }
}

export class RoomArt {
  private readonly bg: Phaser.GameObjects.TileSprite;
  private readonly hubBg: Phaser.GameObjects.TileSprite;
  private room: RockLayer;
  private readonly scene: Phaser.Scene;
  private readonly hub: RockLayer;
  private hubKey = "";

  constructor(scene: Phaser.Scene) {
    for (const k of [WATER_BG.key, OVERWORLD_BG.key, ...Object.values(WATER_BACKDROPS).map(bg => bg.key)]) scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    scene.textures.get(PAINTED_WATER_TILES.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.scene = scene;
    // Tiling backdrop: one copy at v1 size (640x360 shows the 1280x720 art at half scale), repeats across wider rooms.
    this.bg = scene.add.tileSprite(0, 0, 640, 360, WATER_BACKDROPS.easy.key).setOrigin(0, 0).setTileScale(640 / WATER_BG.width).setDepth(-3);
    this.hubBg = scene.add.tileSprite(0, 0, OVERWORLD.width, 360, OVERWORLD_BG.key).setOrigin(0, 0).setTileScale(640 / OVERWORLD_BG.width).setDepth(-3);
    this.room = new RockLayer(scene, ROOM_COLS, "waterRock", ROOM_ROWS, true);
    this.hub = new RockLayer(scene, HUB_COLS, "hubRock");
  }

  /** A Water room: rock from the room's live collision, wood columns excluded (waterView draws them). */
  sync(r: WaterRoom, e: Expedition, o: RoomObjective): void {
    this.show(false);
    const backdrop = WATER_BACKDROPS[r.tier];
    if (this.bg.texture.key !== backdrop.key) this.bg.setTexture(backdrop.key);
    this.bg.setTint(TIER_TINT[r.tier]);
    const g = roomGeometry(r);
    if (this.bg.width !== g.width || this.bg.height !== g.height) this.bg.setSize(g.width, g.height);
    if (this.room.cols !== g.cols || this.room.rows !== g.rows) { // a room of another size gets its own layer
      this.room.destroy(); this.room = new RockLayer(this.scene, g.cols, "waterRock", g.rows, true); this.show(false);
    }
    this.room.sync((x, y) => terrainSolid(r, e, o, x, y), (x, y) => woodColumn(r, e, o, x, y) !== null, `room ${r.id}`);
  }

  /** The overworld (forest backdrop) or the Water shoreline (cave-water backdrop); sky above the playable band. */
  syncHub(waterTrail: boolean): void {
    this.show(true);
    const key = waterTrail ? "shore" : "overworld";
    if (key !== this.hubKey) {
      this.hubKey = key;
      this.hubBg.setTexture(waterTrail ? WATER_BG.key : OVERWORLD_BG.key).setSize(waterTrail ? OVERWORLD.waterWidth : OVERWORLD.width, 360);
    }
    const width = (waterTrail ? OVERWORLD.waterWidth : OVERWORLD.width) / 16;
    this.hub.sync((x, y) => x < width && y >= 6 && hubSolid(waterTrail, x, y), () => false, key);
  }

  hide(): void { this.bg.setVisible(false); this.hubBg.setVisible(false); this.room.setVisible(false); this.hub.layer.setVisible(false); }

  private show(hub: boolean): void {
    this.bg.setVisible(!hub); this.room.setVisible(!hub);
    this.hubBg.setVisible(hub); this.hub.layer.setVisible(hub);
  }
}
