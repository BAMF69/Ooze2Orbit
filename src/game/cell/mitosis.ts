// A growth -> three connected lobes -> separation -> preview-docking presentation.
// Scene update owns the clock so pausing, game speed and shutdown also control the animation.
import * as Phaser from "phaser";
import { CELL_ART, dietFrame } from "./illustrated";
import type { I18n } from "../../core/i18n";
import type { Daughter } from "./division";
import type { Creature } from "./rules";
import { TUNING } from "./tuning";
import { equipmentTexture } from "./equipmentArt";

export type MitosisTuning = { [K in keyof typeof TUNING.mitosis]: number };
export interface MitosisCards { cardWidth: number; cardHeight: number; cardGap: number; previewScale: number }

const smooth = (n: number) => { const x = Math.max(0, Math.min(1, n)); return x * x * (3 - 2 * x); };

export class Mitosis {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private parent: Phaser.GameObjects.Sprite[] = [];
  private daughters: Phaser.GameObjects.Sprite[][] = [];
  private membrane!: Phaser.GameObjects.Graphics;
  private shade!: Phaser.GameObjects.Rectangle;
  private caption!: Phaser.GameObjects.Text;
  private elapsed = 0;
  private reduced = false;
  isPlaying = false;

  constructor(private scene: Phaser.Scene, private i18n: I18n, private tuning: MitosisTuning = TUNING.mitosis,
    private cards: MitosisCards = TUNING.division, private messages = { grow: "cell.mitosis_grow", split: "cell.mitosis_split" }) {
      const resize = () => { if (this.isPlaying) this.render(); };
      scene.scale.on("resize", resize); scene.events.once("shutdown", () => scene.scale.off("resize", resize));
    }

  start(parent: Creature, offers: readonly Daughter[], reduced: boolean): void {
    this.setup(reduced);
    this.parent = this.body(parent);
    this.daughters = offers.map(d => this.body(d.creature));
    this.render();
  }

  /** Other stages supply their own actual body sprites while sharing the split choreography. */
  startCustom(parent: () => Phaser.GameObjects.Sprite[], daughters: () => Phaser.GameObjects.Sprite[][], reduced: boolean): void {
    this.setup(reduced);
    this.parent = parent(); this.daughters = daughters();
    this.objects.push(...this.parent, ...this.daughters.flat());
    this.render();
  }

  private setup(reduced: boolean): void {
    this.close(); this.isPlaying = true; this.elapsed = 0; this.reduced = reduced;
    const { width, height } = this.scene.scale;
    const t = this.tuning;
    this.shade = this.keep(this.scene.add.rectangle(0, 0, width, height, 0x000000, t.dimAlpha)
      .setOrigin(0).setScrollFactor(0).setDepth(t.depth));
    this.membrane = this.keep(this.scene.add.graphics().setScrollFactor(0).setDepth(t.depth + 1));
    this.caption = this.keep(this.scene.add.text(width / 2, height - t.captionBottom, "", {
      fontFamily: "monospace", fontSize: `${t.captionSize}px`, color: "#fff6c8", align: "center",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(t.depth + 4).setResolution(2));
  }

  /** Returns true exactly when the presentation finishes. Choices are enabled by the scene afterward. */
  update(dt: number): boolean {
    if (!this.isPlaying) return false;
    this.elapsed += Math.max(0, dt);
    const t = this.tuning;
    const duration = this.reduced ? t.reducedS : t.growS + t.splitS + t.settleS + t.dockS;
    this.render();
    if (this.elapsed < duration) return false;
    this.close();
    return true;
  }

  close(): void {
    this.objects.forEach(o => o.destroy()); this.objects = [];
    this.parent = []; this.daughters = []; this.isPlaying = false;
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T { this.objects.push(o); return o; }

  private body(c: Creature): Phaser.GameObjects.Sprite[] {
    const t = this.tuning;
    const body = this.keep(this.scene.add.sprite(0, 0, CELL_ART.texture, dietFrame(c.diet))
      .setScrollFactor(0).setDepth(t.depth + 2));
    body.setData("artScale", CELL_ART.size / body.width);
    const equipment = this.keep(this.scene.add.sprite(0, 0, equipmentTexture(this.scene, c)).setScrollFactor(0).setDepth(t.depth + 3));
    equipment.setData("artScale", CELL_ART.size / equipment.width);
    return [body, equipment];
  }

  private place(group: Phaser.GameObjects.Sprite[], x: number, y: number, sx: number, sy: number, alpha: number): void {
    group.forEach(s => { const factor = Number(s.getData("artScale")) || 1; s.setPosition(x, y).setScale(sx * factor, sy * factor).setAlpha(Math.max(0, Math.min(1, alpha))); });
  }

  private render(): void {
    const t = this.tuning, card = this.cards;
    const { width, height } = this.scene.scale;
    const cx = width / 2, cy = height / 2;
    this.shade.setSize(width, height); this.caption.setPosition(cx, height - t.captionBottom).setWordWrapWidth(width - 20);
    const grow = this.reduced ? 0 : smooth(this.elapsed / t.growS);
    const split = smooth((this.elapsed - t.growS) / t.splitS);
    const dock = this.reduced ? 1 : smooth((this.elapsed - t.growS - t.splitS - t.settleS) / t.dockS);
    const fade = this.reduced ? smooth(this.elapsed / t.reducedS) : split;
    const parentScale = t.bodyScale * (1 + grow * t.swell);
    this.place(this.parent, cx, cy, parentScale * (1 + split * t.stretch), parentScale * (1 - split * t.squeeze), 1 - fade);
    const left = (width - this.daughters.length * card.cardWidth - (this.daughters.length - 1) * card.cardGap) / 2;
    this.membrane.clear();
    this.shade.setAlpha(1).setFillStyle(0x000000, t.dimAlpha + dock * (t.menuDimAlpha - t.dimAlpha));
    this.daughters.forEach((group, i) => {
      const offset = i - (this.daughters.length - 1) / 2;
      const x = cx + offset * Math.min(t.separation, width / 3) * split;
      const y = cy + Math.abs(offset) * t.arcHeight * Math.sin(split * Math.PI);
      const targetX = width < 600 ? cx + offset * width / 3 : left + i * (card.cardWidth + card.cardGap) + card.cardWidth / 2;
      const targetY = (height - card.cardHeight) / 2 + t.previewOffsetY;
      const scale = t.bodyScale + dock * (card.previewScale - t.bodyScale);
      if (!this.reduced && split > 0 && split < 1 && i < this.daughters.length - 1) {
        // Soft membrane bridges narrow and disappear as the actual daughter bodies separate.
        this.membrane.fillStyle(t.membraneColor, t.bridgeAlpha * Math.sin(split * Math.PI));
        this.membrane.fillEllipse(x + t.separation * split / 2, y, t.separation * split + t.bridgeWidth,
          t.bridgeHeight * (1 - split) + t.bridgeMinHeight);
      }
      this.place(group, x + dock * (targetX - x), y + dock * (targetY - y), scale, scale, fade);
    });
    const message = this.elapsed < t.growS ? this.messages.grow : this.messages.split;
    this.caption.setText(this.i18n.t(message)).setAlpha(this.reduced ? 0 : 1 - dock);
  }
}
