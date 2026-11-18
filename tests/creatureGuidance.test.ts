// Purpose: The 2026-11-17 playtest confusions (pt7: Hard locked after Reedheart; pt15: Reedheart cannot beat the
//          current) each get a message naming what is missing and how the lineage gets it; the HUD rack lists
//          equipped traits and banked discoveries separately.
import { describe, it, expect } from "vitest";
import { currentAdvice, levelAdvice, heirNote, generationPlan } from "../src/game/creature/guidance";
import { equipmentRows } from "../src/game/creature/creatureIcons";
import { attachExpedition, freshExpedition, levelLock } from "../src/game/creature/expedition";
import { newGarden, offspring, evidence, inherit } from "../src/game/creature/generations";
import { bankCargo } from "../src/game/creature/waterObjectives";
import { generateWaterV2 } from "../src/game/creature/levelgen/world";

const hard = generateWaterV2(15).rooms.find(r => r.tier === "hard" && r.current)!;
const base = newGarden().traits;
describe("Current-room guidance (pt15)", () => {
  it("names the missing piece: fins, diversion, or both; silent when the creature can swim upstream", () => {
    const e = freshExpedition(15);
    expect(currentAdvice(hard, base, e)).toMatch(/Two things.*raise the basin first.*fins/);
    expect(currentAdvice(hard, { ...base, fins: true }, { ...e, basinRaised: true })).toMatch(/Divert torrent/);
    const noFins = currentAdvice(hard, base, { ...e, basinRaised: true, torrentDiverted: true })!;
    expect(noFins).toMatch(/no swimming fins/); expect(noFins).toMatch(/nursery/);
    expect(currentAdvice(hard, base, { ...e, torrentDiverted: true, unlocked: ["fins"] })).toMatch(/Fins are banked.*Reedheart/);
    expect(currentAdvice(hard, { ...base, fins: true }, { ...e, basinRaised: true, torrentDiverted: true })).toBeNull();
    expect(currentAdvice(generateWaterV2(15).rooms[0], base, e)).toBeNull();
  });
});
describe("Level gate guidance (pt7)", () => {
  it("explains a Reedheart lineage without gills and the two-generation route", () => {
    let g = attachExpedition(newGarden(), 7, [], "roar");
    g = bankCargo(g, { samples: ["fins"], clears: [] }); g = inherit(g, offspring(g, evidence())[2], "flood");
    expect(levelLock("hard", g.traits)).not.toBeNull();
    const msg = levelAdvice("hard", g.traits, g.expedition!)!;
    expect(msg).toMatch(/Hard needs gills and swimming fins/); expect(msg).toMatch(/has swimming fins/); expect(msg).toMatch(/reef.*Tidefoot/);
    const none = levelAdvice("hard", base, { ...freshExpedition(7), unlocked: ["gills", "fins"] })!;
    expect(none).toMatch(/choose Tidefoot.*then.*choose Reedheart/); expect(none).toMatch(/two generations/);
    expect(levelAdvice("easy", base, freshExpedition(7))).toBeNull();
    expect(levelAdvice("hard", { ...base, gills: true, fins: true }, freshExpedition(7))).toBeNull();
  });
  it("flags a daughter who will not express her adaptation, and plans the generations at the nest", () => {
    let g = attachExpedition(newGarden(), 7, [], "roar");
    const plain = offspring(g, evidence());
    expect(heirNote(plain[2], g)).toMatch(/NOT have swimming fins/); expect(heirNote(plain[0], g)).toBeNull();
    g = bankCargo(g, { samples: ["gills", "fins"], clears: [] });
    const both = offspring(g, evidence());
    expect(heirNote(both[1], g)).toMatch(/will express gills/);
    expect(generationPlan(g)).toMatch(/each daughter adds only one.*Tidefoot.*Reedheart/s);
    g = inherit(g, both[1], "flood"); expect(generationPlan(g)).toMatch(/Reedheart \(fins\) adds the last/);
    g = inherit(g, offspring(g, evidence())[2], "flood"); expect(generationPlan(g)).toBeNull();
    expect(g.traits.gills && g.traits.fins).toBe(true);
  });
});
describe("HUD equipment rack", () => {
  it("separates equipped traits from banked discoveries and lists the class skill", () => {
    const e = { ...freshExpedition(7), unlocked: ["gills", "fins", "iceBreath"] as ("gills" | "fins" | "iceBreath")[] };
    const r = equipmentRows({ ...base, fins: true, classSkills: ["burrow"] }, e);
    expect(r.equipped.map(i => i.icon)).toEqual(["fins", "burrow"]);
    expect(r.banked.map(i => i.icon)).toEqual(["gills", "iceBreath"]);
    expect(r.banked[0].label).toMatch(/Tidefoot/);
    expect(equipmentRows(base, freshExpedition(7))).toEqual({ equipped: [], banked: [] });
  });
});
