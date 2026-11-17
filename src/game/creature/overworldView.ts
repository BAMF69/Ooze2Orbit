// Purpose: Landmarks for the walkable overworld and Water approach, drawn over the illustrated terrain (creature-hd):
//   biome trail arches, difficulty locks, the nest, distant biome silhouettes, shoreline water and reeds.
// Notes: Terrain collision comes exclusively from overworld.ts; RoomArt draws its rock tiles and backdrop from
//   hubSolid. Every state cue is kept (path colours, lock cross, raised-basin line).
// Authored: Written with Codex (GPT-6); illustrated restyle with Claude (Opus 5.5).
import type * as Phaser from "phaser";
import { OVERWORLD, BIOME_PATHS, WATER_PATHS } from "./overworld";
import { levelLock, type Expedition } from "./expedition";
import type { Traits } from "./generations";

const INK = 0x0d1a20;
type G = Phaser.GameObjects.Graphics;
const stick = (g: G, x0: number, y0: number, x1: number, y1: number, w: number, color: number) => { g.lineStyle(w + 2, INK).lineBetween(x0, y0, x1, y1); g.lineStyle(w, color).lineBetween(x0, y0, x1, y1); };

/** A trail entrance: dark mouth, inked arch in the destination's colour, two leaf tufts. */
function arch(g: G, x: number, color: number): void {
  g.fillStyle(color, 0.22).fillTriangle(x - 70, 304, x, 225, x + 70, 304);
  g.fillStyle(0x0a1a1e).fillRoundedRect(x - 23, 242, 46, 62, { tl: 21, tr: 21, bl: 0, br: 0 });
  g.lineStyle(6, INK).strokeRoundedRect(x - 27, 240, 54, 64, { tl: 23, tr: 23, bl: 0, br: 0 });
  g.lineStyle(3, color).strokeRoundedRect(x - 26, 241, 52, 63, { tl: 22, tr: 22, bl: 0, br: 0 });
  for (const dx of [-27, 27]) { g.fillStyle(0xa9d68a).fillEllipse(x + dx, 246, 8, 12); g.lineStyle(1, INK).strokeEllipse(x + dx, 246, 8, 12); }
}

function reeds(g: G, x0: number, x1: number): void {
  for (let x = x0; x < x1; x += 6) {
    const h = 32 + (x * 7) % 12, lean = ((x * 3) % 7) - 3;
    stick(g, x, 305, x + lean * 1.5, 304 - h, 1.8, (x / 6) % 2 ? 0x5f9a4e : 0x719d64);
    if (x % 18 === 0) { g.fillStyle(0x8a5a3a).fillEllipse(x + lean * 1.5, 304 - h + 3, 4, 9); g.lineStyle(0.9, INK).strokeEllipse(x + lean * 1.5, 304 - h + 3, 4, 9); }
  }
}

export function drawHub(g: G, water: boolean, t: Traits, e: Expedition): void {
  const width = water ? OVERWORLD.waterWidth : OVERWORLD.width;
  if (!water) {
    // Distant biome silhouettes (flat, no ink: scenery, not ground) so each destination reads before its sign.
    g.fillStyle(0x4b8c9a, 0.55).fillEllipse(384, 299, 160, 24);
    g.lineStyle(5, 0x3d6b3a, 0.9).lineBetween(800, 200, 820, 260).lineBetween(820, 260, 850, 207);
    g.fillStyle(0x4f5c59, 0.9).fillTriangle(1180, 304, 1240, 176, 1330, 304);
    g.fillStyle(0xcbdeda, 0.85).fillTriangle(1640, 304, 1710, 190, 1800, 304).fillStyle(0xeef6f4, 0.9).fillTriangle(1690, 222, 1710, 190, 1730, 222);
    // The nest: a woven ring of reeds and twigs.
    g.fillStyle(0x6c5a3c).fillEllipse(OVERWORLD.nest, 302, 76, 18); g.lineStyle(1.5, INK).strokeEllipse(OVERWORLD.nest, 302, 76, 18);
    for (let a = 0; a < 12; a++) { const x = OVERWORLD.nest - 34 + a * 6; stick(g, x, 298 + (a % 2) * 3, x + 9, 304 - (a % 2) * 3, 1.4, a % 3 ? 0xd0b47c : 0xa98a58); }
    g.fillStyle(0xf2e3bf).fillEllipse(OVERWORLD.nest - 6, 297, 9, 7).fillEllipse(OVERWORLD.nest + 5, 298, 8, 6);
    g.lineStyle(1, INK).strokeEllipse(OVERWORLD.nest - 6, 297, 9, 7).strokeEllipse(OVERWORLD.nest + 5, 298, 8, 6);
  }
  const paths = water ? WATER_PATHS : BIOME_PATHS;
  paths.forEach((p, i) => {
    arch(g, p.x, p.color);
    if (water && levelLock(WATER_PATHS[i].tier, t)) { stick(g, p.x - 18, 253, p.x + 18, 288, 3, 0xd5b87e); stick(g, p.x + 18, 253, p.x - 18, 288, 3, 0xd5b87e); }
  });
  if (water) {
    g.fillStyle(0x4fb6c9, 0.42).fillRect(310, 278, width - 310, 26);
    g.fillStyle(0x1f6a80, 0.3).fillRect(310, 290, width - 310, 14);
    g.lineStyle(1.4, 0xbfeaf0, 0.95).beginPath(); g.moveTo(310, 278);
    for (let x = 310; x < width; x += 8) g.lineTo(x + 8, 278 + ((x / 8) % 2 ? 1.2 : -1.2));
    g.strokePath();
    reeds(g, 360, 500);
    if (e.basinRaised) stick(g, 338, 286, 488, 286, 2, 0xd4c48b);
  }
}
export function hubLabels(water: boolean): { x: number; y: number; text: string }[] {
  return water ? [{ x: 64, y: 220, text: "← Nest\nReturn trail" }, ...WATER_PATHS.map(p => ({ x: p.x, y: 195, text: `${p.name}\n${p.detail}` }))] :
    [{ x: OVERWORLD.nest, y: 240, text: "NEST\nRest & raise daughters" }, ...BIOME_PATHS.map(p => ({ x: p.x, y: 202, text: `${p.name.toUpperCase()}\n${p.detail}` }))];
}
