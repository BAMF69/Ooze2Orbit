// Purpose: Independent flood-fill proof over thousands of seeds; real placement/movement regression.
import { describe, expect, it } from "vitest";
import { DIFFICULTIES, generateBoard, heroHome, sameCell, type Board, type Cell, type Difficulty } from "../src/game/civ/battlefields";
import { canBlock, newBattle, place, route, send, stepBattle, wavePreview, train, income, heroAttack } from "../src/game/civ/wars";
import { heroRoute, followHeroOrder, newHeroOrders } from "../src/game/civ/heroOrders";
import { hdCellAt, hdWarsLayout } from "../src/game/civ/hdLayout";
function reachable(board: Board, extra: Cell[] = [], start = board.entry): boolean {
  const blocked = new Set([...board.obstacles, ...extra].map(c => `${c.x},${c.y}`)), visited = new Set<string>(), queue = [start];
  while (queue.length) {
    const c = queue.pop()!, k = `${c.x},${c.y}`;
    if (visited.has(k) || blocked.has(k) || c.x < 0 || c.y < 0 || c.x >= board.cols || c.y >= board.rows) continue;
    if (sameCell(c, board.exit)) return true;
    visited.add(k); queue.push({ x: c.x + 1, y: c.y }, { x: c.x - 1, y: c.y }, { x: c.x, y: c.y + 1 }, { x: c.x, y: c.y - 1 });
  }
  return false;
}
describe("civilization seeded battlefields", () => {
  for (const difficulty of Object.keys(DIFFICULTIES) as Difficulty[]) {
    it(`${difficulty}: 2,000 seeds preserve valid entry/hero routes and rival starting defenses`, () => {
      const failures: string[] = [];
      for (let seed = 0; seed < 2000; seed++) {
        const b = newBattle({}, seed % 2 ? "warden" : "raider", { difficulty, seed }), board = b.board;
        if (!reachable(board) || !reachable(board, [], heroHome(board)) || !reachable(board, b.sides[1].towers)) failures.push(`seed ${seed}: route`);
        if (board.obstacles.length !== DIFFICULTIES[difficulty].obstacles || board.obstacles.some(c => c.x === 0 || c.x === board.cols - 1 || sameCell(c, heroHome(board))) || new Set(board.obstacles.map(c => `${c.x},${c.y}`)).size !== board.obstacles.length) failures.push(`seed ${seed}: terrain`);
        if (seed < 5) expect(generateBoard(difficulty, seed)).toEqual(board);
      }
      expect(failures).toEqual([]);
    }, 60000);
    it(`${difficulty}: actual construction preserves moving creatures' escape routes`, () => {
      for (let seed = 0; seed < 12; seed++) {
        const s = newBattle({}, "raider", { difficulty, seed }); s.sides[0].ore = 1e6; send(s, "runner", 0, true);
        for (let n = 0; n < 40; n++) stepBattle(s, .05);
        for (let y = 0; y < s.board.rows; y++) for (let x = 1; x < s.board.cols - 1; x++) {
          if (place(s, { x, y }, "thorn")) {
            expect(reachable(s.board, s.sides[0].towers)).toBe(true);
            for (const u of s.units) expect(route(s.sides[0].towers, u.waypoint ?? u, s.board).length).toBeGreaterThan(0);
          }
        }
        for (const o of s.board.obstacles) expect(canBlock(s, 1, o)).toBe(false);
      }
    });
    it(`${difficulty}: actual sends break the base; defensive kills fund economic victory`, () => {
      const attack = newBattle({}, "raider", { difficulty, seed: 17 }); attack.waveClock = 999; attack.sides[1].towers = []; attack.sides[1].hp = 3;
      expect(send(attack, "runner")).toBe(true);
      for (let n = 0; n < 1000 && attack.status === "playing"; n++) stepBattle(attack, .05);
      expect(attack.status).toBe("base"); expect(attack.sides[1].hp).toBe(0);
      const defense = newBattle({ strength: 20 }, "raider", { difficulty, seed: 17 }); defense.waveClock = 999;
      defense.sides[0].ore = 2000;
      for (let n = 0; n < 18; n++) expect(train(defense, "gatherer")).toBe(true);
      defense.hero.x = defense.board.entry.x; defense.hero.y = defense.board.entry.y;
      expect(income(defense, 0)).toBeLessThan(income(defense, 1) * 5);
      for (let n = 0; n < 60 && defense.status === "playing"; n++) {
        send(defense, "runner", 0, true); heroAttack(defense);
        for (let frame = 0; frame < 7; frame++) stepBattle(defense, .1);
      }
      expect(defense.status).toBe("economy"); expect(defense.tally.kills).toBeGreaterThan(0);
    });
    it(`${difficulty}: every cell maps correctly in desktop, portrait and landscape layouts`, () => {
      const board = generateBoard(difficulty, 5);
      for (const [w, h, top, bottom] of [[1440, 900, 165, 670], [375, 812, 205, 620], [560, 375, 125, 360], [800, 1280, 170, 1000]]) {
        const l = hdWarsLayout(w, h, top, bottom, board); expect(l.tile).toBeGreaterThan(0);
        for (const side of [0, 1] as const) {
          const origin = side ? l.right : l.left;
          expect(origin.x).toBeGreaterThanOrEqual(0); expect(origin.y).toBeGreaterThanOrEqual(top);
          expect(origin.x + board.cols * l.tile).toBeLessThanOrEqual(w); expect(origin.y + board.rows * l.tile).toBeLessThanOrEqual(bottom);
          for (let y = 0; y < board.rows; y++) for (let x = 0; x < board.cols; x++) expect(hdCellAt(l, origin.x + (x + .5) * l.tile, origin.y + (y + .5) * l.tile, side)).toEqual({ x, y });
        }
      }
    });
  }
  it("hard navigation follows a real detour through permanent terrain and respects climbing", () => {
    const s = newBattle({}, "raider", { difficulty: "hard", seed: 11 });
    const goal = s.board.entry, orders = newHeroOrders();
    const path = heroRoute(s, goal); expect(path.length).toBeGreaterThan(0);
    for (let n = 0; n < 2000 && !sameCell(s.hero, goal); n++) followHeroOrder(s, goal, .05, orders);
    expect(Math.hypot(s.hero.x - goal.x, s.hero.y - goal.y)).toBeLessThan(.03);
    const obstacle = s.board.obstacles[0]; expect(heroRoute(s, obstacle)).toEqual([]);
    s.hero.climb = true; expect(heroRoute(s, obstacle).length).toBeGreaterThan(0);
  });
  it("difficulty scales real incoming waves and the HUD preview uses those same counts", () => {
    const waves = (["easy", "medium", "hard"] as const).map(difficulty => {
      const s = newBattle({}, "raider", { difficulty, seed: 0 }), preview = wavePreview(s); s.waveClock = .01; stepBattle(s, .05);
      expect(s.units).toHaveLength(preview.count); expect(s.units[0].kind).toBe(preview.kind);
      return { count: s.units.length, hp: s.units[0].maxHp, defenses: s.sides[1].towers.length };
    });
    expect(waves[2].count).toBeGreaterThan(waves[1].count); expect(waves[1].hp).toBeGreaterThan(waves[0].hp); expect(waves[2].defenses).toBeGreaterThan(waves[0].defenses);
  });
});
