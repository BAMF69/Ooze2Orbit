// ---------------------------------------------------------------------------
// dietPicker.ts
// Purpose : The diet choice (herbivore, carnivore, omnivore): three cards across the middle of the screen, shown
//           when the run starts and again at each evolution. The pond waits while it is up.
// Usage   : picker.show(currentDiet, "diet.title_start"); picker.move(+1); const d = picker.confirm()
// Notes   : Drawing only; the scene reads input (left/right or A/D pick, Enter confirms) and pauses its own logic
//           while picker.isOpen. Cards are clickable: a click picks and confirms through onPick.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { DIETS, type Diet } from "./tuning";

const CARD_W = 180;
const CARD_H = 92;
const GAP = 12;
const DEPTH = 1200;
const CARD_COLOR: Readonly<Record<Diet, number>> = { herbivore: 0x2f6b3a, carnivore: 0x7a2f35, omnivore: 0x5d4a2a };

export class DietPicker {
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly cards: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly texts: Phaser.GameObjects.Text[];
  private readonly hit: Phaser.GameObjects.Zone[];
  private index = 0;
  private openNow = false;

  constructor(private readonly scene: Phaser.Scene, private readonly i18n: I18n, onPick: (d: Diet) => void) {
    const { width, height } = scene.scale;
    this.dim = scene.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH);
    this.cards = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this.title = scene.add.text(width / 2, height / 2 - CARD_H / 2 - 34, "", {
      fontFamily: "monospace", fontSize: "16px", color: "#fff6c8", stroke: "#1d2b53", strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 2).setResolution(2);
    const x0 = width / 2 - (CARD_W * 3 + GAP * 2) / 2;
    const y0 = height / 2 - CARD_H / 2;
    this.texts = DIETS.map((d, i) =>
      scene.add.text(x0 + i * (CARD_W + GAP) + 8, y0 + 8, i18n.t(`diet.${d}`) + "\n\n" + i18n.t(`diet.${d}_desc`), {
        fontFamily: "monospace", fontSize: "11px", color: "#ffffff", wordWrap: { width: CARD_W - 16 },
      }).setScrollFactor(0).setDepth(DEPTH + 2).setResolution(2));
    this.hit = DIETS.map((_d, i) =>
      scene.add.zone(x0 + i * (CARD_W + GAP), y0, CARD_W, CARD_H).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 3)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => { if (this.openNow) { this.index = i; onPick(this.confirm()); } }));
    this.setVisible(false);
  }

  get isOpen(): boolean {
    return this.openNow;
  }

  show(current: Diet, titleKey: string, args: Record<string, string | number> = {}): void {
    this.index = DIETS.indexOf(current);
    this.title.setText(this.i18n.t(titleKey, args));
    this.openNow = true;
    this.setVisible(true);
    this.draw();
  }

  move(step: number): void {
    this.index = (this.index + step + DIETS.length) % DIETS.length;
    this.draw();
  }

  /** Close and return the highlighted diet. */
  confirm(): Diet {
    this.openNow = false;
    this.setVisible(false);
    return DIETS[this.index];
  }

  private draw(): void {
    const { width, height } = this.scene.scale;
    const x0 = width / 2 - (CARD_W * 3 + GAP * 2) / 2;
    const y0 = height / 2 - CARD_H / 2;
    this.cards.clear();
    DIETS.forEach((d, i) => {
      const x = x0 + i * (CARD_W + GAP);
      this.cards.fillStyle(CARD_COLOR[d], 0.95).fillRoundedRect(x, y0, CARD_W, CARD_H, 6);
      const on = i === this.index;
      this.cards.lineStyle(on ? 3 : 1, on ? 0xffd27f : 0xffffff, on ? 1 : 0.4).strokeRoundedRect(x, y0, CARD_W, CARD_H, 6);
    });
  }

  private setVisible(v: boolean): void {
    this.dim.setVisible(v);
    this.cards.setVisible(v);
    this.title.setVisible(v);
    this.texts.forEach((t) => t.setVisible(v));
    this.hit.forEach((z) => z.setVisible(v));
  }
}
