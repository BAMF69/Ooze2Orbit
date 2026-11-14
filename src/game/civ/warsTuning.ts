// Purpose: Civilization Toy 2 economy, combat and board tunables. PROTOTYPE values await playtest.
export const WAR = {
  cols: 11, rows: 7, entry: { x: 0, y: 3 }, exit: { x: 10, y: 3 },
  tick: 8, wave: 24, firstWave: 30, baseHp: 40, startOre: 120, startFood: 45,
  baseIncome: 8, rivalIncome: 8, incomeRatio: 5, gatherIncome: 1.5, gatherFood: 3,
  gatherCost: 35, builderCost: 40, farmerCost: 35, farmerFood: 6, maxWorkers: 20, buildSeconds: 4,
  killOre: 5, killIncome: 0.6, oreMult: 1.6, rockyDiscount: 0.65,
  heroSpeed: 2.4, heroRange: 1.7, heroDamage: 4, heroCooldown: 0.6,
  heroHp: 12, heroRespawn: 10, heroRecovery: 2, abilityRange: 2.8, abilityCooldown: 9,
  heroArrival: 0.025, heroArrivalStep: 0.05, patrolRangeFactor: 0.8, patrolPulseTargets: 2,
  unitLimit: 100, rivalGrowth: 0.15, rivalBuildEvery: 3,
};
export const TOWERS = {
  thorn: { name: "Thorn tower", cost: 30, damage: 4, range: 3.1, cooldown: 1, splash: 0, slow: 0, frame: 12 },
  mortar: { name: "Seed mortar", cost: 50, damage: 3, range: 3.8, cooldown: 1.8, splash: 1.4, slow: 0, frame: 12 },
  frost: { name: "Mist spire", cost: 40, damage: 1, range: 2.7, cooldown: 0.8, splash: 0, slow: 2, frame: 12 },
} as const;
export const SENDS = {
  runner: { name: "Reedrunner", ore: 10, food: 8, hp: 13, speed: 1.25, damage: 3, income: 0.6, armor: 0 },
  shell: { name: "Shellback", ore: 22, food: 14, hp: 40, speed: 0.65, damage: 6, income: 1.2, armor: 1 },
  swarm: { name: "Briar brood", ore: 20, food: 18, hp: 9, speed: 1.05, damage: 2, income: 1, armor: 0 },
} as const;
export type TowerKind = keyof typeof TOWERS;
export type SendKind = keyof typeof SENDS;
// ---------------------------------------------------------------------------
