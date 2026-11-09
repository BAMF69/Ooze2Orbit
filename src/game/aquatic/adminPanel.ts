// ---------------------------------------------------------------------------
// adminPanel.ts (aquatic)
// Purpose : A developer panel for the aquatic stage (BAMF69 2026-11-08: "change temperament to instantly check the
//           changes and jump between the maps"): set the lineage's three temperaments, go to any map or river run,
//           set your form, top up your points, invincible mode (no damage). The world waits while it is open.
// Usage   : const admin = new AdminPanel(scene, actions); admin.toggle(); admin.input(nav); admin.render(state)
//           Opened with the ` key (the key above Tab) in the scene; arrows pick and change, Enter does.
// Notes   : Drawing and row logic only; the scene applies each change through `actions`. A dev tool: strings are
//           English, not i18n. Temperament changes here are not saved to the lineage.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import type { TemperamentKind } from "../../core/lineage";

export const DESTINATIONS = ["pond", "river1", "lake", "river2", "ocean"] as const;
export type Destination = (typeof DESTINATIONS)[number];
const DEST_NAME: Record<Destination, string> = { pond: "Pond", river1: "River 1", lake: "Lake", river2: "River 2", ocean: "Coast" };

export interface AdminState {
  temperament: Record<TemperamentKind, number>; // 0..1
  form: number;
  look: string; // the body look now: its family and step, like aggressive 2
  invincible: boolean;
}

export interface AdminActions {
  setTemperament(kind: TemperamentKind, value: number): void;
  goTo(dest: Destination): void;
  setForm(form: number): void;
  addPoints(): void;
  toggleInvincible(): void;
}

type Row = "cautious" | "aggressive" | "adaptable" | "goto" | "form" | "points" | "invincible";
const ROWS: readonly Row[] = ["cautious", "aggressive", "adaptable", "goto", "form", "points", "invincible"];
const DEPTH = 3200;

const ROW_H = 17;
const X0 = 16;
const Y0 = 64;

export class AdminPanel {
  private readonly box: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly note: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly buttons: Phaser.GameObjects.Text[] = [];
  private index = 0;
  private dest = 0;
  private openNow = false;
  private last: AdminState | null = null;

  constructor(scene: Phaser.Scene, private readonly actions: AdminActions) {
    const h = Y0 - 40 + ROWS.length * ROW_H + 26;
    this.box = scene.add.graphics().setDepth(DEPTH).setVisible(false);
    this.box.fillStyle(0x1a0c20, 0.92).fillRoundedRect(8, 40, 330, h, 6).lineStyle(1, 0xffb0e0, 0.7).strokeRoundedRect(8, 40, 330, h, 6);
    const style = { fontFamily: "monospace", fontSize: "11px", color: "#ffe0f4" };
    this.title = scene.add.text(X0, 46, "ADMIN (` closes)  click, or arrows + Enter", style).setDepth(DEPTH + 1).setResolution(2).setVisible(false);
    this.note = scene.add.text(X0, Y0 + ROWS.length * ROW_H + 2, "", { ...style, fontSize: "10px", color: "#c8a8bc" })
      .setDepth(DEPTH + 1).setResolution(2).setVisible(false);
    const button = (x: number, y: number, label: string, onClick: () => void) => {
      const b = scene.add.text(x, y, label, { ...style, color: "#ffffff", backgroundColor: "#5a2a50", padding: { x: 3, y: 1 } })
        .setDepth(DEPTH + 2).setResolution(2).setVisible(false).setInteractive({ useHandCursor: true });
      b.on("pointerover", () => b.setBackgroundColor("#8a4a7c")).on("pointerout", () => b.setBackgroundColor("#5a2a50")).on("pointerdown", onClick);
      this.buttons.push(b);
      return b;
    };
    ROWS.forEach((row, i) => {
      const y = Y0 + i * ROW_H;
      this.labels.push(scene.add.text(X0, y, "", style).setDepth(DEPTH + 1).setResolution(2).setVisible(false)
        .setInteractive({ useHandCursor: true }).on("pointerdown", () => { this.index = i; }));
      const act = (step: number, accept: boolean) => () => { this.index = i; this.act(row, step, accept); };
      if (row === "goto") { button(230, y, "<", act(-1, false)); button(250, y, ">", act(1, false)); button(272, y, "Go", act(0, true)); }
      else if (row === "points") button(272, y, "Add", act(0, true));
      else if (row === "invincible") button(272, y, "Toggle", act(0, true));
      else { button(272, y, "-", act(-1, false)); button(294, y, "+", act(1, false)); }
    });
  }

  get isOpen(): boolean {
    return this.openNow;
  }

  toggle(): void {
    this.openNow = !this.openNow;
    for (const o of [this.box, this.title, this.note, ...this.labels, ...this.buttons]) o.setVisible(this.openNow);
  }

  /** One keyboard step: up/down pick a row, left/right change it, accept does it. */
  input(nav: { up: boolean; down: boolean; left: boolean; right: boolean; accept: boolean }, s: AdminState): void {
    this.last = s;
    if (nav.up) this.index = (this.index + ROWS.length - 1) % ROWS.length;
    if (nav.down) this.index = (this.index + 1) % ROWS.length;
    const step = (nav.right ? 1 : 0) - (nav.left ? 1 : 0);
    if (step || nav.accept) this.act(ROWS[this.index], step, nav.accept);
  }

  /** What a row does: shared by the keys and the buttons. */
  private act(row: Row, step: number, accept: boolean): void {
    const s = this.last;
    if (!s) return;
    if (row === "cautious" || row === "aggressive" || row === "adaptable") {
      if (step) this.actions.setTemperament(row, Math.max(0, Math.min(1, Math.round((s.temperament[row] + step * 0.1) * 10) / 10)));
    } else if (row === "goto") {
      if (step) this.dest = (this.dest + step + DESTINATIONS.length) % DESTINATIONS.length;
      if (accept) this.actions.goTo(DESTINATIONS[this.dest]);
    } else if (row === "form") {
      if (step) this.actions.setForm(Math.max(1, Math.min(3, s.form + step)));
    } else if (row === "invincible") {
      if (accept || step) this.actions.toggleInvincible();
    } else if (accept) this.actions.addPoints();
  }

  render(s: AdminState): void {
    this.last = s;
    if (!this.openNow) return;
    const pct = (k: TemperamentKind) => `${String(Math.round(s.temperament[k] * 100)).padStart(3)} % ${"#".repeat(Math.round(s.temperament[k] * 10)).padEnd(10, ".")}`;
    const text: Record<Row, string> = {
      cautious: `Cautious   ${pct("cautious")}`,
      aggressive: `Aggressive ${pct("aggressive")}`,
      adaptable: `Adaptable  ${pct("adaptable")}`,
      goto: `Go to      ${DEST_NAME[DESTINATIONS[this.dest]]}`,
      form: `Form       ${s.form}`,
      points: "+50 plant and +50 meat",
      invincible: `Invincible ${s.invincible ? "ON (no damage)" : "off"}`,
    };
    ROWS.forEach((r, i) => this.labels[i].setText(`${i === this.index ? ">" : " "} ${text[r]}`).setColor(i === this.index ? "#ffffff" : "#ffe0f4"));
    this.note.setText(`Body: ${s.look} (the strongest temperament picks it)`);
  }
}
