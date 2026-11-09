// ---------------------------------------------------------------------------
// runSave.ts
// Purpose : Pick up where you left off (BAMF69 2026-11-09: "a way for players to save/export so they can pick up
//           where they left off at another time"). Two pure jobs:
//           1. The aquatic run as save data: which map, your creature, your kin's bodies, the water, the story so
//              far. Packed for save slot RUN_SLOT; unpacked defensively (anything odd is clamped or dropped, never
//              trusted), so a hand-edited or old file cannot break the game.
//           2. An export file bundling the save slots (the lineage and the run) into one JSON text the player can
//              keep, move to another computer, and import again.
// Usage   : saves.save(RUN_SLOT, packRun(state)); const { state, problems } = unpackRun(saves.load(RUN_SLOT).envelope?.data)
//           const text = packBundle({ lineage, aquatic_run }, date); const { slots, problems } = unpackBundle(text)
// Notes   : Pure, no Phaser (the shell's menu uses it too). Tested in tests/aquaticRunSave.test.ts. The SaveStore
//           envelope (versions, .bak, migrations) wraps this data; RUN_V versions only the run's own shape.
//           Mid-river saves are not made: a continued run starts on the map you were on.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import type { TemperamentKind } from "../../core/lineage";
import type { AqCreature } from "./creature";
import type { Population } from "./population";
import { AQ, AQ_PARTS, AQ_STATS, MAPS, UNIQUE_PARTS, type AqPart, type AqStat } from "./tuning";

export const RUN_SLOT = "aquatic_run";
export const RUN_V = 1;
/** The slots an export carries, in this order. */
export const EXPORT_SLOTS = ["lineage", RUN_SLOT] as const;
export const EXPORT_FORMAT = "ooze2orbit-save";
export const EXPORT_V = 1;
const MAX_CAUSES = 20;

export interface AqRun {
  map: number; // index into MAPS
  me: AqCreature;
  tempC: number;
  pop: Population;
  causes: string[];
  temper: Record<TemperamentKind, number>;
  kills: number;
  deaths: number;
  breaches: number;
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number, dflt: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt);
const int = (v: unknown, lo: number, hi: number, dflt: number) => Math.floor(num(v, lo, hi, dflt));

/** The run as plain JSON for a save slot. */
export function packRun(r: AqRun): Json {
  return {
    kind: "aquatic_run", v: RUN_V, map: r.map, tempC: r.tempC, kills: r.kills, deaths: r.deaths, breaches: r.breaches,
    me: { ...r.me, points: { ...r.me.points }, ups: { ...r.me.ups }, parts: [...r.me.parts], uniques: [...r.me.uniques] },
    pop: { generation: r.pop.generation, thickness: [...r.pop.thickness] },
    causes: r.causes.slice(-MAX_CAUSES), temper: { ...r.temper },
  };
}

/** Read a run back. null (with the reasons) when there is none, it is finished, or it is not a run at all. */
export function unpackRun(raw: unknown): { run: AqRun | null; problems: string[] } {
  if (raw === null || raw === undefined) return { run: null, problems: [] };
  if (!isObj(raw) || raw.kind !== "aquatic_run") return { run: null, problems: ["not an aquatic run"] };
  if (raw.finished === true) return { run: null, problems: [] }; // the lineage left the water
  if (typeof raw.v !== "number" || raw.v > RUN_V) return { run: null, problems: [`run version ${String(raw.v)} is newer than this build`] };
  const problems: string[] = [];
  const m = isObj(raw.me) ? raw.me : {};
  if (!isObj(raw.me)) problems.push("no creature: a fresh one");
  const forms = AQ.forms.size.length, maxLv = AQ.stats.cellMaxLevel * AQ.stats.stageMult;
  const ups = (isObj(m.ups) ? m.ups : {}) as Json;
  const pts = (isObj(m.points) ? m.points : {}) as Json;
  const partList = (v: unknown, unique: boolean) => (Array.isArray(v) ? v : [])
    .filter((p): p is AqPart => AQ_PARTS.includes(p as AqPart) && UNIQUE_PARTS.includes(p as AqPart) === unique)
    .filter((p, i, a) => a.indexOf(p) === i);
  const form = int(m.form, 1, forms, 1);
  const me: AqCreature = {
    form,
    food: num(m.food, 0, 1e6, 0),
    diet: m.diet === "herbivore" || m.diet === "carnivore" || m.diet === "omnivore" ? m.diet : "omnivore",
    points: { algae: num(pts.algae, 0, 1e6, 0), meat: num(pts.meat, 0, 1e6, 0) },
    ups: Object.fromEntries(AQ_STATS.map((s) => [s, int(ups[s], 0, maxLv, 0)])) as Record<AqStat, number>,
    parts: partList(m.parts, false).slice(0, AQ.forms.slots[form - 1]),
    uniques: partList(m.uniques, true),
    hp: num(m.hp, 1, 1e6, 1e6), // the scene clamps it to the max
    stamina: num(m.stamina, 0, 1e6, 1e6),
    thickness: num(m.thickness, 0, 1, 0.5),
  };
  const p = isObj(raw.pop) ? raw.pop : {};
  const th = (Array.isArray(p.thickness) ? p.thickness : []).filter((v): v is number => typeof v === "number" && Number.isFinite(v)).map((v) => Math.max(0, Math.min(1, v)));
  if (!th.length) problems.push("no kin: a fresh population");
  const pop: Population = { generation: int(p.generation, 0, 1e6, 0), thickness: th.length ? th : Array(AQ.population.size).fill(AQ.population.startThickness) };
  const t = isObj(raw.temper) ? raw.temper : {};
  const temper = { cautious: num(t.cautious, 0, 1, 0), aggressive: num(t.aggressive, 0, 1, 0), adaptable: num(t.adaptable, 0, 1, 0) };
  return {
    run: {
      map: int(raw.map, 0, MAPS.length - 1, 0), me, pop, temper,
      tempC: num(raw.tempC, AQ.lens.tempMin, AQ.lens.tempMax, AQ.lens.tempStart),
      causes: (Array.isArray(raw.causes) ? raw.causes : []).filter((c): c is string => typeof c === "string").slice(-MAX_CAUSES),
      kills: int(raw.kills, 0, 1e9, 0), deaths: int(raw.deaths, 0, 1e9, 0), breaches: int(raw.breaches, 0, 1e9, 0),
    },
    problems,
  };
}

/** One export file: the slots' data (missing slots are left out), stamped with the format and the date. */
export function packBundle(slots: Partial<Record<(typeof EXPORT_SLOTS)[number], unknown>>, exportedAt: string): string {
  const keep: Json = {};
  for (const k of EXPORT_SLOTS) if (isObj(slots[k])) keep[k] = slots[k];
  return JSON.stringify({ format: EXPORT_FORMAT, v: EXPORT_V, exportedAt, slots: keep }, null, 1);
}

/** Read an export file: the known slots' data, or why it cannot be used. Unknown slots are ignored. */
export function unpackBundle(text: string): { slots: Partial<Record<(typeof EXPORT_SLOTS)[number], Json>>; problems: string[] } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { slots: {}, problems: ["not a save file (unreadable)"] }; }
  if (!isObj(raw) || raw.format !== EXPORT_FORMAT) return { slots: {}, problems: ["not an Ooze2Orbit save file"] };
  if (typeof raw.v !== "number" || raw.v > EXPORT_V) return { slots: {}, problems: ["made by a newer version of the game"] };
  const src = isObj(raw.slots) ? raw.slots : {};
  const slots: Partial<Record<(typeof EXPORT_SLOTS)[number], Json>> = {};
  for (const k of EXPORT_SLOTS) if (isObj(src[k])) slots[k] = src[k] as Json;
  if (!Object.keys(slots).length) return { slots, problems: ["the file holds no saves"] };
  if (slots[RUN_SLOT] && !unpackRun(slots[RUN_SLOT]).run && slots[RUN_SLOT].finished !== true) return { slots: {}, problems: ["its aquatic run is damaged"] };
  return { slots, problems: [] };
}
