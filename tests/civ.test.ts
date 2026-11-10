// ---------------------------------------------------------------------------
// civ.test.ts
// Purpose : Locks the civilization stage's Toy 1 rules (docs/stages/04-civilization.md): the 9-region planet and its
//           borders, the three ways to take a region (conquest, trade then buy-out, faith until it converts), the
//           machines and acts of god, the rival playing the temperament you are not (its armies announced a turn
//           ahead), your capital never falling, the live tally and the victory named by the method that took most.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import {
  CIV, SPECS, act, beliefFor, blocked, endTurn, neighbours, newGame, region, rivalFor, rivalTurn, tally, victoryType, won,
  type CivState,
} from "../src/game/civ/rules";

const rich = (s: CivState): CivState => ({ ...s, you: { ...s.you, materials: 50, goods: 50, faith: 50, favor: 50 } });
const temper = { cautious: 0.3, aggressive: 0.2, adaptable: 0.1 };

describe("the planet", () => {
  it("nine regions; each capital borders two neutral regions", () => {
    expect(SPECS).toHaveLength(9);
    expect(neighbours("hearthhold").sort()).toEqual(["fernhills", "saltcoast"]);
    expect(neighbours("rivalseat").sort()).toEqual(["ambershore", "moonwell"]);
  });
  it("the rival is a temperament you are not", () => {
    expect(rivalFor("cautious")).toBe("aggressive");
    expect(rivalFor("adaptable")).toBe("aggressive");
    expect(rivalFor("aggressive")).toBe("adaptable");
  });
});

describe("three ways to take a region", () => {
  it("conquest: an army stronger than the defense takes it; a weaker one wears the walls down", () => {
    let s = rich(newGame("aggressive", 0));
    expect(blocked(s, "you", { kind: "army", target: "heartwood" })).toMatch(/not adjacent/);
    s = act(s, { kind: "army", target: "fernhills" }).state; // strength 2 vs defense 2: walls worn to 0
    expect(region(s, "fernhills").owner).toBe(null);
    expect(region(s, "fernhills").defense).toBe(0);
    s = act(s, { kind: "army", target: "fernhills" }).state;
    expect(region(s, "fernhills")).toMatchObject({ owner: "you", method: "conquest" });
  });
  it("trade: a route makes it depend on you each turn, then you buy it out", () => {
    let s = rich(newGame("aggressive", 0));
    s = act(s, { kind: "route", target: "saltcoast" }).state;
    expect(blocked(s, "you", { kind: "buyout", target: "saltcoast" })).toMatch(/depends/);
    for (let i = 0; i < 3; i++) s = endTurn(s);
    s = act(s, { kind: "buyout", target: "saltcoast" }).state;
    expect(region(s, "saltcoast")).toMatchObject({ owner: "you", method: "trade" });
  });
  it("faith: missionaries raise belief each turn until it converts; a harsh Gardener needs more belief", () => {
    let s = rich(newGame("aggressive", 0));
    s = act(s, { kind: "mission", target: "saltcoast" }).state;
    for (let i = 0; i < 4; i++) s = endTurn(s);
    expect(region(s, "saltcoast")).toMatchObject({ owner: "you", method: "faith" });
    expect(beliefFor(newGame("aggressive", 1), "saltcoast")).toBeGreaterThan(beliefFor(newGame("aggressive", 0), "saltcoast"));
  });
  it("machines speed their way up", () => {
    let s = rich(newGame("aggressive", 0));
    s = act(s, { kind: "machine", machine: "siege" }).state;
    s = act(s, { kind: "army", target: "fernhills" }).state; // strength 3 > defense 2
    expect(region(s, "fernhills").owner).toBe("you");
  });
});

describe("acts of god", () => {
  it("a meteor breaks defenses and scatters an army marching there, and makes you harsher", () => {
    let s = rich(newGame("aggressive", 0));
    s = { ...s, march: { target: "saltcoast", strength: 2 } };
    s = act(s, { kind: "meteor", target: "saltcoast" }).state;
    expect(s.march).toBe(null);
    expect(region(s, "saltcoast").defense).toBe(0);
    expect(s.harshness).toBeCloseTo(CIV.meteor.harshness);
  });
  it("terraform: +1 yield on a region of yours, and gentler", () => {
    let s = rich(newGame("aggressive", 0.2));
    s = act(s, { kind: "terraform", target: "hearthhold" }).state;
    expect(region(s, "hearthhold").bonus).toBe(1);
    expect(s.harshness).toBeLessThan(0.2);
  });
});

describe("the rival", () => {
  it("an aggressive rival announces its army a turn before it strikes", () => {
    let s = newGame("aggressive", 0);
    s = { ...s, rival: { ...s.rival, materials: 3 } };
    s = rivalTurn(s);
    expect(s.march).not.toBe(null);
    const target = s.march!.target;
    s = rivalTurn(s);
    expect(region(s, target).owner === "rival" || region(s, target).defense < SPECS.find((x) => x.id === target)!.defense).toBe(true);
  });
  it("your capital never falls", () => {
    let s = newGame("aggressive", 0);
    s = { ...s, march: { target: "hearthhold", strength: 99 } };
    s = rivalTurn(s);
    expect(region(s, "hearthhold").owner).toBe("you");
  });
});

describe("the tally and the victory", () => {
  it("the victory is named by the method that took most regions; a tie goes to your strongest temperament", () => {
    let s = newGame("aggressive", 0);
    const own = (id: string, method: "conquest" | "trade" | "faith") => { s = { ...s, regions: s.regions.map((r) => (r.id === id ? { ...r, owner: "you" as const, method } : r)) }; };
    own("fernhills", "conquest"); own("saltcoast", "trade");
    expect(tally(s)).toEqual({ conquest: 1, trade: 1, faith: 0 });
    expect(victoryType(s, { cautious: 0, aggressive: 0.1, adaptable: 0.5 })).toBe("trade");
    own("stillwater", "faith"); own("moonwell", "faith");
    expect(victoryType(s, temper)).toBe("faith");
    expect(won(s)).toBe(false);
    for (const r of s.regions) own(r.id, r.owner === "you" ? (r.method as "faith") : "conquest");
    expect(won(s)).toBe(true);
  });
});
