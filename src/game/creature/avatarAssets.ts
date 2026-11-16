// Purpose: Validate creature sprite sheets before constructing bodies; failed loads must not become avatars.
// Usage: queueAvatarAssets in preload; avatarAssetsReady in create and before retry completion.
// Notes: A Phaser loader may complete with failed files. Completion alone does not guarantee textures exist.
// Authored: Written with Codex (GPT-6).
import type * as Phaser from "phaser";
export const AVATAR_ASSETS = [
  { key: "genWalker", path: "assets/art/creature_walker.png", frames: 20 },
  { key: "genFoe", path: "assets/art/creature_foes.png", frames: 24 },
] as const;
export function avatarAssetsReady(scene: Phaser.Scene): boolean {
  return AVATAR_ASSETS.every(a => scene.textures.exists(a.key) &&
    Array.from({ length: a.frames }, (_, n) => n).every(n => scene.textures.get(a.key).has(String(n))));
}
export function queueAvatarAssets(scene: Phaser.Scene): void {
  for (const a of AVATAR_ASSETS) {
    if (scene.textures.exists(a.key)) {
      if (Array.from({ length: a.frames }, (_, n) => n).every(n => scene.textures.get(a.key).has(String(n)))) continue;
      scene.textures.remove(a.key);
    }
    scene.load.spritesheet(a.key, a.path, { frameWidth: 32, frameHeight: 32 });
  }
}
