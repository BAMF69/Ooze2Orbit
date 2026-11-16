// ---------------------------------------------------------------------------
// tuning.ts (creature/levelgen)
// Purpose : Every number the creature level generator and its progression model use, in one place
//           (CREATURE_LEVELGEN.md §2 and §6, agreed with BAMF69 2026-11-16). Feel and pacing live here.
// Usage   : import { LEVELGEN } from "./tuning"; LEVELGEN.stats.cap
// Notes   : Units: stat points, generations, pixels (16 px tiles), seconds. No literal in the generator.
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
export const LEVELGEN = {
  version: 2,
  attempts: 6, // generation retries per seed before the authored fallback
  stats: { cap: 30, lesserSkill: 20, ultimateSkill: 30, hpPerVitality: 3, baseHealth: 6 },
  bonusTier: { easy: 8, medium: 16, hard: 24 }, // stat threshold of a bonus vault by level difficulty
  partCap: 3, // fun parts expressed per daughter; story keys sit outside it
  // reduction = armor / (armor + a + b * tier), never above cap; enemy base damage grows per tier
  armor: { a: 12, b: 4, cap: 0.75 }, damageGrowth: 0.11,
  /** Rooms on the critical chain per difficulty: [min, max]. Branches and vaults come on top. */
  chain: { easy: [3, 4], medium: [3, 4], hard: [4, 5] } as Record<"easy" | "medium" | "hard", [number, number]>,
  branches: { nursery: 1, vaultChance: 0.6 }, // Easy always has the nursery; vaults are optional per level
  pacing: { maxSameRole: 3, maxSpikesInRow: 2 }, // no four same-role rooms or three sealed rooms in a row
  lineage: { maxGenerations: 20 }, // the simulator gives up after this many generations without a goal
} as const;
