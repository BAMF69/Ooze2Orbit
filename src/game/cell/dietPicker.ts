// Purpose: Responsive diet cards; the existing scene retains choice rules and its paused world.
import type * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import { DIETS, type Diet } from "./tuning";
import { cellUi, node } from "./responsiveUi";
import { CELL_ART, dietFrame } from "./illustrated";
import { preview } from "./responsiveUi";
export class DietPicker {
  private root: HTMLDivElement;
  private title = node("h2");
  private buttons: HTMLButtonElement[];
  private index = 0;
  isOpen = false;
  constructor(scene: Phaser.Scene, private i18n: I18n, onPick: (d: Diet) => void) {
    this.root = cellUi(scene, "cell-modal"); this.root.setAttribute("role", "dialog"); this.root.setAttribute("aria-label", i18n.t("diet.title_start"));
    const panel = node("div", "", "cell-dialog"), cards = node("div", "", "cell-cards");
    this.buttons = DIETS.map((d, i) => {
      const b = node("button", "", `cell-card ${d}`); b.append(node("strong", i18n.t(`diet.${d}`)), node("span", i18n.t(`diet.${d}_desc`)));
      const cleanup = preview(scene, b, [{ texture: CELL_ART.texture, first: dietFrame(d) }]); scene.events.once("shutdown", cleanup);
      b.onclick = () => { if (this.isOpen) { this.index = i; onPick(this.confirm()); } }; cards.append(b); return b;
    });
    panel.append(this.title, cards, node("p", i18n.t("cell.ui.choose_hint"))); this.root.append(panel); this.root.hidden = true;
  }
  show(current: Diet, title: string, args: Record<string, string | number> = {}): void {
    this.index = DIETS.indexOf(current); this.title.textContent = this.i18n.t(title, args); this.isOpen = true; this.root.hidden = false; this.highlight();
  }
  move(step: number): void { this.index = (this.index + step + 3) % 3; this.highlight(); }
  confirm(): Diet { this.isOpen = false; this.root.hidden = true; return DIETS[this.index]; }
  private highlight(): void { this.buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === this.index))); }
}
// ---------------------------------------------------------------------------
