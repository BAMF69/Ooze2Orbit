// Division-only perks. Pure helpers keep inheritance and effects testable without Phaser.
// Prototype values and perk choices: your pick, 2026-11-12; playtest pending.
import type { Creature } from "./rules";
import { TUNING } from "./tuning";

export const PERKS = ["foodSense", "jetBurst", "softLanding"] as const;
export type Perk = (typeof PERKS)[number];
export type PerkLevels = Readonly<Partial<Record<Perk, number>>>;
export const PERK_NAMES: Record<Perk, string> = {
  foodSense: "Food Sense", jetBurst: "Jet Burst", softLanding: "Soft Landing",
};
export const perkLevel = (c: Creature, perk: Perk): number => c.perks?.[perk] ?? 0;
export function grantPerk(c: Creature, perk: Perk): Creature {
  return { ...c, perks: { ...c.perks, [perk]: Math.min(TUNING.perks.maxRank, perkLevel(c, perk) + 1) } };
}
export const foodSenseRadius = (c: Creature): number => perkLevel(c, "foodSense") * TUNING.perks.foodSenseRadius;
export const foodLossMultiplier = (c: Creature): number => Math.pow(TUNING.perks.softLandingLossMult, perkLevel(c, "softLanding"));
export const jetCooldown = (c: Creature): number => Math.max(TUNING.perks.jetMinCooldownS,
  TUNING.perks.jetCooldownS - Math.max(0, perkLevel(c, "jetBurst") - 1) * TUNING.perks.jetCooldownReductionS);
export function perkDescription(c: Creature, perk: Perk): string {
  if (perk === "foodSense") return `Pull edible food within ${foodSenseRadius(c)}px.`;
  if (perk === "softLanding") return `${Math.round((1 - foodLossMultiplier(c)) * 100)}% less food lost on hits.`;
  return `Space / pad south: dash. ${jetCooldown(c)}s recharge.`;
}

export interface JetState { remaining: number; cooldown: number }
/** Paused scenes do not tick this state. A failed activation leaves the cooldown untouched. */
export function tickJet(c: Creature, state: JetState, dt: number, pressed: boolean): JetState {
  const remaining = Math.max(0, state.remaining - dt);
  const cooldown = Math.max(0, state.cooldown - dt);
  if (pressed && perkLevel(c, "jetBurst") > 0 && cooldown === 0) {
    return { remaining: TUNING.perks.jetDurationS, cooldown: jetCooldown(c) };
  }
  return { remaining, cooldown };
}
