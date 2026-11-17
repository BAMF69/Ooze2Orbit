// Purpose: Validate creature sprite sheets before constructing bodies; failed loads must not become avatars.
// Usage: queueAvatarAssets(scene, look?) in preload; avatarAssetsReady(scene, look?) in create and before retry completion.
// Notes: A Phaser loader may complete with failed files. Completion alone does not guarantee textures exist.
//   With a look, the lineage's HD body sheet, its family's worn-trait atlas and the four HD enemies, and the Water rock tiles and background are required too
//   (the other eight bodies are never downloaded). Every sheet must have every frame or it is removed and re-queued.
// Authored: Written with Codex (GPT-6); HD sheets added with Claude (Opus 5.5).
import type * as Phaser from "phaser";
import { HD_AVATAR, bodyKey, bodyPath, wornKey, wornPath, wornFrameCount, type AvatarLook } from "./avatarLook";
import { FOE_HD, HD_FOE_KINDS } from "./foeArt";
import { WATER_TILES, WATER_BG, OVERWORLD_BG, tileCount } from "./roomTiles";

export interface AvatarSheet { key: string; path: string; frames: number; size: number; height?: number }
export const AVATAR_ASSETS: readonly AvatarSheet[] = [
  { key: "genWalker", path: "assets/art/creature_walker.png", frames: 20, size: 32 },
  { key: "genFoe", path: "assets/art/creature_foes.png", frames: 24, size: 32 },
];

/** The sheets a scene needs: the legacy pair, plus the look's HD body and worn atlas when a look is known. */
export function avatarSheets(look?: Pick<AvatarLook, "family" | "diet">): AvatarSheet[] {
  if (!look) return [...AVATAR_ASSETS];
  return [...AVATAR_ASSETS,
    { key: bodyKey(look.family, look.diet), path: bodyPath(look.family, look.diet), frames: HD_AVATAR.frames, size: HD_AVATAR.cell },
    { key: wornKey(look.family), path: wornPath(look.family), frames: wornFrameCount(), size: HD_AVATAR.cell },
    ...HD_FOE_KINDS.map(k => ({ key: FOE_HD[k].key, path: FOE_HD[k].path, frames: FOE_HD[k].frames, size: FOE_HD[k].cell })),
    { key: WATER_TILES.key, path: WATER_TILES.path, frames: tileCount(), size: WATER_TILES.cell },
    { key: WATER_BG.key, path: WATER_BG.path, frames: 1, size: WATER_BG.width, height: WATER_BG.height },
    { key: OVERWORLD_BG.key, path: OVERWORLD_BG.path, frames: 1, size: OVERWORLD_BG.width, height: OVERWORLD_BG.height }];
}

const complete = (scene: Phaser.Scene, a: AvatarSheet): boolean => scene.textures.exists(a.key) &&
  Array.from({ length: a.frames }, (_, n) => n).every(n => scene.textures.get(a.key).has(String(n)));

export function avatarAssetsReady(scene: Phaser.Scene, look?: Pick<AvatarLook, "family" | "diet">): boolean {
  return avatarSheets(look).every(a => complete(scene, a));
}
export function queueAvatarAssets(scene: Phaser.Scene, look?: Pick<AvatarLook, "family" | "diet">): void {
  for (const a of avatarSheets(look)) {
    if (scene.textures.exists(a.key)) {
      if (complete(scene, a)) continue;
      scene.textures.remove(a.key);
    }
    scene.load.spritesheet(a.key, a.path, { frameWidth: a.size, frameHeight: a.height ?? a.size });
  }
}
