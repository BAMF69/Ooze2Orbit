// Purpose: The progression-graph generator is deterministic, varied, and rejects every named invariant failure;
//          sphere search proves keys come before gates for the weakest lineage of each class, one adaptation per
//          daughter. Each review finding 3-6 has a deliberately broken input rejected with its named problem.
import { describe, it, expect } from "vitest";
import { generateWaterGraph, cycleCount, type BiomeGraph } from "../src/game/creature/levelgen/graph";
import { graphProblems, gardenerCircular } from "../src/game/creature/levelgen/graphProblems";
import { sphereSearch, minimalKeys, maximalKeys, reachable } from "../src/game/creature/levelgen/lineageSim";
import { MATERIALS, opens, holds, keysOf, statKey } from "../src/game/creature/levelgen/keys";

const fingerprint = (g: BiomeGraph): string => g.levels.map(l => `${l.nodes.map(n => n.role[0] + (n.reward ?? "") + (n.vaultStat ?? "")).join("")}|${l.edges.length}`).join("/");
const level = (g: BiomeGraph, tier: string) => g.levels.find(l => l.tier === tier)!;

describe("Water progression graph", () => {
  it("accepts seed 0 as the v1 topology plus a channel under Medium and Hard: 3 + nursery, 3 + channel, 4 + channel", () => {
    const g = generateWaterGraph(0);
    expect(graphProblems(g)).toEqual([]); expect(g.fallback).toBe(false);
    expect(g.levels.map(l => l.nodes.length)).toEqual([4, 4, 5]);
    expect(level(g, "easy").nodes.map(n => n.role)).toEqual(["lever", "lever", "arena", "nursery"]);
    expect(level(g, "medium").nodes.map(n => n.role)).toEqual(["drain", "shaft", "pressure", "channel"]);
    expect(cycleCount(level(g, "medium"))).toBe(1); expect(cycleCount(level(g, "hard"))).toBe(1); expect(cycleCount(level(g, "easy"))).toBe(0);
    // The ManiaMap layout: the channel spans the drain to the finale, one row below the chain.
    expect(level(g, "medium").map!.cells["medium:c"]).toEqual([{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }]);
    expect(level(g, "hard").map!.cells["hard:c"]).toEqual([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }]);
  });
  it("sphere search reports 3 generations to Hard: Easy finds both adaptations, each daughter expresses one", () => {
    const sim = sphereSearch(generateWaterGraph(0), minimalKeys("roar"));
    expect(sim.problem).toBeUndefined(); expect(sim.generations).toBe(3);
    expect(sim.spheres.map(s => s.held.filter(k => k === "gills" || k === "fins").length)).toEqual([0, 1, 2]);
    expect(sim.spheres[0].found.sort()).toEqual(["fins", "gills"]);
    console.log(`Sphere search, seed 0: ${sim.log.join("; ")}`);
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
        const sim = sphereSearch(g, minimalKeys(c));
        expect(sim.problem, `seed ${seed} ${c}: ${sim.log.join("; ")}`).toBeUndefined();
        expect(sim.generations).toBe(3); expect(sim.banked).toContain("gills"); expect(sim.banked).toContain("fins");
      }
      expect(sphereSearch(g, maximalKeys()).generations).toBe(1);
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
    // Finding 3: the loop was a field the generator set. A pure chain with the field claiming a loop is rejected, and
    // so is a second edge between the same two rooms (the old drain-to-shaft "loop").
    ["loop", g => { const l = g.levels[1]; l.nodes = l.nodes.filter(n => n.role !== "channel"); l.edges = l.edges.filter(e => !e.id.includes(":c")); l.loops = 5; }],
    ["loop", g => { const l = g.levels[1]; l.nodes = l.nodes.filter(n => n.role !== "channel"); l.edges = l.edges.filter(e => !e.id.includes(":c"));
      l.edges.push({ id: "medium:0>medium:1:bottom", from: "medium:0", to: "medium:1", fromSide: "bottom", toSide: "top", materials: ["controls"], opensWhen: "controls", reciprocal: "medium:1>medium:0:top" },
        { id: "medium:1>medium:0:top", from: "medium:1", to: "medium:0", fromSide: "top", toSide: "bottom", materials: ["controls"], opensWhen: "controls", reciprocal: "medium:0>medium:1:bottom" }); l.loops = 1; }],
    ["map layout", g => { g.levels[1].map = null; }],
    // Finding 6: pacing allowed a Hard spike with no recovery; the Gardener check never read where its controls sit.
    ["pacing", g => { for (const n of g.levels[2].nodes) if (n.role === "shaft") n.role = "lever"; }],
    ["gardener circularity", g => { g.gardener = [{ key: "gardener:raise", at: { tier: "medium", node: "medium:2" } }, { key: "gardener:divert", at: "menu" }]; }],
    ["pacing", g => { for (const n of g.levels[2].nodes) n.role = "lever"; }],
    ["class triad", g => { g.levels[1].nodes[0].role = "classTrial"; }],
    ["keys before gates", g => { g.levels[0].placements = g.levels[0].placements.filter(p => p.key !== "gills"); }],
    ["easy open", g => { g.levels[0].entry = [["gills"]]; }],
  ];
  for (const [i, [problem, mutate]] of broken.entries()) it(`rejects ${problem} (${i})`, () => {
    const g = generateWaterGraph(0); mutate(g); expect(graphProblems(g)).toContain(problem);
  });
  it("accepts a Gardener control placed where it is reachable without its own effect", () => {
    const g = generateWaterGraph(0); g.gardener = [{ key: "gardener:raise", at: { tier: "medium", node: "medium:0" } }, { key: "gardener:divert", at: "menu" }];
    expect(graphProblems(g)).toEqual([]);
  });
  it("never lets the channel bypass the sluice: the finale's hatch opens only from above", () => {
    const l = level(generateWaterGraph(0), "medium"), noRaise = new Set([...maximalKeys(), "gardener:divert"] as const);
    expect(reachable(l, noRaise).has("medium:c")).toBe(true); expect(reachable(l, noRaise).has("medium:2")).toBe(false);
  });
  // Finding 4: the check only asked that a class door exist; the variant must be a class the lineage has.
  it("rejects a class door built for a class the lineage lacks (class triad)", () => {
    for (let seed = 1; seed < 80; seed++) {
      const g = generateWaterGraph(seed), trials = g.levels.flatMap(l => l.nodes).filter(n => n.role === "classTrial"), trial = trials[0]; if (!trial) continue;
      for (const t of trials) t.classVariant = "roar"; expect(graphProblems(g, ["roar"])).toEqual([]);
      trial.classVariant = "burrow"; expect(graphProblems(g, ["roar"])).toContain("class triad");
      trial.classVariant = undefined; expect(graphProblems(g, ["roar"])).toContain("class triad");
      return;
    }
    throw new Error("no class trial in 80 seeds");
  });
  // Finding 5: the old simulator let one daughter express both adaptations (2 generations). Express them together
  // and the count drops below what the game allows; sphere search refuses that shortcut.
  it("needs a generation per expressed adaptation (keys before gates)", () => {
    const g = generateWaterGraph(0);
    g.levels[2].entry = [["gills", "fins"]]; expect(sphereSearch(g, minimalKeys("roar")).generations).toBe(3);
    g.levels[0].placements = g.levels[0].placements.filter(p => p.key !== "fins"); // fins nowhere: Hard never opens
    expect(graphProblems(g)).toContain("keys before gates");
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
