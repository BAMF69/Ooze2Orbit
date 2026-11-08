// ---------------------------------------------------------------------------
// upgradePanel.ts
// Purpose : The upgrade panel: four rows (attack, speed, defense, mobility) with level, cost and which points pay
//           for it. The pond keeps moving while it is open (BAMF69's pick: spending is a risk too).
// Usage   : const panel = new UpgradePanel(scene, i18n, (stat) => tryBuy(stat))
//           panel.toggle(); panel.move(+1); panel.render(creature); panel.selected  // the highlighted stat
// Notes   : Drawing only. The scene owns input (E toggles, arrows pick, Enter buys) and asks rules.buyUpgrade();
//           rows are clickable too. Fixed to the camera, bottom-left, above the pond. Rows: green = affordable,
//           red = short of points, gray = maxed; "E closes" sits bottom right.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { maxLevel, upgradeCost, type Creature } from "./rules";
import { UPGRADE_PAID_WITH, UPGRADE_STATS, type UpgradeStat } from "./tuning";

const X = 8;
const W = 260;
const ROW_H = 18;
const PAD = 6;
const FOOT_H = 12; // the "E closes" strip under the rows
const DEPTH = 1100;
export const POINT_COLOR = { algae: "#8be070", meat: "#ff8a7a" } as const;
/** Row colours (BAMF69 2026-11-08): green = you can buy it now, red = not enough points, gray = maxed. */
export const ROW_COLOR = { afford: "#7ee07a", short: "#ff6b6b", maxed: "#7a8294" } as const;

/** Which colour a row gets: cost null = maxed. Pure, tested in tests/cellRules.test.ts. */
export function rowColor(cost: number | null, points: number): string {
  if (cost === null) return ROW_COLOR.maxed;
  return points >= cost ? ROW_COLOR.afford : ROW_COLOR.short;
}

export class UpgradePanel {
  private readonly box: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly rows: Phaser.GameObjects.Text[];
  private readonly closeHint: Phaser.GameObjects.Text;
  private index = 0;
  private openNow = false;

  constructor(scene: Phaser.Scene, private readonly i18n: I18n, onClick: (stat: UpgradeStat) => void) {
    const h = PAD * 2 + ROW_H * (UPGRADE_STATS.length + 1) + FOOT_H;
    const y = scene.scale.height - h - 8;
    this.box = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.box.fillStyle(0x000000, 0.6).fillRoundedRect(X, y, W, h, 6).lineStyle(1, 0xffffff, 0.5).strokeRoundedRect(X, y, W, h, 6);
    const style = { fontFamily: "monospace", fontSize: "11px", color: "#ffffff" };
    this.title = scene.add.text(X + PAD, y + PAD, i18n.t("up.title"), { ...style, color: "#fff6c8" })
      .setScrollFactor(0).setDepth(DEPTH + 1).setResolution(2);
    this.rows = UPGRADE_STATS.map((stat, i) =>
      scene.add.text(X + PAD, y + PAD + ROW_H * (i + 1), "", style)
        .setScrollFactor(0).setDepth(DEPTH + 1).setResolution(2)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => { this.index = i; onClick(stat); }));
    this.closeHint = scene.add.text(X + W - PAD, y + h - PAD + 2, i18n.t("up.close"), { ...style, fontSize: "10px", color: "#9aa4b8" })
      .setOrigin(1, 1).setScrollFactor(0).setDepth(DEPTH + 1).setResolution(2);
    this.setVisible(false);
  }

  get isOpen(): boolean {
    return this.openNow;
  }

  get selected(): UpgradeStat {
    return UPGRADE_STATS[this.index];
  }

  toggle(): void {
    this.openNow = !this.openNow;
    this.setVisible(this.openNow);
  }

  move(step: number): void {
    const n = UPGRADE_STATS.length;
    this.index = (this.index + step + n) % n;
  }

  /** Redraw the rows for the creature's current levels and points (cheap; called every frame while open). */
  render(c: Creature): void {
    if (!this.openNow) return;
    UPGRADE_STATS.forEach((stat, i) => {
      const kind = UPGRADE_PAID_WITH[stat];
      const cost = upgradeCost(c, stat);
      const name = this.i18n.t(`up.${stat}`);
      const lvl = `${c.ups[stat]}/${maxLevel()}`;
      const price = cost === null ? this.i18n.t("up.max") : this.i18n.t(`up.cost_${kind}`, { n: cost });
      const mark = i === this.index ? ">" : " ";
      this.rows[i].setText(`${mark} ${name.padEnd(9)} ${lvl}  ${price}`)
        .setColor(rowColor(cost, c.points[kind]))
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
