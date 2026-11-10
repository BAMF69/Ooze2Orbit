// ---------------------------------------------------------------------------
// lineagePanel.ts
// Purpose : The opening screen every stage after the cell stage shows (BAMF69 2026-11-09: "the opening screen from
//           the aquatic stage to both the creature and civilization screen"): your lineage's temperament, a bar for
//           each, the decisions that shaped it, and what it leans toward. Same look as the aquatic reveal.
// Usage   : const p = new LineagePanel(scene); p.show(revealFrom(saved, 3, "creature"), "Enter: come ashore");
//           p.isOpen; p.hide()
// Notes   : Drawing only (screen space, above everything). The data is pure and tested: aquatic/reveal.ts. The
//           aquatic stage draws the same panel in its own HUD (aquatic/hud.ts showReveal).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { temperamentWord, type Reveal } from "./aquatic/reveal";

const DEPTH = 5000;
const FONT = { fontFamily: "monospace", fontSize: "11px", color: "#e8f0e8" };
const SMALL = { ...FONT, fontSize: "10px", color: "#c4d4cc" };
const BAR = { cautious: 0x6aa0d8, aggressive: 0xd85a48, adaptable: 0x8ad06a } as const;

export class LineagePanel {
  private readonly g: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  isOpen = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
  }

  private line(x: number, y: number, s: string, style: Phaser.Types.GameObjects.Text.TextStyle = FONT, wrap = 0): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, s, wrap ? { ...style, wordWrap: { width: wrap } } : style).setScrollFactor(0).setDepth(DEPTH + 1).setResolution(2);
    this.texts.push(t);
    return t;
  }

  show(r: Reveal, continueText: string): void {
    this.hide();
    this.isOpen = true;
    const w0 = this.scene.scale.width, h0 = this.scene.scale.height;
    const x = 70, y = 34, w = w0 - 140, h = h0 - 68;
    this.g.fillStyle(0x000000, 0.6).fillRect(0, 0, w0, h0);
    this.g.fillStyle(0x061418, 1).fillRoundedRect(x, y, w, h, 6).lineStyle(1, 0xc8e0d8, 0.5).strokeRoundedRect(x, y, w, h, 6);
    this.line(x + 12, y + 10, r.title, { ...FONT, fontSize: "13px", color: "#fff6c8" });
    let ry = y + 34;
    for (const row of r.rows) {
      this.line(x + 12, ry, `${temperamentWord(row.kind).padEnd(11)}${String(row.pct).padStart(3)} %`);
      const bx = x + 130, bw = 140;
      this.g.fillStyle(0x203038, 1).fillRect(bx, ry + 3, bw, 7).fillStyle(BAR[row.kind], 1).fillRect(bx, ry + 3, (bw * row.pct) / 100, 7);
      ry += 15;
      const causes = row.causes.length ? row.causes.map((c) => `- ${c}`).join("\n") : "- (nothing yet)";
      ry += this.line(x + 22, ry, causes, SMALL, w - 40).height + 6;
    }
    this.line(x + 12, ry + 2, r.leaning, { ...FONT, color: "#fff6c8" }, w - 24);
    this.line(x + w - 12, y + h - 18, continueText, SMALL).setOrigin(1, 0);
  }

  hide(): void {
    this.isOpen = false;
    this.g.clear();
    for (const t of this.texts) t.destroy();
    this.texts = [];
  }
}
