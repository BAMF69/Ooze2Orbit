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
import { roomTileGrid, ROOM_COLS, ROOM_ROWS, WATER_TILES, WATER_BG, OVERWORLD_BG, REED_SHALLOWS_BG, REED_SHALLOWS_TILES, paintedTile } from "./roomTiles";
import { terrainSolid, woodColumn } from "./waterView";
import { OVERWORLD, hubSolid } from "./overworld";

const TIER_TINT = { easy: 0xffffff, medium: 0xc9d6e6, hard: 0xd9cfe8 } as const;
export const usesPaintedShallows = (r: WaterRoom, e: Expedition): boolean => e.seed === 0 && r.id === 1 && r.tier === "easy";
const HUB_COLS = OVERWORLD.width / 16;

/** A rock tile layer that only re-tiles cells whose rock changed. */
class RockLayer {
  readonly layer: Phaser.Tilemaps.TilemapLayer;
  private last: number[] = [];
  constructor(scene: Phaser.Scene, private readonly cols: number, name: string, texture: string = WATER_TILES.key) {
    const map = scene.make.tilemap({ tileWidth: WATER_TILES.cell, tileHeight: WATER_TILES.cell, width: cols, height: ROOM_ROWS });
    const tileset = map.addTilesetImage("rock", texture, WATER_TILES.cell, WATER_TILES.cell, 0, 0);
    const layer = tileset && map.createBlankLayer(name, tileset, 0, 0, cols, ROOM_ROWS, WATER_TILES.cell, WATER_TILES.cell);
    if (!layer) throw new Error(`RoomArt: could not create the ${name} rock layer (tileset texture missing?)`);
    this.layer = layer.setScale(WATER_TILES.tile / WATER_TILES.cell).setDepth(-2);
  }
  sync(solid: (x: number, y: number) => boolean, special: (x: number, y: number) => boolean, label: string): void {
    const grid = roomTileGrid(solid, special, this.cols);
    if (this.layer.layer.name === "paintedShallowsRock")
      for (let i = 0; i < grid.length; i++) grid[i] = paintedTile(grid[i], i % this.cols, Math.floor(i / this.cols));
    let changed = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === this.last[i]) continue;
      const x = i % this.cols, y = Math.floor(i / this.cols);
      if (grid[i] < 0) this.layer.removeTileAt(x, y); else this.layer.putTileAt(grid[i], x, y);
      changed++;
    }
    if (changed) Log.debug("creature-room", `${label}: ${changed} tiles updated`);
    this.last = grid;
  }
}

export class RoomArt {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly hubBg: Phaser.GameObjects.TileSprite;
  private readonly room: RockLayer;
  private readonly paintedRoom: RockLayer;
  private readonly hub: RockLayer;
  private hubKey = "";

  constructor(scene: Phaser.Scene) {
    for (const k of [WATER_BG.key, OVERWORLD_BG.key, REED_SHALLOWS_BG.key]) scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.bg = scene.add.image(0, 0, WATER_BG.key).setOrigin(0, 0).setScale(640 / WATER_BG.width).setDepth(-3);
    this.hubBg = scene.add.tileSprite(0, 0, OVERWORLD.width, 360, OVERWORLD_BG.key).setOrigin(0, 0).setTileScale(640 / OVERWORLD_BG.width).setDepth(-3);
    this.room = new RockLayer(scene, ROOM_COLS, "waterRock");
    this.paintedRoom = new RockLayer(scene, ROOM_COLS, "paintedShallowsRock", REED_SHALLOWS_TILES.key);
    this.paintedRoom.layer.setVisible(false);
    this.hub = new RockLayer(scene, HUB_COLS, "hubRock");
  }

  /** A Water room: rock from the room's live collision, wood columns excluded (waterView draws them). */
  sync(r: WaterRoom, e: Expedition, o: RoomObjective): void {
    this.show(false);
    const painted = usesPaintedShallows(r, e);
    const backdrop = painted ? REED_SHALLOWS_BG : WATER_BG;
    this.paintedRoom.layer.setVisible(painted);
    this.room.layer.setVisible(!painted);
    if (this.bg.texture.key !== backdrop.key) this.bg.setTexture(backdrop.key);
    this.bg.setTint(TIER_TINT[r.tier]);
    (painted ? this.paintedRoom : this.room).sync((x, y) => terrainSolid(r, e, o, x, y), (x, y) => woodColumn(r, e, o, x, y) !== null, `room ${r.id}`);
  }

  /** The overworld (forest backdrop) or the Water shoreline (cave-water backdrop); sky above the playable band. */
  syncHub(waterTrail: boolean): void {
    this.show(true);
    this.paintedRoom.layer.setVisible(false);
    const key = waterTrail ? "shore" : "overworld";
    if (key !== this.hubKey) {
      this.hubKey = key;
      this.hubBg.setTexture(waterTrail ? WATER_BG.key : OVERWORLD_BG.key).setSize(waterTrail ? OVERWORLD.waterWidth : OVERWORLD.width, 360);
    }
    const width = (waterTrail ? OVERWORLD.waterWidth : OVERWORLD.width) / 16;
    this.hub.sync((x, y) => x < width && y >= 6 && hubSolid(waterTrail, x, y), () => false, key);
  }

  hide(): void { this.bg.setVisible(false); this.hubBg.setVisible(false); this.room.layer.setVisible(false); this.paintedRoom.layer.setVisible(false); this.hub.layer.setVisible(false); }

  private show(hub: boolean): void {
    this.bg.setVisible(!hub); this.room.layer.setVisible(!hub);
    this.hubBg.setVisible(hub); this.hub.layer.setVisible(hub);
  }
}
