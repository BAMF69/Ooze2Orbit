// Purpose: protect inherited progress, readable offspring causes and defensive generation saves.
import { describe, it, expect } from "vitest";
import { newGarden, evidence, offspring, inherit, readGarden, edible, resumeGarden } from "../src/game/creature/generations";
import { packBundle, unpackBundle } from "../src/game/aquatic/runSave";
describe("creature generations", () => {
  it("rejects another lineage's checkpoint while preserving matching generation progress", () => {
    const old = inherit(newGarden("herbivore"), offspring(newGarden("herbivore"), evidence())[0], "drought");
    old.source = "pond A";
    expect(resumeGarden(old, "herbivore", "pond A").generation).toBe(2);
    expect(resumeGarden(old, "herbivore", "pond B").generation).toBe(1);
    expect(resumeGarden(old, "carnivore", "pond A").traits.diet).toBe("carnivore");
    delete old.source;
    expect(resumeGarden(old, "herbivore", "pond A").generation).toBe(2);
    expect(resumeGarden(old, "carnivore", "pond A").generation).toBe(1);
  });
  it("starts with neither gate key and offers stronger offspring", () => {
    const g = newGarden();
    expect(g.traits.climb).toBe(false); expect(g.traits.strength).toBe(2);
    expect(offspring(g, evidence())[0].traits.strength).toBe(4);
  });
  it("exploring the cliff favors inheritable claws without changing the living parent", () => {
    const g = newGarden(), e = evidence(); e.cliff = true;
    const daughter = offspring(g, e)[1];
    expect(daughter.traits.climb).toBe(true); expect(g.traits.climb).toBe(false);
    expect(offspring(inherit(g, daughter, "drought"), evidence()).every(h => h.traits.climb)).toBe(true);
  });
  it("keeps opened routes and history while climate changes between lives", () => {
    const g = newGarden(); g.opened = [2]; g.visited = [0, 1, 2];
    const next = inherit(g, offspring(g, evidence())[0], "drought");
    expect(next.generation).toBe(2); expect(next.opened).toEqual([2]); expect(next.visited).toEqual([0, 1, 2]);
    expect(next.history[0]).toContain("Stonejaw"); expect(next.climate).toBe("drought"); expect(g.generation).toBe(1);
  });
  it("caps inherited stats and enforces diets", () => {
    const g = newGarden(); g.traits.strength = 20; g.traits.vitality = 20;
    expect(offspring(g, evidence()).every(h => h.traits.strength <= 20 && h.traits.vitality <= 20)).toBe(true);
    expect(edible("herbivore", true)).toBe(false); expect(edible("carnivore", false)).toBe(false);
    expect(edible("omnivore", true)).toBe(true);
  });
  it("behavior improves the offered traits without grinding unlimited gains", () => {
    const g = newGarden(), e = evidence(); e.fights = 3; e.plants = 3; e.solves = 1;
    const h = offspring(g, e);
    expect(h[0].traits.strength).toBe(5); expect(h[2].traits.vitality).toBe(3); expect(h[2].traits.strength).toBe(3);
    e.fights = 1000; expect(offspring(g, e)[0].traits.strength).toBe(5);
  });
  it("rejects malformed saves and round trips valid progress", () => {
    expect(readGarden(null)).toBeNull(); expect(readGarden({ ...newGarden(), opened: [99] })).toBeNull();
    expect(readGarden({ ...newGarden(), traits: { strength: -2 } })).toBeNull();
    expect(readGarden(newGarden())).toEqual(newGarden());
    expect(unpackBundle(packBundle({ creature_generations: newGarden() }, "2026-11-13")).slots.creature_generations).toEqual(newGarden());
    expect(unpackBundle(packBundle({ creature_generations: { broken: true } }, "2026-11-13")).problems).toContain("its creature garden is damaged");
  });
});
