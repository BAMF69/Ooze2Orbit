// Purpose: Modest prototype terrain and readable world landmarks; no new art or shared styling.
// Usage: drawWaterRoom(graphics, room, expedition, food, trap); all collision comes from waterWorld.
// Notes: Background geometry is decorative. Existing original creature sprite sheets remain in use.
// Authored: Written with Codex (GPT-6).
import type * as Phaser from "phaser";
import { WATER, type WaterRoom } from "./waterWorld";
import { challengeSolid, switchback } from "./waterChallenges";
import { hasVent, ventPhase, encounterKinds, reedPatches } from "./waterEncounters";
import type { Expedition } from "./expedition";
import { waterline } from "./waterPhysics";
import { valves, leftExit, objectiveBarrier, type RoomObjective } from "./waterObjectives";
import { netRig, netFrame } from "./waterTraps";
import { roomSpec } from "./levelgen/roomSpec";
export interface WaterFood { x: number; meat: boolean; taken: boolean }
export function drawWaterRoom(g: Phaser.GameObjects.Graphics, r: WaterRoom, e: Expedition, food: WaterFood[], _trap: boolean, clock: number, cache: boolean, objective: RoomObjective): void {
  const spec = roomSpec(r);
  const bg = r.tier === "easy" ? 0x193e47 : r.tier === "medium" ? 0x17313e : 0x263644;
  g.fillStyle(bg).fillRect(0, 0, 640, 360);
  for (let x = 0; x < 640; x += 64) {
    g.fillStyle(0x10272c).fillRect(x + r.variant * 4, 120 + x % 40, 12, 200);
    g.fillStyle(0x224b41).fillEllipse(x + 4, 150 + x % 40, 80, 65);
  }
  for (let y = 6; y < 22; y++) for (let x = 0; x < 40; x++) if (objectiveBarrier(r, objective, x) || challengeSolid(r, e.basinRaised, x, y, objective)) {
    const gate = r.gate && !e.basinRaised && x === r.gateX / 16;
    g.fillStyle(x === 35 || x === 3 && objective.arenaActive && !objective.arenaCleared ? 0x9a6950 : gate ? 0x9d8356 : y >= 19 ? 0x3b5449 : 0x5a6665).fillRect(x * 16, y * 16, 16, 16);
    g.fillStyle(gate ? 0xe1c58b : 0x78977b, 0.7).fillRect(x * 16, y * 16, 15, 2);
  }
  g.fillStyle(0x4b8350, 0.8); for (let x = r.cover; x < r.cover + 96; x += 8) g.fillTriangle(x, 304, x + 4, 270, x + 7, 304);
  for (const center of reedPatches(r).slice(1)) for (let x = center - 28; x < center + 28; x += 8) g.fillTriangle(x, 304, x + 4, 266, x + 7, 304);
  for (const f of food) if (!f.taken) { g.lineStyle(1, 0x12252a); g.fillStyle(f.meat ? 0xd7968c : 0x9cd36d).fillEllipse(f.x, 296, 12, 8).strokeEllipse(f.x, 296, 12, 8); }
  g.fillStyle(0x3c9eb8, 0.35).fillRect(144, waterline(e), 400, WATER.floor - waterline(e));
  g.lineStyle(2, 0x80cccf, 0.7).lineBetween(144, waterline(e), 544, waterline(e));
  if (r.current) for (let x = 176; x < 540; x += 64) g.lineStyle(2, 0xadd7da).lineBetween(x + 16, 258, x, 258).lineBetween(x, 258, x + 5, 253);
  if (r.branch !== -1) g.lineStyle(3, 0x97be88).strokeRoundedRect(110, 252, 32, 52, 15);
  if (r.reward && !e.unlocked.includes(r.reward)) {
    g.lineStyle(2, 0xe8d38e).strokeCircle(576, 282, 16); g.fillStyle(r.reward === "gills" ? 0x89c7ca : 0x9bd292).fillEllipse(576, 282, 18, 24);
  }
  if (r.goal) g.lineStyle(3, 0xe4be71).strokeEllipse(600, 287, 24, 32);
  for (const [n, v] of valves(r).entries()) {
    const active = objective.open || n === 0 && objective.first;
    g.lineStyle(3, 0x17282b).lineBetween(v.x, v.y - 18, v.x, v.y + 12);
    g.fillStyle(active ? 0x89c791 : 0xe9bd72).fillCircle(v.x, v.y - 14, 10);
    g.lineStyle(2, 0x243b3b).strokeCircle(v.x, v.y - 14, 10).lineBetween(v.x - 7, v.y - 14, v.x + 7, v.y - 14);
  }
  if (leftExit(r)) g.lineStyle(3, objective.open ? 0x94e0bc : 0xb47558).strokeRoundedRect(112, 204, 32, 36, 8);
  if (encounterKinds(r).length) {
    const rig = netRig(r), net = netFrame(r);
    g.lineStyle(2, objective.rigging ? 0x8ed8ab : 0xe5ce91).strokeCircle(rig.x, rig.y - 12, 9).strokeCircle(rig.x, rig.y - 12, 5);
    g.lineStyle(2, objective.netArmed ? 0xf2ba63 : objective.netCaught ? 0x8ed8ab : 0x799293).strokeRect(net.x - 24, net.y - 64, 48, 80);
    if (objective.netArmed) for (let d = -24; d <= 24; d += 8) g.lineStyle(1, 0xf2ba63, 0.7).lineBetween(net.x + d, net.y - 64, net.x + d, net.y + 14);
  }
  for (const pit of spec.pits) {
    const x0 = pit.tiles[0] * 16, x1 = (pit.tiles[1] + 1) * 16;
    g.fillStyle(0x142027).fillRect(x0, 304, x1 - x0, 56);
    for (let x = x0; x < x1; x += 8) g.fillStyle(0xd1a28b).fillTriangle(x, 348, x + 4, 332, x + 8, 348);
    g.lineStyle(2, 0xe3bd69).lineBetween(x0 - 4, 300, x0 - 4, 277).lineBetween(x1 + 4, 300, x1 + 4, 277);
  }

  if (switchback(r)) {
    g.lineStyle(2, 0x9edbd5).lineBetween(276, 283, 276, 246).lineBetween(276, 246, 270, 253);
    g.lineStyle(2, 0x9edbd5).lineBetween(390, 246, 390, 280).lineBetween(390, 280, 384, 273);
    if (!cache && spec.cache) { g.fillStyle(0xe2ca75).fillEllipse(spec.cache.x, spec.cache.y - 14, 17, 12); g.lineStyle(2, 0x122d30).strokeEllipse(spec.cache.x, spec.cache.y - 14, 17, 12); }
  }
  if (hasVent(r)) {
    const phase = ventPhase(clock), x = spec.vent!.x;
    g.fillStyle(0x333c40).fillEllipse(x, 300, 40, 10);
    if (phase !== "quiet") { g.lineStyle(2, phase === "active" ? 0xff9b65 : 0xf0d88d).strokeCircle(x, 284, 5).strokeCircle(x + 8, 275, 3); }
    if (phase === "active") g.fillStyle(0xec936c, 0.65).fillTriangle(x - 20, 304, x, 253, x + 20, 304);
  }
}
