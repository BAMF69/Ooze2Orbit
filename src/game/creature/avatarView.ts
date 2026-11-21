// ---------------------------------------------------------------------------
// avatarView.ts (creature)
// Purpose : Draw the creature avatar from the HD sheets: worn-trait strips behind the body, the body, then
//           front strips, all sharing one frame, position, facing and scale. Replaces the tinted legacy walker.
// Usage   : const v = new AvatarView(scene, look, x, y); scene camera follows v.anchor;
//           each frame v.update(look, x, y, frame, flip, scale, alpha); v.destroy() on shutdown (scene-owned objects
//           also die with the scene). A look change (new daughter) rebuilds only the overlay sprites.
// Notes   : 96 px cells drawn at 32 px (HD_AVATAR). Linear filtering: the global config is pixelArt, which would
//           drop two of every three source pixels when downscaling. Debug: Log channel "creature-avatar".
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { Log } from "../../core/log";
import { HD_AVATAR, bodyKey, wornKey, wornFrame, lookStrips, lookKey, paintedAvatar, paintedSwimWornFrame, WORN_STRIPS, type AvatarLook } from "./avatarLook";

export class AvatarView {
  readonly anchor: Phaser.GameObjects.Sprite;
  private back: { sprite: Phaser.GameObjects.Sprite; strip: number }[] = [];
  private front: { sprite: Phaser.GameObjects.Sprite; strip: number }[] = [];
  private key = "";

  constructor(private readonly scene: Phaser.Scene, look: AvatarLook, x: number, y: number, private readonly depth = 4) {
    this.anchor = scene.add.sprite(x, y, bodyKey(look.family, look.diet), 0).setDepth(depth);
    this.apply(look);
  }

  /** Rebuild textures and overlay sprites only when the look actually changes. */
  private apply(look: AvatarLook): void {
    const key = lookKey(look);
    if (key === this.key) return;
    this.key = key;
    const body = bodyKey(look.family, look.diet), worn = wornKey(look.family, look.diet);
    for (const k of [body, worn]) {
      if (!this.scene.textures.exists(k)) { Log.error("creature-avatar", `Missing HD sheet ${k}; avatarAssetsReady should have blocked this`); continue; }
      this.scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.anchor.setTexture(body, 0);
    for (const o of [...this.back, ...this.front]) o.sprite.destroy();
    const strips = lookStrips(look);
    const make = (strip: number, d: number) => ({ sprite: this.scene.add.sprite(this.anchor.x, this.anchor.y, worn, wornFrame(strip, 0)).setDepth(d), strip });
    this.back = strips.back.map((s, i) => make(s, this.depth - 0.1 + i * 0.001));
    this.front = strips.front.map((s, i) => make(s, this.depth + 0.1 + i * 0.001));
    Log.info("creature-avatar", `look ${key} (${this.back.length} back, ${this.front.length} front strips)`);
  }

  /** Same frame index as the legacy walker grid (POSE_START + 0..3); scale is the old 32 px scale factor. */
  update(look: AvatarLook, x: number, y: number, frame: number, flip: boolean, scale: number, alpha: number, swimmingWithFins = false): void {
    this.apply(look);
    const s = scale * HD_AVATAR.display / HD_AVATAR.cell;
    const swim = swimmingWithFins && paintedAvatar(look.family, look.diet);
    const bodyFrame = swim ? HD_AVATAR.frames + frame % HD_AVATAR.bodyColumns : frame;
    this.anchor.setPosition(x, y).setFrame(bodyFrame).setFlipX(flip).setScale(s).setAlpha(alpha);
    for (const o of [...this.back, ...this.front])
      o.sprite.setVisible(!swim || WORN_STRIPS[o.strip].trait !== "fins").setPosition(x, y).setFrame(swim ? paintedSwimWornFrame(o.strip, frame) : wornFrame(o.strip, frame)).setFlipX(flip).setScale(s).setAlpha(alpha);
  }

  destroy(): void {
    for (const o of [...this.back, ...this.front]) o.sprite.destroy();
    this.back = []; this.front = [];
    this.anchor.destroy();
  }
}
