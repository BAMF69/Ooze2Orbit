// Purpose: Creature HD avatar: family/diet/worn-trait selection, sheet layout, and HD loader validation.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type * as Phaser from "phaser";
import {
  avatarFamily, avatarDiet, wornTraits, avatarLook, lookStrips, lookKey, WORN_STRIPS, HD_AVATAR, AVATAR_FAMILIES, AVATAR_DIETS,
  bodyPath, wornPath, wornFrameCount, bodyKey, wornKey,
} from "../src/game/creature/avatarLook";
import { avatarAssetsReady, queueAvatarAssets, avatarSheets } from "../src/game/creature/avatarAssets";
import { CHARGER_HD, chargerFrame, FOE_HD, HD_FOE_KINDS } from "../src/game/creature/foeArt";
import { WATER_TILES, WATER_BG, OVERWORLD_BG } from "../src/game/creature/roomTiles";

describe("avatar family and diet", () => {
  it("takes the strongest temperament", () => {
    expect(avatarFamily({ aggressive: 20, cautious: 50, adaptable: 30 })).toBe("cautious");
    expect(avatarFamily({ aggressive: 10, cautious: 20, adaptable: 70 })).toBe("adaptable");
  });
  it("breaks ties aggressive, then cautious, then adaptable (aquatic bodyLook order)", () => {
    expect(avatarFamily({ aggressive: 40, cautious: 40, adaptable: 20 })).toBe("aggressive");
    expect(avatarFamily({ aggressive: 20, cautious: 40, adaptable: 40 })).toBe("cautious");
    expect(avatarFamily({})).toBe("aggressive");
  });
  it("keeps known diets and falls back to omnivore", () => {
    for (const d of AVATAR_DIETS) expect(avatarDiet(d)).toBe(d);
    expect(avatarDiet("lithovore")).toBe("omnivore");
    expect(avatarDiet(undefined)).toBe("omnivore");
  });
});

describe("worn traits", () => {
  it("maps story traits, claws and class skills, in strip order regardless of input order", () => {
    expect(wornTraits({ diet: "carnivore", climb: true, gills: true, fins: true, classSkills: ["tool", "roar"] }))
      .toEqual(["fins", "roar", "gills", "toolUse", "claws"]);
    expect(wornTraits({ diet: "herbivore", climb: false })).toEqual([]);
  });
  it("accepts only known grotto parts", () => {
    expect(wornTraits({ diet: "omnivore", climb: false, parts: ["iceBreath", "jetpack", "fullArmor"] })).toEqual(["fullArmor", "iceBreath"]);
  });
  it("puts full armor on both layers and everything else in front", () => {
    const look = avatarLook({ cautious: 60 }, { diet: "herbivore", climb: true, gills: true, parts: ["fullArmor"] });
    const s = lookStrips(look);
    expect(s.back.map(i => WORN_STRIPS[i])).toEqual([{ trait: "fullArmor", layer: "back" }]);
    expect(s.front.map(i => WORN_STRIPS[i].trait)).toEqual(["fullArmor", "gills", "claws"]);
    expect(lookKey(look)).toBe("cautious/herbivore/fullArmor,gills,claws");
  });
  it("gives every worn trait at least one strip", () => {
    for (const t of ["gills", "fins", "claws", "roar", "burrow", "toolUse", "fullArmor", "iceBreath"])
      expect(WORN_STRIPS.some(s => s.trait === t), t).toBe(true);
  });
});

/** PNG width/height straight from the IHDR chunk (no image dependency). */
function pngSize(rel: string): [number, number] {
  const b = readFileSync(`public/${rel}`);
  expect(b.subarray(1, 4).toString()).toBe("PNG"); // an LFS pointer file would fail here: run `git lfs pull`
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
describe("baked HD sheets match the layout the game slices", () => {
  for (const f of AVATAR_FAMILIES) {
    for (const d of AVATAR_DIETS) it(`${f} ${d} body`, () => {
      expect(pngSize(bodyPath(f, d))).toEqual([HD_AVATAR.bodyColumns * HD_AVATAR.cell, Math.ceil(HD_AVATAR.frames / HD_AVATAR.bodyColumns) * HD_AVATAR.cell]);
    });
    it(`${f} worn atlas`, () => {
      expect(pngSize(wornPath(f))).toEqual([HD_AVATAR.wornColumns * HD_AVATAR.cell, Math.ceil(wornFrameCount() / HD_AVATAR.wornColumns) * HD_AVATAR.cell]);
    });
  }
});

describe("HD avatar loading", () => {
  const look = { family: "adaptable", diet: "carnivore" } as const;
  function fixture(ready: string[], missing: Record<string, number> = {}) {
    const queued: string[] = [], removed: string[] = [];
    const scene = { textures: { exists: (key: string) => ready.includes(key),
      get: (key: string) => ({ has: (frame: string) => Number(frame) !== missing[key] }), remove: (key: string) => removed.push(key) },
      load: { spritesheet: (key: string, _p: string, cfg: { frameWidth: number }) => queued.push(`${key}@${cfg.frameWidth}`) } } as unknown as Phaser.Scene;
    return { scene, queued, removed };
  }
  it("queues only the lineage's body, its family atlas, the HD charger and the Water terrain", () => {
    const f = fixture(["genWalker", "genFoe"]);
    expect(avatarAssetsReady(f.scene, look)).toBe(false);
    queueAvatarAssets(f.scene, look);
    expect(f.queued).toEqual([`${bodyKey("adaptable", "carnivore")}@96`, `${wornKey("adaptable")}@96`, ...HD_FOE_KINDS.map(k => `${FOE_HD[k].key}@${FOE_HD[k].cell}`), `${WATER_TILES.key}@48`, `${WATER_BG.key}@1280`, `${OVERWORLD_BG.key}@1280`]);
  });
  it("rejects a worn atlas missing its last frame", () => {
    const keys = avatarSheets(look).map(a => a.key);
    const f = fixture(keys, { [wornKey("adaptable")]: wornFrameCount() - 1 });
    expect(avatarAssetsReady(f.scene, look)).toBe(false);
    queueAvatarAssets(f.scene, look);
    expect(f.removed).toEqual([wornKey("adaptable")]);
  });
  it("is ready when every sheet is complete", () => {
    const f = fixture(avatarSheets(look).map(a => a.key));
    expect(avatarAssetsReady(f.scene, look)).toBe(true);
  });
});

describe("HD enemy frames", () => {
  it("maps each phase to its row and steps four frames on the clock", () => {
    expect(chargerFrame("patrol", false, 0, false)).toBe(0);
    expect(chargerFrame("tell", false, 0, false)).toBe(4);
    expect(chargerFrame("strike", false, 0.26, false)).toBe(10);
    expect(chargerFrame("recover", false, 0.5, false)).toBe(12);
    expect(chargerFrame("patrol", true, 0.1, false)).toBe(16);
  });
  it("holds frame 0 of the phase under Reduced Motion", () => {
    for (const t of [0, 0.13, 0.4, 7.9]) expect(chargerFrame("tell", false, t, true)).toBe(4);
  });
  for (const k of HD_FOE_KINDS) it(`bakes a ${k} sheet the loader slices into 20 frames`, () => {
    const a = FOE_HD[k];
    expect(pngSize(a.path)).toEqual([a.columns * a.cell, Math.ceil(a.frames / a.columns) * a.cell]);
  });
  it("keeps each kind's legacy on-screen size", () => {
    expect([FOE_HD.charger.display, FOE_HD.ambusher.display, FOE_HD.swimmer.display, FOE_HD.dropper.display]).toEqual([40, 27, 32, 32]);
    expect(CHARGER_HD).toBe(FOE_HD.charger);
  });
});
