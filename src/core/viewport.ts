// Purpose: Engine-free layout bounds. World units stay independent of CSS pixels and screen cutouts.
export interface Insets { top: number; right: number; bottom: number; left: number }
export type DisplayStage = "main" | "aquatic" | "creature" | "civ" | "space";
export const DISPLAY = { width: 640, height: 360, phoneWidth: 360, tabletWidth: 480, tabletAt: 600,
  portraitHeader: 124, header: 100, gap: 8, minHeight: 180, maxHeight: 720 };
export function cellViewport(width: number, height: number, safe: Insets) {
  const portrait = height > width;
  const clean = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
  const left = clean(safe.left), top = clean(safe.top) + (portrait ? DISPLAY.portraitHeader : DISPLAY.header);
  const w = Math.max(1, width - left - clean(safe.right)), h = Math.max(1, height - top - clean(safe.bottom) - DISPLAY.gap);
  const responsive = portrait || height < 500;
  const logicalWidth = portrait ? width < DISPLAY.tabletAt ? DISPLAY.phoneWidth : DISPLAY.tabletWidth : DISPLAY.width;
  const logicalHeight = responsive ? Math.max(DISPLAY.minHeight, Math.min(DISPLAY.maxHeight, Math.round(logicalWidth * h / w))) : DISPLAY.height;
  return { left, top, width: w, height: h, logicalWidth, logicalHeight, portrait };
}
/** Stage adapters own world framing; all reserve readable native status/command space. */
export function stageViewport(stage: DisplayStage, width: number, height: number, safe: Insets) {
  if (stage === "main") {
    const portrait = height > width, w = Math.max(1, width), h = Math.max(1, height);
    const logicalWidth = portrait ? width < DISPLAY.tabletAt ? DISPLAY.phoneWidth : DISPLAY.tabletWidth : DISPLAY.width;
    return { left: 0, top: 0, width: w, height: h, logicalWidth,
      logicalHeight: Math.max(120, Math.min(1440, Math.round(logicalWidth * h / w))), portrait };
  }
  const box = cellViewport(width, height, safe);
  box.height = Math.max(1, box.height - 64);
  if (stage === "creature") {
    box.logicalHeight = !box.portrait && height < 500 ? Math.max(180, Math.min(360, Math.round(640 * box.height / box.width))) : 360;
    box.logicalWidth = box.portrait ? Math.max(180, Math.min(640, Math.round(360 * box.width / box.height))) : 640;
  } else if (box.portrait || height < 500) {
    box.logicalHeight = Math.max(DISPLAY.minHeight, Math.min(DISPLAY.maxHeight, Math.round(box.logicalWidth * box.height / box.width)));
  }
  return box;
}
// ---------------------------------------------------------------------------
