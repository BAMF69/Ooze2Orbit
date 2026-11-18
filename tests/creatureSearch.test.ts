// Purpose: Step 1.5 acceptance. The search solver (no hand-written scripts) proves every generated room at its tier's
//          minimum traits in every Gardener state, names what a failing room is missing, rejects broken rooms, and
//          the threat model shows an enemy-ignoring player failing every room whose role demands a solution.
// Usage  : default seeds keep the unit suite quick; the full sweep is
//          LEVELGEN_SEEDS=120 npx vitest run tests/creatureSearch.test.ts
import { describe, it, expect } from "vitest";
import { generateWaterV2 } from "../src/game/creature/levelgen/world";
import { searchRoom, whatIsMissing } from "../src/game/creature/levelgen/search";
import { relationProblems, threatZone, demandsSolution } from "../src/game/creature/levelgen/relations";
import { freshExpedition } from "../src/game/creature/expedition";
import { newBody } from "../src/game/creature/physics";
import { stepWaterBody, inWater, waterlineAt } from "../src/game/creature/waterPhysics";
import type { WaterRoom } from "../src/game/creature/waterWorld";
import { V1_GEOMETRY } from "../src/game/creature/levelgen/geometry";
import { run, GARDEN_STATES, MIN_TRAITS, expectedSolvable, minimalKeys, signature, threatSignature } from "./helpers/searchMatrix";

const SEEDS = Number(process.env.LEVELGEN_SEEDS ?? 12);
const name = (st: { raised: boolean; diverted: boolean }) => `${st.raised ? "raised" : "low"}/${st.diverted ? "diverted" : "wild"}`;
function rooms(): { seed: number; r: WaterRoom }[] {
  const out: { seed: number; r: WaterRoom }[] = [], seen = new Set<string>();
  for (let seed = 0; seed < SEEDS; seed++) for (const r of generateWaterV2(seed).rooms) {
    const k = threatSignature(r) + JSON.stringify([r.spec!.net, r.spec!.reeds, r.tier]); if (seen.has(k)) continue; seen.add(k); out.push({ seed, r });
  }
  return out;
}
const ALL = rooms();

describe(`Search solver over ${SEEDS} seeds (${ALL.length} distinct rooms)`, () => {
  it("solves every room at minimum traits in each Gardener state it declares, and only those", () => {
    const failures: string[] = [];
    for (const { seed, r } of ALL) for (const st of GARDEN_STATES) {
      const t = MIN_TRAITS[r.tier], res = run(r, st, t, minimalKeys(r), { threatsHandled: true }), exp = expectedSolvable(r, st, t);
      if (exp && !res.solved) failures.push(`seed ${seed} room ${r.id} ${r.name} unsolved at ${name(st)}: ${res.reasons}`);
      if (exp && res.solved && !res.returned) failures.push(`seed ${seed} room ${r.id} ${r.name}: no way back at ${name(st)}`);
      if (!exp && res.solved) failures.push(`seed ${seed} room ${r.id} ${r.name} solved at ${name(st)} without its requirement`);
    }
    expect(failures).toEqual([]);
  }, 1800000);
  it("requires fins against every current: no breach-hop or other route past the torrent", () => {
    for (const { seed, r } of ALL.filter(x => x.r.current)) {
      const res = run(r, { raised: true, diverted: true }, { ...MIN_TRAITS.hard, fins: false }, minimalKeys(r), { threatsHandled: true });
      expect(res.solved, `seed ${seed} room ${r.id} passable without fins`).toBe(false);
    }
  }, 600000);
  it("keeps every relation rule: nets reachable and lurable, guards lurable, dodge lanes, pit crossings, net-only arenas", () => {
    const bad: string[] = [];
    for (const { seed, r } of ALL) {
      const res = run(r, { raised: true, diverted: true }, MIN_TRAITS[r.tier], minimalKeys(r), { threatsHandled: true, collect: true });
      for (const p of relationProblems(r, res.positions)) bad.push(`seed ${seed} room ${r.id} ${r.name}: ${p}`);
    }
    expect(bad).toEqual([]);
  }, 1800000);
  it("an enemy-ignoring player fails every room whose role demands a solution", () => {
    let demanding = 0, avoidable = 0, open = 0;
    for (const { seed, r } of ALL) {
      if (demandsSolution(r)) {
        demanding++;
        expect(run(r, { raised: true, diverted: true }, MIN_TRAITS[r.tier], minimalKeys(r), { threatsHandled: false }).solved, `seed ${seed} room ${r.id} ${r.name}`).toBe(false);
      } else if (r.spec!.enemies.length) {
        open++; if (run(r, { raised: true, diverted: true }, MIN_TRAITS[r.tier], minimalKeys(r), { threatsHandled: true, avoid: threatZone(r) }).solved) avoidable++;
      }
    }
    expect(demanding).toBeGreaterThan(0);
    console.log(`Threats: ${demanding} rooms demand a solution (ignoring bot fails all); ${avoidable} of ${open} open rooms let a player avoid every threat zone`);
  }, 1800000);
});

describe("Search solver rejects broken rooms and names what is missing", () => {
  const w = generateWaterV2(0), e = { ...freshExpedition(0), basinRaised: true, torrentDiverted: true };
  const lever = w.rooms[1], drain = w.rooms[4], hard = w.rooms[8];
  it("fails a room whose control is out of reach", () => {
    const r = { ...lever, spec: { ...lever.spec!, controls: [{ ...lever.spec!.controls[0], y: 120 }] } };
    const res = searchRoom(r, e, MIN_TRAITS.easy, minimalKeys(r), { threatsHandled: true });
    expect(res.solved).toBe(false); expect(res.reasons).toContain("exit unreachable"); expect(res.reached.controls).toEqual([]);
  });
  it("fails a room whose exit is walled off even when solved", () => {
    const r = { ...drain, spec: { ...drain.spec!, collision: [{ solid: true, x0: 30, x1: 30, y0: -99, y1: 99 }, ...drain.spec!.collision] } };
    const res = searchRoom(r, e, MIN_TRAITS.medium, minimalKeys(r), { threatsHandled: true });
    expect(res.solved).toBe(false); expect(res.reached.controls.length).toBeGreaterThan(0);
  });
  it("names the missing ability or Gardener state", () => {
    expect(whatIsMissing(w.rooms[1], freshExpedition(0), MIN_TRAITS.easy, minimalKeys(w.rooms[1]), { threatsHandled: true })).toEqual(["basin raised"]);
    expect(whatIsMissing(hard, { ...freshExpedition(0), basinRaised: true }, MIN_TRAITS.hard, minimalKeys(hard), { threatsHandled: true })).toEqual(["torrent diverted"]);
    expect(whatIsMissing(hard, e, { ...MIN_TRAITS.hard, fins: false }, minimalKeys(hard), { threatsHandled: true })).toEqual(["swimming fins"]);
    expect(whatIsMissing(lever, e, MIN_TRAITS.easy, minimalKeys(lever), { threatsHandled: true })).toEqual([]);
  }, 120000);
  it("enforces the timed gate: a crossing longer than the timer (with slack) fails", () => {
    const p = w.rooms[6], quick = searchRoom(p, e, MIN_TRAITS.medium, minimalKeys(p), { threatsHandled: true });
    expect(quick.solved).toBe(true);
    const slow = searchRoom({ ...p, spec: { ...p.spec!, timed: 1 } }, e, MIN_TRAITS.medium, minimalKeys(p), { threatsHandled: true });
    expect(slow.solved).toBe(false);
  }, 120000);
  it("no breach against a current the body cannot out-swim (the breach-hop exploit stays fixed)", () => {
    const b = newBody(150, 300), wild = { ...freshExpedition(0), basinRaised: true }, o = { first: true, open: true, remaining: 0 };
    for (let n = 0; n < 1200; n++) stepWaterBody(b, hard, wild, { ...MIN_TRAITS.hard, fins: false }, { dir: 1, vertical: -1, jump: inWater(b, wild, hard) && b.y <= waterlineAt(hard, wild, b.x) + 8, crouch: false, sprint: true }, 1 / 60, o);
    expect(b.x).toBeLessThan(250);
  });
  const near = (r: WaterRoom) => run(r, { raised: true, diverted: true }, MIN_TRAITS[r.tier], minimalKeys(r), { threatsHandled: true, collect: true }).positions;
  const broken: [string, () => WaterRoom][] = [
    ["lure lane", () => ({ ...drain, spec: { ...drain.spec!, net: { ...drain.spec!.net, frame: { x: 200, y: 288 } } } })],
    ["guard opening", () => ({ ...drain, spec: { ...drain.spec!, net: { ...drain.spec!.net, frame: { x: 200, y: 288 } } } })],
    // Rock fills the floor on both sides of the dropper's shadow: nowhere to step aside.
    ["dodge lane", () => { const r = w.rooms[6]; return { ...r, spec: { ...r.spec!, collision: [{ solid: true, x0: 18, x1: 21, y0: 17, y1: 18 }, { solid: true, x0: 24, x1: 27, y0: 17, y1: 18 }, ...r.spec!.collision] } }; }],
    // A dry room (no water to swim over it, no platform to hop across) with a pit far wider than any jump.
    ["pit crossing", () => { const r = w.rooms[7]; return { ...r, spec: { ...r.spec!, base: { ...r.spec!.base, platforms: false }, geometry: { ...V1_GEOMETRY, water: [] }, pits: [{ tiles: [7, 22] as [number, number], recoverX: 96 }] } }; }],
    ["arena net-only", () => { const r = w.rooms[2]; return { ...r, spec: { ...r.spec!, net: { rig: { x: 40, y: 304 }, frame: r.spec!.net.frame } } }; }],
    ["branch reason", () => { const r = w.rooms[1]; return { ...r, spec: { ...r.spec!, openings: r.spec!.openings.map(o => ({ ...o, label: { ...o.label, text: " " } })) } }; }],
  ];
  for (const [problem, make] of broken) it(`relation rule rejects: ${problem}`, () => { const r = make(); expect(relationProblems(r, near(r))).toContain(problem); }, 120000);
  it("memo signatures ignore names and food but not geometry", () => {
    const r = w.rooms[1];
    expect(signature({ ...r, name: "x", food: [96, 112, 128, 144] })).toBe(signature(r));
    expect(signature({ ...r, platforms: [{ x: 300, y: 224, width: 48 }] })).not.toBe(signature(r));
  });
});
