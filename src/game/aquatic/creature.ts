// ---------------------------------------------------------------------------
// creature.ts (aquatic)
// Purpose : Your creature in the aquatic stage, as pure rules: five stats (attack, speed, defense, mobility,
//           health) whose max doubles from the cell stage (5 -> 10) and which start at the cell's final levels;
//           plant and meat points from eating; food that grows you through three forms; the stage's own parts
//           (fins, jaws, plates, gills); hit points, damage and what dying costs; the movement numbers all of
//           that adds up to.
// Usage   : let c = creatureFromLineage(cellBlock, diet); c = eatFood(c, "algae", 1).creature;
//           buyUpgrade(c, "attack"); movement(c); takeHit(c, 24); dieAndCarryOn(c)
// Notes   : Pure and immutable (rules return a new creature), like src/game/cell/rules.ts. Tested in
//           tests/aquaticCreature.test.ts. Numbers: AQ.stats / forms / parts / move in tuning.ts.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { TUNING as CELL } from "../cell/tuning";
import { bodyTraits } from "./gardener";
import { AQ, AQ_PAID_WITH, AQ_PARTS, AQ_STATS, UNIQUE_PARTS, type AqPart, type AqStat } from "./tuning";

export type Diet = "herbivore" | "carnivore" | "omnivore";
export type FoodKind = "algae" | "meat";

export interface AqSelection {
  form: number; diet: Diet; stat: AqStat; gain: number; cause: string; bonusPart?: AqPart;
}

export interface AqCreature {
  selections?: AqSelection[];
  growthEvidence?: { algae: number; meat: number };
  divisionSeed?: number; // while a grown form is waiting for a daughter choice (autosave/Continue)
  form: number; // 1..3
  food: number; // toward the next form
  diet: Diet;
  points: { algae: number; meat: number };
  ups: Record<AqStat, number>;
  parts: AqPart[]; // the normal parts, oldest first (slots by form)
  uniques: AqPart[]; // the river parts: their own slots, never swapped out
  hp: number;
  stamina: number;
  thickness?: number; // the body your kin evolved, 0 slender .. 1 thick (gardener.ts); missing = 0.5, no edge
}

export interface Movement {
  turnRate: number;
  accel: number;
  drag: number;
  maxSpeed: number;
  spoolS: number;
  spoolMin: number;
  dashSpeed: number;
  dashS: number;
  dashCdS: number;
}

const DIETS: readonly Diet[] = ["herbivore", "carnivore", "omnivore"];

/** "The stats max doubles each phase": the cell's max times the stage multiplier (5 x 2 = 10). */
export function maxLevel(): number {
  return AQ.stats.cellMaxLevel * AQ.stats.stageMult;
}

/** What the inherited body does (thick: health and toughness; slender: speed and turning). */
const body = (c: AqCreature) => bodyTraits(c.thickness ?? 0.5);

// Preserve valid cell daughter bonuses even if they exceed this stage's purchase cap.
const inheritedCellMax = CELL.upgradeCost.length + (CELL.maxForm - 1) * CELL.division.statGain;
/** Largest valid saved level after this stage's three daughter rewards. */
export const maxSavedLevel = (stat: AqStat): number => Math.max(maxLevel(), stat === "health" ? 0 : inheritedCellMax) +
  (AQ.forms.size.length - 1) * AQ.division.statGain;
const clampLevel = (v: unknown, cap = maxLevel()) => Math.max(0, Math.min(cap, Math.floor(Number(v) || 0)));

/**
 * Start from the cell stage's block in the lineage (its final upgrade levels; health is new and starts at 0).
 * Anything missing or odd starts at 0: a default lineage is a fresh creature.
 */
export function creatureFromLineage(cellBlock: unknown, diet: string): AqCreature {
  const ups = ((cellBlock as { upgrades?: Record<string, unknown> } | null)?.upgrades ?? {}) as Record<string, unknown>;
  const levels = Object.fromEntries(AQ_STATS.map((s) => [s, clampLevel(ups[s], s === "health" ? maxLevel() : Math.max(maxLevel(), inheritedCellMax))])) as Record<AqStat, number>;
  const c: AqCreature = {
    form: 1, food: 0, diet: DIETS.includes(diet as Diet) ? (diet as Diet) : "omnivore",
    points: { algae: 0, meat: 0 }, ups: levels, parts: [], uniques: [], hp: 0, stamina: 0,
  };
  return { ...c, hp: maxHp(c), stamina: maxStamina(c) };
}

export const has = (c: AqCreature, p: AqPart) => c.parts.includes(p) || c.uniques.includes(p);
export const isUnique = (p: AqPart) => UNIQUE_PARTS.includes(p);

// ---- derived numbers ------------------------------------------------------------------
export function maxHp(c: AqCreature): number {
  const base = AQ.stats.hpBase + AQ.stats.hpPerLevel * c.ups.health + AQ.stats.hpPerForm * (c.form - 1);
  return Math.round(base * body(c).hp);
}

export function size(c: AqCreature): number {
  return AQ.forms.size[c.form - 1];
}

export function slots(c: AqCreature): number {
  return AQ.forms.slots[c.form - 1];
}

/** Damage you take from a bite after defense and plates. */
export function damageTaken(c: AqCreature, bite: number): number {
  const def = Math.max(0, 1 - AQ.stats.defensePerLevel * c.ups.defense);
  return bite * def * (has(c, "plates") ? AQ.parts.platesMult : 1) * body(c).bite;
}

/** Damage your ram does. */
export function ramDamage(c: AqCreature): number {
  const s = AQ.stats;
  return s.ramBase + s.attackPerLevel * c.ups.attack + s.ramPerForm * (c.form - 1) + (has(c, "jaws") ? AQ.parts.jawsDamage : 0);
}

/** Mobility that counts for handling: the stat plus fins, capped at the max. */
export function mobility(c: AqCreature): number {
  return Math.min(maxLevel(), c.ups.mobility + (has(c, "fins") ? AQ.parts.finsMobility : 0));
}

/** The cell stage's momentum rule: bigger forms are heavier; mobility takes it back toward 1 (full = snappiest). */
export function heaviness(c: AqCreature): number {
  const over = Math.max(0, c.ups.mobility - maxLevel());
  return (1 + (AQ.forms.heaviness[c.form - 1] - 1) * (1 - mobility(c) / maxLevel())) /
    (1 + over * AQ.division.extraHandlingPerLevel);
}

export function movement(c: AqCreature): Movement {
  const m = AQ.move;
  const h = heaviness(c);
  const mob = mobility(c);
  const b = body(c);
  return {
    turnRate: m.turnRate * (1 + m.turnPerMobility * mob) * b.turn,
    accel: m.accel / h,
    drag: m.drag / h,
    maxSpeed: m.maxSpeed * (1 + AQ.stats.speedPerLevel * c.ups.speed) * b.speed,
    spoolS: m.spoolS * (1 - mob / maxLevel()),
    spoolMin: m.spoolMin,
    dashS: m.dashS,
    dashSpeed: m.dashSpeed * (1 + AQ.stats.speedPerLevel * c.ups.speed * 0.5) * (has(c, "torrent") ? AQ.parts.torrentDashSpeedMult : 1),
    dashCdS: m.dashCdS * (has(c, "gills") ? AQ.parts.gillsDashMult : 1) * (has(c, "torrent") ? AQ.parts.torrentDashCdMult : 1),
  };
}

// ---- eating and growing -----------------------------------------------------------------
export function dietShare(c: AqCreature, kind: FoodKind): number {
  return CELL.dietMult[c.diet][kind];
}

export function foodToEvolve(c: AqCreature): number {
  return AQ.forms.foodToEvolve[c.form - 1] ?? Infinity;
}

/** Eat: food and points by the diet's share (0 = it cannot eat this). May grow into the next form (full health). */
export function eatFood(c: AqCreature, kind: FoodKind, base: number): { creature: AqCreature; eaten: boolean; evolved: boolean; gained: number } {
  const gained = base * dietShare(c, kind);
  if (gained <= 0) return { creature: c, eaten: false, evolved: false, gained: 0 };
  let next: AqCreature = {
    ...c, growthEvidence: { algae: c.growthEvidence?.algae ?? 0, meat: c.growthEvidence?.meat ?? 0,
      [kind]: (c.growthEvidence?.[kind] ?? 0) + gained }, food: c.food + gained, points: { ...c.points, [kind]: c.points[kind] + gained },
    hp: Math.min(maxHp(c), c.hp + AQ.food.heal), // every food pickup heals a little
  };
  const need = foodToEvolve(next);
  if (next.food < need) return { creature: next, eaten: true, evolved: false, gained };
  next = { ...next, form: next.form + 1, food: next.food - need };
  return { creature: { ...next, hp: maxHp(next) }, eaten: true, evolved: true, gained };
}

// ---- upgrades -------------------------------------------------------------------------------
export function upgradeCost(c: AqCreature, stat: AqStat): number | null {
  return c.ups[stat] >= maxLevel() ? null : AQ.stats.upgradeCost[c.ups[stat]] ?? null;
}

export type BuyResult = { ok: true; creature: AqCreature } | { ok: false; reason: "max" | "points" };

/** Points a stat can be paid with: one pool, or (health) both together. */
export function pointsFor(c: AqCreature, stat: AqStat): number {
  const w = AQ_PAID_WITH[stat];
  return w === "either" ? c.points.algae + c.points.meat : c.points[w];
}

/** Pay a cost: from its pool, or (health) from the bigger pool first, then the other. Assumes it is affordable. */
export function pay(points: { algae: number; meat: number }, stat: AqStat, cost: number): { algae: number; meat: number } {
  const w = AQ_PAID_WITH[stat];
  if (w !== "either") return { ...points, [w]: points[w] - cost };
  const first = points.algae >= points.meat ? "algae" : "meat";
  const second = first === "algae" ? "meat" : "algae";
  const fromFirst = Math.min(points[first], cost);
  return { ...points, [first]: points[first] - fromFirst, [second]: points[second] - (cost - fromFirst) } as { algae: number; meat: number };
}

export function buyUpgrade(c: AqCreature, stat: AqStat): BuyResult {
  const cost = upgradeCost(c, stat);
  if (cost === null) return { ok: false, reason: "max" };
  if (pointsFor(c, stat) < cost) return { ok: false, reason: "points" };
  const next: AqCreature = { ...c, points: pay(c.points, stat, cost), ups: { ...c.ups, [stat]: c.ups[stat] + 1 } };
  // a health level raises the max and heals by the same amount
  return { ok: true, creature: stat === "health" ? { ...next, hp: c.hp + AQ.stats.hpPerLevel } : next };
}

// ---- parts -------------------------------------------------------------------------------------
export type PartResult =
  | { kind: "added"; creature: AqCreature }
  | { kind: "replaced"; creature: AqCreature; lost: AqPart }
  | { kind: "duplicate"; creature: AqCreature };

/**
 * Pick up a part: add it, swap out the oldest when the slots are full, or turn a duplicate into food. River parts go
 * to their own slots, on top of the normal ones.
 */
export function addPart(c: AqCreature, p: AqPart): PartResult {
  if (!AQ_PARTS.includes(p)) throw new Error(`unknown aquatic part "${p}"`);
  if (has(c, p)) return { kind: "duplicate", creature: { ...c, food: c.food + AQ.parts.duplicateFood } };
  if (isUnique(p)) {
    const next = { ...c, uniques: [...c.uniques, p] };
    return { kind: "added", creature: p === "endurance" ? { ...next, stamina: maxStamina(next) } : next };
  }
  if (c.parts.length < slots(c)) return { kind: "added", creature: { ...c, parts: [...c.parts, p] } };
  const [lost, ...rest] = c.parts;
  return { kind: "replaced", creature: { ...c, parts: [...rest, p] }, lost };
}

// ---- the shark look --------------------------------------------------------------------------------
/**
 * How aggressive the lineage is now, 0..1: the cell stage's aggressive temperament, your attack level and the
 * creatures you have killed (AQ.shark). Pillar 2: the player sees it, as a more shark-like body.
 */
export function aggression(lineageAggressive: number, c: AqCreature, kills: number): number {
  const s = AQ.shark;
  const v = s.fromLineage * lineageAggressive + s.fromAttack * (c.ups.attack / maxLevel()) + s.fromKills * Math.min(1, kills / s.killsForFull);
  return Math.max(0, Math.min(1, v));
}

/** Which look: 0 (none) to 3 (a shark). */
export function sharkTier(aggr: number): number {
  return AQ.shark.tiers.filter((t) => aggr >= t).length;
}

// ---- the body's look from all three temperaments (2026-11-08) -------------------------------------
export type LookFamily = "aggressive" | "cautious" | "adaptable";

/**
 * How strongly each temperament shapes the body now, 0..1: half from the lineage's temperament, the rest from how you
 * live this stage (attack and kills; defense, health and plates; speed, mobility and breaches).
 */
export function lookScores(
  temper: Record<LookFamily, number>, c: AqCreature, kills: number, breaches: number,
): Record<LookFamily, number> {
  const s = AQ.shark, max = maxLevel();
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return {
    aggressive: aggression(temper.aggressive, c, kills),
    cautious: clamp(s.fromLineage * temper.cautious + s.fromAttack * ((c.ups.defense + c.ups.health) / (2 * max)) + s.fromKills * (has(c, "plates") ? 1 : 0)),
    adaptable: clamp(s.fromLineage * temper.adaptable + s.fromAttack * ((c.ups.speed + c.ups.mobility) / (2 * max)) + s.fromKills * Math.min(1, breaches / 10)),
  };
}

/**
 * The body: the strongest temperament picks the family (aggressive: a shark; cautious: armoured; adaptable:
 * streamlined), its strength picks the step 1..3 (sharkTier's thresholds). Step 0 is the plain fish. Ties go
 * aggressive, then cautious, then adaptable. The atlas row suffix: "0", "1".."3" (shark), "c1".."c3", "a1".."a3".
 */
export function bodyLook(scores: Record<LookFamily, number>): { family: LookFamily; tier: number; row: string } {
  let family: LookFamily = "aggressive";
  for (const f of ["cautious", "adaptable"] as const) if (scores[f] > scores[family]) family = f;
  const tier = sharkTier(scores[family]);
  const row = tier === 0 ? "0" : family === "aggressive" ? `${tier}` : `${family[0]}${tier}`;
  return { family, tier, row };
}

// ---- getting hurt and dying (pillar 1: stakes rise each stage) ------------------------------------
export function takeHit(c: AqCreature, bite: number): { creature: AqCreature; died: boolean; damage: number } {
  const damage = damageTaken(c, bite);
  const hp = c.hp - damage;
  return { creature: { ...c, hp: Math.max(0, hp) }, died: hp <= 0, damage };
}

export function heal(c: AqCreature, amount: number): AqCreature {
  return { ...c, hp: Math.min(maxHp(c), c.hp + amount) };
}

// ---- stamina (BAMF69 2026-11-08) ----------------------------------------------------------------------
export type Pace = "fast" | "cruise" | "still";

/** Max stamina: fixed in this stage (not upgradeable), doubled by the endurance muscle. */
export function maxStamina(c: AqCreature): number {
  return AQ.stamina.max * (has(c, "endurance") ? AQ.parts.enduranceStaminaMult : 1);
}

/** Full speed drains it fast, cruising slowly refills it, holding still refills it fast; cold water refills it slower (regen x). */
export function stepStamina(c: AqCreature, pace: Pace, dt: number, regen = 1): AqCreature {
  const s = AQ.stamina;
  const d = pace === "fast" ? -s.fastDrain : (pace === "cruise" ? s.cruiseRegen : s.stillRegen) * regen;
  return { ...c, stamina: Math.max(0, Math.min(maxStamina(c), c.stamina + d * dt)) };
}

/** Dash and breach need, and use, AQ.stamina.abilityCost (50), even with the endurance muscle (2026-11-08). */
export function canAbility(c: AqCreature): boolean {
  return c.stamina >= AQ.stamina.abilityCost - 1e-9;
}

export function spendAbility(c: AqCreature): AqCreature {
  return { ...c, stamina: Math.max(0, c.stamina - AQ.stamina.abilityCost) };
}

/** Out of breath: below the minimum for full speed (the bar turns red). */
export function outOfBreath(c: AqCreature): boolean {
  return c.stamina < AQ.stamina.minFast;
}

/** Can you switch to full speed now? Only with at least the minimum stamina. */
export function canGoFast(c: AqCreature): boolean {
  return !outOfBreath(c);
}

/** Full speed while there is stamina for it (at 0 you drop to cruise); otherwise cruise. */
export function paceSpeed(c: AqCreature, wantFast: boolean, moving: boolean): { pace: Pace; mult: number } {
  if (!moving) return { pace: "still", mult: AQ.stamina.cruiseMult };
  if (wantFast && c.stamina > 0) return { pace: "fast", mult: 1 };
  return { pace: "cruise", mult: AQ.stamina.cruiseMult };
}

/**
 * A relative carries on: full health and stamina, but half the food toward the next form is lost, and the newest normal
 * part is lost. Upgrades, points, the form and the river parts are kept (you never lose a form you reached).
 */
export function dieAndCarryOn(c: AqCreature): { creature: AqCreature; lostPart: AqPart | null } {
  const lostPart = AQ.death.losePart && c.parts.length ? c.parts[c.parts.length - 1] : null;
  const parts = lostPart ? c.parts.slice(0, -1) : c.parts;
  const next = { ...c, food: c.food * AQ.death.keepFoodShare, parts };
  return { creature: { ...next, hp: maxHp(next), stamina: maxStamina(next) }, lostPart };
}
