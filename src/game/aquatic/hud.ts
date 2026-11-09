// ---------------------------------------------------------------------------
// hud.ts (aquatic)
// Purpose : Everything drawn over the lake: the status block (health, food, points, abilities) with your parts as
//           icons and what each does, the stamina gauge (bottom right), toasts, the red
//           behind-you edge cue (pillar 1), the temperament reveal panel (Toy 2) and the lens panel (Toy 3: water
//           temperature, your kin's thickness, the cause log).
// Usage   : const hud = new AquaticHud(scene, i18n); hud.status(...); hud.warn(threat, dt, reduceMotion)
//           hud.showReveal(reveal) / hud.hideReveal(); hud.showLens(...) / hud.hideLens(); hud.toast(text)
// Notes   : Drawing only (Phaser objects in screen space, depth 1000+); the scene owns state and input.
//           Strings come from data/i18n, except the generated cause lines (population.ts, reveal.ts: English for
//           the Toy).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import type { I18n } from "../../core/i18n";
import type { Reveal } from "./reveal";
import { temperamentWord } from "./reveal";
import type { Edge } from "./view";

const DEPTH = 3000;
const FONT = { fontFamily: "monospace", fontSize: "11px", color: "#e8f0e8" };
const SMALL = { ...FONT, fontSize: "10px", color: "#c4d4cc" };
const WARN_RGB = 0xff3a28;
const BAR = { cautious: 0x6aa0d8, aggressive: 0xd85a48, adaptable: 0x8ad06a } as const;
const TOAST_S = 3.5;

export class AquaticHud {
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly partIcons: Phaser.GameObjects.Image[] = [];
  private readonly partTexts: Phaser.GameObjects.Text[] = [];
  private readonly gaugeGfx: Phaser.GameObjects.Graphics;
  private readonly gaugeText: Phaser.GameObjects.Text;
  private readonly noticeText: Phaser.GameObjects.Text;
  private readonly bannerText: Phaser.GameObjects.Text;
  private readonly healthGfx: Phaser.GameObjects.Graphics;
  private readonly blackRect: Phaser.GameObjects.Rectangle;
  private readonly blackText: Phaser.GameObjects.Text;
  private blackLeft = 0; // seconds of full black left
  private fadeLeft = 0; // then seconds of fading in
  private fadeS = 1;
  private noticeLeft = 0;
  private readonly toastText: Phaser.GameObjects.Text;
  private readonly warnGfx: Phaser.GameObjects.Graphics;
  private readonly panelGfx: Phaser.GameObjects.Graphics;
  private panelTexts: Phaser.GameObjects.Text[] = [];
  private toastLeft = 0;
  private pulse = 0;
  private readonly w: number;
  private readonly h: number;

  constructor(private readonly scene: Phaser.Scene, private readonly i18n: I18n) {
    this.w = scene.scale.width;
    this.h = scene.scale.height;
    this.statusText = this.text(this.w - 8, 6, "", { ...FONT, align: "right", lineSpacing: 1 }).setOrigin(1, 0); // top right: the bottom centre is the "behind" cue's
    this.toastText = this.text(this.w / 2, this.h * 0.42, "", // mid-screen: the top right holds the status and parts
      { ...FONT, fontSize: "12px", color: "#fff6c8", align: "center", wordWrap: { width: this.w - 120 } }).setOrigin(0.5, 0);
    this.gaugeGfx = scene.add.graphics().setDepth(DEPTH + 5);
    this.gaugeText = this.text(this.w - 8, this.h - 30, "", SMALL).setOrigin(1, 0);
    this.noticeText = this.text(this.w / 2 - 70, this.h - 36, "", { ...SMALL, color: "#e8f0d0", align: "center", wordWrap: { width: this.w - 300 } })
      .setOrigin(0.5, 1).setVisible(false); // the generation's cause, at the bottom (BAMF69 2026-11-08)
    this.bannerText = this.text(this.w / 2 - 60, 6, "", { ...FONT, color: "#ffe0d8", backgroundColor: "#5a0c0ccc", padding: { x: 6, y: 3 } })
      .setOrigin(0.5, 0).setVisible(false); // a shark hunting you: stays up while it lasts (2026-11-08)
    this.healthGfx = scene.add.graphics().setDepth(DEPTH + 5);
    this.warnGfx = scene.add.graphics().setDepth(DEPTH);
    this.panelGfx = scene.add.graphics().setDepth(DEPTH + 10);
    // a death (2026-11-09): the whole screen black, only the words, then a fade in on the relative
    this.blackRect = scene.add.rectangle(0, 0, this.w, this.h, 0x000000, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 30).setVisible(false);
    this.blackText = scene.add.text(this.w / 2, this.h / 2, "", { ...FONT, fontSize: "14px", color: "#f0e6d8", align: "center", wordWrap: { width: this.w - 160 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 31).setResolution(2).setVisible(false);
  }

  /** True while the screen is black or fading back in: the scene holds the world still. */
  get blackedOut(): boolean {
    return this.blackLeft > 0 || this.fadeLeft > 0;
  }

  /** Black screen with one message for holdS seconds, then a fade back in over fadeS. */
  blackout(s: string, holdS: number, fadeS: number): void {
    this.blackLeft = holdS;
    this.fadeS = this.fadeLeft = Math.max(0.01, fadeS);
    this.blackRect.setVisible(true).setAlpha(1);
    this.blackText.setVisible(true).setAlpha(1).setText(s);
  }

  private tickBlackout(dt: number): void {
    if (this.blackLeft > 0) { this.blackLeft -= dt; return; }
    if (this.fadeLeft <= 0) return;
    this.fadeLeft -= dt;
    const a = Math.max(0, this.fadeLeft / this.fadeS);
    this.blackRect.setAlpha(a);
    this.blackText.setAlpha(a);
    if (this.fadeLeft <= 0) { this.blackRect.setVisible(false); this.blackText.setVisible(false); }
  }

  private text(x: number, y: number, s: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, s, style).setDepth(DEPTH + 11).setResolution(2);
  }

  /** The status block, top right: one string per line (form, health, food, points, parts, abilities). */
  status(lines: readonly string[]): void {
    this.statusText.setVisible(true).setText([...lines]);
  }

  /**
   * Your parts under the status block: one row each, the part's icon (an atlas frame; null = an empty slot) and
   * what it does. Unique (river) parts are tinted gold.
   */
  parts(rows: readonly { atlas: string; frame: number | null; text: string; unique: boolean }[]): void {
    const top = this.statusText.y + this.statusText.height + 4;
    rows.forEach((r, i) => {
      const y = top + i * 17;
      this.partIcons[i] ??= this.scene.add.image(0, 0, r.atlas).setDepth(DEPTH + 11).setScale(0.6);
      this.partTexts[i] ??= this.text(0, 0, "", SMALL).setOrigin(1, 0.5);
      const icon = this.partIcons[i], txt = this.partTexts[i];
      icon.setPosition(this.w - 16, y + 8).setVisible(r.frame !== null);
      if (r.frame !== null) icon.setTexture(r.atlas, r.frame);
      txt.setPosition(this.w - 30, y + 8).setText(r.text).setVisible(true).setColor(r.unique ? "#ffd27f" : r.frame === null ? "#7a8a84" : "#c4d4cc");
    });
    for (let i = rows.length; i < this.partTexts.length; i++) { this.partTexts[i].setVisible(false); this.partIcons[i].setVisible(false); }
  }

  /** The stamina gauge, bottom right: the bar, a mark at the share dash and breach need, and your pace. */
  stamina(cur: number, max: number, paceLabel: string, needShare: number, redBelow: number): void {
    const g = this.gaugeGfx.clear();
    const w = 120, x = this.w - 8 - w, y = this.h - 14;
    const f = Math.max(0, Math.min(1, cur / max));
    const col = cur < redBelow ? 0xff6b6b : 0x7ee07a; // red below the minimum for full speed
    g.fillStyle(0x000000, 0.55).fillRect(x - 2, y - 2, w + 4, 10).fillStyle(col, 1).fillRect(x, y, w * f, 6)
      .fillStyle(0xffffff, 0.8).fillRect(x + w * needShare - 1, y - 2, 2, 10);
    this.gaugeText.setVisible(true).setText(`${paceLabel}   ${Math.round(cur)}/${Math.round(max)}`);
  }

  clearToast(): void {
    this.toastLeft = 0;
    this.toastText.setVisible(false);
  }

  toast(s: string, seconds = TOAST_S): void {
    this.toastText.setText(s).setVisible(true);
    this.toastLeft = seconds;
  }

  /** A message pinned to the top of the screen while it applies (null hides it): red for danger, green for good news. */
  banner(s: string | null, tone: "danger" | "good" = "danger"): void {
    if (s === null) { this.bannerText.setVisible(false); return; }
    const danger = tone === "danger";
    const pulse = danger ? 0.75 + 0.25 * Math.sin(this.scene.time.now / 220) : 1;
    this.bannerText.setVisible(true).setText(s).setAlpha(pulse)
      .setBackgroundColor(danger ? "#5a0c0ccc" : "#0c4a26cc").setColor(danger ? "#ffe0d8" : "#e0ffe8");
  }

  /** The health bar, right under the numbers in the status block (2026-11-08): green, then yellow, then red. */
  health(cur: number, max: number): void {
    const g = this.healthGfx.clear();
    if (!this.statusText.visible) return;
    const w = 150, x = this.w - 8 - w, y = this.statusText.y + 16;
    const f = Math.max(0, Math.min(1, cur / max));
    const col = f > 0.5 ? 0x5ad05a : f > 0.25 ? 0xe0c040 : 0xe04a3a;
    g.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, w + 2, 7).fillStyle(0x3a1414, 1).fillRect(x, y, w, 5).fillStyle(col, 1).fillRect(x, y, w * f, 5);
  }

  /** A longer message at the bottom of the screen (the generation's cause). */
  notice(s: string, seconds: number): void {
    this.noticeText.setText(s).setVisible(true).setAlpha(1);
    this.noticeLeft = seconds;
  }

  tick(dt: number): void {
    this.tickBlackout(dt);
    if (this.noticeLeft > 0) {
      this.noticeLeft -= dt;
      this.noticeText.setAlpha(Math.min(1, this.noticeLeft / 0.6));
      if (this.noticeLeft <= 0) this.noticeText.setVisible(false);
    }
    if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      this.toastText.setAlpha(Math.min(1, this.toastLeft / 0.5));
      if (this.toastLeft <= 0) this.toastText.setVisible(false);
    }
  }

  /** The red cue on the screen edge a hidden predator comes from; stronger as it nears. Steady under reduce motion. */
  warn(threat: { edge: Edge; strength: number } | null, dt: number, reduceMotion: boolean): void {
    const g = this.warnGfx.clear();
    if (!threat) return;
    this.pulse += dt * 5;
    const beat = reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(this.pulse);
    const a = (0.45 + 0.55 * threat.strength) * beat;
    const bands = 8;
    const depth = 60; // px the glow reaches into the screen
    for (let i = 0; i < bands; i++) {
      const alpha = a * (1 - i / bands) * 0.7;
      const t = (depth / bands) * i;
      const step = depth / bands;
      g.fillStyle(WARN_RGB, alpha);
      if (threat.edge === "left") g.fillRect(t, 0, step, this.h);
      else if (threat.edge === "right") g.fillRect(this.w - t - step, 0, step, this.h);
      else if (threat.edge === "above") g.fillRect(0, t, this.w, step);
      else if (threat.edge === "below") g.fillRect(0, this.h - t - step, this.w, step);
      else {
        g.fillRect(0, this.h - t - step, this.w, step); // behind: the bottom edge, and up both sides a little
        g.fillRect(t, this.h * 0.45, step, this.h * 0.55);
        g.fillRect(this.w - t - step, this.h * 0.45, step, this.h * 0.55);
      }
    }
    // a chevron pointing at the edge the threat comes from: readable even for players who cannot tell red apart
    const s = 9 + 5 * threat.strength;
    g.fillStyle(WARN_RGB, Math.min(1, a + 0.2)).lineStyle(2, 0x1a0806, 0.9);
    const tri = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => g.fillTriangle(x1, y1, x2, y2, x3, y3).strokeTriangle(x1, y1, x2, y2, x3, y3);
    const my = this.h * 0.55, mx = this.w / 2;
    if (threat.edge === "left") tri(8, my, 8 + s * 1.4, my - s, 8 + s * 1.4, my + s);
    else if (threat.edge === "right") tri(this.w - 8, my, this.w - 8 - s * 1.4, my - s, this.w - 8 - s * 1.4, my + s);
    else if (threat.edge === "above") tri(mx, 8, mx - s, 8 + s * 1.4, mx + s, 8 + s * 1.4);
    else tri(mx, this.h - 26, mx - s, this.h - 26 - s * 1.4, mx + s, this.h - 26 - s * 1.4); // behind and below: point down
  }

  private clearPanel(): void {
    this.panelGfx.clear();
    for (const t of this.panelTexts) t.destroy();
    this.panelTexts = [];
  }

  private box(x: number, y: number, w: number, h: number): void {
    this.panelGfx.fillStyle(0x061418, 0.88).fillRoundedRect(x, y, w, h, 6)
      .lineStyle(1, 0xc8e0d8, 0.5).strokeRoundedRect(x, y, w, h, 6);
  }

  private line(x: number, y: number, s: string, style: Phaser.Types.GameObjects.Text.TextStyle = FONT, wrap = 0): Phaser.GameObjects.Text {
    const t = this.text(x, y, s, wrap ? { ...style, wordWrap: { width: wrap } } : style);
    this.panelTexts.push(t);
    return t;
  }

  /** Toy 2: the first time the player sees their lineage's temperament, with the causes behind it. */
  showReveal(r: Reveal): void {
    this.clearPanel();
    const x = 70, y = 34, w = this.w - 140, h = this.h - 68;
    this.box(x, y, w, h);
    this.line(x + 12, y + 10, r.title, { ...FONT, fontSize: "13px", color: "#fff6c8" });
    let ry = y + 34;
    for (const row of r.rows) {
      this.line(x + 12, ry, `${temperamentWord(row.kind).padEnd(11)}${String(row.pct).padStart(3)} %`);
      const bx = x + 130, bw = 140;
      this.panelGfx.fillStyle(0x203038, 1).fillRect(bx, ry + 3, bw, 7);
      this.panelGfx.fillStyle(BAR[row.kind], 1).fillRect(bx, ry + 3, (bw * row.pct) / 100, 7);
      ry += 15;
      const causes = row.causes.length ? row.causes.map((c) => `- ${c}`).join("\n") : "- (nothing yet)";
      const t = this.line(x + 22, ry, causes, SMALL, w - 40);
      ry += t.height + 6;
    }
    this.line(x + 12, ry + 2, r.leaning, { ...FONT, color: "#fff6c8" }, w - 24);
    this.line(x + w - 12, y + h - 18, this.i18n.t("aq.reveal_continue"), SMALL).setOrigin(1, 0);
  }

  /** Toy 3: the lens. Water temperature, your kin's thickness (one bar each, sorted), the latest causes. */
  showLens(tempC: number, tMin: number, tMax: number, kin: readonly number[], causes: readonly string[], generation: number, effects: readonly string[] = []): void {
    this.clearPanel();
    const w = 250, x = this.w - w - 8, y = 8, h = this.h - 16;
    this.box(x, y, w, h);
    this.line(x + 10, y + 8, this.i18n.t("aq.lens_title"), { ...FONT, color: "#fff6c8" });
    this.line(x + 10, y + 26, `${this.i18n.t("aq.water", { t: Math.round(tempC) })}   ${this.i18n.t("aq.generation", { n: generation })}`);
    const bx = x + 10, bw = w - 20, by = y + 42;
    const f = (tempC - tMin) / (tMax - tMin);
    for (let i = 0; i < 24; i++) { // cold blue to warm amber
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x3a70c8), Phaser.Display.Color.ValueToColor(0xd88a3a), 23, i);
      this.panelGfx.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1).fillRect(bx + (bw / 24) * i, by, bw / 24 + 1, 6);
    }
    this.panelGfx.fillStyle(0xffffff, 1).fillRect(bx + bw * f - 1, by - 3, 3, 12);
    this.line(x + 10, by + 14, this.i18n.t("aq.lens_kin"), SMALL);
    const sorted = [...kin].sort((a, b) => a - b);
    const hy = by + 28, hh = 50, cw = bw / Math.max(1, sorted.length);
    sorted.forEach((th, i) => {
      const bh = 4 + th * (hh - 4);
      this.panelGfx.fillStyle(0xd0a060, 1).fillRect(bx + i * cw + 1, hy + hh - bh, cw - 2, bh);
    });
    let cy = hy + hh + 8;
    for (const e of effects) { // what the water does now and what your body does (2026-11-09)
      const t = this.line(x + 10, cy, e, { ...SMALL, color: "#fff0b8" }, w - 20);
      cy += t.height + 4;
    }
    cy += 4;
    for (const c of causes.slice(-3).reverse()) {
      const t = this.line(x + 10, cy, c, SMALL, w - 20);
      cy += t.height + 4;
    }
    this.line(x + 10, y + h - 10, this.i18n.t("aq.lens_controls"), SMALL, w - 20).setOrigin(0, 1);
  }

  hidePanel(): void {
    this.clearPanel();
  }

  /** The lens panel shows the same numbers, so the status line steps aside. */
  hideStatus(): void {
    this.statusText.setVisible(false);
    this.healthGfx.clear();
    this.partIcons.forEach((i) => i.setVisible(false));
    this.partTexts.forEach((t) => t.setVisible(false));
    this.gaugeGfx.clear();
    this.gaugeText.setVisible(false);
  }
}
