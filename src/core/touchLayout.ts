// ---------------------------------------------------------------------------
// touchLayout.ts
// Purpose : The player's on-screen touch control layout: size and position of the movement stick and of the
//           action buttons (the aquatic d-pad, cell's actions), plus stick sensitivity (dead zone).
// Why     : Playtest 2026-11-21: on a small phone the stick was too small and too sensitive. Players now
//           resize and move both groups in Settings -> Controls -> Touch layout.
// Usage   : const layout = parseTouchLayout(store.read(TOUCH_LAYOUT_FILE))
//           store.write(TOUCH_LAYOUT_FILE, touchLayoutText(layout))
//           clampOffset(baseRect, viewW, viewH, dx, dy)  -> an offset that keeps the group on screen
// Notes   : Engine-free (Vitest). Its own small file rather than a settings.json section so the shared
//           golden settings vectors (data/golden/shell.json, tools/golden_vectors.py) stay untouched.
//           Offsets are fractions of the viewport so they survive rotation and different screens; the
//           stage CSS still owns the default position, the layout only shifts and scales from it.
// ---------------------------------------------------------------------------
import { isNum, isObject } from "./jsonUtil";

// ---- Tunables ----------------------------------------------------------------
export const TOUCH_LAYOUT_FILE = "touch_layout.json";
export const TOUCH_LAYOUT = {
  minScale: 0.6, maxScale: 2.2, scaleStep: 0.1,
  minDeadzone: 0.08, maxDeadzone: 0.5, deadzoneStep: 0.04, defaultDeadzone: 0.26, // was 0.18: "too sensitive"
  maxOffset: 1, // fraction of the viewport
  edgeMargin: 4, // px a group keeps from the screen edge when clamped
};

export interface TouchGroup { scale: number; dx: number; dy: number }
export interface TouchLayout { version: 1; stick: TouchGroup; buttons: TouchGroup; deadzone: number }
export type TouchGroupName = "stick" | "buttons";

export function defaultTouchLayout(): TouchLayout {
  return { version: 1, stick: { scale: 1, dx: 0, dy: 0 }, buttons: { scale: 1, dx: 0, dy: 0 }, deadzone: TOUCH_LAYOUT.defaultDeadzone };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;

function group(raw: unknown): TouchGroup {
  const g = isObject(raw) ? raw : {};
  const num = (v: unknown, def: number, lo: number, hi: number) => (isNum(v) ? round3(clamp(v, lo, hi)) : def);
  return {
    scale: num(g.scale, 1, TOUCH_LAYOUT.minScale, TOUCH_LAYOUT.maxScale),
    dx: num(g.dx, 0, -TOUCH_LAYOUT.maxOffset, TOUCH_LAYOUT.maxOffset),
    dy: num(g.dy, 0, -TOUCH_LAYOUT.maxOffset, TOUCH_LAYOUT.maxOffset),
  };
}

/** A valid layout from the file's text (null or damaged text -> defaults; bad fields are repaired one by one). */
export function parseTouchLayout(text: string | null): TouchLayout {
  if (text === null) return defaultTouchLayout();
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return defaultTouchLayout(); }
  if (!isObject(raw)) return defaultTouchLayout();
  return {
    version: 1, stick: group(raw.stick), buttons: group(raw.buttons),
    deadzone: isNum(raw.deadzone) ? round3(clamp(raw.deadzone, TOUCH_LAYOUT.minDeadzone, TOUCH_LAYOUT.maxDeadzone)) : TOUCH_LAYOUT.defaultDeadzone,
  };
}

export function touchLayoutText(layout: TouchLayout): string {
  return JSON.stringify(parseTouchLayout(JSON.stringify(layout)), null, 1) + "\n";
}

/** Step a group's size; stays inside the allowed range. */
export function stepScale(layout: TouchLayout, which: TouchGroupName, steps: number): TouchLayout {
  const next = structuredClone(layout);
  next[which].scale = round3(clamp(layout[which].scale + steps * TOUCH_LAYOUT.scaleStep, TOUCH_LAYOUT.minScale, TOUCH_LAYOUT.maxScale));
  return next;
}

/** Step the dead zone. A bigger dead zone = less sensitive: the thumb must travel further before you move. */
export function stepDeadzone(layout: TouchLayout, steps: number): TouchLayout {
  return { ...layout, deadzone: round3(clamp(layout.deadzone + steps * TOUCH_LAYOUT.deadzoneStep, TOUCH_LAYOUT.minDeadzone, TOUCH_LAYOUT.maxDeadzone)) };
}

export interface Rect { left: number; top: number; width: number; height: number }

/**
 * Pixel offset (dx, dy) that keeps a group fully on screen. `base` is where the group sits with no offset but
 * with its scale already applied; the result is the requested offset, nudged back inside the viewport.
 */
export function clampOffset(base: Rect, viewW: number, viewH: number, dx: number, dy: number, margin = TOUCH_LAYOUT.edgeMargin): { dx: number; dy: number } {
  const fit = (start: number, size: number, view: number, d: number) => {
    const lo = margin - start, hi = view - margin - size - start;
    return lo > hi ? (lo + hi) / 2 : clamp(d, lo, hi); // bigger than the screen: centre it
  };
  return { dx: fit(base.left, base.width, viewW, dx), dy: fit(base.top, base.height, viewH, dy) };
}
// ---------------------------------------------------------------------------
