// ---------------------------------------------------------------------------
// domPatch.ts
// Purpose : Write-if-changed helpers for HUD code that runs every frame.
// Why     : Playtest 2026-11-21 (older tablet: choppy, sluggish touch). The HTML HUD rewrote ~25 attributes and
//           8 text nodes per frame even when nothing changed. Every write queues a mutation and can invalidate
//           style for the subtree (and for the whole page when it lands on <body>), which older WebKit/Blink
//           tablets pay for with dropped frames. Comparing first costs a property read, nothing more.
// Usage   : setText(el, "3/10") ; setAttr(el, "aria-valuenow", "30") ; setHidden(el, true)
//           setMeter(progress, value, max) ; setVar(el, "--x", "12px") ; setData(el, "action", id)
// Debug   : In the browser, count body mutations per frame with a MutationObserver (docs/sop/SOP-10).
// ---------------------------------------------------------------------------
export function setText(el: Node | null | undefined, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}
export function setAttr(el: Element | null | undefined, name: string, value: string): void {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}
export function setHidden(el: HTMLElement | null | undefined, hidden: boolean): void {
  if (el && el.hidden !== hidden) el.hidden = hidden;
}
export function setData(el: HTMLElement | null | undefined, key: string, value: string): void {
  if (el && el.dataset[key] !== value) el.dataset[key] = value;
}
export function setTitle(el: HTMLElement | null | undefined, value: string): void {
  if (el && el.title !== value) el.title = value;
}
/** Meter values are rounded so a slowly refilling bar does not write on every frame. */
export function setMeter(el: HTMLProgressElement | HTMLMeterElement, value: number, max = el.max, step = 0.002): void {
  const m = Number.isFinite(max) && max > 0 ? max : 1;
  if (el.max !== m) el.max = m;
  const v = Math.round(Math.max(0, Math.min(m, Number.isFinite(value) ? value : 0)) / (m * step)) * m * step;
  if (Math.abs(el.value - v) > 1e-9) el.value = v;
}
export function setVar(el: HTMLElement | null | undefined, name: string, value: string): void {
  if (el && el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
}
export function setStyle(el: HTMLElement | null | undefined, prop: "width" | "height" | "opacity" | "transform", value: string): void {
  if (el && el.style[prop] !== value) el.style[prop] = value;
}
// ---------------------------------------------------------------------------
