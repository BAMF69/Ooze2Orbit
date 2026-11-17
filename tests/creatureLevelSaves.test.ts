// Purpose: Save compatibility for generated worlds. A version 1 expedition keeps replaying the frozen skeleton;
//          new gardens get version 2 graph worlds; class skills come from the dominant temperament and persist.
import { describe, it, expect } from "vitest";
import { attachExpedition, freshExpedition, validExpedition, classFromTemperament, discover } from "../src/game/creature/expedition";
import { newGarden, readGarden, inherit, offspring, evidence } from "../src/game/creature/generations";
import { generateWater } from "../src/game/creature/waterWorld";
import { generateWaterV2, levelEntry } from "../src/game/creature/levelgen/world";
import { packBundle, unpackBundle } from "../src/game/aquatic/runSave";

describe("Generated world saves", () => {
  it("gives a new garden a version 2 world and its class skill, and round trips it through export", () => {
    const g = attachExpedition(newGarden(), 42, ["gills"], "burrow");
    expect(g.expedition!.version).toBe(2); expect(g.traits.classSkills).toEqual(["burrow"]); expect(g.traits.gills).toBe(true);
    const visited = { ...g, expedition: { ...g.expedition!, visited: [0, 12, 15] } };
    expect(readGarden(visited)).toEqual(visited);
    expect(unpackBundle(packBundle({ creature_generations: visited }, "2026-11-17")).slots.creature_generations).toEqual(visited);
  });
  it("keeps an existing version 1 world on its frozen skeleton and room ids", () => {
    const v1 = { ...newGarden(), expedition: { ...freshExpedition(42, 1), visited: [0, 3, 10] } };
    expect(readGarden(v1)).not.toBeNull();
    expect(readGarden({ ...v1, expedition: { ...v1.expedition, visited: [11] } })).toBeNull();
    const resumed = attachExpedition(v1, 99, [], "tool");
    expect(resumed.expedition).toEqual(v1.expedition); expect(resumed.traits.classSkills).toEqual(["tool"]);
    expect(generateWater(42).rooms).toHaveLength(11);
  });
  it("keeps class skills and fun parts through inheritance; daughters keep the lineage's keys", () => {
    let g = attachExpedition(newGarden(), 7, [], "roar");
    g = discover(g, "iceBreath"); expect(g.expedition!.unlocked).toContain("iceBreath");
    g = inherit(g, offspring(g, evidence())[0], "flood");
    expect(g.traits.classSkills).toEqual(["roar"]);
    expect(validExpedition({ ...g.expedition, unlocked: ["wings"] })).toBe(false);
  });
  it("picks the class skill from the dominant temperament share", () => {
    expect(classFromTemperament({ aggressive: 50, cautious: 30, adaptable: 20 })).toBe("roar");
    expect(classFromTemperament({ aggressive: 10, cautious: 60, adaptable: 30 })).toBe("burrow");
    expect(classFromTemperament({ aggressive: 10, cautious: 20, adaptable: 70 })).toBe("tool");
  });
  it("builds class trials for the lineage's own class, and enters each level at its generated start", () => {
    for (const seed of [3, 9, 17, 23, 31]) for (const c of ["roar", "burrow", "tool"] as const) {
      const w = generateWaterV2(seed, [c]);
      for (const r of w.rooms) if (r.spec!.keyed?.opens === "keyOpen") expect(r.spec!.variant).toBe(c);
      for (const tier of ["easy", "medium", "hard"] as const) expect(w.rooms.find(r => r.id === levelEntry(w, tier))!.tier).toBe(tier);
    }
  });
});
