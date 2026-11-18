// ---------------------------------------------------------------------------
// foeView.ts (creature)
// Purpose : Create and pose enemy sprites from the HD sheets (charger, ambusher, swimmer, dropper): phase frames
//           instead of a tinted static frame. Falls back to the legacy genFoe frame if a sheet is missing.
// Usage   : addFoeSprite(scene, foe) at spawn; poseHdFoe(sprite, foe, clock, reduceMotion) each frame returns
//           false for legacy sprites so the scene's old styling still runs for them.
// Notes   : The scene still places the sprite at (foe.x, foe.y); originY only puts the charger's feet on the
//           floor. A patrolling ambusher stays at 60% alpha (it is hiding), exactly as before. Linear filtering
//           because the game config is pixelArt.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { ENEMIES, type WaterEnemy } from "./waterEncounters";
import { FOE_HD, HD_FOE_KINDS, foeFrame } from "./foeArt";

const byKey = new Map(HD_FOE_KINDS.map(k => [FOE_HD[k].key, FOE_HD[k]]));

export function addFoeSprite(scene: Phaser.Scene, foe: WaterEnemy): Phaser.GameObjects.Sprite {
  const a = FOE_HD[foe.kind];
  if (a && scene.textures.exists(a.key)) {
    scene.textures.get(a.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    return scene.add.sprite(foe.x, foe.y, a.key, 0).setOrigin(0.5, a.originY).setScale(a.display / a.cell).setDepth(3);
  }
  return scene.add.sprite(foe.x, foe.y, "genFoe", ENEMIES[foe.kind].frame).setDepth(3);
}

/** Pose an HD enemy for this frame. Returns false for legacy sprites (the scene's tint styling applies). */
export function poseHdFoe(sprite: Phaser.GameObjects.Sprite, foe: WaterEnemy, clock: number, reduceMotion: boolean): boolean {
  if (!byKey.has(sprite.texture.key)) return false;
  const down = !!foe.incapacitated;
  sprite.setFrame(foeFrame(foe.phase, down, clock, reduceMotion)).setFlipX(foe.facing < 0).setAngle(0)
    .setTint(down ? 0xc4cbcf : 0xffffff).setAlpha(down ? 0.85 : foe.kind === "ambusher" && foe.phase === "patrol" ? 0.6 : 1);
  if (!down) sprite.setPosition(foe.x, foe.y);
  return true;
}
