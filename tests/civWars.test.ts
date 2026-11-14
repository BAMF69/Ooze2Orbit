// Purpose: Meaningful tower-wars checks: valid mazes, live routes, resources, combat, wins and space handoff.
import { describe, expect, it } from "vitest";
import { newBattle, place, route, train, send, setLever, income, heroAttack, moveHero, stepBattle, warsRecord, type Battle } from "../src/game/civ/wars";
import { WAR } from "../src/game/civ/warsTuning";
import { startCampaign } from "../src/game/space/campaign";
const tick = (s: Battle, seconds: number) => { for (let n = 0; n < seconds * 20; n++) stepBattle(s, 0.05); };
describe("civilization tower wars", () => {
  it("farmers add food on each payday without increasing ore income", () => {
    const a = newBattle(), b = newBattle();
    const beforeIncome = income(a, 0), ore = a.sides[0].ore;
    expect(train(a, "farmer")).toBe(true);
    expect(a.sides[0].ore).toBe(ore - WAR.farmerCost);
    expect(income(a, 0)).toBe(beforeIncome);
    tick(a, WAR.tick * 2 + 0.1); tick(b, WAR.tick * 2 + 0.1);
    expect(a.sides[0].food - b.sides[0].food).toBe(WAR.farmerFood * 2);
    expect(a.sides[0].ore - b.sides[0].ore).toBeCloseTo(-WAR.farmerCost);
  });
  it("farmer hiring respects affordability, capacity, ended matches and missing legacy counts", () => {
    const s = newBattle(); delete s.sides[0].farmers;
    expect(train(s, "farmer")).toBe(true); expect(s.sides[0].farmers).toBe(1);
    s.sides[0].ore = 0; expect(train(s, "farmer")).toBe(false);
    s.sides[0].ore = 100; s.sides[0].farmers = WAR.maxWorkers;
    expect(train(s, "farmer")).toBe(false); expect(s.sides[0].ore).toBe(100);
    s.sides[0].farmers = 0; s.status = "fallen"; expect(train(s, "farmer")).toBe(false);
  });
  it("lengthens the maze and refuses the final blocking tile without charging", () => {
    const s = newBattle(); s.sides[0].ore = 1000;
    for (let y = 0; y < 6; y++) expect(place(s, { x: 5, y }, "thorn")).toBe(true);
    expect(route(s.sides[0].towers).length).toBeGreaterThan(11);
    const ore = s.sides[0].ore;
    expect(place(s, { x: 5, y: 6 }, "thorn")).toBe(false); expect(s.sides[0].ore).toBe(ore);
  });
  it("refuses occupied, duplicate and invalid cells", () => {
    const s = newBattle(); send(s, "runner", 0, true);
    expect(place(s, { x: 0, y: 3 }, "thorn")).toBe(false);
    expect(place(s, { x: 3.2, y: 2 }, "thorn")).toBe(false);
    expect(place(s, { x: 4, y: 2 }, "thorn")).toBe(true);
    expect(place(s, { x: 4, y: 2 }, "frost")).toBe(false);
  });
  it("a hero can leave a tower built underfoot, and inherited claws cross defenses", () => {
    const s = newBattle(); place(s, { x: 8, y: 3 }, "thorn");
    for (let n = 0; n < 20; n++) moveHero(s, -1, 0, 0.05);
    expect(s.hero.x).toBeLessThan(7);
    s.hero.x = 7; s.hero.climb = true;
    for (let n = 0; n < 20; n++) moveHero(s, 1, 0, 0.05);
    expect(s.hero.x).toBeGreaterThan(9);
  });
  it("walks a bent route to a base without oscillating or crossing towers", () => {
    const s = newBattle(); s.waveClock = 999; s.sides[1].towers = []; s.sides[1].towers.push({ id: 999, x: 5, y: 3, kind: "thorn", cooldown: 999, build: 999 });
    send(s, "runner"); const base = s.sides[1].hp;
    tick(s, 16); expect(s.sides[1].hp).toBe(base - 3); expect(s.units).toHaveLength(0);
  });
  it("sends cost both resources and permanently raise income; swarm has three bodies", () => {
    const s = newBattle(), before = income(s, 0); expect(send(s, "swarm")).toBe(true);
    expect(s.units).toHaveLength(3); expect(s.sides[0].food).toBe(27); expect(income(s, 0)).toBeGreaterThan(before);
    s.sides[0].food = 0; expect(send(s, "shell")).toBe(false);
  });
  it("workers produce resources and builders accelerate construction", () => {
    const s = newBattle(); expect(train(s, "gatherer")).toBe(true); expect(train(s, "builder")).toBe(true);
    expect(place(s, { x: 5, y: 3 }, "thorn")).toBe(true); tick(s, 2.1);
    expect(s.sides[0].towers[0].build).toBe(0); const food = s.sides[0].food, ore = s.sides[0].ore;
    tick(s, 6); expect(s.sides[0].food).toBe(food + 9); expect(s.sides[0].ore).toBeGreaterThan(ore);
  });
  it("the Gardener changes actual costs and ore yields", () => {
    const a = newBattle(), b = newBattle(); setLever(b);
    place(a, { x: 4, y: 2 }, "thorn"); place(b, { x: 4, y: 2 }, "thorn");
    expect(a.sides[0].ore).toBeGreaterThan(b.sides[0].ore);
    const before = b.sides[0].ore; tick(b, 8.1); expect(b.sides[0].ore - before).toBeCloseTo(income(b, 0) * WAR.oreMult);
  });
  it("hero attacks pay one bounty per kill and pulse respects cooldown", () => {
    const s = newBattle({ strength: 20 }); s.hero.x = 0; s.hero.y = 3;
    send(s, "runner", 0, true); const ore = s.sides[0].ore; heroAttack(s, true); heroAttack(s, true);
    expect(s.tally.kills).toBe(1); expect(s.sides[0].ore).toBe(ore + WAR.killOre); expect(s.tally.heroHits).toBe(1);
  });
  it("previewed waves spawn and towers slow or splash incoming creatures", () => {
    const s = newBattle(); s.sides[0].ore = 1000;
    place(s, { x: 2, y: 2 }, "frost"); place(s, { x: 3, y: 4 }, "mortar"); tick(s, 8.1);
    send(s, "swarm", 0, true); tick(s, 2);
    expect(s.units.some(u => u.slow > 0) || s.tally.kills > 0).toBe(true);
    tick(s, 25); expect(s.wave).toBe(1); expect(s.waveClock).toBeGreaterThan(0);
  });
  it("both wins and a fallen-base rematch state are reachable", () => {
    const a = newBattle(); a.sides[0].income = income(a, 1) * 5; stepBattle(a, 0.05); expect(a.status).toBe("economy");
    const b = newBattle(); b.sides[1].hp = 0; stepBattle(b, 0.05); expect(b.status).toBe("base");
    const c = newBattle(); c.sides[0].hp = 0; stepBattle(c, 0.05); expect(c.status).toBe("fallen");
  });
  it("new victory names hand into space while old saves remain compatible", () => {
    const temper = { aggressive: 0.3, cautious: 0.3, adaptable: 0.3 };
    const base = newBattle(); base.status = "base"; const block = warsRecord(base).block;
    expect(startCampaign({ temper, civ: block }).fit.parts).toContain("needle");
    expect(startCampaign({ temper, civ: { victory: "economic_supremacy" } }).credits).toBe(startCampaign({ temper, civ: { victory: "trade" } }).credits);
    expect(warsRecord(base).causes).toHaveLength(3);
    expect(startCampaign({ temper, civ: { machines: ["frost"] } }).fit.parts).toContain("plating");
    expect(startCampaign({ temper, civ: { machines: ["runner"] } }).fit.parts.filter(p => p === "fin")).toHaveLength(2);
  });
});
