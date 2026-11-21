// Purpose: Physical hub reachability and avatar readiness regressions for the creature overworld.
// Authored: Written with Codex (GPT-6).
import { describe, it, expect } from "vitest";
import type * as Phaser from "phaser";
import { OVERWORLD, BIOME_PATHS, WATER_PATHS, hubSolid, nearLandmark } from "../src/game/creature/overworld";
import { newBody, stepBody, boxHits } from "../src/game/creature/physics";
import { AVATAR_ASSETS, avatarAssetsReady, queueAvatarAssets } from "../src/game/creature/avatarAssets";

describe("walkable creature overworld", () => {
  for (const water of [false, true]) it(`walks to every ${water ? "Water difficulty" : "biome"} entrance and back`, () => {
    const paths = water ? WATER_PATHS : BIOME_PATHS, b = newBody(water ? 64 : OVERWORLD.nest, OVERWORLD.floor);
    for (const path of paths) {
      for (let n = 0; n < 1200 && !nearLandmark(b.x, path.x); n++) {
        stepBody(b, { dir: 1, jump: false, speed: 105 }, 1 / 60, (x, y) => hubSolid(water, x, y));
        expect(boxHits(b.x, b.y, b.w, b.h, (x, y) => hubSolid(water, x, y))).toBe(false);
      }
      expect(nearLandmark(b.x, path.x), path.name).toBe(true);
    }
    for (let n = 0; n < 1500 && b.x > 112; n++) stepBody(b, { dir: -1, jump: false, speed: 105 }, 1 / 60, (x, y) => hubSolid(water, x, y));
    expect(b.x).toBeLessThanOrEqual(112);
  });
  it("provides enough camera/world width for exploration rather than a compressed menu screen", () => {
    expect(OVERWORLD.width).toBeGreaterThan(640 * 2);
    expect(OVERWORLD.waterWidth).toBeGreaterThan(640);
    expect(BIOME_PATHS.map(p => p.name)).toEqual(["Water", "Jungle", "Mountains", "Ice"]);
  });
});

describe("creature avatar asset lifecycle", () => {
  function fixture(ready: string[], missingFrame = -1) {
    const queued: string[] = [], removed: string[] = [];
    const scene = { textures: { exists: (key: string) => ready.includes(key),
      get: () => ({ has: (frame: string) => Number(frame) !== missingFrame }), remove: (key: string) => removed.push(key) },
      load: { spritesheet: (key: string) => queued.push(key) } } as unknown as Phaser.Scene;
    return { scene, queued, removed };
  }
  it("refuses avatars when loading completed without textures", () => {
    const f = fixture([]); expect(avatarAssetsReady(f.scene)).toBe(false);
    queueAvatarAssets(f.scene); expect(f.queued).toEqual(AVATAR_ASSETS.map(a => a.key));
  });
  it("rejects incomplete cached sheets instead of using missing frames", () => {
    const f = fixture(["genWalker", "genFoe"], 3); expect(avatarAssetsReady(f.scene)).toBe(false);
    queueAvatarAssets(f.scene); expect(f.removed).toEqual(["genWalker", "genFoe"]); expect(f.queued).toHaveLength(2);
  });
  it("reuses valid cached sheets on scene restart", () => {
    const f = fixture(["genWalker", "genFoe"]); expect(avatarAssetsReady(f.scene)).toBe(true);
    queueAvatarAssets(f.scene); expect(f.queued).toEqual([]); expect(f.removed).toEqual([]);
  });
});
