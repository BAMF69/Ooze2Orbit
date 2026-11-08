// ---------------------------------------------------------------------------
// mood.ts
// Purpose : The "lit and moody, under a microscope" look (GDD art direction, mockup D): a dark falloff toward the
//           screen edges, a soft light wash from the top-left, and a faint lamp pool around the player.
// Usage   : const mood = new PondMood(scene); mood.follow(player.x, player.y)   // once per frame
// Notes   : Gradient images, not a camera shader: a camera filter would also darken the HUD (it renders through
//           the same camera). These sit at depth MOOD_DEPTH, under the HUD (1000+) and over the pond. The sprites
//           carry the top-left lighting themselves (assets_src/sprites/cellart.py). Numbers: TUNING.mood.
//           Works in WebGL and Canvas (plain textures drawn with the 2D canvas API).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { TUNING } from "./tuning";

const MOOD_DEPTH = 990;
const LAMP_DEPTH = 5; // over the pond objects, under the HUD and the vignette

/** A canvas texture painted once by `paint` (created only if the key is new: textures outlive scene restarts). */
function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`could not create canvas texture ${key}`);
  paint(tex.getContext());
  tex.refresh();
  return key;
}

export class PondMood {
  private readonly lamp: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    const { width: w, height: h } = scene.scale;
    const m = TUNING.mood;

    // the dark falloff: clear in the middle, near-black at the corners
    const vig = canvasTexture(scene, "mood_vignette", w, h, (ctx) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * m.vignetteInner, w / 2, h / 2, Math.hypot(w, h) / 2);
      g.addColorStop(0, "rgba(4,8,10,0)");
      g.addColorStop(1, `rgba(4,8,10,${m.vignetteAlpha})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    // the light comes from the top-left: a warm wash there, a little extra shade bottom-right
    const tilt = canvasTexture(scene, "mood_tilt", w, h, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, `rgba(255,236,190,${m.tiltLight})`);
      g.addColorStop(0.5, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,6,10,${m.tiltShade})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    // the lamp pool around the player
    const r = m.lampRadius;
    const lamp = canvasTexture(scene, "mood_lamp", r * 2, r * 2, (ctx) => {
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, `rgba(255,232,180,${m.lampAlpha})`);
      g.addColorStop(1, "rgba(255,232,180,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, r * 2, r * 2);
    });

    scene.add.image(0, 0, tilt).setOrigin(0, 0).setScrollFactor(0).setDepth(MOOD_DEPTH);
    scene.add.image(0, 0, vig).setOrigin(0, 0).setScrollFactor(0).setDepth(MOOD_DEPTH + 1);
    this.lamp = scene.add.image(0, 0, lamp).setDepth(LAMP_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Keep the lamp pool on the player (world coordinates). */
  follow(x: number, y: number): void {
    this.lamp.setPosition(x, y);
  }
}
