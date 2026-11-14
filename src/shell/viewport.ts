// Purpose: Shared browser viewport/safe-area adapter with per-stage camera framing policies.
// Usage: shell owns one instance; activate before scene load; rotations notify shell without resuming it.
// Authored: Written with Codex (GPT-6).
import type * as Phaser from "phaser";
import { stageViewport, DISPLAY, type Insets, type DisplayStage } from "../core/viewport";
export class DisplayViewport {
  private stage: DisplayStage | null = null;
  private portrait = window.innerHeight > window.innerWidth;
  private pending = 0;
  private readonly probe = document.createElement("div");
  constructor(private game: () => Phaser.Game | null, private rotated: () => void) {
    this.probe.className = "safe-area-probe"; this.probe.setAttribute("aria-hidden", "true"); document.body.append(this.probe);
    const changed = () => { if (!this.pending) this.pending = requestAnimationFrame(() => { this.pending = 0; this.measure(); }); };
    window.addEventListener("resize", changed); window.visualViewport?.addEventListener("resize", changed);
    screen.orientation?.addEventListener("change", changed);
    document.addEventListener("fullscreenchange", changed);
  }
  activate(stage: DisplayStage | boolean | null): void {
    this.stage = stage === true ? "main" : stage === false ? null : stage; this.portrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle("cell-display", this.stage === "main");
    document.body.classList.toggle("display-active", this.stage !== null); this.measure();
  }
  measure(): void {
    const game = this.game(), host = document.getElementById("game"); if (!game || !host) return;
    const style = getComputedStyle(this.probe);
    const safe: Insets = { top: parseFloat(style.paddingTop) || 0, right: parseFloat(style.paddingRight) || 0, bottom: parseFloat(style.paddingBottom) || 0, left: parseFloat(style.paddingLeft) || 0 };
    const width = window.visualViewport?.width ?? window.innerWidth, height = window.visualViewport?.height ?? window.innerHeight;
    const next = stageViewport(this.stage ?? "main", width, height, safe);
    if (this.stage && next.portrait !== this.portrait) this.rotated();
    this.portrait = next.portrait;
    let w: number = DISPLAY.width, h: number = DISPLAY.height;
    if (this.stage) {
      Object.assign(host.style, { position: "fixed", left: next.left + "px", top: next.top + "px", width: next.width + "px", height: next.height + "px" });
      w = next.logicalWidth; h = next.logicalHeight;
    } else host.removeAttribute("style");
    // refresh() uses cached parent dimensions; update them after changing the host rectangle.
    game.scale.getParentBounds();
    if (game.scale.width !== w || game.scale.height !== h) game.scale.setGameSize(w, h);
    game.scale.refresh();
  }
}
// ---------------------------------------------------------------------------
