// Purpose: Procedural invariants, actual-controller traversal and lineage-safe Water progression.
// Notes: Broken-world tests prove each validator can reject its corresponding failure.
// Authored: Written with Codex (GPT-6).
import { describe, it, expect } from "vitest";
import { generateWater, worldProblems, WATER, returnX, type WaterWorld } from "../src/game/creature/waterWorld";
import { attachExpedition, freshExpedition, discover, intervene, completeLevel, levelLock, weatherEvent, stepWeather } from "../src/game/creature/expedition";
import { newGarden, offspring, evidence, inherit, readGarden, resumeGarden, creatureSource } from "../src/game/creature/generations";
import { writeStage } from "../src/core/lineage";
import { switchback, challengeSolid } from "../src/game/creature/waterChallenges";
import { newBody, boxHits } from "../src/game/creature/physics";
import { stepWaterBody } from "../src/game/creature/waterPhysics";
import { packBundle, unpackBundle } from "../src/game/aquatic/runSave";

function fingerprint(w: WaterWorld): string {
  let h = 2166136261; for (const c of JSON.stringify(w.rooms)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16);
}
describe("Water generation rubric", () => {
  const broken: [string, (w: WaterWorld) => void][] = [
    ["room identity", w => { w.rooms.pop(); }],
    ["connected paths", w => { w.rooms[0].right = 0; }],
    ["Gardener crossing", w => { w.rooms.filter(r => r.tier === "easy").forEach(r => { r.gate = false; }); }],
    ["starter access", w => { w.rooms[0].tunnel = true; }],
    ["reachable adaptations", w => { delete w.rooms[3].reward; }],
    ["return routes", w => { w.rooms[2].left = -1; }],
    ["lattice geometry", w => { w.rooms[1].gateX = 301; }],
    ["body clearance", w => { w.rooms[0].platforms.push({ x: 160, y: 288, width: 32 }); }],
    ["food spacing", w => { w.rooms[0].food = [0]; }],
    ["encounter safety", w => { w.rooms[0].foes = [48]; }],
  ];
  for (const [problem, mutate] of broken) it(`rejects ${problem}`, () => {
    const w = generateWater(0); mutate(w); expect(worldProblems(w)).toContain(problem);
  });
  it("validates authored seed 0 and 500 generated worlds without fallback", () => {
    const signatures = new Set<string>();
    for (let seed = 0; seed <= 500; seed++) {
      const w = generateWater(seed);
      expect(worldProblems(w), `seed ${seed}`).toEqual([]); expect(w.fallback, `seed ${seed}`).toBe(false);
      expect(w.rejected).toEqual([]); signatures.add(fingerprint(w));
    }
    expect(signatures.size).toBeGreaterThan(490);
    console.log(`Water rubric: 501 seeds, ${signatures.size} layouts, 0 rejections, 0 fallbacks`);
  }, 20000);
  it("replays deterministically, including unsigned boundary seeds", () => {
    for (const seed of [0, 1, 42, 0x7fffffff, 0xffffffff]) expect(generateWater(seed)).toEqual(generateWater(seed));
    // Pinned once the v1 grammar is established; changes require an explicit generator version decision.
    expect([0, 1, 42].map(s => fingerprint(generateWater(s)))).toEqual(["9f8dd9c7", "5e9e7982", "300e3301"]);
  });
});

describe("Water inheritance and Gardener", () => {
  it("keeps a standalone world's checkpoint after its own hero creates the default home", () => {
    const source = creatureSource(undefined, "omnivore");
    const g = { ...attachExpedition(newGarden(), 42, []), generation: 3, source };
    const heroLineage = writeStage(undefined, "creature", [], { diet: "omnivore", hero: g.traits });
    expect(creatureSource(heroLineage, "omnivore")).toBe(source);
    expect(resumeGarden(g, "omnivore", creatureSource(heroLineage, "omnivore")).generation).toBe(3);
    const legacy = { ...g, source: '[null,"omnivore",null,null,null]' };
    expect(resumeGarden(legacy, "omnivore", source).generation).toBe(3);
    const aquatic = writeStage(heroLineage, "aquatic", [], { diet: "omnivore", parts: ["gills"] });
    expect(resumeGarden(legacy, "omnivore", creatureSource(aquatic, "omnivore")).generation).toBe(1);
    expect(resumeGarden(g, "omnivore", creatureSource(aquatic, "omnivore")).generation).toBe(1);
  });
  it("discovers adaptations without mutating the living parent; daughters can combine them", () => {
    let g = attachExpedition(newGarden("herbivore"), 42, []);
    expect(levelLock("easy", g.traits)).toBeNull(); expect(levelLock("medium", g.traits)).toContain("gills");
    g = discover(discover(g, "gills"), "fins");
    expect(g.traits.gills).toBe(false); expect(g.traits.fins).toBe(false);
    const h = offspring(g, evidence()); expect(h[1].traits.gills).toBe(true); expect(h[1].cause).toContain("Breathing-reef");
    expect(h[2].traits.fins).toBe(true); expect(levelLock("hard", h[1].traits)).toContain("fins");
    g = inherit(g, h[1], "flood"); g = inherit(g, offspring(g, evidence())[2], "drought");
    expect(levelLock("hard", g.traits)).toBeNull(); expect(g.traits.diet).toBe("herbivore");
    expect(offspring(g, evidence()).every(h => h.traits.gills && h.traits.fins)).toBe(true);
  });
  it("honors aquatic parts while retaining an existing world's seed and unknown fields", () => {
    const base = { ...newGarden("carnivore"), futureField: { keep: true } };
    const g = attachExpedition(base, 42, ["gills", "torrent"]);
    expect(g.traits.gills && g.traits.fins).toBe(true);
    const resumed = attachExpedition(g, 99, []); expect(resumed.expedition!.seed).toBe(42);
    expect((readGarden(g) as unknown as typeof base).futureField).toEqual({ keep: true });
  });
  it("persists only permanent terrain changes and makes weather expire on gameplay time", () => {
    let g = attachExpedition(newGarden(), 5, []);
    expect(intervene(g, "divert")).toBe(g);
    g = intervene(intervene(g, "raise"), "divert");
    const again = intervene(g, "raise"); expect(again).toBe(g);
    const next = inherit(g, offspring(g, evidence())[0], "drought");
    expect(next.expedition).toEqual(g.expedition); expect(next.history.join(" ")).toContain("Gardener");
    expect(stepWeather(weatherEvent("flood"), 0).remaining).toBe(WATER.weatherSeconds);
    expect(stepWeather(weatherEvent("flood"), 60).remaining).toBe(0);
  });
  it("round trips generation saves/exports and rejects mismatched lineage or malformed extensions", () => {
    let g = attachExpedition(newGarden("herbivore"), 123, []); g.source = "aquatic A";
    g = completeLevel(discover(intervene(g, "raise"), "gills"), "easy");
    g = inherit(g, offspring(g, evidence())[1], "drought");
    const loaded = unpackBundle(packBundle({ creature_generations: g }, "2026-11-13")).slots.creature_generations;
    expect(loaded).toEqual(g); expect(resumeGarden(loaded, "herbivore", "aquatic A")).toEqual(g);
    expect(resumeGarden(loaded, "herbivore", "aquatic B").expedition).toBeUndefined();
    expect(resumeGarden(loaded, "carnivore", "aquatic A").generation).toBe(1);
    expect(readGarden({ ...g, traits: { ...g.traits, classSkills: ["laser"] } })).toBeNull();
    for (const bad of [{ seed: -1 }, { version: 1, visited: [99] }, { visited: [-1] }, { unlocked: ["wings"] }, { basinRaised: 1 }, { completed: ["ice"] }, { version: 3 }])
      expect(readGarden({ ...g, expedition: { ...g.expedition, ...bad } })).toBeNull();
  });
});

describe("Water actual-controller traversal", () => {
  const traits = { ...newGarden().traits, gills: true, fins: true };
  it("blocks every movement style at the easy sluice until the Gardener acts", () => {
    const r = generateWater(42).rooms[1], e = freshExpedition(42);
    for (const style of ["walk", "jump", "hide"]) {
      const b = newBody(48, WATER.floor);
      for (let n = 0; n < 1500; n++) stepWaterBody(b, r, e, traits,
        { dir: 1, vertical: 0, jump: style === "jump" && n % 40 === 0, crouch: style === "hide", sprint: true }, 1 / 60);
      expect(b.x).toBeLessThan(r.gateX);
    }
  });
  it("returns from the nursery on the entrance side of the mandatory sluice", () => {
    for (let seed = 0; seed < 50; seed++) {
      const w = generateWater(seed), branch = w.rooms[3], parent = w.rooms[branch.left];
      expect(returnX(branch)).toBeLessThan(parent.gateX);
      expect(returnX(branch)).toBe(126);
    }
  });
  it("requires BOTH a diverted torrent and inherited fins for upstream traversal", () => {
    const r = generateWater(0).rooms[8];
    for (const [diverted, fins, crosses] of [[false, true, false], [true, false, false], [true, true, true]] as const) {
      const e = { ...freshExpedition(0), basinRaised: true, torrentDiverted: diverted }, b = newBody(48, WATER.floor);
      for (let n = 0; n < 1800; n++) stepWaterBody(b, r, e, { ...traits, fins }, { dir: 1, vertical: 1, jump: false, crouch: false, sprint: false }, 1 / 60);
      expect(b.x > 590, `diverted ${diverted}, fins ${fins}`).toBe(crosses);
    }
  });
  it("walks authored seed and eight generated worlds with three controller strategies", () => {
    let crossed = 0;
    for (const seed of [0, 1, 2, 3, 7, 42, 101, 255, 0xffffffff]) {
      const w = generateWater(seed), e = { ...freshExpedition(seed), basinRaised: true, torrentDiverted: true };
      for (const r of w.rooms) for (const style of ["careful", "runner", "explorer"]) {
        const b = newBody(48, WATER.floor);
        for (let n = 0; n < 1800 && b.x < 600; n++) {
          const targetY = switchback(r) && b.x >= 250 && b.x < 365 ? 244 : 288;
          stepWaterBody(b, r, e, traits, { dir: 1, vertical: b.y > targetY + 2 ? -1 : b.y < targetY - 2 ? 1 : 0, jump: false, crouch: style === "careful", sprint: style === "runner" }, 1 / 60);
          if (boxHits(b.x, b.y, b.w, b.h, (x, y) => challengeSolid(r, true, x, y))) throw Error(`Collision penetration: seed ${seed}, room ${r.id}, ${style}`);
        }
        expect(b.x, `seed ${seed}, room ${r.id}, ${style}`).toBeGreaterThanOrEqual(600); crossed++;
      }
    }
    console.log(`Water controller bots: ${crossed} room traversals, 3 strategies, authored + 8 generated worlds`);
  }, 20000);
});
