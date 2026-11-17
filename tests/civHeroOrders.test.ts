import { describe, expect, it } from "vitest";
import { followHeroOrder, heroRoute, newHeroOrders, patrolHero } from "../src/game/civ/heroOrders";
import { newBattle, place, send, stepBattle } from "../src/game/civ/wars";

describe("civilization hero orders", () => {
  it("walks around a wall to a move order without clipping or oscillating", () => {
    const s = newBattle(); s.sides[0].ore = 1000; s.hero.x = 2;
    for (let y = 0; y < 6; y++) place(s, { x: 5, y }, "thorn");
    const orders = newHeroOrders(), goal = { x: 8, y: 3 };
    expect(heroRoute(s, goal).some(c => c.y === 6)).toBe(true);
    for (let n = 0; n < 220; n++) followHeroOrder(s, goal, 0.05, orders);
    expect(s.hero.x).toBeCloseTo(8, 1); expect(s.hero.y).toBeCloseTo(3, 1);
    expect(heroRoute(s, { x: 5, y: 3 })).toEqual([]);
    s.hero.climb = true;
    expect(heroRoute(s, { x: 5, y: 3 }).length).toBeGreaterThan(0);
  });
  it("replans when construction blocks the next segment", () => {
    const s = newBattle(); s.hero.x = 2;
    const orders = newHeroOrders(); followHeroOrder(s, { x: 8, y: 3 }, 0.05, orders);
    expect(place(s, { x: 3, y: 3 }, "thorn")).toBe(true);
    for (let n = 0; n < 150; n++) followHeroOrder(s, { x: 8, y: 3 }, 0.05, orders);
    expect(s.hero.x).toBeCloseTo(8, 1); expect(s.hero.y).toBeCloseTo(3, 1);
  });
  it("patrols a bent maze and autonomously kills incoming creatures with ordinary rewards", () => {
    const s = newBattle({ strength: 8 }); s.waveClock = 999; s.hero.x = 8;
    const orders = newHeroOrders();
    for (let n = 0; n < 50; n++) { patrolHero(s, 0.05, orders); stepBattle(s, 0.05); }
    expect(s.hero.x).not.toBe(8);
    send(s, "swarm", 0, true);
    for (let n = 0; n < 300; n++) { patrolHero(s, 0.05, orders); stepBattle(s, 0.05); }
    expect(s.tally.heroHits).toBeGreaterThan(0); expect(s.tally.kills).toBe(3);
    expect(s.sides[0].hp).toBe(40);
  });
  it("does nothing while recovering or after the match ends", () => {
    const s = newBattle(), orders = newHeroOrders(); send(s, "runner", 0, true);
    s.hero.respawn = 4; const before = JSON.stringify(s);
    patrolHero(s, 0.05, orders); expect(JSON.stringify(s)).toBe(before);
    s.hero.respawn = 0; s.status = "fallen"; const ended = JSON.stringify(s);
    patrolHero(s, 0.05, orders); expect(JSON.stringify(s)).toBe(ended);
  });
});
