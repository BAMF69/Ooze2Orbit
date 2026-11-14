// Regression: aquatic daughter diets must reach the creature and later stages, including old exports.
import { it, expect } from "vitest";
import { defaultLineage, writeStage } from "../src/core/lineage";
import { revealFrom } from "../src/game/aquatic/reveal";
it("hands the surviving aquatic daughter's diet to later stages", () => {
  const cell = defaultLineage(); cell.species[0].diet = "carnivore";
  const aquatic = writeStage(cell, "aquatic", [], { diet: "herbivore" });
  expect(aquatic.species[0].diet).toBe("herbivore");
  expect(cell.species[0].diet).toBe("carnivore");
  expect(writeStage(aquatic, "civ", [], {}).species[0].diet).toBe("herbivore");
  aquatic.species[0].diet = "carnivore"; // Legacy save before species diet was synchronized.
  expect(revealFrom(aquatic, 3, "creature").diet).toBe("herbivore");
  expect(revealFrom(aquatic, 3, "aquatic").diet).toBe("carnivore");
});
