import { UpgradeTray } from '../upgradeTray';
import { TouchMenuPause } from '../touchMenuPause';
import { paintUpgradeCard } from '../upgradeCard';
import { decorateIllustratedUpgrade } from '../illustratedHud';
import { upgradeEffect } from './effectDescriptions';
// Purpose: Responsive cell purchases. Touch pauses the pond; keyboard/controller purchases remain live.
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
  private tray: UpgradeTray;
  private pause: TouchMenuPause;
  get touchPaused(): boolean { return this.isOpen && this.touchMode(); }
  isOpen = false;
  constructor(private scene: Phaser.Scene, private i18n: I18n, onClick: (stat: UpgradeStat) => void, private touchMode: () => boolean = () => false, private onToggle: () => void = () => {}) {
    this.pause = new TouchMenuPause(scene);
    scene.events.once("shutdown", () => this.pause.set(false));
    this.root = cellUi(scene, "cell-upgrades");
    this.tray = new UpgradeTray(scene, this.root, i18n, UPGRADE_STATS.length, () => this.toggle());
    this.rows = UPGRADE_STATS.map((s,i) => { const b=node("button"); b.onclick=()=>{this.index=i;onClick(s);}; this.tray.rail.append(b); return b; });
    this.tray.show(false);
  }
  get selected(): UpgradeStat { return UPGRADE_STATS[this.index]; }
  toggle(): void { this.isOpen = !this.isOpen; this.tray.show(this.isOpen); this.onToggle(); this.pause.set(this.touchPaused); }
  move(step: number): void { this.index = (this.index + step + UPGRADE_STATS.length) % UPGRADE_STATS.length; }
  render(c: Creature): void {
    if (!this.isOpen) return;
    this.pause.set(this.touchPaused);
    this.root.dataset.paused = String(this.touchPaused);
    this.tray.balance.textContent = this.i18n.t("cell.hud_plant", { n: Math.floor(c.points.algae) }) + "\n" + this.i18n.t("cell.hud_meat", { n: Math.floor(c.points.meat) });
    this.root.classList.toggle("touch-upgrades", this.touchPaused);
    this.tray.notice.textContent = this.i18n.t(this.touchPaused ? "up.tray_paused" : "up.tray_live");
    UPGRADE_STATS.forEach((s, i) => {
      const cost = upgradeCost(c, s), pay = UPGRADE_PAID_WITH[s];
      this.rows[i].dataset.upgradeDiet = pay === "algae" ? "herbivore" : pay === "meat" ? "carnivore" : "omnivore";
      paintUpgradeCard(this.rows[i], s, this.i18n.t(`up.${s}`), c.ups[s], maxLevel(),
        cost === null ? this.i18n.t("up.max") : this.i18n.t(`up.cost_${pay}`, { n: cost }), upgradeEffect(c, s, this.i18n), cost !== null && c.points[pay] >= cost, this.i18n.t("effect.bonus", { cap: maxLevel(), bonus: Math.max(0,c.ups[s]-maxLevel()) }));
      this.rows[i].setAttribute("aria-pressed", String(i === this.index));
      decorateIllustratedUpgrade(this.scene,this.rows[i],s);
    });
  }
}
// ---------------------------------------------------------------------------
