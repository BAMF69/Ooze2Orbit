// ---------------------------------------------------------------------------
// foeArt.ts (creature)
// Purpose : HD enemy sheet layout and frame choice for all four Water threats (charger C-0105; ambusher,
//           swimmer, dropper in the same treatment). Shared with assets_src/sprites/creature_hd/bake.mjs.
// Usage   : FOE_HD[kind] for key/path/size; foeFrame(phase, incapacitated, clock, reduceMotion) -> frame index.
// Notes   : Pure and import-free (Node type stripping loads it in the bake). Display sizes keep each kind's legacy
//           on-screen size (charger x1.25, ambusher x0.85 of 32 px). originY 0.5 = centred like the old frames;
//           the charger's feet sit 16 px below its position.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------

export type FoeArtPhase = "patrol" | "tell" | "strike" | "recover" | "down";
export const FOE_ART_PHASES: readonly FoeArtPhase[] = ["patrol", "tell", "strike", "recover", "down"];
/** Kept for the charger's existing tests and docs. */
export const CHARGER_ART_PHASES = FOE_ART_PHASES;
export type HdFoeKind = "charger" | "ambusher" | "swimmer" | "dropper";
export interface FoeSheet { key: string; path: string; cell: number; display: number; frames: number; columns: number; originY: number; fps: number }

const sheet = (kind: HdFoeKind, cell: number, display: number, originY: number): FoeSheet =>
  ({ key: `creatureHd_${kind}`, path: `assets/art/creature_hd_${kind}_v1.webp`, cell, display, frames: 20, columns: 4, originY, fps: 8 });
export const FOE_HD: Readonly<Record<HdFoeKind, FoeSheet>> = {
  charger: sheet("charger", 120, 40, 0.545),
  ambusher: sheet("ambusher", 96, 27, 0.5),
  swimmer: sheet("swimmer", 96, 32, 0.5),
  dropper: sheet("dropper", 96, 32, 0.5),
};
export const HD_FOE_KINDS = Object.keys(FOE_HD) as HdFoeKind[];
export const CHARGER_HD = FOE_HD.charger;

export function foeFrame(phase: "patrol" | "tell" | "strike" | "recover", incapacitated: boolean, clock: number, reduceMotion: boolean): number {
  const p: FoeArtPhase = incapacitated ? "down" : phase;
  const step = reduceMotion ? 0 : Math.floor(Math.max(0, clock) * 8) % 4;
  return FOE_ART_PHASES.indexOf(p) * 4 + step;
}
export const chargerFrame = foeFrame;
