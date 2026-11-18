// Purpose: Step 1 of the large-room plan: the room engine is size-agnostic. A generated lever room stretched to two
//          screens (80 tiles) keeps every rule at its scaled place: collision bounds, the exit wall, the arena seal,
//          water, enemy bounds, edges and the goal zone, the real controller solving it, and D+Shift still failing.
//          One-screen rooms are pinned unchanged by tests/creatureLegacyRooms.test.ts.
import { describe, it, expect } from "vitest";
import { generateWaterV2 } from "../src/game/creature/levelgen/world";
import { sizedGeometry, V1_GEOMETRY, exitTile, rightEdgeX, goalX, sealTiles, bottomEdgeY, regionAt } from "../src/game/creature/levelgen/geometry";
import { roomGeometry } from "../src/game/creature/levelgen/roomSpec";
import { runScript, sprintThrough } from "../src/game/creature/levelgen/solver";
import { challengeSolid } from "../src/game/creature/waterChallenges";
import { objectiveBarrier, newObjective, emergencyRelease } from "../src/game/creature/waterObjectives";
import { encounterLock, sealedEncounter } from "../src/game/creature/waterCombatRooms";
import { spawnEncounters, stepEnemy } from "../src/game/creature/waterEncounters";
import { inWater, waterlineAt } from "../src/game/creature/waterPhysics";
import { newBody } from "../src/game/creature/physics";
import { freshExpedition } from "../src/game/creature/expedition";
import { newGarden } from "../src/game/creature/generations";
import type { WaterRoom } from "../src/game/creature/waterWorld";
import type { Key } from "../src/game/creature/levelgen/keys";

/** The same room, two screens wide: content keeps its place, the room grows to the right. */
function stretched(r: WaterRoom, cols = 80): WaterRoom { return { ...r, spec: { ...r.spec!, geometry: sizedGeometry(cols) } }; }
const w = generateWaterV2(0), lever = w.rooms[1], wide = stretched(lever), g = roomGeometry(wide);
const e = { ...freshExpedition(0), basinRaised: true, torrentDiverted: true }, traits = { ...newGarden().traits, gills: true, fins: true };

describe("Size-agnostic rooms", () => {
  it("defaults every one-screen room to the v1 numbers", () => {
    for (const r of w.rooms) if (r.spec!.puzzle !== "channel") expect(roomGeometry(r)).toBe(V1_GEOMETRY);
    expect([exitTile(V1_GEOMETRY), rightEdgeX(V1_GEOMETRY), goalX(V1_GEOMETRY), bottomEdgeY(V1_GEOMETRY)]).toEqual([35, 625, 550, 338]);
  });
  it("scales collision bounds, the exit wall and the arena seal with the room", () => {
    expect([g.width, g.cols, exitTile(g), rightEdgeX(g), goalX(g)]).toEqual([1280, 80, 75, 1265, 1190]);
    expect(challengeSolid(wide, true, 79, 17)).toBe(false); expect(challengeSolid(wide, true, 80, 17)).toBe(true);
    expect(challengeSolid(lever, true, 40, 17)).toBe(true);
    const closed = newObjective(), open = { ...closed, open: true };
    expect(objectiveBarrier(wide, closed, 75)).toBe(true); expect(objectiveBarrier(wide, closed, 35)).toBe(false);
    expect(objectiveBarrier(wide, open, 75)).toBe(false);
    const arena = { ...wide, spec: { ...wide.spec!, sealed: true } }, foes = spawnEncounters(arena);
    expect(sealTiles(g)).toEqual([3, 75]);
    expect(sealedEncounter(encounterLock(arena, closed, foes, 900))).toBe(true); // x 900 is inside a wide arena, past a v1 goal zone
    expect(sealedEncounter(encounterLock(arena, closed, foes, 1200))).toBe(false);
  });
  it("puts water, enemy bounds and the pressure latch where the room's size says", () => {
    const deep = newBody(1000, 300);
    expect(inWater(deep, e, wide)).toBe(true); expect(inWater(deep, e, lever)).toBe(false);
    expect(inWater(newBody(1220, 300), e, wide)).toBe(false); expect(waterlineAt(wide, e, 1000)).toBe(224);
    expect(regionAt(g, 1000)?.x1).toBe(1184);
    const charger = { ...spawnEncounters(lever)[0], x: 1100, home: 1100, phase: "strike" as const, timer: 1, facing: 1 };
    for (let n = 0; n < 120; n++) stepEnemy(charger, { x: 0, y: 0, hidden: true, submerged: false }, 1 / 60, false, g.enemyMinX, () => false, { maxX: g.enemyMaxX, swimMaxX: 1176 });
    expect(charger.x).toBeLessThanOrEqual(g.enemyMaxX); expect(charger.x).toBeGreaterThan(580);
    const pressure = { ...wide, spec: { ...wide.spec!, puzzle: "pressure" as const } };
    expect(emergencyRelease(pressure, newObjective(), 600).open).toBe(false); expect(emergencyRelease(pressure, newObjective(), 1210).open).toBe(true);
  });
  it("is solved by the real controller across two screens and back, and D+Shift still fails", () => {
    const script = w.solutions[lever.id].map(s => s.use === "right" ? { ...s, to: [g.width - 8, 288] as [number, number] } : s);
    const run = runScript(wide, e, script, traits, new Set<Key>(["play"]));
    expect(run.ok, `${run.step}: ${run.reason}`).toBe(true);
    const sprint = sprintThrough(wide, e, { ...traits, strength: 30, vitality: 30 }, 1800);
    expect(sprint.open).toBe(false); expect(sprint.x).toBeLessThan(goalX(g) + 10); expect(sprint.x).toBeGreaterThan(640);
  });
});
