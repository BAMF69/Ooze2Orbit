// ---------------------------------------------------------------------------
// draw.ts (creature)
// Purpose : The creature stage's drawing helpers (placeholder art, CLAUDE.md "crude on purpose"): the level's
//           moody parallax backdrop (far hills, jungle silhouettes, a dead smooth moon: the stage's T0|▼| hint), the
//           tiles (plain tiles: rock with a mossy top, brambles, plank gates, water, mud, thorns, bridges, the dead
//           tree) with the tall grass on its own layer in front of you, a stalker's sight cone, and the top-down
//           world map (coast, the lake full or drained, places and paths).
// Usage   : drawBackdrop(scene, levelW); drawTiles(g, front, lv, st); drawCone(g, x, y, facing, range, alert);
//           drawWorldMap(g, map, selected, t)
// Notes   : Phaser only here; the rules live in level.ts / worldMap.ts. Colours are the GDD's "lit and moody".
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { Tile, solidAt, tileAt, tileKey, type Level, type LevelState, type Theme } from "./level";
import { CR } from "./tuning";
import { isOpen, type WorldMap } from "./worldMap";

const T = CR.tile;
const COL = {
  bramble: 0x4a2a2a, thornL: 0xa07a6a,
  gate: 0x6a4a2a, gateL: 0x8e6a3e, waterL: 0x3a6a8e, mud: 0x4a3a22, mudL: 0x645034,
  grass: 0x3a6a2e, grassL: 0x6a9c44, tree: 0x4a3a2c, treeL: 0x6a5440, plank: 0x7a5a32, plankL: 0xa07a46,
  thorn: 0x6a6a72, thornTip: 0xc0a090,
};

/** The far backdrop: sky bands, a smooth dead moon, two layers of silhouettes that scroll slower than the level. */
export function drawBackdrop(scene: Phaser.Scene, levelW: number, th: Theme): Phaser.GameObjects.Graphics[] {
  const w = scene.scale.width, h = scene.scale.height;
  const sky = scene.add.graphics().setScrollFactor(0).setDepth(-30);
  th.sky.forEach((c, i) => sky.fillStyle(c, 1).fillRect(0, (h / th.sky.length) * i, w, h / th.sky.length + 1));
  if (th.midKind !== "cave") { // the moon: perfectly smooth, no craters (the stage's T0|▼| hint)
    sky.fillStyle(0xd8dce0, 0.9).fillCircle(w * 0.78, 54, 16);
    sky.fillStyle(0xd8dce0, 0.12).fillCircle(w * 0.78, 54, 26);
  }
  const far = scene.add.graphics().setScrollFactor(0.2, 1).setDepth(-25);
  far.fillStyle(th.far, 1);
  const tall = th.midKind === "pines" ? 1.8 : th.midKind === "reeds" ? 0.6 : 1;
  for (let x = 0; x < levelW * 0.2 + w; x += 60) {
    const hh = (70 + ((x * 37) % 50)) * tall;
    if (th.midKind === "cave") far.fillTriangle(x - 30, 0, x + 10, 40 + ((x * 13) % 60), x + 50, 0); // stalactites
    else far.fillTriangle(x - 50, 260, x + 10, 260 - hh, x + 70, 260);
  }
  far.fillRect(0, 258, levelW * 0.2 + w, 200);
  const mid = scene.add.graphics().setScrollFactor(0.5, 1).setDepth(-20);
  mid.fillStyle(th.mid, 1);
  for (let x = 0; x < levelW * 0.5 + w; x += 34) {
    const hh = 90 + ((x * 53) % 70);
    if (th.midKind === "trees") { mid.fillRect(x + 8, 300 - hh, 6, hh); mid.fillCircle(x + 11, 300 - hh, 16 + ((x * 7) % 10)); }
    else if (th.midKind === "pines") { mid.fillRect(x + 10, 300 - hh, 3, hh); mid.fillTriangle(x - 4, 310 - hh * 0.4, x + 11, 290 - hh, x + 26, 310 - hh * 0.4); }
    else if (th.midKind === "reeds") { for (let k = 0; k < 4; k++) mid.fillRect(x + k * 7, 300 - hh * 0.5 + k * 6, 2, hh * 0.5); }
    else { mid.fillRect(x + 6, 120 + ((x * 11) % 60), 14, 200); } // cave columns
  }
  mid.fillRect(0, 296, levelW * 0.5 + w, 200);
  return [sky, far, mid];
}

/** The level's tiles. Grass goes on `front` (drawn over your creature: you are hidden in it). */
export function drawTiles(g: Phaser.GameObjects.Graphics, front: Phaser.GameObjects.Graphics, lv: Level, st: LevelState): void {
  g.clear();
  front.clear();
  for (let y = 0; y < lv.h; y++) {
    for (let x = 0; x < lv.w; x++) {
      const t = tileAt(lv, x, y), px = x * T, py = y * T;
      const th = lv.theme;
      switch (t) {
        case Tile.Rock: {
          g.fillStyle(th.rock, 1).fillRect(px, py, T, T);
          if (!solidAt(lv, st, x, y - 1) && tileAt(lv, x, y - 1) !== Tile.Rock) { // a mossy top edge
            g.fillStyle(th.moss, 1).fillRect(px, py, T, 4).fillStyle(th.mossL, 1).fillRect(px + ((x * 5) % 12), py, 3, 2);
          } else if ((x + y) % 3 === 0) g.fillStyle(th.rockL, 1).fillRect(px + 4, py + 6, 3, 2);
          break;
        }
        case Tile.Bramble:
          if (!solidAt(lv, st, x, y)) break;
          g.fillStyle(COL.bramble, 1).fillRect(px, py, T, T);
          for (let k = 0; k < 4; k++) g.fillStyle(COL.thornL, 1).fillTriangle(px + k * 4, py + 8, px + k * 4 + 2, py + 2 + (k % 2) * 3, px + k * 4 + 4, py + 8);
          g.fillStyle(0x2e4a22, 1).fillRect(px, py + 10, T, 2);
          break;
        case Tile.Gate:
          if (!solidAt(lv, st, x, y)) { g.fillStyle(COL.gate, 0.25).fillRect(px, py, T, 3); break; } // raised
          g.fillStyle(COL.gate, 1).fillRect(px, py, T, T).fillStyle(COL.gateL, 1).fillRect(px + 2, py, 3, T).fillRect(px + 9, py, 3, T);
          break;
        case Tile.Water:
          g.fillStyle(th.water, 1).fillRect(px, py, T, T);
          if ((x + y) % 4 === 0) g.fillStyle(COL.waterL, 1).fillRect(px + 2, py + 3, 6, 1);
          break;
        case Tile.Mud:
          g.fillStyle(COL.mud, 1).fillRect(px, py, T, T).fillStyle(COL.mudL, 1).fillRect(px + ((x * 3) % 10), py + 2, 5, 2);
          break;
        case Tile.Grass:
          for (let k = 0; k < 5; k++) {
            const bx = px + k * 3 + 1;
            front.fillStyle(k % 2 ? COL.grassL : COL.grass, 0.92).fillTriangle(bx - 1, py + T, bx + 1, py - 3 + (k % 3) * 2, bx + 3, py + T);
          }
          break;
        case Tile.Tree:
          if (st.open.has(lv.links[tileKey(x, y)])) break; // felled: it lies across the water as a bridge
          g.fillStyle(COL.tree, 1).fillRect(px + 3, py, 10, T).fillStyle(COL.treeL, 1).fillRect(px + 4, py, 2, T);
          if (tileAt(lv, x, y - 1) !== Tile.Tree) { // bare dead branches at the top
            g.lineStyle(2, COL.tree, 1).lineBetween(px + 8, py, px - 6, py - 12).lineBetween(px + 8, py, px + 20, py - 14);
          }
          break;
        case Tile.Bridge:
          if (!solidAt(lv, st, x, y)) break;
          g.fillStyle(COL.plank, 1).fillRect(px, py, T, 6).fillStyle(COL.plankL, 1).fillRect(px + 1, py + 1, T - 4, 2);
          break;
        case Tile.Thorn:
          g.fillStyle(COL.thorn, 1).fillRect(px, py + 8, T, 8);
          for (let k = 0; k < 4; k++) g.fillStyle(COL.thornTip, 1).fillTriangle(px + k * 4, py + 9, px + k * 4 + 2, py + 1, px + k * 4 + 4, py + 9);
          break;
        default:
          break;
      }
    }
  }
  for (const e of lv.entities) { // pressure plates: a stone slab in its dip, glowing while held down
    if (e.kind !== "plate") continue;
    const down = st.open.has(e.gate), px = e.x * T, py = (e.y + 1) * T;
    g.fillStyle(0x6a6e74, 1).fillRect(px + 1, py - (down ? 2 : 4), T * 2 - 2, down ? 2 : 4);
    g.fillStyle(down ? 0xa0e070 : 0xd0c060, 1).fillRect(px + 8, py - (down ? 2 : 4), T * 2 - 16, 1);
  }
}

/** A stalker's sight cone: pale while it patrols, red while it hunts you. */
export function drawCone(g: Phaser.GameObjects.Graphics, x: number, y: number, facing: number, range: number, alert: boolean): void {
  const a = (CR.foes.stalker.coneDeg * Math.PI) / 180;
  g.fillStyle(alert ? 0xff4a30 : 0xffe0a0, alert ? 0.22 : 0.12);
  g.fillTriangle(x, y, x + facing * range * Math.cos(a), y - range * Math.sin(a), x + facing * range * Math.cos(a), y + range * Math.sin(a));
}

/** Fill a closed polygon with the current fill style. */
function shape(g: Phaser.GameObjects.Graphics, pts: [number, number][]): void {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
  g.closePath();
  g.fillPath();
}

/** The world map, top-down: sea, the coast, the lake (blue, or cracked mud), paths and places. */
export function drawWorldMap(g: Phaser.GameObjects.Graphics, m: WorldMap, selected: string, t: number): void {
  const w = 640, h = 360;
  g.clear();
  g.fillStyle(0x10283c, 1).fillRect(0, 0, w, h); // the sea
  for (let i = 0; i < 40; i++) g.fillStyle(0x1a3a52, 1).fillRect((i * 97) % w, (i * 53) % h, 10, 1);
  g.fillStyle(0x3c4a2a, 1);
  shape(g, [[60, 360], [40, 280], [120, 220], [200, 150], [330, 120], [420, 60], [560, 40], [640, 60], [640, 360]]); // the land
  g.fillStyle(0x4e5e34, 1);
  shape(g, [[420, 140], [470, 80], [540, 70], [600, 120], [560, 170]]); // the ridge
  if (m.drained) { // the lake, drained: cracked mud
    g.fillStyle(0x5a4630, 1).fillEllipse(350, 240, 120, 60);
    g.lineStyle(1, 0x3a2a1a, 1).lineBetween(310, 235, 350, 245).lineBetween(350, 245, 390, 230).lineBetween(350, 245, 355, 265);
  } else {
    g.fillStyle(0x24507a, 1).fillEllipse(350, 240, 120, 60);
    g.fillStyle(0x3a6e9a, 1).fillEllipse(340 + Math.sin(t) * 4, 232, 50, 10);
  }
  for (const [a, b] of m.paths) {
    const na = m.nodes.find((n) => n.id === a)!, nb = m.nodes.find((n) => n.id === b)!;
    const open = isOpen(m, a) && isOpen(m, b);
    g.lineStyle(3, open ? 0xe0c890 : 0x6a6a5a, open ? 1 : 0.6);
    const steps = 14;
    for (let i = 0; i < steps; i += open ? 1 : 2) { // closed paths are dotted
      const x0 = na.x + ((nb.x - na.x) * i) / steps, y0 = na.y + ((nb.y - na.y) * i) / steps;
      const x1 = na.x + ((nb.x - na.x) * (i + 0.6)) / steps, y1 = na.y + ((nb.y - na.y) * (i + 0.6)) / steps;
      g.lineBetween(x0, y0, x1, y1);
    }
  }
  for (const n of m.nodes) {
    const open = isOpen(m, n.id), cleared = m.cleared.includes(n.id);
    const r = n.id === selected ? 11 + Math.sin(t * 5) * 1.5 : 9;
    g.fillStyle(0x000000, 0.5).fillCircle(n.x + 2, n.y + 3, r);
    g.fillStyle(cleared ? 0x7ec46a : open ? 0xe0b84a : 0x6a6a6a, 1).fillCircle(n.x, n.y, r);
    g.lineStyle(2, n.id === selected ? 0xffffff : 0x20180c, 1).strokeCircle(n.x, n.y, r);
    if (!open) { // a padlock: beat the place before it first
      g.lineStyle(2, 0x2a2a2a, 1).strokeCircle(n.x, n.y - 3, 3);
      g.fillStyle(0x2a2a2a, 1).fillRect(n.x - 4, n.y - 2, 8, 6).fillStyle(0x9a9a9a, 1).fillRect(n.x - 1, n.y, 2, 2);
    }
  }
}
