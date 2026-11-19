// Purpose: Campaign battlefield sizes, generation limits and rival difficulty tunables.
// Claude's picks: obstacle counts and rival pressure await the step-2 playtest.
export const DIFFICULTIES = {
  easy: { cols: 11, rows: 7, obstacles: 0, wave: 24, firstWave: 30, extraSends: 0, unitHealth: 1, rivalIncome: 8, rivalGrowth: .15, buildEvery: 3, defenses: 2 },
  medium: { cols: 15, rows: 9, obstacles: 12, wave: 24, firstWave: 35, extraSends: 1, unitHealth: 1.15, rivalIncome: 9, rivalGrowth: .2, buildEvery: 3, defenses: 3 },
  hard: { cols: 19, rows: 11, obstacles: 30, wave: 22, firstWave: 40, extraSends: 2, unitHealth: 1.3, rivalIncome: 10, rivalGrowth: .25, buildEvery: 2, defenses: 4 },
} as const;
export const GENERATOR_VERSION = 1;
export const TERRAIN = { attemptFactor: 12, heroOffset: 2, seedMax: 0xffffffff };
