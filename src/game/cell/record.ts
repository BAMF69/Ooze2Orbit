// ---------------------------------------------------------------------------
// record.ts
// Purpose : The cell stage's side of the handoff contract (docs/HANDOFF_CONTRACT.md): count what the player does
//           (diet choices, rams, pops, bites, gulper escapes and lures), turn the finished creature plus those
//           counts into cause-log entries, and build the lineage the aquatic stage will start from.
// Usage   : let rec = newCellRecord()
//           rec = recordDiet(rec, "carnivore") ; rec = bump(rec, "cellsRammed")
//           const ev = gulperEvent(before, after) ; if (ev) rec = bump(rec, ev === "escape" ? "gulperEscapes" : "gulpersLured")
//           const lineage = cellLineage(creature, rec)        // at the stage's end; save it, hand it on
// Notes   : No Phaser import (Vitest runs it). Pure functions: every call returns a new record.
//           How much each cause counts lives in TUNING.temperament. Cell evidence is normalized into shares totaling 1;
//           the per-stage shift cap starts with the aquatic stage (src/core/lineage.ts).
//           "Popped" here means pond cells the player popped. The player getting popped is not built yet
//           (ROADMAP "Getting popped"); add a timesPopped count when it is.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import {
  LINEAGE_SCHEMA, temperamentOf, type Influence, type Lineage, type Species, type Temperament, type TemperamentKind,
} from "../../core/lineage";
import { PLAYER_ID, type GulperBrain } from "./predator";
import type { Perk } from "./perks";
import type { Creature } from "./rules";
import { TUNING, UPGRADE_STATS, type Diet, type UpgradeStat } from "./tuning";

export const BEHAVIORS = ["cellsRammed", "cellsPopped", "timesBitten", "gulperEscapes", "gulpersLured"] as const;
export type Behavior = (typeof BEHAVIORS)[number];

export interface CellRecord {
  readonly selections: readonly { form: number; diet?: Diet; stat: UpgradeStat; gain: number; perk?: Perk; cause: string; evidence?: Readonly<Record<string, number>> }[];
  readonly dietHistory: readonly Diet[]; // the diet picked at the start and at each evolution, in order
  readonly behavior: Readonly<Record<Behavior, number>>;
}

export function newCellRecord(): CellRecord {
  return { selections: [], dietHistory: [], behavior: Object.fromEntries(BEHAVIORS.map((b) => [b, 0])) as Record<Behavior, number> };
}

export function recordDiet(r: CellRecord, d: Diet): CellRecord {
  return { ...r, dietHistory: [...r.dietHistory, d] };
}

export function bump(r: CellRecord, b: Behavior, n = 1): CellRecord {
  return { ...r, behavior: { ...r.behavior, [b]: r.behavior[b] + n } };
}

/** What one gulper decision means for the player: it gave up on you (escape), or turned to other prey (lured). */
export function gulperEvent(before: GulperBrain, after: GulperBrain): "escape" | "lure" | null {
  if (before.state !== "hunt" || before.targetId !== PLAYER_ID) return null;
  if (after.state === "tired") return "escape"; // it tired of chasing you
  if (after.targetId === null) return "escape"; // you got out of its sight
  if (after.targetId !== PLAYER_ID) return "lure"; // something else tempted it away
  return null;
}

const UPGRADE_TEMPERAMENT: Readonly<Record<UpgradeStat, TemperamentKind>> = {
  attack: "aggressive", defense: "cautious", speed: "adaptable", mobility: "adaptable",
};

/** The cause log for the finished cell stage: one entry per cause, in words the player can read. */
export function cellInfluence(c: Creature, r: CellRecord): Influence[] {
  const w = TUNING.temperament;
  const out: Influence[] = [];
  const add = (kind: TemperamentKind, points: number, cause: string) => {
    if (points > 0) out.push({ stage: "cell", cause, effect: { [kind]: points / w.full } });
  };
  const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

  for (const stat of UPGRADE_STATS) {
    const inheritedBonus = r.selections.filter(p => p.stat === stat).reduce((sum, p) => sum + p.gain, 0);
    const lvl = Math.max(0, c.ups[stat] - inheritedBonus);
    add(UPGRADE_TEMPERAMENT[stat], lvl * w.perUpgradeLevel[stat], `Your ancestor grew its ${stat} to level ${lvl}`);
  }
  for (const pick of r.selections) add(UPGRADE_TEMPERAMENT[pick.stat], pick.gain * w.perUpgradeLevel[pick.stat], `You kept a daughter with ${pick.stat} +${pick.gain}. ${pick.cause}`);
  if (c.parts.includes("spikes")) add("aggressive", w.spikesKept, "Your ancestor kept its spikes");
  if (c.parts.includes("shell")) add("cautious", w.shellKept, "Your ancestor kept its shell");

  const picks = (d: Diet) => r.dietHistory.filter((x) => x === d).length;
  add("aggressive", picks("carnivore") * w.carnivorePick, `Your ancestor chose to eat meat ${plural(picks("carnivore"), "time")}`);
  add("adaptable", picks("omnivore") * w.omnivorePick, `Your ancestor chose to eat anything ${plural(picks("omnivore"), "time")}`);
  const switches = r.dietHistory.filter((d, i) => i > 0 && d !== r.dietHistory[i - 1]).length;
  add("adaptable", switches * w.dietSwitch, `Your ancestor changed its diet ${plural(switches, "time")}`);

  const b = r.behavior;
  add("aggressive", Math.min(w.ramMax, b.cellsRammed * w.ram), `Your ancestor rammed ${plural(b.cellsRammed, "cell")}`);
  add("aggressive", Math.min(w.popMax, b.cellsPopped * w.pop), `Your ancestor popped ${plural(b.cellsPopped, "cell")}`);
  add("cautious", Math.min(w.escapeMax, b.gulperEscapes * w.escape), `Your ancestor escaped the gulpers ${plural(b.gulperEscapes, "time")}`);
  add("adaptable", Math.min(w.lureMax, b.gulpersLured * w.lure), `Your ancestor lured gulpers onto other prey ${plural(b.gulpersLured, "time")}`);
  return out;
}

/** The cell stage's own block in the lineage (contract: "The cell stage's block"). */
export function cellBlock(c: Creature, r: CellRecord): Record<string, unknown> {
  return {
    selections: r.selections.map(s => ({ ...s })),
    ...(c.perks ? { perks: { ...c.perks } } : {}),
    finalForm: c.form,
    diet: c.diet,
    dietHistory: [...r.dietHistory],
    parts: [...c.parts],
    upgrades: { ...c.ups },
    behavior: { ...r.behavior },
  };
}

/** The temperament so far (for logs and the ?debug readout during the stage). */
export function cellTemperament(c: Creature, r: CellRecord): Temperament {
  return temperamentOf(cellInfluence(c, r));
}

/** The lineage the cell stage hands to the aquatic stage. The cell stage always starts fresh, so it makes a new one. */
export function cellLineage(c: Creature, r: CellRecord): Lineage {
  const influence = cellInfluence(c, r);
  const home: Species = {
    id: "home", name: "", world: "home", origin: "played", status: "alive", diet: c.diet, branches: [],
    stages: { cell: cellBlock(c, r) }, influence, temperament: temperamentOf(influence),
  };
  return { schemaVersion: LINEAGE_SCHEMA, lastStage: "cell", gardener: { harshness: 0 }, species: [home] };
}
