// ---------------------------------------------------------------------------
// reveal.ts
// Purpose : Toy 2, the temperament reveal: the aquatic stage opens by showing, for the first time, the temperament
//           the cell stage recorded, with the causes behind each one (BAMF69 2026-11-08: hidden in the cell stage,
//           revealed at the transition). With no cell-stage save it explains the default lineage instead.
// Usage   : const r = revealFrom(saved);  r.title, r.rows[i] = { kind, pct, causes: [...] }, r.leaning
//           revealFrom(saved, 3, "creature" | "civ"): the same, worded for the stage it opens (shared/lineagePanel.ts)
// Notes   : Pure. Tested in tests/aquaticReveal.test.ts. Reads the lineage per docs/HANDOFF_CONTRACT.md; a lineage
//           that fails lineageProblems() is reported (problems) and the default is shown, never a crash.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import {
  TEMPERAMENTS, lineageProblems, shipSpecialty, temperamentOf, zeroTemperament,
  type Lineage, type TemperamentKind,
} from "../../core/lineage";

export interface RevealRow {
  kind: TemperamentKind;
  pct: number; // 0..100
  causes: string[]; // biggest first, at most maxCauses
}

export interface Reveal {
  fromSave: boolean;
  title: string;
  rows: RevealRow[];
  leaning: string; // one line: what it leans toward
  problems: string[]; // why a save was not used (empty when it was, or when there was none)
  diet: string; // the lineage's diet (herbivore, carnivore, omnivore): what the avatar can eat
}

const WORD: Record<TemperamentKind, string> = { cautious: "Cautious", aggressive: "Aggressive", adaptable: "Adaptable" };

/** How each stage words its opening (BAMF69 2026-11-09: the creature and civilization stages open with it too). */
export type RevealStage = "aquatic" | "creature" | "civ";
const STAGE_WORDS: Record<RevealStage, { title: string; test: string; none: string }> = {
  aquatic: { title: "Your lineage, as the pond shaped it", test: "The water will test that.", none: "the water will decide." },
  creature: { title: "Your lineage comes ashore", test: "The land will test that.", none: "the land will decide." },
  civ: { title: "Your lineage, the makers of a people", test: "Your people will carry it to their rivals.", none: "your people will decide." },
};

/** Build the reveal from whatever the save slot held (undefined/null = no save), worded for the stage it opens. */
export function revealFrom(saved: unknown, maxCauses = 3, stage: RevealStage = "aquatic"): Reveal {
  if (saved === undefined || saved === null) return defaultReveal([], stage);
  const problems = lineageProblems(saved);
  if (problems.length) return defaultReveal(problems, stage);
  const home = (saved as Lineage).species[0];
  const t = temperamentOf(home.influence);
  const rows = TEMPERAMENTS.map((kind) => ({
    kind,
    pct: Math.round(t[kind] * 100),
    causes: home.influence
      .filter((e) => (e.effect[kind] ?? 0) > 0)
      .sort((a, b) => (b.effect[kind] ?? 0) - (a.effect[kind] ?? 0))
      .slice(0, maxCauses)
      .map((e) => e.cause),
  }));
  const top = shipSpecialty(t).kind;
  const any = rows.some((r) => r.pct > 0);
  return {
    fromSave: true,
    title: STAGE_WORDS[stage].title,
    rows,
    leaning: any ? `Most of all ${WORD[top].toLowerCase()}. ${STAGE_WORDS[stage].test}` : `No strong leaning yet: ${STAGE_WORDS[stage].none}`,
    problems: [],
    diet: home.diet,
  };
}

function defaultReveal(problems: string[], stage: RevealStage): Reveal {
  const t = zeroTemperament();
  return {
    fromSave: false,
    title: "A new lineage (no cell-stage save found)",
    rows: TEMPERAMENTS.map((kind) => ({ kind, pct: Math.round(t[kind] * 100), causes: [] })),
    leaning: `Finish the cell stage to bring your own creature here. For now: a balanced omnivore, no leaning${stage === "aquatic" ? "" : `, and ${STAGE_WORDS[stage].none}`}`,
    problems,
    diet: "omnivore",
  };
}

export const temperamentWord = (k: TemperamentKind): string => WORD[k];
