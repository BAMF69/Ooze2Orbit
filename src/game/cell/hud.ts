// ---------------------------------------------------------------------------
// hud.ts
// Purpose : The cell stage's on-canvas HUD: form, the food meter toward the next evolution, part slots (icons of
//           the parts you carry, empty frames for free slots), diet and plant/meat points with the upgrade key,
//           and short floating messages ("Got spikes!").
// Usage   : const hud = new CellHud(scene, i18n); hud.update(creature); hud.toast("cell.got", { part })
// Notes   : Fixed to the camera (scrollFactor 0), top-right, so it never covers the shell's pause prompt
//           (top-left DOM). Redraws only when the creature changes. Strings come from data/i18n.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { evolveNeed, slots, type Creature } from "./rules";
import { TUNING, type PartKind } from "./tuning";
import { POINT_COLOR } from "./upgradePanel";

const W = 150; // panel width
const BAR_H = 8;
const SLOT = 22;
const MARGIN = 8;
const TOAST_S = 2.2;
const DEPTH = 1000;

export class CellHud {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly dietText: Phaser.GameObjects.Text;
  private readonly plantText: Phaser.GameObjects.Text;
  private readonly meatText: Phaser.GameObjects.Text;
  private readonly icons: Phaser.GameObjects.Sprite[] = [];
  private readonly toastText: Phaser.GameObjects.Text;
  private toastLeft = 0;
  private last = "";

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly i18n: I18n,
    private readonly partFrame: (p: PartKind) => number,
  ) {
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.label = scene.add.text(0, 0, "", { fontFamily: "monospace", fontSize: "11px", color: "#ffffff" })
      .setScrollFactor(0).setDepth(DEPTH + 1).setResolution(2);
    const small = { fontFamily: "monospace", fontSize: "10px", color: "#ffffff" };
    this.dietText = scene.add.text(0, 0, "", small).setScrollFactor(0).setDepth(DEPTH + 1).setResolution(2);
    this.plantText = scene.add.text(0, 0, "", { ...small, color: POINT_COLOR.algae }).setScrollFactor(0).setDepth(DEPTH + 1).setResolution(2);
    this.meatText = scene.add.text(0, 0, "", { ...small, color: POINT_COLOR.meat }).setScrollFactor(0).setDepth(DEPTH + 1).setResolution(2);
    this.toastText = scene.add.text(scene.scale.width / 2, 46, "", {
      fontFamily: "monospace", fontSize: "14px", color: "#fff6c8", stroke: "#1d2b53", strokeThickness: 4, align: "center",
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1).setResolution(2).setAlpha(0);
  }

  /** Redraw when anything shown changed. */
  update(c: Creature, dt: number): void {
    this.tickToast(dt);
    const key = `${c.form}|${Math.floor(c.food)}|${c.parts.join(",")}|${c.diet}|${Math.floor(c.points.algae)}|${Math.floor(c.points.meat)}`;
    if (key === this.last) return;
    this.last = key;
    const x = this.scene.scale.width - W - MARGIN;
    const y = MARGIN;
    const need = evolveNeed(c);
    const full = !Number.isFinite(need);
    const n = slots(c);
    const h = 40 + SLOT + 30;

    this.panel.clear();
    this.panel.fillStyle(0x000000, 0.72).fillRoundedRect(x, y, W, h, 6);
    this.label.setPosition(x + 6, y + 4).setText(
      full ? this.i18n.t("cell.hud_full", { form: c.form }) : this.i18n.t("cell.hud_form", { form: c.form, food: Math.floor(c.food), need }),
    );
    // food meter
    const bx = x + 6, by = y + 20, bw = W - 12;
    this.panel.fillStyle(0x223260, 1).fillRect(bx, by, bw, BAR_H);
    const frac = full ? 1 : Math.min(1, c.food / need);
    this.panel.fillStyle(full ? 0xffd27f : 0x8be070, 1).fillRect(bx, by, Math.round(bw * frac), BAR_H);
    this.panel.lineStyle(1, 0xffffff, 0.6).strokeRect(bx, by, bw, BAR_H);
    // diet, points and the upgrade key
    const ly = by + BAR_H + SLOT + 10;
    this.dietText.setPosition(bx, ly).setText(this.i18n.t("cell.hud_diet", { diet: this.i18n.t(`diet.${c.diet}`) }));
    this.plantText.setPosition(bx, ly + 13).setText(this.i18n.t("cell.hud_plant", { n: Math.floor(c.points.algae) }));
    this.meatText.setPosition(bx + 64, ly + 13).setText(this.i18n.t("cell.hud_meat", { n: Math.floor(c.points.meat) }));
    // part slots
    this.icons.forEach((s) => s.destroy());
    this.icons.length = 0;
    for (let i = 0; i < TUNING.maxSlots; i++) { // part slots (form 4 adds none)
      const sx = bx + i * (SLOT + 4), sy = by + BAR_H + 6;
      const open = i < n;
      this.panel.lineStyle(1, 0xffffff, open ? 0.8 : 0.2).strokeRect(sx, sy, SLOT, SLOT);
      const part = c.parts[i];
      if (part) {
        this.icons.push(this.scene.add.sprite(sx + SLOT / 2, sy + SLOT / 2, "props", this.partFrame(part))
          .setScale(0.7).setScrollFactor(0).setDepth(DEPTH + 1));
      }
    }
  }

  /** A short message in the top middle of the screen. */
  toast(key: string, args: Record<string, string | number> = {}): void {
    this.toastText.setText(this.i18n.t(key, args)).setAlpha(1);
    this.toastLeft = TOAST_S;
  }

  private tickToast(dt: number): void {
    if (this.toastLeft <= 0) return;
    this.toastLeft -= dt;
    this.toastText.setAlpha(Math.max(0, Math.min(1, this.toastLeft / 0.5)));
  }
}
