// ---------------------------------------------------------------------------
// fit.ts (space)
// Purpose : Ship fitting as pure rules (docs/stages/05-space.md, "Ship customization"): a hull has slots (guns,
//           turrets, defences, engines, power; BAMF69 2026-11-10), a part takes one slot of its type and uses or
//           makes power, and the fitted ship's numbers follow from its parts, from who grew them (a
//           maker's strongest temperament makes its shields, weapons or engines 25 % better) and from what T0|▼|
//           has learned (a learned defence family protects less).
// Usage   : const p = fitProblems(fit);  const st = shipStats(fit, makers, learned);  isHybrid(fit)
// Notes   : Pure. Tested in tests/space.test.ts. Numbers: SPACE in tuning.ts. Weapon damage against T0|▼| is cut in
//           combat.ts (per shot, by family), not here, so the hangar can show both the raw and the learned number.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import { SHIP_TECH, type TemperamentKind } from "../../core/lineage";
import { SPACE } from "./tuning";

export type HullId = keyof typeof SPACE.hulls;
export type PartId = keyof typeof SPACE.parts;
export type Maker = "home" | "ally";
export type Kind = "weapon" | "defence" | "engine" | "power";
export type SlotType = "gun" | "turret" | "defence" | "engine" | "power";
export const SLOT_TYPES: readonly SlotType[] = ["gun", "turret", "defence", "engine", "power"];
export type Mount = "gun" | "turret" | "missile"; // forward when you fire; tracks and fires on its own; launches and homes
export type WeaponFamily = "kinetic" | "beam" | "spore";
export type DefenceFamily = "plating" | "membrane";
export type Family = WeaponFamily | DefenceFamily;
export const WEAPON_FAMILIES: readonly WeaponFamily[] = ["kinetic", "beam", "spore"];
export const DEFENCE_FAMILIES: readonly DefenceFamily[] = ["plating", "membrane"];
export const FAMILIES: readonly Family[] = [...WEAPON_FAMILIES, ...DEFENCE_FAMILIES];
export const PART_IDS = Object.keys(SPACE.parts) as PartId[];
export const HULL_IDS = (Object.keys(SPACE.hulls) as HullId[]).filter((h) => !SPACE.hulls[h].escortOnly); // the ones you can fly
export type Learned = Record<Family, number>; // 0..cap: how well T0|▼| knows each family

/** One part's numbers with every optional field present (0 when it does not apply). */
export interface PartSpec {
  name: string; kind: Kind; slot: SlotType; mount: Mount | null; maker: Maker; family: Family | null; space: number; power: number; cost: number;
  homing: number; damage: number; every: number; speed: number; range: number; hull: number; shield: number; regen: number; thrust: number; turn: number;
}
const BLANK = { family: null, mount: null, homing: 0, damage: 0, every: 0, speed: 0, range: 0, hull: 0, shield: 0, regen: 0, thrust: 0, turn: 0 };
export const part = (id: PartId): PartSpec => ({ ...BLANK, ...(SPACE.parts[id] as Partial<PartSpec>) }) as PartSpec;

export interface Fit { hull: HullId; parts: PartId[] }
export type Makers = Record<Maker, TemperamentKind>; // each maker's strongest temperament

export interface WeaponStat { id: PartId; family: WeaponFamily; mount: Mount; homing: number; damage: number; every: number; speed: number; range: number }
export interface ShipStats {
  hull: number; shield: number; regen: number; accel: number; topSpeed: number; turn: number; mass: number; radius: number;
  weapons: WeaponStat[];
}

export const noLearning = (): Learned => ({ kinetic: 0, beam: 0, spore: 0, plating: 0, membrane: 0 });
export const spaceUsed = (f: Fit): number => f.parts.reduce((n, id) => n + part(id).space, 0);
export const powerOf = (f: Fit): number => SPACE.flight.basePower + f.parts.reduce((n, id) => n + part(id).power, 0);
export const countOf = (f: Fit, id: PartId): number => f.parts.filter((p) => p === id).length;

export const slotsOf = (hull: HullId): Record<SlotType, number> => SPACE.hulls[hull].slots;
export const slotsUsed = (f: Fit, t: SlotType): number => f.parts.filter((id) => part(id).slot === t).length;
export const freeSlots = (f: Fit, t: SlotType): number => slotsOf(f.hull)[t] - slotsUsed(f, t);
/** The parts in one type of slot, in the order they were fitted (the hangar draws them slot by slot). */
export const partsIn = (f: Fit, t: SlotType): PartId[] => f.parts.filter((id) => part(id).slot === t);

/** Why this ship cannot launch, in the player's words (empty: it can). */
export function fitProblems(f: Fit): string[] {
  const p: string[] = [];
  for (const t of SLOT_TYPES) { const over = -freeSlots(f, t); if (over > 0) p.push(`${over} ${t} slot${over === 1 ? "" : "s"} too few`); }
  if (powerOf(f) < 0) p.push(`${-powerOf(f)} power short`);
  if (!f.parts.some((id) => part(id).kind === "engine")) p.push("no engine");
  if (!f.parts.some((id) => part(id).kind === "weapon")) p.push("no weapon");
  return p;
}

/** What a maker's strongest temperament improves: cautious = defences, aggressive = weapons, adaptable = engines. */
const SPECIALTY_KIND: Record<(typeof SHIP_TECH)[TemperamentKind], Kind> = { shields: "defence", weapons: "weapon", engines: "engine" };
export const specialtyKind = (t: TemperamentKind): Kind => SPECIALTY_KIND[SHIP_TECH[t]];
export const bonusFor = (id: PartId, makers: Makers): number => (specialtyKind(makers[part(id).maker]) === part(id).kind ? 1 + SPACE.specialtyBonus : 1);

/** The fitted ship's numbers. A learned defence family protects (1 - learned) as much. */
export function shipStats(f: Fit, makers: Makers, learned: Learned): ShipStats {
  const h = SPACE.hulls[f.hull];
  let hull: number = h.hull, shield = 0, regen = 0, thrust = 0, turn = 0;
  const weapons: WeaponStat[] = [];
  for (const id of f.parts) {
    const p = part(id), b = bonusFor(id, makers);
    if (p.kind === "defence") {
      const keep = 1 - learned[p.family as DefenceFamily];
      hull += p.hull * b * keep; shield += p.shield * b * keep; regen += p.regen * b * keep;
    } else if (p.kind === "engine") { thrust += p.thrust * b; turn += p.turn * b; }
    else if (p.kind === "weapon") weapons.push({ id, family: p.family as WeaponFamily, mount: p.mount ?? "gun", homing: p.homing, damage: p.damage * b, every: p.every, speed: p.speed, range: p.range });
  }
  const mass = h.mass + SPACE.flight.massPerSpace * spaceUsed(f);
  const accel = thrust / mass;
  return { hull: Math.round(hull), shield: Math.round(shield), regen, accel, topSpeed: accel / SPACE.flight.drag, turn: turn / mass, mass, radius: h.radius, weapons };
}

/** Hybrid technology: weapons and defences from both makers on one ship. T0|▼| learns it slower. */
export function isHybrid(f: Fit): boolean {
  const makers = new Set(f.parts.map(part).filter((p) => p.family !== null).map((p) => p.maker));
  return makers.size > 1;
}

/** Space fitted per kind: what the ship is built around (the lineage leans that way when it wins). */
export function spaceByKind(f: Fit): Record<Kind, number> {
  const out: Record<Kind, number> = { weapon: 0, defence: 0, engine: 0, power: 0 };
  for (const id of f.parts) out[part(id).kind] += part(id).space;
  return out;
}
