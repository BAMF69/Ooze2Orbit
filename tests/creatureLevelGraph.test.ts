// Purpose: The progression-graph generator is deterministic, varied, and rejects every named invariant failure;
//          the lineage simulator proves keys come before gates for the weakest lineage of each class.
import { describe, it, expect } from "vitest";
import { generateWaterGraph, type BiomeGraph } from "../src/game/creature/levelgen/graph";
import { graphProblems, gardenerCircular } from "../src/game/creature/levelgen/graphProblems";
import { simulateLineage, minimalKeys, maximalKeys, reachable } from "../src/game/creature/levelgen/lineageSim";
import { MATERIALS, opens, holds, keysOf, statKey } from "../src/game/creature/levelgen/keys";

const fingerprint = (g: BiomeGraph): string => g.levels.map(l => `${l.nodes.map(n => n.role[0] + (n.reward ?? "") + (n.vaultStat ?? "")).join("")}|${l.edges.length}`).join("/");
const level = (g: BiomeGraph, tier: string) => g.levels.find(l => l.tier === tier)!;

describe("Water progression graph", () => {
  it("accepts seed 0 as the v1 topology: 3 + nursery, 3, 4 rooms, one Medium loop", () => {
    const g = generateWaterGraph(0);
    expect(graphProblems(g)).toEqual([]); expect(g.fallback).toBe(false);
    expect(g.levels.map(l => l.nodes.length)).toEqual([4, 3, 4]);
    expect(level(g, "easy").nodes.map(n => n.role)).toEqual(["lever", "lever", "arena", "nursery"]);
    expect(level(g, "medium").loops).toBe(1); expect(level(g, "hard").loops).toBe(1);
  });
  it("generates 500 valid, varied graphs without fallback and replays them exactly", () => {
    const prints = new Set<string>(); let vaults = 0, trials = 0, rejected = 0;
    for (let seed = 0; seed <= 500; seed++) {
      const g = generateWaterGraph(seed);
      expect(graphProblems(g), `seed ${seed}`).toEqual([]); expect(g.fallback, `seed ${seed}`).toBe(false);
      rejected += g.rejected.length; prints.add(fingerprint(g));
      vaults += g.levels.filter(l => l.nodes.some(n => n.role === "vault")).length;
      trials += g.levels.filter(l => l.nodes.some(n => n.role === "classTrial")).length;
      expect(generateWaterGraph(seed)).toEqual(g);
    }
    expect(prints.size).toBeGreaterThan(60); expect(vaults).toBeGreaterThan(400); expect(trials).toBeGreaterThan(100);
    console.log(`Water graphs: 501 seeds, ${prints.size} distinct topologies, ${vaults} vaults, ${trials} class trials, ${rejected} rejected attempts`);
  });
  it("places every story key before the gate that needs it, for each class and for the strongest lineage", () => {
    for (const seed of [0, 1, 7, 42, 99, 255, 1001, 0xffffffff]) {
      const g = generateWaterGraph(seed);
      for (const c of ["roar", "burrow", "tool"] as const) {
        const sim = simulateLineage(g, minimalKeys(c));
        expect(sim.problem, `seed ${seed} ${c}: ${sim.log.join("; ")}`).toBeUndefined();
        expect(sim.generations).toBe(2); expect(sim.banked).toContain("gills"); expect(sim.banked).toContain("fins");
      }
      expect(simulateLineage(g, maximalKeys()).generations).toBe(1);
    }
  });
  it("keeps vaults optional: the weakest lineage never enters one, a stat at the tier opens it", () => {
    let checked = 0;
    for (let seed = 1; seed <= 200; seed++) for (const l of generateWaterGraph(seed).levels) {
      const vault = l.nodes.find(n => n.role === "vault"); if (!vault) continue;
      const edge = l.edges.find(e => e.to === vault.id)!, threshold = { easy: 8, medium: 16, hard: 24 }[l.tier];
      const weak = new Set([...maximalKeys()].filter(k => !k.startsWith("stat:")));
      expect(reachable(l, new Set([...weak, "gardener:raise", "gardener:divert"])).has(vault.id)).toBe(false);
      expect(reachable(l, new Set([...weak, "gardener:raise", "gardener:divert", statKey(vault.vaultStat!, threshold - 1)])).has(vault.id)).toBe(false);
      expect(reachable(l, new Set([...weak, "gardener:raise", "gardener:divert", statKey(vault.vaultStat!, threshold)])).has(vault.id)).toBe(true);
      expect(edge.keys).toBeDefined(); checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });
  const broken: [string, (g: BiomeGraph) => void][] = [
    ["graph identity", g => { g.levels[0].nodes.push({ ...g.levels[0].nodes[0] }); }],
    ["reciprocity", g => { g.levels[1].edges.pop(); }],
    ["critical materials", g => { g.levels[1].edges[0].materials = ["vaultStrength"]; }],
    ["critical chain", g => { g.levels[2].edges = g.levels[2].edges.filter(e => e.id !== "hard:0>hard:1:right"); }],
    ["bonus isolation", g => { g.levels[0].placements.push({ kind: "storyKey", key: "gills", node: "easy:v" }); g.levels[0].nodes.push({ ...g.levels[0].nodes[0], id: "easy:v", role: "vault", onCritical: false, depth: 9 }); }],
    ["loop", g => { g.levels[1].loops = 0; }],
    ["pacing", g => { for (const n of g.levels[2].nodes) n.role = "lever"; }],
    ["class triad", g => { g.levels[1].nodes[0].role = "classTrial"; }],
    ["keys before gates", g => { g.levels[0].placements = g.levels[0].placements.filter(p => p.key !== "gills"); }],
    ["easy open", g => { g.levels[0].entry = [["gills"]]; }],
  ];
  for (const [problem, mutate] of broken) it(`rejects ${problem}`, () => {
    const g = generateWaterGraph(0); mutate(g); expect(graphProblems(g)).toContain(problem);
  });
  it("detects circular Gardener prerequisites", () => {
    expect(gardenerCircular({ "gardener:raise": [], "gardener:divert": ["gardener:raise"] })).toBe(false);
    expect(gardenerCircular({ "gardener:raise": ["gardener:divert"], "gardener:divert": ["gardener:raise"] })).toBe(true);
  });
});
describe("Keys and materials", () => {
  it("never lets a skill or fun part open a critical material", () => {
    const cheats = new Set(["play", "skill:strength:30", "skill:agility:30", "part:fullArmor", "part:iceBreath", statKey("vitality", 30)] as const);
    for (const m of Object.values(MATERIALS)) if (m.critical && m.id !== "controls") expect(opens(m, cheats), m.id).toBe(false);
    expect(opens(MATERIALS.torrent, new Set(["fins", "gardener:divert"] as const))).toBe(true);
    expect(opens(MATERIALS.torrent, new Set(["fins"] as const))).toBe(false);
    expect(opens(MATERIALS.classDoor, new Set(["class:burrow"] as const))).toBe(true);
  });
  it("orders stat keys and derives a key set from traits and world terrain", () => {
    expect(holds(new Set([statKey("strength", 12)]), statKey("strength", 8))).toBe(true);
    expect(holds(new Set([statKey("strength", 7)]), statKey("strength", 8))).toBe(false);
    const keys = keysOf({ stats: { strength: 20, agility: 30 }, gills: true, classSkills: ["tool"], parts: ["iceBreath"] }, { basinRaised: true, torrentDiverted: false });
    for (const k of ["gills", "class:tool", "part:iceBreath", "skill:strength:20", "skill:agility:30", "gardener:raise"]) expect(keys.has(k as never), k).toBe(true);
    expect(keys.has("skill:strength:30")).toBe(false); expect(keys.has("gardener:divert")).toBe(false);
  });
});
