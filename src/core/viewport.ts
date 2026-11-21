// Purpose: Engine-free layout bounds. World units stay independent of CSS pixels and screen cutouts.
export interface Insets { top: number; right: number; bottom: number; left: number }
export type DisplayStage = "main" | "aquatic" | "creature" | "civ" | "space";
export const DISPLAY = { width: 640, height: 360, phoneWidth: 360, tabletWidth: 480, tabletAt: 600,
  portraitHeader: 124, header: 100, gap: 8, minHeight: 180, maxHeight: 720, creatureMinWidth: 180 };
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
/**
 * Creature fills the whole display (playtest 2026-11-21: no blue border). The logical view "covers" the
 * 640x360 room: on wide screens it shows the full width and crops height, on narrower ones the full height
 * and crops width; the scene's camera follows the walker and extends the room's ground and canopy beyond
 * its edges, so nothing outside the world is ever visible. Native status and buttons float over the canvas.
 */
export function creatureViewport(width: number, height: number) {
  const w = Math.max(1, width), h = Math.max(1, height), portrait = h > w, aspect = w / h;
  const logicalWidth = Math.max(DISPLAY.creatureMinWidth, Math.min(DISPLAY.width, Math.round(aspect >= DISPLAY.width / DISPLAY.height ? DISPLAY.width : DISPLAY.height * aspect)));
  const logicalHeight = Math.max(120, Math.min(1440, Math.round(logicalWidth / aspect)));
  return { left: 0, top: 0, width: w, height: h, logicalWidth, logicalHeight, portrait };
}
/** Stage adapters own framing: cell/aquatic/creature/civ fill the display; space reserves native command space. */
export function stageViewport(stage: DisplayStage, width: number, height: number, safe: Insets) {
  // Civilization draws a fullscreen habitat; its native HUD supplies unobscured maze bounds.
  // This is deliberately independent of other stages' in-progress display adapters.
  if (stage === "civ") {
    const w = Math.max(1, width), h = Math.max(1, height), logicalWidth = Math.min(1600, Math.round(w));
    return { left: 0, top: 0, width: w, height: h, logicalWidth,
      logicalHeight: Math.max(1, Math.round(logicalWidth * h / w)), portrait: h > w };
  }
  if (stage === "main" || stage === "aquatic") {
    const portrait = height > width, w = Math.max(1, width), h = Math.max(1, height);
    const logicalWidth = portrait ? width < DISPLAY.tabletAt ? DISPLAY.phoneWidth : DISPLAY.tabletWidth : DISPLAY.width;
    return { left: 0, top: 0, width: w, height: h, logicalWidth,
      logicalHeight: Math.max(120, Math.min(1440, Math.round(logicalWidth * h / w))), portrait };
  }
  if (stage === "creature") return creatureViewport(width, height);
  const box = cellViewport(width, height, safe);
  box.height = Math.max(1, box.height - 64);
  if (box.portrait || height < 500) {
    box.logicalHeight = Math.max(DISPLAY.minHeight, Math.min(DISPLAY.maxHeight, Math.round(box.logicalWidth * box.height / box.width)));
  }
  return box;
}
// ---------------------------------------------------------------------------
