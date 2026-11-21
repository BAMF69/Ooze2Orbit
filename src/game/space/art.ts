// Space illustration keys and original world-space display dimensions.
import type * as Phaser from "phaser";
import { PART_IDS } from "./fit";
import { SPACE } from "./tuning";

export const FLIGHT_SPRITE_SIZE = 32;
export const artKey = (id: string): string => `space_hd_${id}`;
export const artIcon = (id: string): { texture: string; frame: number } => ({ texture: artKey(id), frame: 0 });

export function preloadSpaceArt(scene: Phaser.Scene): void {
  const path = (id: string) => `assets/art/space_hd_${id}_v1.webp`;
  for (const id of [...Object.keys(SPACE.hulls), ...Object.keys(SPACE.t0), ...PART_IDS]) {
    scene.load.spritesheet(artKey(id), path(id), { frameWidth: 128, frameHeight: 128 });
  }
  for (const id of ["hearth", "tidereach"]) {
    scene.load.spritesheet(artKey(id), path(id), { frameWidth: 256, frameHeight: 256 });
  }
  for (const id of ["driftfield", "lattice_field"]) scene.load.image(artKey(id), path(id));
}
