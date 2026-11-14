// Purpose: Responsive aquatic purchases; the water retains its established live-upgrade behavior.
import type * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { rowColor } from "../cell/upgradePanel";
import { cellUi, node } from "../cell/responsiveUi";
import { maxLevel, pointsFor, upgradeCost, type AqCreature } from "./creature";
import { AQ_PAID_WITH, AQ_STATS, type AqStat } from "./tuning";
export class AqUpgradePanel {
  private root: HTMLDivElement;
  private rows: HTMLButtonElement[];
  private index = 0;
  isOpen = false;
  constructor(scene: Phaser.Scene, private i18n: I18n, onClick: (s: AqStat) => void) {
    this.root = cellUi(scene, "cell-upgrades"); const panel = node("section", "", "cell-dialog");
    panel.append(node("h2", i18n.t("up.title")), node("p", i18n.t("aq.up_live")));
    this.rows = AQ_STATS.map((s, n) => { const b = node("button"); b.onclick = () => { this.index = n; onClick(s); }; panel.append(b); return b; });
    const close = node("button", i18n.t("cell.ui.up_close")); close.onclick = () => this.close(); panel.append(close); this.root.append(panel); this.root.hidden = true;
  }
  get selected(): AqStat { return AQ_STATS[this.index]; }
  toggle(): void { this.isOpen = !this.isOpen; this.root.hidden = !this.isOpen; }
  close(): void { this.isOpen = false; this.root.hidden = true; }
  move(step: number): void { this.index = (this.index + step + AQ_STATS.length) % AQ_STATS.length; }
  render(c: AqCreature): void {
    if (!this.isOpen) return;
    AQ_STATS.forEach((s, n) => {
      const cost = upgradeCost(c, s), bonus = Math.max(0, c.ups[s] - maxLevel());
      this.rows[n].textContent = `${this.i18n.t(`up.${s}`)} ${bonus ? `${maxLevel()}+${bonus}` : `${c.ups[s]}/${maxLevel()}`} · ${cost === null ? this.i18n.t("up.max") : this.i18n.t(`up.cost_${AQ_PAID_WITH[s]}`, { n: cost })}`;
      this.rows[n].style.color = rowColor(cost, Math.floor(pointsFor(c, s))); this.rows[n].setAttribute("aria-pressed", String(n === this.index));
    });
  }
}
// ---------------------------------------------------------------------------
