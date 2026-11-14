// ---------------------------------------------------------------------------
// rules.ts
// Purpose : The cell stage's rules, with no Phaser: diet, eating, growing, evolving, part slots, upgrade points
//           and levels, and what a bump does. The scene (src/game/MainScene.ts) moves things around and asks
//           these functions what happens.
// Usage   : let c = newCreature("herbivore"); const r = eatFood(c, "algae", true); c = r.creature
//           const b = buyUpgrade(c, "defense"); if (b.ok) c = b.creature
// Notes   : Pure functions over a small immutable Creature record, so tests cover every rule (tests/cellRules.test.ts).
//           Pillar 1 (tense but fair): nothing here can end the game or undo a form. For now a bump only moves
//           food out of the meter (getting popped is a ROADMAP item).
//           Cell playtest revision: pickups and daughter bonuses both add parts. Slots = form, and a
//           new part into full slots replaces the OLDEST one. Diet and upgrades are the player's picks too.
//           Points come only from FRESH food (algae in the pond, meat from a popped cell). Food knocked out of you
//           by a bump gives food back but no points, or getting bumped on purpose would farm points.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import {
  TUNING, UPGRADE_PAID_WITH, UPGRADE_STATS, type CellKind, type Diet, type FoodKind, type PartKind, type UpgradeStat,
} from "./tuning";

import { foodLossMultiplier, type PerkLevels } from "./perks";

export interface Creature {
  readonly perks?: PerkLevels; // daughter-only abilities; absent on legacy bodies
  readonly form: number; // 1 .. TUNING.maxForm
  readonly food: number; // growth meter toward the next evolution (can be fractional: the omnivore eats halves)
  readonly parts: readonly PartKind[]; // oldest first
  readonly diet: Diet;
  readonly points: Readonly<Record<FoodKind, number>>; // algae -> plant points, meat -> meat points
  readonly ups: Readonly<Record<UpgradeStat, number>>; // total levels; purchases stop at maxLevel(), daughters can exceed it
}

export function newCreature(diet: Diet = "omnivore"): Creature {
  const ups = Object.fromEntries(UPGRADE_STATS.map((s) => [s, 0])) as Record<UpgradeStat, number>;
  return { form: 1, food: 0, parts: [], diet, points: { algae: 0, meat: 0 }, ups };
}

export const has = (c: Creature, p: PartKind): boolean => c.parts.includes(p);

/** Part slots: one per form, up to the three kinds of part (form 4 grows, it does not add a slot). */
export function slots(c: Creature): number {
  return Math.min(c.form, TUNING.maxSlots);
}

/** Food needed to evolve from the current form; Infinity when fully evolved. */
export function evolveNeed(c: Creature): number {
  if (c.form >= TUNING.maxForm) return Infinity;
  const need = TUNING.evolveFood[c.form - 1];
  if (need === undefined) throw new Error(`no evolveFood entry for form ${c.form}`);
  return need;
}

/** Add food; evolves (meter back to the leftover) when it reaches the need. */
export function eat(c: Creature, amount: number): { creature: Creature; evolved: boolean } {
  if (amount < 0) throw new Error(`eat() takes a non-negative amount, got ${amount}`);
  const food = c.food + amount;
  const need = evolveNeed(c);
  if (food >= need) return { creature: { ...c, form: c.form + 1, food: food - need }, evolved: true };
  return { creature: { ...c, food }, evolved: false };
}

// ---- diet ----------------------------------------------------------------------------
export function canEat(c: Creature, kind: FoodKind): boolean {
  return TUNING.dietMult[c.diet][kind] > 0;
}

/** Parts a diet cannot use (playtest 2026-11-07: a carnivore with a filter mouth is a dead part). */
export function partAllowed(diet: Diet, p: PartKind): boolean {
  return !(diet === "carnivore" && p === "mouth");
}

/** Change diet; a part the new diet cannot use comes off (the scene drops it back into the pond). */
export function changeDiet(c: Creature, diet: Diet): { creature: Creature; dropped: PartKind[] } {
  const dropped = c.parts.filter((p) => !partAllowed(diet, p));
  return { creature: { ...c, diet, parts: c.parts.filter((p) => partAllowed(diet, p)) }, dropped };
}

export function setDiet(c: Creature, diet: Diet): Creature {
  return changeDiet(c, diet).creature;
}

/** What one piece of `kind` food is worth to this creature, before it is eaten (0 = cannot eat it). */
export function foodValue(c: Creature, kind: FoodKind, base: number): number {
  let v = base * TUNING.dietMult[c.diet][kind];
  if (kind === "algae" && has(c, "mouth")) v *= TUNING.mouthFoodMult;
  return v;
}

/** Food supply follows the player's form, including the original leaner opening pond. */
export function pondFood(form: number): { algaeCount: number; algaeRegrowS: number; meatFood: number } {
  return form === 1 ? TUNING.form1Food : TUNING;
}

/** The base value of freshly spawned food; existing drops keep their original value. */
export function freshBase(kind: FoodKind, form = 1): number {
  return kind === "algae" ? TUNING.algaeFood : pondFood(form).meatFood;
}

/**
 * Eat one piece of food. `fresh` food also earns points of its kind; food knocked out of you does not.
 * Returns eaten=false (and the creature unchanged) when the diet cannot eat it.
 */
export function eatFood(c: Creature, kind: FoodKind, base: number, fresh: boolean): { creature: Creature; evolved: boolean; eaten: boolean; gained: number } {
  const v = foodValue(c, kind, base);
  if (v <= 0) return { creature: c, evolved: false, eaten: false, gained: 0 };
  const r = eat(c, v);
  const gained = fresh ? v : 0;
  const points = gained ? { ...r.creature.points, [kind]: r.creature.points[kind] + gained } : r.creature.points;
  return { creature: { ...r.creature, points }, evolved: r.evolved, eaten: true, gained };
}

/** The pull radius of the filter mouth (0 without it, or when you cannot eat algae). */
export function pullRadius(c: Creature): number {
  return has(c, "mouth") && canEat(c, "algae") ? TUNING.mouthPullRadius : 0;
}

// ---- parts -----------------------------------------------------------------------------
export type AddPartResult =
  | { kind: "refused"; creature: Creature }
  | { kind: "added"; creature: Creature }
  | { kind: "replaced"; creature: Creature; lost: PartKind }
  | { kind: "duplicate"; creature: Creature; food: number };

/** Pick up a part: refuse one the diet cannot use, add it, swap out the oldest when slots are full, or turn a duplicate into food. */
export function addPart(c: Creature, p: PartKind): AddPartResult {
  if (!partAllowed(c.diet, p)) return { kind: "refused", creature: c };
  if (has(c, p)) return { kind: "duplicate", creature: c, food: TUNING.partFoodOnDuplicate };
  if (c.parts.length < slots(c)) return { kind: "added", creature: { ...c, parts: [...c.parts, p] } };
  const [lost, ...rest] = c.parts;
  return { kind: "replaced", creature: { ...c, parts: [...rest, p] }, lost };
}

// ---- upgrades ----------------------------------------------------------------------------
export function maxLevel(): number {
  return TUNING.upgradeCost.length;
}

/** Points the next level of `stat` costs, or null at max level. */
export function upgradeCost(c: Creature, stat: UpgradeStat): number | null {
  return TUNING.upgradeCost[c.ups[stat]] ?? null;
}

export type BuyResult = { ok: true; creature: Creature } | { ok: false; reason: "max" | "points" };

/** Spend points of the stat's kind (meat: attack, speed; algae: defense, mobility) on its next level. */
export function buyUpgrade(c: Creature, stat: UpgradeStat): BuyResult {
  const cost = upgradeCost(c, stat);
  if (cost === null) return { ok: false, reason: "max" };
  const kind = UPGRADE_PAID_WITH[stat];
  if (c.points[kind] < cost) return { ok: false, reason: "points" };
  return {
    ok: true,
    creature: { ...c, points: { ...c.points, [kind]: c.points[kind] - cost }, ups: { ...c.ups, [stat]: c.ups[stat] + 1 } },
  };
}

/** Which look an upgrade level shows on the cell (assets_src/sprites/player_upgrades.py): 0 none, 1..3. */
export function upgradeTier(level: number): number {
  return TUNING.upgradeTierAt.filter((at) => level >= at).length;
}

/** Top swim speed after the speed upgrade. */
export function maxSpeed(c: Creature): number {
  return TUNING.player.maxSpeed * (1 + TUNING.speedPerLevel * c.ups.speed);
}

/**
 * Momentum: how sluggish the cell handles, 1 = snappiest. Bigger forms are heavier; each mobility level takes it
 * a step back toward 1, and full mobility reaches 1 at any form.
 */
export function heaviness(c: Creature): number {
  const table = TUNING.player.heaviness;
  const atForm = table[Math.min(c.form, table.length) - 1];
  const left = 1 - Math.min(c.ups.mobility, maxLevel()) / maxLevel();
  const over = Math.max(0, c.ups.mobility - maxLevel());
  return (1 + (atForm - 1) * left) / (1 + over * TUNING.overcap.handlingPerLevel);
}

/** Seconds for thrust to build to full from a standstill: longer at bigger forms, 0 at full mobility. */
export function spoolTime(c: Creature): number {
  const table = TUNING.player.spoolS;
  const atForm = table[Math.min(c.form, table.length) - 1];
  return atForm * (1 - Math.min(c.ups.mobility, maxLevel()) / maxLevel());
}

/** Thrust build-up, 0..1: grows while you push, resets when you let go. */
export function nextSpool(spool: number, pushing: boolean, dt: number, spoolS: number): number {
  if (!pushing) return 0;
  if (spoolS <= 0) return 1;
  return Math.min(1, spool + dt / spoolS);
}

/** Share of full thrust at a given build-up: starts at spoolMinThrust so the first press still does something. */
export function thrustAt(spool: number): number {
  const min = TUNING.player.spoolMinThrust;
  return min + (1 - min) * spool;
}

/** Acceleration (also how fast you turn): divided by heaviness. */
export function accel(c: Creature): number {
  return TUNING.player.accel / heaviness(c);
}

/**
 * Water drag (how fast you stop): divided by heaviness, so a heavy cell coasts but keeps the same top speed
 * (terminal speed is accel / drag). Speed streamlines the body, which lowers drag further.
 */
export function drag(c: Creature): number {
  return (TUNING.player.drag * Math.max(0.1, 1 - TUNING.speedDragPerLevel * c.ups.speed)) / heaviness(c);
}

/** Knockback this creature takes from a bump, after the mobility upgrade. */
export function knockbackTaken(c: Creature): number {
  return TUNING.bumpKnockback * Math.max(0, 1 - TUNING.mobilityKnockPerLevel * Math.min(c.ups.mobility, maxLevel())) *
    Math.pow(TUNING.overcap.knockbackMult, Math.max(0, c.ups.mobility - maxLevel()));
}

// ---- bumps -------------------------------------------------------------------------------
/** Damage the player deals to a pond cell per bump: full when the player rams it, only spikes when it rams the
 *  player (so a predator biting an idle player does not hurt itself, but biting a spiky one does). */
export function bumpDamage(c: Creature, ramming = true): number {
  if (!ramming) return has(c, "spikes") ? TUNING.spikeDamageBonus : 0;
  return TUNING.bumpDamageBase + (c.form - 1) + (has(c, "spikes") ? TUNING.spikeDamageBonus : 0) + TUNING.attackPerLevel * c.ups.attack;
}

/** Food knocked out of the player by one bump from a pond cell of this kind (whole pieces, never more than they have). */
/**
 * Damage (hp) one pond cell deals another when they bump (playtest 2026-11-08 "enemies can do half damage to
 * each other"): half of what its bump knocks out of an unarmoured player.
 */
export function cellHitDamage(by: CellKind): number {
  return TUNING.bumpFoodLoss * TUNING.cell.kinds[by].bumpMult * TUNING.cell.cellOnCellMult;
}

/** Meat chunks a dead pond cell drops: all of it when you killed it, a share when the pond did. */
export function deathMeat(kind: CellKind, byPlayer: boolean): number {
  const meat = TUNING.cell.kinds[kind].meat;
  return byPlayer ? meat : Math.max(1, Math.floor(meat * TUNING.cell.otherKillMeatMult));
}

export function bumpFoodLoss(c: Creature, by: CellKind): number {
  let loss = TUNING.bumpFoodLoss * TUNING.cell.kinds[by].bumpMult;
  if (has(c, "shell")) loss *= TUNING.shellLossMult;
  loss *= Math.max(0, 1 - TUNING.defensePerLevel * Math.min(c.ups.defense, maxLevel())) *
    Math.pow(TUNING.overcap.foodLossMult, Math.max(0, c.ups.defense - maxLevel()));
  return Math.min(Math.floor(c.food), Math.round(loss * foodLossMultiplier(c)));
}

/** Take food out of the meter (a bump). Never below zero, never undoes an evolution. */
export function loseFood(c: Creature, amount: number): Creature {
  return { ...c, food: Math.max(0, c.food - amount) };
}

/** What a bump knocks out of you, piece by piece: food you can eat (the omnivore drops both, alternating). */
export function dropKinds(c: Creature, count: number): FoodKind[] {
  const kinds: FoodKind[] = c.diet === "herbivore" ? ["algae"] : c.diet === "carnivore" ? ["meat"] : ["algae", "meat"];
  return Array.from({ length: count }, (_, i) => kinds[i % kinds.length]);
}

/** How many of a pond organism should be alive when the player is at `form` (predators multiply as you grow). */
export function cellsWanted(kind: CellKind, form: number): number {
  const k = TUNING.cell.kinds[kind];
  return k.base + k.perForm * form;
}

/** Row name in the player atlas (assets_src/sprites/player_cell.py): pose "formN", direction "sXhXmX". */
export function spriteRow(c: Creature): { pose: string; direction: string } {
  const b = (p: PartKind) => (has(c, p) ? "1" : "0");
  return { pose: `form${c.form}`, direction: `s${b("spikes")}h${b("shell")}m${b("mouth")}` };
}
