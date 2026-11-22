// Purpose: Touch adapter shared by cell and aquatic. Pointer capture supports independent movement and action fingers.
// Layout : a movement stick (left) and an action group (right). Actions with a `slot` form a d-pad (aquatic:
//          up/down = depth, left = dash, right = sprint toggle, centre = shock when owned). The player's touch
//          layout (core/touchLayout.ts) scales and shifts both groups from the stage CSS default and sets the stick
//          dead zone. Settings -> Controls -> Touch layout edits it live through edit mode below.
// Lifecycle: caller updates visibility each frame and suspends on pause/shutdown; no synthetic key bindings.
// Debug  : TouchControls.live is the instance on screen (null when none); window.__touchLayout() in the console.
// Authored: Written with Codex for Ooze2Orbit; d-pad, layout and edit mode with Claude (Opus 5.5) 2026-11-21.
import "./touchControls.css";
import { CONTROL, stickDirections } from "../core/controlScheme";
import { clampOffset, defaultTouchLayout, parseTouchLayout, type TouchGroupName, type TouchLayout } from "../core/touchLayout";
import type { ShellInput } from "./input";
export type DpadSlot = "up" | "down" | "left" | "right" | "center";
export interface TouchAction {
  label: string; description?: string;
  action?: string; // the action held while pressed (also the button's data-touch-action, used for icons and CSS)
  also?: string[]; // extra actions held with it (d-pad up also holds "surface" so the scene can breach)
  run?: () => void; group?: "depth"; slot?: DpadSlot;
}

// ---- The player's layout, shared by every instance ---------------------------------------------------------
let layout: TouchLayout = defaultTouchLayout();
export function touchLayout(): TouchLayout { return layout; }
/** Loads (shell boot) or changes (editor) the layout and re-applies it to the controls on screen. */
export function setTouchLayout(next: TouchLayout | string | null): void {
  layout = typeof next === "object" && next !== null ? parseTouchLayout(JSON.stringify(next)) : parseTouchLayout(next);
  TouchControls.live?.applyLayout();
}
(globalThis as { __touchLayout?: () => TouchLayout }).__touchLayout = () => layout;

export class TouchControls {
  /** The instance currently mounted (the editor drives it); null when no stage has touch controls. */
  static live: TouchControls | null = null;
  readonly root = document.createElement("div");
  private stick = document.createElement("div");
  private knob = document.createElement("span");
  private buttons = document.createElement("div");
  private depth = document.createElement("div");
  private dpad: HTMLDivElement | null = null;
  private pointer: number | null = null;
  private active = false;
  private editing: ((l: TouchLayout) => void) | null = null;
  private sources = new Set<string>();
  private onResize = () => this.applyLayout();
  constructor(private input: ShellInput, actions: TouchAction[]) {
    this.root.className = "touch-controls"; this.root.hidden = true;
    this.stick.className = "touch-stick"; this.stick.setAttribute("aria-label", "Movement stick");
    this.knob.className = "touch-knob"; this.stick.append(this.knob);
    this.buttons.className = "touch-actions"; this.depth.className = "touch-depth";
    if (actions.some(a => a.slot)) { this.dpad = document.createElement("div"); this.dpad.className = "touch-dpad"; this.dpad.setAttribute("role", "group"); }
    for (const [i, a] of actions.entries()) {
      const b = document.createElement("button"); b.textContent = a.label; b.dataset.touchAction = a.action ?? "menu";
      b.title = a.description ?? a.label; b.setAttribute("aria-label", b.title);
      if (a.slot) b.dataset.slot = a.slot;
      const held = a.action ? [a.action, ...(a.also ?? [])] : [];
      const source = `touch:button${i}`; this.sources.add(source);
      b.onpointerdown = e => {
        if (!this.active || this.editing) return; e.preventDefault(); this.input.use("touch"); b.setPointerCapture(e.pointerId);
        if (held.length) this.input.hold(source, held);
        b.classList.add("touch-down");
      };
      b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => { this.input.releaseVirtual(source); b.classList.remove("touch-down"); };
      // Keyboard/screen-reader activation remains available without duplicating a pointer press.
      b.onclick = e => {
        if (!this.active || this.editing) return;
        if (!a.action) a.run?.();
        else if (e.detail === 0 && !(e instanceof PointerEvent && e.pointerType)) { this.input.hold(source, held); this.input.releaseVirtual(source); }
      };
      (a.slot && this.dpad ? this.dpad : a.group === "depth" ? this.depth : this.buttons).append(b);
    }
    if (this.dpad) this.buttons.append(this.dpad);
    this.stick.onpointerdown = e => {
      if (this.editing || !this.active || this.pointer !== null) return;
      e.preventDefault(); this.input.use("touch"); this.pointer = e.pointerId; this.stick.setPointerCapture(e.pointerId); this.move(e);
    };
    this.stick.onpointermove = e => { if (e.pointerId === this.pointer) this.move(e); };
    this.stick.onpointerup = this.stick.onpointercancel = this.stick.onlostpointercapture = e => {
      if (e.pointerId === this.pointer) this.releaseStick();
    };
    this.draggable(this.stick, "stick"); this.draggable(this.buttons, "buttons");
    this.root.append(this.stick, this.buttons, this.depth); document.body.append(this.root);
    TouchControls.live = this;
    window.addEventListener("resize", this.onResize); window.visualViewport?.addEventListener("resize", this.onResize);
  }
  private move(e: PointerEvent): void {
    const r = this.stick.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    // Travel grows with the stick: a bigger stick (touch layout) needs a longer thumb movement = finer control.
    const radius = Math.max(CONTROL.stickRadius * 0.6, Math.min(r.width, r.height) * 0.4);
    const length = Math.hypot(dx, dy), scale = Math.min(1, radius / (length || 1));
    const x = dx * scale, y = dy * scale, s = this.groupScale("stick");
    this.knob.style.transform = `translate(${x / s}px, ${y / s}px)`; // the knob sits inside the scaled stick
    this.input.hold("touch:stick", stickDirections(x / radius, y / radius, layout.deadzone));
  }
  private releaseStick(): void { this.pointer = null; this.input.releaseVirtual("touch:stick"); this.knob.style.transform = ""; }
  update(enabled: boolean): void {
    if (this.editing) return; // the editor owns visibility until it closes
    const active = enabled && this.input.scheme === "touch";
    if (!active) { if (this.active || !this.root.hidden) this.suspend(); }
    else if (!this.active || this.root.hidden) { this.active = true; this.root.hidden = false; this.applyLayout(); }
  }
  suspend(): void {
    if (this.editing) return;
    this.active = false; this.root.hidden = true; this.releaseStick();
    for (const s of this.sources) this.input.releaseVirtual(s);
    this.root.querySelectorAll(".touch-down").forEach(b => b.classList.remove("touch-down"));
  }
  setAvailable(action: string, available: boolean): void {
    const b = this.root.querySelector<HTMLButtonElement>(`[data-touch-action="${action}"]`);
    if (b && b.hidden === available) b.hidden = !available;
  }
  /** Toggle buttons (sprint) show whether they are on. */
  setPressed(action: string, on: boolean): void {
    const b = this.root.querySelector<HTMLButtonElement>(`[data-touch-action="${action}"]`);
    if (b && b.getAttribute("aria-pressed") !== String(on)) b.setAttribute("aria-pressed", String(on));
  }
  destroy(): void {
    this.editing = null; this.suspend(); this.root.remove();
    window.removeEventListener("resize", this.onResize); window.visualViewport?.removeEventListener("resize", this.onResize);
    if (TouchControls.live === this) TouchControls.live = null;
  }

  // ---- Layout -------------------------------------------------------------------------------------------------
  private groupEls(which: TouchGroupName): HTMLElement[] { return which === "stick" ? [this.stick] : [this.buttons, this.depth]; }
  private groupScale(which: TouchGroupName): number { return layout[which].scale; }
  /** Scale and shift each group from its CSS default, clamped so nothing leaves the screen. */
  applyLayout(): void {
    if (this.root.hidden) return;
    const vw = window.visualViewport?.width ?? innerWidth, vh = window.visualViewport?.height ?? innerHeight;
    for (const which of ["stick", "buttons"] as const) {
      const g = layout[which];
      for (const el of this.groupEls(which)) {
        // `scale` and `translate` are separate from `transform`, so stage CSS (which only sets sizes and
        // positions, often with !important) keeps working and the knob's own transform is untouched.
        el.style.transformOrigin = which === "stick" ? "left bottom" : "right bottom";
        el.style.scale = g.scale === 1 ? "" : String(g.scale);
        el.style.translate = "";
        if (!el.children.length && el !== this.stick) continue;
        const base = el.getBoundingClientRect();
        if (base.width < 1) continue;
        const o = clampOffset(base, vw, vh, g.dx * vw, g.dy * vh);
        el.style.translate = Math.abs(o.dx) < 0.5 && Math.abs(o.dy) < 0.5 ? "" : `${Math.round(o.dx)}px ${Math.round(o.dy)}px`;
      }
    }
  }

  // ---- Edit mode (Settings -> Controls -> Touch layout) -------------------------------------------------------
  /** Shows the controls above the menus; dragging a group moves it. onChange receives each new layout. */
  edit(onChange: ((l: TouchLayout) => void) | null): void {
    if (onChange) {
      this.suspend(); this.editing = onChange; this.root.hidden = false; this.root.classList.add("touch-editing");
      this.root.querySelectorAll<HTMLButtonElement>("button[hidden]").forEach(b => { b.dataset.editShown = "1"; b.hidden = false; });
      this.applyLayout();
    } else {
      this.editing = null; this.root.classList.remove("touch-editing");
      this.root.querySelectorAll<HTMLButtonElement>("[data-edit-shown]").forEach(b => { delete b.dataset.editShown; b.hidden = true; });
      this.active = false; this.root.hidden = true;
    }
  }
  private draggable(el: HTMLElement, which: TouchGroupName): void {
    let drag: { id: number; x: number; y: number; dx: number; dy: number } | null = null;
    el.addEventListener("pointerdown", e => {
      if (!this.editing) return;
      e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: layout[which].dx, dy: layout[which].dy };
      el.classList.add("touch-dragging");
    });
    el.addEventListener("pointermove", e => {
      if (!this.editing || !drag || e.pointerId !== drag.id) return;
      const vw = window.visualViewport?.width ?? innerWidth, vh = window.visualViewport?.height ?? innerHeight;
      const next = structuredClone(layout);
      next[which].dx = drag.dx + (e.clientX - drag.x) / vw; next[which].dy = drag.dy + (e.clientY - drag.y) / vh;
      setTouchLayout(next); this.editing(layout);
    });
    const end = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null; el.classList.remove("touch-dragging");
      if (!this.editing) return;
      // Store what is actually on screen: an offset pushed past the edge is saved clamped.
      const vw = window.visualViewport?.width ?? innerWidth, vh = window.visualViewport?.height ?? innerHeight;
      const t = (el.style.translate || "0px 0px").split(" ").map(parseFloat);
      const next = structuredClone(layout); next[which].dx = (t[0] || 0) / vw; next[which].dy = (t[1] || 0) / vh;
      setTouchLayout(next); this.editing(layout);
    };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  }
}
