// ---------------------------------------------------------------------------
// upgradePanel.ts (aquatic)
// Purpose : The aquatic stage's upgrade panel: five rows (attack, speed, defense, mobility, health) up to level 10,
//           with cost and which points pay. Same look and colours as the cell stage's panel (green affordable, red
//           short, gray maxed); the lake keeps moving while it is open.
// Usage   : const panel = new AqUpgradePanel(scene, i18n, (stat) => tryBuy(stat)); panel.toggle(); panel.move(+1)
//           panel.render(creature); panel.selected
// Notes   : Drawing only; the scene owns input (E toggles, as in the cell stage; arrows pick, Enter buys; rows are clickable) and asks
//           creature.buyUpgrade(). Fixed to the screen, bottom-left.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { rowColor } from "../cell/upgradePanel";
import { maxLevel, pointsFor, upgradeCost, type AqCreature } from "./creature";
import { AQ_PAID_WITH, AQ_STATS, type AqStat } from "./tuning";

const X = 8;
const W = 270;
const ROW_H = 16;
const PAD = 6;
const FOOT_H = 12;
const DEPTH = 3100;

export class AqUpgradePanel {
  private readonly box: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly rows: Phaser.GameObjects.Text[];
  private readonly closeHint: Phaser.GameObjects.Text;
  private index = 0;
  private openNow = false;

  constructor(scene: Phaser.Scene, private readonly i18n: I18n, onClick: (stat: AqStat) => void) {
    const h = PAD * 2 + ROW_H * (AQ_STATS.length + 1) + FOOT_H;
    const y = scene.scale.height - h - 8;
    this.box = scene.add.graphics().setDepth(DEPTH);
    this.box.fillStyle(0x000000, 0.65).fillRoundedRect(X, y, W, h, 6).lineStyle(1, 0xffffff, 0.5).strokeRoundedRect(X, y, W, h, 6);
    const style = { fontFamily: "monospace", fontSize: "11px", color: "#ffffff" };
    this.title = scene.add.text(X + PAD, y + PAD, i18n.t("up.title"), { ...style, color: "#fff6c8" }).setDepth(DEPTH + 1).setResolution(2);
    this.rows = AQ_STATS.map((stat, i) =>
      scene.add.text(X + PAD, y + PAD + ROW_H * (i + 1), "", style).setDepth(DEPTH + 1).setResolution(2)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => { this.index = i; onClick(stat); }));
    this.closeHint = scene.add.text(X + W - PAD, y + h - PAD + 2, i18n.t("aq.up_close"), { ...style, fontSize: "10px", color: "#9aa4b8" })
      .setOrigin(1, 1).setDepth(DEPTH + 1).setResolution(2);
    this.setVisible(false);
  }

  get isOpen(): boolean {
    return this.openNow;
  }

  get selected(): AqStat {
    return AQ_STATS[this.index];
  }

  toggle(): void {
    this.openNow = !this.openNow;
    this.setVisible(this.openNow);
  }

  close(): void {
    this.openNow = false;
    this.setVisible(false);
  }

  move(step: number): void {
    const n = AQ_STATS.length;
    this.index = (this.index + step + n) % n;
  }

  render(c: AqCreature): void {
    if (!this.openNow) return;
    AQ_STATS.forEach((stat, i) => {
      const kind = AQ_PAID_WITH[stat];
      const cost = upgradeCost(c, stat);
      const name = this.i18n.t(`up.${stat}`);
      const lvl = `${String(c.ups[stat]).padStart(2)}/${maxLevel()}`;
      const price = cost === null ? this.i18n.t("up.max") : this.i18n.t(`up.cost_${kind}`, { n: cost });
      const mark = i === this.index ? ">" : " ";
      this.rows[i].setText(`${mark} ${name.padEnd(9)} ${lvl}  ${price}`)
        .setColor(rowColor(cost, Math.floor(pointsFor(c, stat))))
        .setBackgroundColor(i === this.index ? "#2e4278" : "");
    });
  }

  private setVisible(v: boolean): void {
    this.box.setVisible(v);
    this.title.setVisible(v);
    this.closeHint.setVisible(v);
    this.rows.forEach((r) => r.setVisible(v));
  }
}
