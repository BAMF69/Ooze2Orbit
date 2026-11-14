// Purpose: Shared readable lineage reveal, independent of camera dimensions. Native scrolling preserves causes.
import type * as Phaser from "phaser";
import { temperamentWord, type Reveal } from "./aquatic/reveal";
import { StageUi, action } from "./stageUi";
import { temperamentChart } from "./temperamentChart";
export class LineagePanel {
  private ui: StageUi;
  isOpen = false;
  constructor(scene: Phaser.Scene) { this.ui = new StageUi(scene, false); }
  show(r: Reveal, continueText: string): void {
    this.isOpen = true;
    this.ui.modal.querySelector(".temperament-chart")?.remove(); this.ui.modalText.before(temperamentChart(r));
    this.ui.show(`${r.title}\n\n${r.rows.map(row => `${temperamentWord(row.kind)} ${row.pct}%\n${row.causes.map(c => "• " + c).join("\n")}`).join("\n\n")}\n\n${r.leaning}`, [action("continue", "ui_accept", continueText)]);
  }
  hide(): void { this.isOpen = false; this.ui.hide(); }
}
// ---------------------------------------------------------------------------
