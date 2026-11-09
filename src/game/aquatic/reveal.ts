// ---------------------------------------------------------------------------
// reveal.ts
// Purpose : Toy 2, the temperament reveal: the aquatic stage opens by showing, for the first time, the temperament
//           the cell stage recorded, with the causes behind each one (BAMF69 2026-11-08: hidden in the cell stage,
//           revealed at the transition). With no cell-stage save it explains the default lineage instead.
// Usage   : const r = revealFrom(saved);  r.title, r.rows[i] = { kind, pct, causes: [...] }, r.leaning
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

/** Build the reveal from whatever the save slot held (undefined/null = no save). */
export function revealFrom(saved: unknown, maxCauses = 3): Reveal {
  if (saved === undefined || saved === null) return defaultReveal([]);
  const problems = lineageProblems(saved);
  if (problems.length) return defaultReveal(problems);
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
    title: "Your lineage, as the pond shaped it",
    rows,
    leaning: any ? `Most of all ${WORD[top].toLowerCase()}. The water will test that.` : "No strong leaning yet: the water will decide.",
    problems: [],
    diet: home.diet,
  };
}

function defaultReveal(problems: string[]): Reveal {
  const t = zeroTemperament();
  return {
    fromSave: false,
    title: "A new lineage (no cell-stage save found)",
    rows: TEMPERAMENTS.map((kind) => ({ kind, pct: Math.round(t[kind] * 100), causes: [] })),
    leaning: "Finish the cell stage to bring your own creature here. For now: a balanced omnivore, no leaning.",
    problems,
    diet: "omnivore",
  };
}

export const temperamentWord = (k: TemperamentKind): string => WORD[k];
