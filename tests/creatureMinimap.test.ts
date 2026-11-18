// Purpose: Every generated level lays out as a coherent minimap (no overlaps, doors between touching cells,
//          connected room shapes), the generator rejects incoherent maps, and the minimap shows explored rooms,
//          the current one, and only the unexplored rooms that adjoin them.
import { describe, it, expect } from "vitest";
import { layoutLevel, mapProblems, type MapLayout } from "../src/game/creature/levelgen/mapLayout";
import { generateWaterV2, worldProblemsV2, levelEntry } from "../src/game/creature/levelgen/world";
import { generateWater } from "../src/game/creature/waterWorld";
import { minimapModel } from "../src/game/creature/minimap";
const TIERS = ["easy", "medium", "hard"] as const;
const clone = (m: MapLayout): MapLayout => ({ ...m, rooms: new Map([...m.rooms].map(([k, v]) => [k, v.map(c => ({ ...c }))])), doors: m.doors.map(d => ({ ...d, a: { ...d.a }, b: { ...d.b } })) });

describe("Minimap layout", () => {
  it("lays out 300 generated worlds and the v1 world coherently", () => {
    let levels = 0, lShapes = 0;
    for (let seed = 0; seed <= 300; seed++) { const w = generateWaterV2(seed); for (const t of TIERS) {
      const m = layoutLevel(w, t); expect(mapProblems(m), `seed ${seed} ${t}`).toEqual([]); levels++;
      lShapes += [...m.rooms.values()].filter(c => c.length > 1).length;
      expect(m.rooms.size).toBe(w.rooms.filter(r => r.tier === t).length);
    } }
    for (const t of TIERS) expect(mapProblems(layoutLevel(generateWater(0), t))).toEqual([]);
    expect(lShapes).toBeGreaterThan(300);
    console.log(`Minimap: ${levels} generated levels coherent, ${lShapes} L-shaped shafts under a drain`);
  });
  it("draws the drain's floor drop into the shaft as an L reaching under the drain", () => {
    const m = layoutLevel(generateWaterV2(0), "medium");
    expect(m.rooms.get(5)).toEqual([{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
    expect(m.doors.find(d => d.from === 4 && d.side === "bottom")).toMatchObject({ a: { x: 0, y: 0 }, b: { x: 0, y: 1 } });
  });
  const broken: [string, (m: MapLayout) => void][] = [
    ["map overlap", m => { const [a, b] = [...m.rooms.keys()]; m.rooms.set(b, [{ ...m.rooms.get(a)![0] }]); }],
    ["map door", m => { m.doors[0].b = { x: 99, y: 99 }; }],
    ["map footprint", m => { const id = [...m.rooms.keys()][1]; m.rooms.get(id)!.push({ x: 50, y: 50 }); }],
    ["map unreached room", m => { m.unplaced.push(42); }],
  ];
  for (const [problem, mutate] of broken) it(`rejects ${problem}`, () => {
    const m = clone(layoutLevel(generateWaterV2(0), "medium")); mutate(m); expect(mapProblems(m)).toContain(problem);
  });
  it("makes an incoherent map a world problem, so the generator rejects that seed", () => {
    const w = generateWaterV2(0), r = w.rooms.find(q => q.id === 4)!;
    r.spec!.openings.push({ ...r.spec!.openings[0], side: "top", to: { ...r.spec!.openings[0].to, room: 6 } });
    expect(worldProblemsV2(w).some(p => p.startsWith("map"))).toBe(true);
  });
});
describe("Minimap contents", () => {
  it("shows explored rooms, the current one and only the adjoining unexplored rooms", () => {
    const w = generateWaterV2(7), start = levelEntry(w, "easy");
    const first = minimapModel(w, "easy", [], start);
    expect(first.rooms.find(r => r.id === start)!.state).toBe("current");
    const shown = first.rooms.map(r => r.id).sort((a, b) => a - b);
    const neighbours = layoutLevel(w, "easy").doors.filter(d => d.from === start).map(d => d.to);
    expect(shown).toEqual([start, ...neighbours].sort((a, b) => a - b));
    expect(first.rooms.filter(r => r.id !== start).every(r => r.state === "adjoining")).toBe(true);
    const later = minimapModel(w, "easy", [start, start + 1], start + 1);
    expect(later.rooms.find(r => r.id === start)!.state).toBe("visited");
    expect(later.rooms.length).toBeGreaterThan(first.rooms.length - 1);
    const all = minimapModel(w, "easy", w.rooms.filter(r => r.tier === "easy").map(r => r.id), start);
    expect(all.rooms.some(r => r.goal)).toBe(true); expect(all.rooms.some(r => r.reward)).toBe(true);
    expect(minimapModel(w, "easy", all.rooms.map(r => r.id), start, ["gills", "fins", "fullArmor", "iceBreath"]).rooms.some(r => r.reward)).toBe(false);
  });
});
