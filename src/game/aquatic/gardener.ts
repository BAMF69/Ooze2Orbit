// ---------------------------------------------------------------------------
// gardener.ts
// Purpose : What the Gardener's lever does (BAMF69 2026-11-08: "what exactly does water temperature do and why should
//           the player care?"). Two pure effects, both explained on screen (pillar 2):
//           1. The body your kin evolve (thickness, 0 slender .. 1 thick) is a real trait you inherit: thick bodies
//              have more health and shrug off bites but swim slower; slender bodies swim and turn faster but have
//              less health.
//           2. The water's temperature changes the lake now: warm water grows more food but makes the hunters faster
//              and keener; cold water starves the lake and slows everyone, hunters and prey, and your stamina comes
//              back slower.
// Usage   : const b = bodyTraits(thickness); maxHp x b.hp; bite x b.bite; speed x b.speed; turn x b.turn
//           const w = waterEffects(tempC); food regrowth x w.food; hunter speed x w.hunterSpeed; ...
//           describeBody(thickness), describeWater(tempC): one line each for the HUD and the lens
// Notes   : Pure. Tested in tests/aquaticGardener.test.ts. Numbers: AQ.gardener in tuning.ts. At thickness 0.5 and
//           the neutral temperature everything is x1.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { AQ } from "./tuning";

export interface BodyTraits {
  hp: number; // max health x
  bite: number; // damage you take x
  speed: number; // top speed x
  turn: number; // turn rate x
}

export interface WaterEffects {
  food: number; // how fast plants regrow, and how many the lake holds, x
  hunterSpeed: number; // deepmaws, spinefish, sharks: speed x
  hunterSight: number; // how far they notice you x
  preySpeed: number; // darters, finrays: speed x
  staminaRegen: number; // your stamina refill x
}

/** -1 (slender) .. 0 (medium) .. +1 (thick). */
const shape = (thickness: number) => Math.max(-1, Math.min(1, (thickness - 0.5) * 2));
/** -1 (coldest) .. 0 (mild) .. +1 (warmest). */
const warmth = (tempC: number) => {
  const l = AQ.lens, n = AQ.population.neutralTemp;
  return tempC >= n ? Math.min(1, (tempC - n) / (l.tempMax - n)) : -Math.min(1, (n - tempC) / (n - l.tempMin));
};

export function bodyTraits(thickness: number): BodyTraits {
  const g = AQ.gardener.body;
  const s = shape(thickness);
  const thick = Math.max(0, s), slim = Math.max(0, -s);
  return {
    hp: 1 + g.hpThick * thick - g.hpSlim * slim,
    bite: 1 - g.biteThick * thick,
    speed: 1 - g.speedThick * thick + g.speedSlim * slim,
    turn: 1 + g.turnSlim * slim,
  };
}

export function waterEffects(tempC: number): WaterEffects {
  const g = AQ.gardener.water;
  const t = warmth(tempC);
  const warm = Math.max(0, t), cold = Math.max(0, -t);
  return {
    food: 1 + g.foodWarm * warm - g.foodCold * cold,
    hunterSpeed: 1 + g.hunterSpeedWarm * warm - g.hunterSpeedCold * cold,
    hunterSight: 1 + g.hunterSightWarm * warm - g.hunterSightCold * cold,
    preySpeed: 1 - g.preySpeedCold * cold,
    staminaRegen: 1 - g.staminaCold * cold,
  };
}

const pct = (m: number) => `${m >= 1 ? "+" : "-"}${Math.round(Math.abs(m - 1) * 100)} %`;

/** "+24 % health, -12 % speed" for a body; "no edge either way" for a medium one. */
export function describeBody(thickness: number): string {
  const b = bodyTraits(thickness);
  const parts: string[] = [];
  if (Math.abs(b.hp - 1) >= 0.01) parts.push(`${pct(b.hp)} health`);
  if (Math.abs(b.bite - 1) >= 0.01) parts.push(`${pct(b.bite)} bite damage`);
  if (Math.abs(b.speed - 1) >= 0.01) parts.push(`${pct(b.speed)} speed`);
  if (Math.abs(b.turn - 1) >= 0.01) parts.push(`${pct(b.turn)} turning`);
  return parts.length ? parts.join(", ") : "no edge either way";
}

/** One line on what the water is doing to the lake right now. */
export function describeWater(tempC: number): string {
  const w = waterEffects(tempC);
  if (Math.abs(w.food - 1) < 0.02 && Math.abs(w.hunterSpeed - 1) < 0.02) return "mild: a balanced lake";
  if (w.food > 1) return `warm: food ${pct(w.food)}, hunters ${pct(w.hunterSpeed)} faster and keener`;
  return `cold: food ${pct(w.food)}, hunters ${pct(w.hunterSpeed)} speed, stamina refills ${pct(w.staminaRegen)}`;
}
