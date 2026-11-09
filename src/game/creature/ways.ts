// ---------------------------------------------------------------------------
// ways.ts (creature)
// Purpose : How you passed each obstacle, and what it means (docs/stages/03-creature.md "The three ways"):
//           fighting builds Aggressive, puzzles build Adaptable, stealth builds Cautious. Records the route zone you
//           went through and what happened to an obstacle's foe, decides the way when you pass its exit, and at the
//           level's end writes the cause line ("Cleared Fernwood: 3 of 5 obstacles by stealth"), the temperament
//           shifts and the parts tally (the parts you use most become inherited traits, later).
// Usage   : let run = newRun(level); run = enterZone(run, "bramble", "stealth"); run = foeEvent(run, "lake", "woke");
//           run = passExit(run, "bramble"); summary(run, level.name)
// Notes   : Pure, immutable, tested in tests/creatureWays.test.ts. A foe overrides the zones: beaten = fight,
//           trapped = puzzle, never noticed you = stealth; noticed you but you ran past = "rushed" (no temperament).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import type { TemperamentKind } from "../../core/lineage";
import type { Level, Way } from "./level";
import { CR } from "./tuning";

export type Verdict = Way | "rushed";
export type FoeEvent = "beaten" | "trapped" | "woke";

export interface ObstacleRun {
  zone: Way | null; // the last route zone you were in
  foe: { beaten: boolean; trapped: boolean; woke: boolean } | null;
  verdict: Verdict | null; // set once you pass its exit
  dmg: Record<Way, number> | null; // a boss: damage dealt each way (the most decides)
}

export interface LevelRun {
  obstacles: Record<string, ObstacleRun>;
  order: string[];
  parts: Record<string, number>; // times each part was used
}

export const WAY_TEMPER: Record<Way, TemperamentKind> = { fight: "aggressive", puzzle: "adaptable", stealth: "cautious" };

export function newRun(lv: Level): LevelRun {
  const obstacles: Record<string, ObstacleRun> = {};
  for (const o of lv.obstacles) obstacles[o.id] = { zone: null, foe: o.foe ? { beaten: false, trapped: false, woke: false } : null, verdict: null, dmg: o.boss ? { fight: 0, puzzle: 0, stealth: 0 } : null };
  return { obstacles, order: lv.obstacles.map((o) => o.id), parts: {} };
}

const with_ = (r: LevelRun, id: string, f: (o: ObstacleRun) => ObstacleRun): LevelRun =>
  r.obstacles[id] && r.obstacles[id].verdict === null ? { ...r, obstacles: { ...r.obstacles, [id]: f(r.obstacles[id]) } } : r;

export function enterZone(r: LevelRun, id: string, way: Way): LevelRun {
  return with_(r, id, (o) => ({ ...o, zone: way }));
}

export function foeEvent(r: LevelRun, id: string, e: FoeEvent): LevelRun {
  return with_(r, id, (o) => (o.foe ? { ...o, foe: { ...o.foe, [e]: true } } : o));
}

export function usedPart(r: LevelRun, part: string): LevelRun {
  return { ...r, parts: { ...r.parts, [part]: (r.parts[part] ?? 0) + 1 } };
}

/** A blow landed on a boss, counted for the way it was dealt. */
export function bossHit(r: LevelRun, id: string, way: Way, amount: number): LevelRun {
  return with_(r, id, (o) => (o.dmg ? { ...o, dmg: { ...o.dmg, [way]: o.dmg[way] + amount } } : o));
}

/** The way an obstacle was passed, from its zone and its foe (a boss: the way that did the most damage). */
export function decide(o: ObstacleRun): Verdict {
  if (o.dmg) {
    const best = (["fight", "puzzle", "stealth"] as Way[]).reduce((a, b) => (o.dmg![b] > o.dmg![a] ? b : a));
    return o.dmg[best] > 0 ? best : "rushed";
  }
  if (o.foe?.beaten) return "fight";
  if (o.foe?.trapped) return "puzzle";
  if (o.zone === "fight" || o.zone === "puzzle") return o.zone;
  if (o.foe) return o.foe.woke ? "rushed" : "stealth";
  return o.zone ?? "rushed";
}

export function passExit(r: LevelRun, id: string): LevelRun {
  return with_(r, id, (o) => ({ ...o, verdict: decide(o) }));
}

/** A checkpoint fallback: obstacles not yet passed start over (their foes keep what happened to them). */
export function resetUnpassed(r: LevelRun): LevelRun {
  const obstacles = { ...r.obstacles };
  for (const id of r.order) if (obstacles[id].verdict === null) obstacles[id] = { ...obstacles[id], zone: null };
  return { ...r, obstacles };
}

export interface Summary {
  rows: { id: string; verdict: Verdict | null }[];
  counts: Record<Verdict, number>;
  cause: string;
  shift: Record<TemperamentKind, number>;
  partsLine: string | null;
}

const WORD: Record<Verdict, string> = { fight: "by fighting", puzzle: "by solving puzzles", stealth: "by stealth", rushed: "by running past" };

export function summary(r: LevelRun, levelName: string): Summary {
  const counts: Record<Verdict, number> = { fight: 0, puzzle: 0, stealth: 0, rushed: 0 };
  const rows = r.order.map((id) => ({ id, verdict: r.obstacles[id].verdict }));
  for (const row of rows) if (row.verdict) counts[row.verdict]++;
  const total = rows.length;
  const best = (["stealth", "fight", "puzzle"] as Way[]).reduce((a, b) => (counts[b] > counts[a] ? b : a));
  const mixed = counts[best] === 0 ? `Cleared ${levelName} by running past everything`
    : `Cleared ${levelName}: ${counts[best]} of ${total} obstacles ${WORD[best]}`;
  const shift = { cautious: 0, aggressive: 0, adaptable: 0 } as Record<TemperamentKind, number>;
  for (const w of ["fight", "puzzle", "stealth"] as Way[]) shift[WAY_TEMPER[w]] = counts[w] * CR.temperPerObstacle;
  const used = Object.entries(r.parts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return { rows, counts, cause: mixed, shift, partsLine: used.length ? `Parts used: ${used.map(([p, n]) => `${p} ${n}x`).join(", ")}` : null };
}
