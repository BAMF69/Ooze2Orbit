// Purpose: Responsive daughter cards keep offers and selection through resizing; previews reuse original atlases.
import type * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import type { Daughter } from "./division";
import { PERK_NAMES, perkLevel, perkDescription } from "./perks";
import { paintEquipment } from "./equipmentArt";
import { cellUi, node, preview } from "./responsiveUi";
import { CELL_ART, dietFrame } from "./illustrated";
export class DivisionPicker {
  private root: HTMLDivElement;
  private buttons: HTMLButtonElement[] = [];
  private cleaners: (() => void)[] = [];
  private index = 0;
  isOpen = false;
  constructor(private scene: Phaser.Scene, private onPick: (index: number) => void, private i18n: I18n) {
    this.root = cellUi(scene, "cell-modal"); this.root.setAttribute("role", "dialog"); this.root.setAttribute("aria-label", i18n.t("cell.ui.daughter_title")); this.root.hidden = true;
  }
  show(offers: readonly Daughter[]): void {
    this.close(); this.isOpen = true; this.root.hidden = false; this.index = 0;
    const panel = node("div", "", "cell-dialog"), cards = node("div", "", "cell-cards");
    panel.append(node("h2", this.i18n.t("cell.ui.daughter_title")), cards, node("p", this.i18n.t("cell.ui.daughter_hint")));
    this.buttons = offers.map((d, i) => {
      const b = node("button", "", `cell-card ${d.creature.diet}`);
      this.cleaners.push(preview(this.scene, b, [{ texture: CELL_ART.texture, first: dietFrame(d.creature.diet) }], ctx => paintEquipment(ctx, d.creature)));
      b.append(node("strong", `${i + 1}. ${d.creature.diet}`), node("span", `${d.stat} +${d.gain} (level ${d.creature.ups[d.stat]})`), node("strong", `${PERK_NAMES[d.perk]} ${perkLevel(d.creature, d.perk)}`), node("span", perkDescription(d.creature, d.perk)), node("span", d.cause));
      b.onclick = () => { if (this.isOpen) this.onPick(i); }; cards.append(b); return b;
    });
    this.root.append(panel); this.highlight();
  }
  move(step: number): void { this.index = (this.index + step + this.buttons.length) % this.buttons.length; this.highlight(); this.buttons[this.index]?.scrollIntoView({ block: "nearest" }); }
  confirm(): number { return this.index; }
  close(): void { this.cleaners.forEach(f => f()); this.cleaners = []; this.buttons = []; this.root.replaceChildren(); this.root.hidden = true; this.isOpen = false; }
  private highlight(): void { this.buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === this.index))); }
}
// ---------------------------------------------------------------------------
