// ---------------------------------------------------------------------------
// ladder.ts (creature/levelgen)
// Purpose : The cross-biome difficulty ladder (BAMF69 2026-11-18, CREATURE_LEVELGEN.md §7a step 2): twelve tiers,
//           three per biome, each strictly bigger, more complex and harder than the one before, across biome
//           boundaries too: Jungle Easy (tier 4) is beyond Water Hard (tier 3). The generator reads a level's
//           tier, never its biome, for size, stitched-room width, segment difficulty, loops and enemy density.
// Usage   : ladderTier("water", "medium") -> TierSpec ; LADDER[tier - 1]
// Notes   : Pure data. Sizes are screens on the critical path (a one-screen room is 1, a stitched room its cell
//           count). The authored seed-0 world is the hand-made fallback and is exempt (it predates the ladder).
//           Tiers 4-12 are placeholders until their biomes exist; tests hold them to the same monotonic rules.
// Authored: Written with Claude (Opus 5.5).
// ---------------------------------------------------------------------------
import type { Difficulty } from "../waterWorld";

export type Biome = "water" | "jungle" | "mountains" | "ice";
export const BIOMES: readonly Biome[] = ["water", "jungle", "mountains", "ice"];
export interface TierSpec {
  tier: number; biome: Biome; difficulty: Difficulty;
  /** Screens on the critical path, [min, max]: every generated level of this tier lands inside. */
  screens: [number, number];
  /** Width in screens of one stitched room, [min, max]; [1, 1] means no stitched rooms (Easy teaches on one screen). */
  roomCells: [number, number];
  /** Segment difficulty ratings (1-12) this tier may draw, [min, max]. */
  segments: [number, number];
  /** Minimum independent cycles per level. */
  loops: number;
  /** Most enemies in one screen of a room. */
  enemiesPerScreen: number;
  /** Whether rooms are proved at minimum traits (Water) or at the tier's baseline stats (§2.3a, step 3). */
  proof: "minimumTraits" | "baselineStats";
}
const DIFFS: readonly Difficulty[] = ["easy", "medium", "hard"];
// screens, roomCells, segments, loops, enemies per screen: one row per tier.
const ROWS: [[number, number], [number, number], [number, number], number, number][] = [
  [[3, 4], [1, 1], [1, 2], 0, 1],     // 1  Water Easy: one-screen teaching rooms
  [[5, 7], [2, 3], [2, 3], 1, 2],     // 2  Water Medium
  [[8, 11], [2, 4], [3, 4], 1, 3],    // 3  Water Hard
  [[12, 16], [2, 4], [4, 5], 2, 3],   // 4  Jungle Easy: beyond Water Hard in every column
  [[17, 22], [3, 5], [5, 6], 2, 3],
  [[23, 29], [3, 5], [6, 7], 2, 4],
  [[30, 37], [3, 5], [7, 8], 3, 4],   // 7  Mountains
  [[38, 46], [3, 5], [8, 9], 3, 4],
  [[47, 56], [4, 5], [9, 10], 3, 5],
  [[57, 67], [4, 5], [10, 11], 4, 5], // 10 Ice
  [[68, 79], [4, 5], [11, 12], 4, 5],
  [[80, 92], [4, 5], [12, 12], 4, 6],
];
export const LADDER: readonly TierSpec[] = ROWS.map(([screens, roomCells, segments, loops, enemiesPerScreen], i) => ({
  tier: i + 1, biome: BIOMES[Math.floor(i / 3)], difficulty: DIFFS[i % 3], screens, roomCells, segments, loops, enemiesPerScreen,
  proof: i < 3 ? "minimumTraits" : "baselineStats",
}));
export function ladderTier(biome: Biome, difficulty: Difficulty): TierSpec {
  const t = LADDER.find(t => t.biome === biome && t.difficulty === difficulty);
  if (!t) throw new Error(`ladder: no tier for ${biome} ${difficulty}`);
  return t;
}
/** Named problems if the ladder ever stops climbing (tests/creatureLadder.test.ts). */
export function ladderProblems(ladder: readonly TierSpec[] = LADDER): string[] {
  const bad = new Set<string>();
  ladder.forEach((t, i) => {
    if (t.screens[0] > t.screens[1] || t.roomCells[0] > t.roomCells[1] || t.segments[0] > t.segments[1]) bad.add("ladder range");
    if (i === 0) return;
    const p = ladder[i - 1];
    if (t.screens[0] <= p.screens[1]) bad.add("ladder size"); // strictly bigger: no overlap with the tier below
    if (t.loops < p.loops || t.roomCells[1] < p.roomCells[1]) bad.add("ladder complexity");
    if (t.segments[0] < p.segments[0] || t.segments[1] <= p.segments[1] && t.segments[1] < 12 || t.enemiesPerScreen < p.enemiesPerScreen) bad.add("ladder difficulty");
  });
  return [...bad];
}
