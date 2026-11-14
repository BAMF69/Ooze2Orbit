// Scene-clock cinematics: pause, rotation, game speed and shutdown retain their normal ownership.
// Authored: Written with Codex for Ooze2Orbit. Reuses game art; no CSS animation clocks.
import type * as Phaser from "phaser";
export type LifeMoment = "birth" | "descent" | "arrival";
export const LIFE_TIMING = { birth: 2.6, descent: 2.8, arrival: 2.2, reduced: .25 };
interface SequenceArt { texture: string; frame?: string | number; tile?: number; tiles?: number }
export class LifeSequence {
  readonly root = document.createElement("div");
  private canvas = document.createElement("canvas");
  private caption = document.createElement("div");
  private elapsed = 0;
  private duration = 1;
  private moment: LifeMoment = "birth";
  private art: SequenceArt = { texture: "__WHITE" };
  private reduced = false;
  isPlaying = false;
  constructor(private scene: Phaser.Scene) {
    this.root.className = "life-sequence"; this.root.hidden = true;
    this.root.setAttribute("role", "status"); this.root.setAttribute("aria-live", "polite");
    this.canvas.width = this.canvas.height = 640; this.canvas.setAttribute("aria-hidden", "true");
    this.caption.className = "life-caption"; this.root.append(this.canvas, this.caption); document.body.append(this.root);
    scene.events.once("shutdown", () => { this.close(); this.root.remove(); });
  }
  play(moment: LifeMoment, art: SequenceArt, caption: string, reduced: boolean): void {
    this.moment = moment; this.art = art; this.reduced = reduced; this.elapsed = 0;
    this.duration = reduced ? LIFE_TIMING.reduced : LIFE_TIMING[moment];
    this.caption.textContent = caption; this.root.dataset.moment = moment;
    this.root.hidden = false; this.isPlaying = true; document.body.classList.add("life-sequence-active"); this.draw();
  }
  update(dt: number): boolean {
    if (!this.isPlaying) return false;
    this.elapsed = Math.min(this.duration, this.elapsed + Math.max(0, dt)); this.draw();
    if (this.elapsed < this.duration) return false;
    this.close(); return true;
  }
  close(): void { this.isPlaying = false; this.root.hidden = true; document.body.classList.remove("life-sequence-active"); }
  private draw(): void {
    const ctx = this.canvas.getContext("2d"); if (!ctx) return;
    const p = this.elapsed / this.duration, ease = 1 - (1 - p) ** 3;
    this.root.style.setProperty("--sequence-progress", String(p));
    this.root.style.opacity = String(this.reduced ? 1 : this.moment === "arrival" ? Math.min(1, (1 - p) * 4) : 1);
    ctx.clearRect(0, 0, 640, 640); ctx.save(); ctx.translate(320, 320);
    const pulse = this.reduced ? 0 : Math.sin(p * Math.PI * 5) * (1 - p);
    const radius = this.reduced ? 185 : this.moment === "birth" ? 100 + ease * 92 : 185 + pulse * 12;
    const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 260); glow.addColorStop(0, "#b0ecc855"); glow.addColorStop(1, "#b0ecc800");
    ctx.fillStyle = glow; ctx.fillRect(-320, -320, 640, 640);
    ctx.strokeStyle = "#9ae7cf"; ctx.lineWidth = 4; ctx.globalAlpha = .4 * (1 - p);
    ctx.beginPath(); ctx.ellipse(0, 0, radius + pulse * 12, radius - pulse * 8, -.3, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    if (!this.reduced) for (let i = 0; i < 18; i++) {
      const angle = i * 2.399 + p * .7, r = 110 + (i % 5) * 29 + p * 60;
      ctx.fillStyle = i % 3 ? "#97d8c766" : "#f4d79099"; ctx.beginPath();
      ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r - p * 30, 3 + (i % 4) * 2, 0, Math.PI * 2); ctx.fill();
    }
    const f = this.scene.textures.getFrame(this.art.texture, this.art.frame ?? "__BASE");
    if (f) {
      const tiles = this.art.tiles ?? 1, sw = f.cutWidth / tiles;
      const scale = this.reduced ? 1 : this.moment === "birth" ? .15 + ease * .85 + pulse * .05 : this.moment === "descent" ? 1 - p * .45 : .35 + Math.sin(p * Math.PI) * .7;
      const size = 310 * scale, y = this.reduced ? 0 : this.moment === "descent" ? ease * 110 - 40 : this.moment === "arrival" ? -ease * 110 + 60 : 0;
      ctx.save(); ctx.translate(0, y); ctx.rotate(this.reduced ? 0 : Math.sin(p * Math.PI * 2) * .08);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(f.source.image as CanvasImageSource, f.cutX + (this.art.tile ?? 0) * sw, f.cutY, sw, f.cutHeight, -size / 2, -size / 2, size, size); ctx.restore();
    }
    if (!this.reduced && this.moment === "birth" && p < .55) {
      ctx.strokeStyle = "#f5e4a1"; ctx.globalAlpha = 1 - p / .55; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 55 + p * 180 + i * 15, i, i + 4.4); ctx.stroke(); }
    }
    ctx.restore();
  }
}
