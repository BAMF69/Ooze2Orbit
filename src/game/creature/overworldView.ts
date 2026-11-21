// Purpose: Level scenery and trail markers for the walkable overworld and Water approach.
// Notes: Terrain collision comes exclusively from overworld.ts. Original prototype art; no new assets.
// Authored: Written with Codex (GPT-6).
import type * as Phaser from "phaser";
import { OVERWORLD, BIOME_PATHS, WATER_PATHS, hubSolid } from "./overworld";
import { levelLock, type Expedition } from "./expedition";
import type { Traits } from "./generations";
export function drawHub(g: Phaser.GameObjects.Graphics, water: boolean, t: Traits, e: Expedition): void {
  const width = water ? OVERWORLD.waterWidth : OVERWORLD.width;
  g.fillStyle(water ? 0x1b414a : 0x19392e).fillRect(0, 0, width, 360);
  for (let x = 0; x < width; x += 64) {
    g.fillStyle(0x122c2d).fillTriangle(x - 100, 280, x + 60, 118 + x % 56, x + 220, 280);
    if (!water || x < 400) {
      g.fillStyle(0x203f36).fillRect(x + 20, 165, 12, 145);
      g.fillStyle(0x2d5440).fillEllipse(x + 26, 175 + x % 32, 110, 84);
    }
  }
  const paths = water ? WATER_PATHS : BIOME_PATHS;
  paths.forEach((p, i) => {
    g.fillStyle(p.color, 0.28).fillTriangle(p.x - 70, 304, p.x, 225, p.x + 70, 304);
    g.lineStyle(5, 0x10282d).strokeRoundedRect(p.x - 27, 240, 54, 64, 23);
    g.lineStyle(3, p.color).strokeRoundedRect(p.x - 25, 240, 50, 64, 22);
    if (water && levelLock(WATER_PATHS[i].tier, t)) {
      g.lineStyle(3, 0xd5b87e).lineBetween(p.x - 18, 253, p.x + 18, 288).lineBetween(p.x + 18, 253, p.x - 18, 288);
    }
  });
  if (water) {
    g.fillStyle(0x4096ac, 0.5).fillRect(310, 278, width - 310, 26);
    g.lineStyle(2, 0x88c7c5).lineBetween(310, 278, width, 278);
    for (let x = 360; x < 500; x += 12) g.fillStyle(0x719d64).fillTriangle(x, 304, x + 5, 266, x + 9, 304);
    if (e.basinRaised) g.lineStyle(2, 0xd4c48b).lineBetween(338, 286, 488, 286);
  } else {
    // Biome silhouettes let the player read each destination while walking, before reaching its sign.
    g.fillStyle(0x4b8c9a, 0.65).fillEllipse(384, 299, 160, 24);
    g.lineStyle(4, 0x62874d).lineBetween(800, 200, 820, 260).lineBetween(820, 260, 850, 207);
    g.fillStyle(0x65716d).fillTriangle(1180, 304, 1240, 176, 1330, 304);
    g.fillStyle(0xcbdeda).fillTriangle(1640, 304, 1710, 190, 1800, 304);
    g.lineStyle(4, 0xd0b47c).strokeEllipse(OVERWORLD.nest, 302, 72, 16);
  }
  for (let y = 6; y < 22; y++) for (let x = 0; x < width / 16; x++) if (hubSolid(water, x, y)) {
    g.fillStyle(y >= 19 ? 0x3b5440 : 0x63705b).fillRect(x * 16, y * 16, 16, 16);
    g.fillStyle(0x819a68).fillRect(x * 16, y * 16, 15, 2);
  }
}
export function hubLabels(water: boolean): { x: number; y: number; text: string }[] {
  return water ? [{ x: 64, y: 220, text: "← Nest\nReturn trail" }, ...WATER_PATHS.map(p => ({ x: p.x, y: 195, text: `${p.name}\n${p.detail}` }))] :
    [{ x: OVERWORLD.nest, y: 240, text: "NEST\nRest & raise daughters" }, ...BIOME_PATHS.map(p => ({ x: p.x, y: 202, text: `${p.name.toUpperCase()}\n${p.detail}` }))];
}
