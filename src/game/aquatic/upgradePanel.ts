import { UpgradeTray } from '../upgradeTray';
import { TouchMenuPause } from '../touchMenuPause';
import { paintUpgradeCard } from '../upgradeCard';
import { decorateIllustratedUpgrade } from '../illustratedHud';
import { upgradeEffect } from './effectDescriptions';
// Purpose: Responsive aquatic purchases; touch pauses the water; keyboard/controller purchases remain live.
import type * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { cellUi, node } from "../cell/responsiveUi";
import { maxLevel, pointsFor, upgradeCost, type AqCreature } from "./creature";
import { AQ_PAID_WITH, AQ_STATS, type AqStat } from "./tuning";
export class AqUpgradePanel {
  private root: HTMLDivElement;
  private rows: HTMLButtonElement[];
  private index = 0;
  private tray: UpgradeTray;
  private pause: TouchMenuPause;
  get touchPaused(): boolean { return this.isOpen && this.touchMode(); }
  isOpen = false;
  constructor(private scene: Phaser.Scene, private i18n: I18n, onClick: (s: AqStat) => void, private touchMode: () => boolean = () => false, private onToggle: () => void = () => {}) {
    this.pause = new TouchMenuPause(scene);
    scene.events.once("shutdown", () => this.pause.set(false));
    this.root = cellUi(scene, "cell-upgrades");
    this.tray = new UpgradeTray(scene, this.root, i18n, AQ_STATS.length, () => this.close());
    this.rows = AQ_STATS.map((s,n) => { const b=node("button"); b.onclick=()=>{this.index=n;onClick(s);}; this.tray.rail.append(b); return b; });
    this.tray.show(false);
  }
  get selected(): AqStat { return AQ_STATS[this.index]; }
  toggle(): void { this.isOpen = !this.isOpen; this.tray.show(this.isOpen); this.onToggle(); this.pause.set(this.touchPaused); }
  close(): void { if (this.isOpen) this.onToggle(); this.isOpen = false; this.tray.show(false); this.pause.set(false); }
  move(step: number): void { this.index = (this.index + step + AQ_STATS.length) % AQ_STATS.length; }
  render(c: AqCreature): void {
    if (!this.isOpen) return;
    this.pause.set(this.touchPaused);
    this.root.dataset.paused = String(this.touchPaused);
    this.tray.balance.textContent = this.i18n.t("cell.hud_plant", { n: Math.floor(c.points.algae) }) + "\n" + this.i18n.t("cell.hud_meat", { n: Math.floor(c.points.meat) });
    this.root.classList.toggle("touch-upgrades", this.touchPaused);
    this.tray.notice.textContent = this.i18n.t(this.touchPaused ? "up.tray_paused" : "up.tray_live");
    AQ_STATS.forEach((s, n) => {
      const cost = upgradeCost(c, s);
      this.rows[n].dataset.upgradeDiet = AQ_PAID_WITH[s] === "algae" ? "herbivore" : AQ_PAID_WITH[s] === "meat" ? "carnivore" : "omnivore";
      paintUpgradeCard(this.rows[n], s, this.i18n.t(`up.${s}`), c.ups[s], maxLevel(),
        cost === null ? this.i18n.t("up.max") : this.i18n.t(`up.cost_${AQ_PAID_WITH[s]}`, { n: cost }), upgradeEffect(c, s, this.i18n), cost !== null && pointsFor(c, s) >= cost, this.i18n.t("effect.bonus", { cap: maxLevel(), bonus: Math.max(0,c.ups[s]-maxLevel()) }), cost !== null && AQ_PAID_WITH[s] === "either" ? this.i18n.t("up.cost_either_short", { n: cost }) : undefined);
      this.rows[n].setAttribute("aria-pressed", String(n === this.index));
      decorateIllustratedUpgrade(this.scene,this.rows[n],s);
    });
  }
}
// ---------------------------------------------------------------------------
