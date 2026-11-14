// Purpose: Cell's first touch adapter. Pointer capture supports independent movement and action fingers.
// Lifecycle: caller updates visibility each frame and suspends on pause/shutdown; no synthetic key bindings.
// Authored: Written with Codex for Ooze2Orbit.
import { CONTROL, stickDirections } from "../core/controlScheme";
import type { ShellInput } from "./input";
export interface TouchAction { label: string; action?: string; run?: () => void }
export class TouchControls {
  readonly root = document.createElement("div");
  private stick = document.createElement("div");
  private knob = document.createElement("span");
  private pointer: number | null = null;
  private active = false;
  private sources = new Set<string>();
  constructor(private input: ShellInput, actions: TouchAction[]) {
    this.root.className = "touch-controls"; this.root.hidden = true;
    this.stick.className = "touch-stick"; this.stick.setAttribute("aria-label", "Movement stick");
    this.knob.className = "touch-knob"; this.stick.append(this.knob);
    const buttons = document.createElement("div"); buttons.className = "touch-actions";
    for (const [i, a] of actions.entries()) {
      const b = document.createElement("button"); b.textContent = a.label; b.dataset.touchAction = a.action ?? "menu";
      const source = `touch:button${i}`; this.sources.add(source);
      b.onpointerdown = e => {
        if (!this.active) return; e.preventDefault(); this.input.use("touch"); b.setPointerCapture(e.pointerId);
        if (a.action) this.input.hold(source, [a.action]);
      };
      b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => this.input.releaseVirtual(source);
      // Keyboard/screen-reader activation remains available without duplicating a pointer press.
      b.onclick = e => {
        if (!this.active) return;
        if (!a.action) a.run?.();
        else if (e.detail === 0 && !(e instanceof PointerEvent && e.pointerType)) { this.input.hold(source, [a.action]); this.input.releaseVirtual(source); }
      };
      buttons.append(b);
    }
    this.stick.onpointerdown = e => {
      if (!this.active || this.pointer !== null) return;
      e.preventDefault(); this.input.use("touch"); this.pointer = e.pointerId; this.stick.setPointerCapture(e.pointerId); this.move(e);
    };
    this.stick.onpointermove = e => { if (e.pointerId === this.pointer) this.move(e); };
    this.stick.onpointerup = this.stick.onpointercancel = this.stick.onlostpointercapture = e => {
      if (e.pointerId === this.pointer) this.releaseStick();
    };
    this.root.append(this.stick, buttons); document.body.append(this.root);
  }
  private move(e: PointerEvent): void {
    const r = this.stick.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    const length = Math.hypot(dx, dy), scale = Math.min(1, CONTROL.stickRadius / (length || 1));
    const x = dx * scale, y = dy * scale;
    this.knob.style.transform = `translate(${x}px, ${y}px)`;
    this.input.hold("touch:stick", stickDirections(x / CONTROL.stickRadius, y / CONTROL.stickRadius));
  }
  private releaseStick(): void { this.pointer = null; this.input.releaseVirtual("touch:stick"); this.knob.style.transform = ""; }
  update(enabled: boolean): void {
    const active = enabled && this.input.scheme === "touch";
    if (!active) this.suspend(); else { this.active = true; this.root.hidden = false; }
  }
  suspend(): void { this.active = false; this.root.hidden = true; this.releaseStick(); for (const s of this.sources) this.input.releaseVirtual(s); }
  setAvailable(action: string, available: boolean): void { const b = this.root.querySelector<HTMLButtonElement>(`[data-touch-action="${action}"]`); if (b) b.hidden = !available; }
  destroy(): void { this.suspend(); this.root.remove(); }
}
