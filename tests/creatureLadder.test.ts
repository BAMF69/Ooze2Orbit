// Purpose: The difficulty ladder climbs strictly across all twelve tiers and every biome boundary, and rejects a
//          ladder that overlaps, flattens or drops (BAMF69 2026-11-18: each biome bigger, more complex and harder).
import { describe, it, expect } from "vitest";
import { LADDER, ladderTier, ladderProblems, type TierSpec } from "../src/game/creature/levelgen/ladder";

describe("Difficulty ladder", () => {
  it("climbs strictly through twelve tiers, four biomes of three", () => {
    expect(LADDER).toHaveLength(12); expect(ladderProblems()).toEqual([]);
    expect(LADDER.map(t => `${t.biome}:${t.difficulty}`).slice(0, 4)).toEqual(["water:easy", "water:medium", "water:hard", "jungle:easy"]);
  });
  it("puts Jungle Easy beyond Water Hard in size, complexity and difficulty", () => {
    const wh = ladderTier("water", "hard"), je = ladderTier("jungle", "easy");
    expect(je.screens[0]).toBeGreaterThan(wh.screens[1]); expect(je.loops).toBeGreaterThan(wh.loops);
    expect(je.segments[0]).toBeGreaterThan(wh.segments[0]); expect(je.proof).toBe("baselineStats"); expect(wh.proof).toBe("minimumTraits");
  });
  it("keeps Easy Water on one screen per room", () => { expect(ladderTier("water", "easy").roomCells).toEqual([1, 1]); });
  const broken: [string, (l: TierSpec[]) => void][] = [
    ["ladder size", l => { l[3] = { ...l[3], screens: [10, 16] }; }],
    ["ladder complexity", l => { l[4] = { ...l[4], loops: 1 }; }],
    ["ladder difficulty", l => { l[5] = { ...l[5], segments: [4, 6] }; }],
    ["ladder range", l => { l[0] = { ...l[0], screens: [5, 3] }; }],
  ];
  for (const [problem, mutate] of broken) it(`rejects ${problem}`, () => {
    const l = LADDER.map(t => ({ ...t })); mutate(l); expect(ladderProblems(l)).toContain(problem);
  });
});
