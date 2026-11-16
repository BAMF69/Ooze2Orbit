// Purpose: Physical overworld and Water trail entrances, shared by rendering, interaction and traversal tests.
// Notes: Safe hubs are levels, not biome-selection dialogs. Optional ledges never block the walking path.
// Authored: Written with Codex (GPT-6).
import type { Difficulty } from "./waterWorld";
export const OVERWORLD = { width: 1920, waterWidth: 960, nest: 112, floor: 304, reach: 36 };
export const BIOME_PATHS = [
  { x: 384, name: "Water", color: 0x70bed0, detail: "Reedwater trail" },
  { x: 832, name: "Jungle", color: 0x70aa62, detail: "Coming later" },
  { x: 1280, name: "Mountains", color: 0xa29e92, detail: "Coming later" },
  { x: 1728, name: "Ice", color: 0xd7edf5, detail: "Coming later" },
] as const;
export const WATER_PATHS: { x: number; tier: Difficulty; name: string; color: number; detail: string }[] = [
  { x: 256, tier: "easy", name: "Reed shallows", color: 0x99c98a, detail: "EASY · discover gills & fins" },
  { x: 544, tier: "medium", name: "Drowned galleries", color: 0x75b8ce, detail: "MEDIUM · inherited gills" },
  { x: 832, tier: "hard", name: "Torrent heart", color: 0xd3ac7b, detail: "HARD · gills + swimming fins" },
];
export function hubSolid(waterTrail: boolean, tx: number, ty: number): boolean {
  const width = waterTrail ? OVERWORLD.waterWidth : OVERWORLD.width;
  if (tx < 0 || tx >= width / 16 || ty >= 19 || ty < 6) return true;
  return ty === 14 && (waterTrail ? tx >= 22 && tx <= 25 : [34, 62, 90].some(x => tx >= x && tx <= x + 3));
}
export const nearLandmark = (x: number, landmark: number): boolean => Math.abs(x - landmark) < OVERWORLD.reach;
