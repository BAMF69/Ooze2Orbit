// Purpose: Responsive cell purchases. The pond still runs while this panel is open, as approved in the cell toy.
import type * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { maxLevel, upgradeCost, type Creature } from "./rules";
import { UPGRADE_PAID_WITH, UPGRADE_STATS, type UpgradeStat } from "./tuning";
import { cellUi, node } from "./responsiveUi";
export const POINT_COLOR = { algae: "#8be070", meat: "#ff8a7a" } as const;
export const ROW_COLOR = { afford: "#7ee07a", short: "#ff6b6b", maxed: "#7a8294" } as const;
export function rowColor(cost: number | null, points: number): string { return cost === null ? ROW_COLOR.maxed : points >= cost ? ROW_COLOR.afford : ROW_COLOR.short; }
export class UpgradePanel {
  private root: HTMLDivElement;
  private rows: HTMLButtonElement[];
  private index = 0;
  isOpen = false;
  constructor(scene: Phaser.Scene, private i18n: I18n, onClick: (stat: UpgradeStat) => void) {
    this.root = cellUi(scene, "cell-upgrades"); const panel = node("section", "", "cell-dialog");
    const close = node("button", i18n.t("cell.ui.up_close")); close.onclick = () => this.toggle();
    panel.append(node("h2", i18n.t("up.title")), node("p", i18n.t("cell.ui.up_live")));
    this.rows = UPGRADE_STATS.map((s, i) => { const b = node("button"); b.onclick = () => { this.index = i; onClick(s); }; panel.append(b); return b; });
    panel.append(close); this.root.append(panel); this.root.hidden = true;
  }
  get selected(): UpgradeStat { return UPGRADE_STATS[this.index]; }
  toggle(): void { this.isOpen = !this.isOpen; this.root.hidden = !this.isOpen; }
  move(step: number): void { this.index = (this.index + step + UPGRADE_STATS.length) % UPGRADE_STATS.length; }
  render(c: Creature): void {
    if (!this.isOpen) return;
    UPGRADE_STATS.forEach((s, i) => {
      const cost = upgradeCost(c, s), pay = UPGRADE_PAID_WITH[s], extra = Math.max(0, c.ups[s] - maxLevel());
      this.rows[i].textContent = `${this.i18n.t(`up.${s}`)} ${extra ? `${maxLevel()}+${extra}` : `${c.ups[s]}/${maxLevel()}`} · ${cost === null ? this.i18n.t("up.max") : this.i18n.t(`up.cost_${pay}`, { n: cost })}`;
      this.rows[i].style.color = rowColor(cost, c.points[pay]); this.rows[i].setAttribute("aria-pressed", String(i === this.index));
    });
  }
}
// ---------------------------------------------------------------------------
