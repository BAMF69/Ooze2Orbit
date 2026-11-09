// ---------------------------------------------------------------------------
// creature.test.ts
// Purpose : Locks the creature stage's Toy 1 rules (docs/stages/03-creature.md): the sidescroller box lands, stops
//           at walls and fits a one-tile tunnel only when crouched; every Fernwood obstacle has its three openings
//           (and the drained lake swaps the root ledge for a basin); a foe's fate decides its obstacle's way; a
//           stalker's cone and the grass behave; the world map opens paths and the lake toggles with words.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { GROUND, Tile, buildFernwood, newLevelState, solidAt, tileAt, type Level } from "../src/game/creature/level";
import { boxHits, canStand, newBody, stepBody } from "../src/game/creature/physics";
import { sees, noise, woken } from "../src/game/creature/sight";
import { CR } from "../src/game/creature/tuning";
import { decide, enterZone, foeEvent, newRun, passExit, summary } from "../src/game/creature/ways";
import { canEnter, clearLevel, isOpen, lakeLine, newMap, toggleLake } from "../src/game/creature/worldMap";

const T = CR.tile;
const flat = (tx: number, ty: number) => ty >= 10 || tx < 0 || tx > 40;
const run = (b: ReturnType<typeof newBody>, n: number, it = { dir: 0, jump: false, speed: CR.move.runSpeed }, solid = flat) => {
  for (let i = 0; i < n; i++) stepBody(b, i === 0 ? it : { ...it, jump: false }, 1 / 60, solid);
};

describe("the sidescroller box", () => {
  it("falls and lands on the ground", () => {
    const b = newBody(100, 40);
    run(b, 120);
    expect(b.onGround).toBe(true);
    expect(b.y).toBeCloseTo(10 * T, 0);
  });
  it("jumps about five tiles high", () => {
    const b = newBody(100, 10 * T - 0.001);
    run(b, 5);
    let top = b.y;
    for (let i = 0; i < 90; i++) { stepBody(b, { dir: 0, jump: i === 0, speed: 0 }, 1 / 60, flat); top = Math.min(top, b.y); }
    expect((10 * T - top) / T).toBeGreaterThan(5);
  });
  it("stops at a wall", () => {
    const wall = (tx: number, ty: number) => ty >= 10 || tx === 10;
    const b = newBody(100, 10 * T - 0.001);
    run(b, 120, { dir: 1, jump: false, speed: CR.move.runSpeed }, wall);
    expect(b.x + b.w / 2).toBeLessThanOrEqual(10 * T + 0.01);
  });
  it("only fits a one-tile tunnel crouched", () => {
    const tunnel = (tx: number, ty: number) => ty >= 10 || (tx >= 5 && ty <= 8); // one tile of room (row 9) from column 5 on
    expect(boxHits(6 * T, 10 * T - 0.001, CR.body.w, CR.body.h, tunnel)).toBe(true);
    expect(boxHits(6 * T, 10 * T - 0.001, CR.body.w, CR.body.crouchH, tunnel)).toBe(false);
    expect(canStand({ ...newBody(6 * T, 10 * T - 0.001), h: CR.body.crouchH }, tunnel)).toBe(false);
  });
});

describe("Fernwood", () => {
  const lv = buildFernwood(false);
  const st = newLevelState();
  it("has five obstacles, each with a way to fight, solve or sneak", () => {
    expect(lv.obstacles).toHaveLength(5);
    for (const o of lv.obstacles) {
      if (o.foe) continue; // guards: the foe's fate decides
      expect(Object.keys(o.zones).sort()).toEqual(["fight", "puzzle", "stealth"]);
    }
  });
  it("a barrier is closed at first, and each opening is the right kind", () => {
    const o = lv.obstacles[0];
    const f = o.zones.fight!, p = o.zones.puzzle!, s = o.zones.stealth!;
    expect(tileAt(lv, f.x0, f.y0)).toBe(Tile.Bramble);
    expect(solidAt(lv, st, f.x0, f.y0)).toBe(true);
    expect(tileAt(lv, p.x0, p.y0)).toBe(Tile.Gate);
    expect(solidAt(lv, st, p.x0, p.y0)).toBe(true);
    expect(solidAt(lv, st, s.x0, s.y0)).toBe(false); // the tunnel row is open
    expect(solidAt(lv, st, s.x0, s.y0 - 1)).toBe(true); // with rock right above it: crouch only
    const open = { ...st, open: new Set([lv.links[`${p.x0},${p.y0}`]]) };
    expect(solidAt(lv, open, p.x0, p.y0)).toBe(false);
  });
  it("draining the lake swaps the root ledge for a mud basin with a brute", () => {
    const dr: Level = buildFernwood(true);
    const lake = dr.obstacles.find((o) => o.id === "lake")!;
    expect(lake.foe).toBe("brute_lake");
    expect(dr.entities.some((e) => e.kind === "brute")).toBe(true);
    expect(lv.entities.some((e) => e.kind === "brute")).toBe(false);
    const x = lake.zones.stealth!.x0;
    expect(tileAt(lv, x, GROUND + 1)).toBe(Tile.Water);
    expect(tileAt(dr, x, dr.h - 1)).toBe(Tile.Mud);
  });
});

describe("how you passed it", () => {
  const lv = buildFernwood(false);
  it("a barrier: the zone you went through", () => {
    let r = newRun(lv);
    r = passExit(enterZone(r, "bramble", "stealth"), "bramble");
    expect(r.obstacles.bramble.verdict).toBe("stealth");
  });
  it("a guard: beaten = fight, trapped = puzzle, unseen = stealth, seen but escaped = rushed", () => {
    const base = newRun(lv).obstacles.stalker;
    expect(decide({ ...base, foe: { beaten: true, trapped: false, woke: true } })).toBe("fight");
    expect(decide({ ...base, foe: { beaten: false, trapped: true, woke: true } })).toBe("puzzle");
    expect(decide({ ...base, foe: { beaten: false, trapped: false, woke: false } })).toBe("stealth");
    expect(decide({ ...base, foe: { beaten: false, trapped: false, woke: true } })).toBe("rushed");
  });
  it("the cause line and the temperament shift", () => {
    let r = newRun(lv);
    for (const id of ["bramble", "lake", "rockfall"]) r = passExit(enterZone(r, id, "stealth"), id);
    r = passExit(foeEvent(r, "stalker", "beaten"), "stalker");
    r = passExit(foeEvent(r, "ridge", "woke"), "ridge"); // it saw you and you ran: no temperament
    const s = summary(r, "Fernwood");
    expect(s.cause).toBe("Cleared Fernwood: 3 of 5 obstacles by stealth");
    expect(s.shift.cautious).toBeCloseTo(3 * CR.temperPerObstacle);
    expect(s.shift.aggressive).toBeCloseTo(CR.temperPerObstacle);
  });
});

describe("stealth", () => {
  const eye = { x: 0, y: 0, facing: 1 };
  it("a stalker sees ahead, not behind", () => {
    expect(sees(eye, { x: 60, y: 0 }, { inGrass: false, crouched: false, camo: false })).toBe(true);
    expect(sees(eye, { x: -60, y: 0 }, { inGrass: false, crouched: false, camo: false })).toBe(false);
  });
  it("crouching shortens its reach; crouching in grass hides you", () => {
    const far = { x: CR.foes.stalker.sight * 0.8, y: 0 };
    expect(sees(eye, far, { inGrass: false, crouched: true, camo: false })).toBe(false);
    expect(sees(eye, { x: 20, y: 0 }, { inGrass: true, crouched: true, camo: false })).toBe(false);
  });
  it("walking near a sleeping brute wakes it; creeping does not", () => {
    let m = 0;
    for (let i = 0; i < 120; i++) m = noise(m, 30, true, true, 1 / 60);
    expect(woken(m)).toBe(false);
    for (let i = 0; i < 120; i++) m = noise(m, 30, true, false, 1 / 60);
    expect(woken(m)).toBe(true);
  });
});

describe("the world map", () => {
  it("Fernwood is open; the places after it are closed until it is cleared", () => {
    const m = newMap();
    expect(canEnter(m, "fernwood")).toBe(true);
    expect(isOpen(m, "ridge")).toBe(false);
    expect(canEnter(m, "tidepools")).toBe(false); // where you came ashore: not a level
  });
  it("draining the lake says what it changes and counts as a harsh act", () => {
    const m = toggleLake(newMap());
    expect(m.drained).toBe(true);
    expect(m.harshness).toBeGreaterThan(0);
    expect(lakeLine(m)).toMatch(/mud basin/);
  });
});

describe("the other levels and the den (BAMF69 2026-11-09)", () => {
  it("Mirefen and the Ridge: five obstacles each, all with their three ways, unique ids", async () => {
    const { buildLevel } = await import("../src/game/creature/level");
    for (const id of ["mirefen", "ridge"] as const) {
      for (const drained of [false, true]) {
        const lv = buildLevel(id, drained);
        expect(lv.obstacles).toHaveLength(5);
        expect(new Set(lv.obstacles.map((o) => o.id)).size).toBe(5);
        for (const o of lv.obstacles) if (!o.foe || o.foe.startsWith("brute")) expect(Object.keys(o.zones).sort()).toEqual(["fight", "puzzle", "stealth"]);
        const crossings = lv.obstacles.filter((o) => o.zones.puzzle?.y0 === 8).length;
        expect(lv.entities.filter((e) => e.kind === "brute")).toHaveLength(drained ? crossings : 0);
      }
    }
  });
  it("the den: one boss, its way out shut until it is beaten", async () => {
    const { buildLevel, newLevelState, solidAt } = await import("../src/game/creature/level");
    const den = buildLevel("den", false);
    expect(den.obstacles).toHaveLength(1);
    expect(den.obstacles[0].boss).toBe(true);
    expect(den.entities.filter((e) => e.kind === "boss")).toHaveLength(1);
    const st = newLevelState();
    expect(solidAt(den, st, 55, 17)).toBe(true);
    st.open.add("gate_boss");
    expect(solidAt(den, st, 55, 17)).toBe(false);
  });
});

describe("the Old Horn", async () => {
  const { biteDamage, bossStep, hurtBoss, newBossMind } = await import("../src/game/creature/boss");
  const { bossHit } = await import("../src/game/creature/ways");
  const { buildLevel } = await import("../src/game/creature/level");
  it("sees you, paws the ground, charges, and a wall stuns it", () => {
    let b = newBossMind();
    b = bossStep(b, { sees: true, hitWall: false, dt: 0.1 });
    expect(b.mode).toBe("windup");
    b = bossStep(b, { sees: true, hitWall: false, dt: CR.boss.windupS });
    expect(b.mode).toBe("charge");
    b = bossStep(b, { sees: false, hitWall: true, dt: 0.1 });
    expect(b.mode).toBe("stunned");
    b = bossStep(b, { sees: false, hitWall: false, dt: CR.boss.stunS });
    expect(b.mode).toBe("roam");
  });
  it("bites: doubled while stunned (fight), tripled from behind unseen (stealth), plain otherwise", () => {
    const b = newBossMind();
    expect(biteDamage({ ...b, mode: "stunned" }, 1, false)).toEqual({ amount: CR.boss.stunnedMult, way: "fight" });
    expect(biteDamage(b, 1, true)).toEqual({ amount: CR.boss.ambushMult, way: "stealth" });
    expect(biteDamage({ ...b, aware: 2 }, 1, true)).toEqual({ amount: 1, way: "fight" });
  });
  it("a rock stuns it; at 0 hp it is down; the way that hurt it most is how you beat it", () => {
    const b = hurtBoss(newBossMind(), CR.boss.rockDamage, true);
    expect(b.mode).toBe("stunned");
    expect(hurtBoss(b, 999, false).mode).toBe("down");
    const den = buildLevel("den", false);
    let r = newRun(den);
    r = bossHit(bossHit(bossHit(r, "oldhorn", "puzzle", 14), "oldhorn", "fight", 10), "oldhorn", "stealth", 6);
    expect(passExit(r, "oldhorn").obstacles.oldhorn.verdict).toBe("puzzle");
  });
  it("the map is a chain: each place opens when the one before it is cleared", () => {
    let m = newMap();
    expect(isOpen(m, "mirefen")).toBe(false);
    m = clearLevel(m, "fernwood");
    expect(canEnter(m, "mirefen")).toBe(true);
    m = clearLevel(clearLevel(m, "mirefen"), "ridge");
    expect(canEnter(m, "den")).toBe(true);
  });
});

describe("the map only opens forward (BAMF69 2026-11-09)", async () => {
  const { farthestOpen } = await import("../src/game/creature/worldMap");
  it("a place opens only when the one before it is beaten; clearing a later one opens nothing behind", () => {
    let m = newMap();
    expect(farthestOpen(m)).toBe(1); // Fernwood
    m = clearLevel(m, "ridge"); // even a stray clear further on
    expect(isOpen(m, "mirefen")).toBe(false);
    expect(canEnter(m, "mirefen")).toBe(false);
    m = clearLevel(newMap(), "fernwood");
    expect(farthestOpen(m)).toBe(2);
  });
});
