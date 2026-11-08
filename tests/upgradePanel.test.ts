// ---------------------------------------------------------------------------
// upgradePanel.test.ts
// Purpose : Locks the upgrade panel's row colours (BAMF69 2026-11-08): green affordable, red short, gray maxed.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({})); // the panel class needs Phaser; rowColor does not
const { ROW_COLOR, rowColor } = await import("../src/game/cell/upgradePanel");

describe("upgrade row colours", () => {
  it("green when you have enough points (exactly enough counts)", () => {
    expect(rowColor(9, 9)).toBe(ROW_COLOR.afford);
    expect(rowColor(9, 30)).toBe(ROW_COLOR.afford);
  });
  it("red when you are short", () => {
    expect(rowColor(9, 8)).toBe(ROW_COLOR.short);
  });
  it("gray when maxed, whatever your points", () => {
    expect(rowColor(null, 0)).toBe(ROW_COLOR.maxed);
    expect(rowColor(null, 99)).toBe(ROW_COLOR.maxed);
  });
});
