// Purpose: The user's 100% cautious + 100% aggressive regression, cross-stage shares and legacy cache repair.
import { describe, it, expect } from "vitest";
import { balancedTemperament, defaultLineage, normalizeTemperament, temperamentOf, temperamentPercentages, stageTemperament, describeTemperament, type Temperament } from "../src/core/lineage";
import { SaveStore, SAVE_VERSION, saveName } from "../src/core/saveStore";
import { MemoryStore } from "../src/core/textStore";
import { revealFrom } from "../src/game/aquatic/reveal";
import { cellLineage, newCellRecord } from "../src/game/cell/record";
import { newCreature } from "../src/game/cell/rules";
const total = (t: Temperament) => t.cautious + t.aggressive + t.adaptable;
describe("competitive temperament shares", () => {
  it("reproduces the reported double-max build as 50/50/0", () => {
    const t = temperamentOf([{ stage: "cell", cause: "Mixed build", effect: { cautious: 2, aggressive: 2 } }]);
    expect(t).toEqual({ cautious: 0.5, aggressive: 0.5, adaptable: 0 });
    expect(describeTemperament(t)).toBe("cautious 50 %, aggressive 50 %, adaptable 0 %");
  });
  it("keeps uncapped evidence ratios instead of flattening three full meters", () => {
    const t = normalizeTemperament({ cautious: 2, aggressive: 6, adaptable: 2 });
    expect(t.cautious).toBeCloseTo(0.2); expect(t.aggressive).toBeCloseTo(0.6); expect(t.adaptable).toBeCloseTo(0.2);
  });
  it("raising one share reduces both other nonzero shares", () => {
    const before = { cautious: 0.6, aggressive: 0.2, adaptable: 0.2 };
    const after = stageTemperament(before, [{ stage: "aquatic", cause: "Hunted", effect: { aggressive: 0.4 } }]);
    expect(after.aggressive).toBeGreaterThan(before.aggressive); expect(after.cautious).toBeLessThan(before.cautious);
    expect(after.adaptable).toBeLessThan(before.adaptable); expect(total(after)).toBeCloseTo(1, 12);
  });
  it("handles rounding, no evidence, zero shares and large finite weights", () => {
    expect(temperamentPercentages(balancedTemperament())).toEqual({ cautious: 34, aggressive: 33, adaptable: 33 });
    expect(normalizeTemperament({ cautious: 1e308, aggressive: 1e308, adaptable: 0 })).toEqual({ cautious: 0.5, aggressive: 0.5, adaptable: 0 });
    expect(temperamentOf([])).toEqual(balancedTemperament());
    expect(temperamentPercentages({ cautious: 0, aggressive: 1, adaptable: 0 })).toEqual({ cautious: 0, aggressive: 100, adaptable: 0 });
  });
  it("keeps 800 varied signed stage transitions normalized, nonnegative and within the 50pp limit", () => {
    let seed = 7361; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let n = 0; n < 800; n++) {
      const from = normalizeTemperament({ cautious: random(), aggressive: random(), adaptable: random() });
      const next = stageTemperament(from, [{ stage: "aquatic", cause: "Varied actions", effect: { cautious: random() * 10 - 5, aggressive: random() * 10 - 5, adaptable: random() * 10 - 5 } }]);
      expect(total(next)).toBeCloseTo(1, 12); expect(total(temperamentPercentages(next))).toBe(100);
      for (const k of ["cautious", "aggressive", "adaptable"] as const) {
        expect(next[k]).toBeGreaterThanOrEqual(0); expect(next[k]).toBeLessThanOrEqual(1); expect(Math.abs(next[k] - from[k])).toBeLessThanOrEqual(0.500000000001);
      }
    }
  });
  it("normalizes a real mixed cell build and preserves the evidence", () => {
    const c = { ...newCreature(), parts: ["spikes", "shell"] as const, ups: { attack: 5, defense: 5, speed: 5, mobility: 5 } };
    const l = cellLineage(c, newCellRecord()); expect(total(l.species[0].temperament)).toBeCloseTo(1);
    expect(l.species[0].temperament.cautious).toBeGreaterThan(0); expect(l.species[0].temperament.aggressive).toBeGreaterThan(0);
    expect(total(temperamentPercentages(l.species[0].temperament))).toBe(100);
  });
  it("repairs actual old save caches on read/export without changing their records or unknown fields", () => {
    const store = new MemoryStore(), saves = new SaveStore(store), old = defaultLineage();
    old.species[0].influence = [{ stage: "cell", cause: "Kept mixed traits", effect: { cautious: 1.5, aggressive: 1.5, adaptable: 0 } }];
    old.species[0].temperament = { cautious: 1, aggressive: 1, adaptable: 0 }; old.futureField = { preserved: true };
    store.write(saveName("lineage"), JSON.stringify({ format: "save", version: SAVE_VERSION, data: old }));
    const loaded = saves.load("lineage").envelope!.data;
    const reveal = revealFrom(loaded); expect(reveal.rows.map(r => r.pct)).toEqual([50, 50, 0]);
    expect(loaded.futureField).toEqual({ preserved: true });
    expect((loaded.species as unknown as typeof old.species)[0].influence).toEqual(old.species[0].influence);
    expect((loaded.species as unknown as typeof old.species)[0].temperament).toEqual({ cautious: 0.5, aggressive: 0.5, adaptable: 0 });
    expect(reveal.leaning).toMatch(/Equally cautious and aggressive/);
    expect(revealFrom(defaultLineage()).leaning).toMatch(/No strong leaning/);
  });
});
