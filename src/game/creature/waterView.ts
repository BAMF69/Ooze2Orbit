// Purpose: Water room landmarks drawn each frame over the illustrated terrain (creature-hd, C-0106): wooden sluice
//   and barriers, water, reeds, food, levers, net, rigging, arches, pits, vents and caches, all in one ink weight.
// Usage: drawWaterRoom(graphics, room, expedition, food, trap, clock, cache, objective); RoomArt (roomArt.ts) draws
//   the rock tiles and far background underneath from terrainSolid/woodColumn, the same collision as physics.
// Notes: Every state colour is kept (amber = closed/unused, green = done, orange = armed/danger). All collision
//   comes from waterWorld/waterChallenges/waterObjectives; nothing here changes it.
// Authored: Written with Codex (GPT-6); illustrated restyle with Claude (Opus 5.5).
import type * as Phaser from "phaser";
import { WATER, type WaterRoom } from "./waterWorld";
import { challengeSolid, switchback } from "./waterChallenges";
import { hasVent, ventPhase, encounterKinds, reedPatches } from "./waterEncounters";
import type { Expedition } from "./expedition";
import { roomGeometry } from "./levelgen/roomSpec";
import { topEdgeY, floorY, surfaceY, exitTile, sealTiles, controlAnchor, type WaterRegion } from "./levelgen/geometry";
import { valves, leftExit, objectiveBarrier, type RoomObjective } from "./waterObjectives";
import { netRig, netFrame } from "./waterTraps";
import { roomSpec } from "./levelgen/roomSpec";
export interface WaterFood { x: number; meat: boolean; taken: boolean }

const INK = 0x0d1a20;
type G = Phaser.GameObjects.Graphics;

/** The collision test the terrain art is drawn from (identical to the scene's room collision). */
export const terrainSolid = (r: WaterRoom, e: Expedition, o: RoomObjective, x: number, y: number): boolean =>
  objectiveBarrier(r, o, x) || challengeSolid(r, e.basinRaised, x, y, o);
/** Solid cells drawn as wood rather than rock: the log sluice and the exit/arena barriers, between the
 *  ceiling (row 6, y=96) and the floor (row 19, y=304). Rock above and below stays rock. */
export function woodColumn(r: WaterRoom, e: Expedition, o: RoomObjective, x: number, y: number): "sluice" | "barrier" | null {
  const geo = roomGeometry(r), [sealL] = sealTiles(geo);
  if (y < geo.openTop || y >= geo.floorRow) return null;
  if (x === exitTile(geo) || x === sealL && o.arenaActive && !o.arenaCleared) return "barrier";
  if (r.gate && !e.basinRaised && x === r.gateX / 16) return "sluice";
  return null;
}

/** A filled shape with the house ink outline. */
const inkRect = (g: G, x: number, y: number, w: number, h: number, fill: number, line = 1) => g.fillStyle(fill).fillRect(x, y, w, h).lineStyle(line, INK).strokeRect(x, y, w, h);
const inkCircle = (g: G, x: number, y: number, r: number, fill: number, line = 1.2) => g.fillStyle(fill).fillCircle(x, y, r).lineStyle(line, INK).strokeCircle(x, y, r);
/** A stick: ink underlay then colour, so it reads as an inked limb at any length. */
const stick = (g: G, x0: number, y0: number, x1: number, y1: number, w: number, color: number) => { g.lineStyle(w + 2, INK).lineBetween(x0, y0, x1, y1); g.lineStyle(w, color).lineBetween(x0, y0, x1, y1); };

function drawWood(g: G, kind: "sluice" | "barrier", x0: number, rows: number[], painted: boolean): void {
  const top = Math.min(...rows) * 16, bottom = (Math.max(...rows) + 1) * 16;
  if (kind === "sluice") {
    for (let i = 0; i < 3; i++) inkRect(g, x0 + i * 5.33, top, 5.33, bottom - top, i === 1 ? 0xa98a58 : 0x8e7046);
    g.lineStyle(1, 0xd6bb82, 0.8).lineBetween(x0 + 2, top + 2, x0 + 2, bottom - 2);
    for (let y = top + 20; y < bottom - 8; y += 80) inkRect(g, x0 - 2, y, 20, 6, 0xd9c48c);
  } else {
    for (let i = 0; i < 2; i++) {
      const x = x0 + i * 8;
      g.fillStyle(i ? 0x8a5b44 : 0x9a6950).fillRect(x, top + 6, 8, bottom - top - 6).fillTriangle(x, top + 6, x + 4, top, x + 8, top + 6);
      g.lineStyle(1, INK).strokeRect(x, top + 6, 8, bottom - top - 6);
    }
    for (let y = top + 50; y < bottom - 8; y += 100) inkRect(g, x0 - 2, y, 20, 5, 0xc99a6a);
  }
  if (painted) {
    for (const [offset, color] of [[2, 0xe2a743], [6, 0x795022], [10, 0xd19539], [14, 0x764522]])
      g.lineStyle(1.2, color, 0.72).lineBetween(x0 + offset, top + 4, x0 + offset, bottom - 2);
    for (let y = top + 9; y < bottom - 8; y += 17)
      g.lineStyle(0.8, 0x5d3c27, 0.6).lineBetween(x0 + 4, y, x0 + 6, y + 7).lineBetween(x0 + 10, y + 4, x0 + 12, y + 10);
  }
}

function drawReeds(g: G, x0: number, x1: number, tall = 0, painted = false): void {
  for (let x = x0; x < x1; x += 5) {
    const h = 30 + tall + (x * 7) % 13, lean = ((x * 3) % 7) - 3;
    stick(g, x, 305, x + lean * 1.6, 304 - h, 1.8, (x / 5) % 2 ? 0x5f9a4e : 0x4b8350);
    if (painted) {
      const tip = x + lean * 2.4;
      g.fillStyle(0x182d20).fillTriangle(x - 3, 304, x + 5, 304, tip, 299 - h);
      g.fillStyle(x % 3 ? 0x8da748 : 0xb0b657).fillTriangle(x - 1, 304, x + 2, 304, tip, 300 - h);
    }
    if (!painted && x % 15 === 0) { g.fillStyle(0x8a5a3a).fillEllipse(x + lean * 1.6, 304 - h + 3, 4, 9); g.lineStyle(0.9, INK).strokeEllipse(x + lean * 1.6, 304 - h + 3, 4, 9); }
  }
}

function drawWater(g: G, w: WaterRegion, line: number): void {
  const depth = WATER.floor - line, span = w.x1 - w.x0;
  g.fillStyle(0x4fb6c9, 0.42).fillRect(w.x0, line, span, depth);
  g.fillStyle(0x1f6a80, 0.35).fillRect(w.x0, line + depth * 0.45, span, depth * 0.55);
  g.lineStyle(1.4, 0xbfeaf0, 0.95).beginPath(); g.moveTo(w.x0, line);
  for (let x = w.x0; x < w.x1; x += 8) g.lineTo(x + 8, line + ((x / 8) % 2 ? 1.2 : -1.2));
  g.strokePath();
  for (let x = w.x0 + 18; x < w.x1 - 4; x += 38) g.lineStyle(0.9, 0xd9f6fa, 0.6).lineBetween(x, line + 6, x + 12, line + 6);
}

function drawFood(g: G, f: WaterFood): void {
  if (f.meat) {
    g.fillStyle(0xd7968c).fillEllipse(f.x, 297, 13, 8).lineStyle(1, INK).strokeEllipse(f.x, 297, 13, 8);
    stick(g, f.x + 4, 295, f.x + 9, 292, 1.6, 0xefe5c4);
  } else {
    g.lineStyle(1.4, 0x3f7a3a).lineBetween(f.x, 300, f.x - 5, 291).lineBetween(f.x, 300, f.x + 6, 292);
    for (const [dx, dy] of [[-3, 297], [3, 296], [0, 294]]) inkCircle(g, f.x + dx, dy, 2.8, 0x9cd36d, 1);
  }
}

/** Top of the first solid tile at or below a control's interaction point, so its base stands on real ground. */
function surfaceBelow(r: WaterRoom, e: Expedition, o: RoomObjective, x: number, y: number): number {
  const tx = Math.floor(x / 16);
  for (let ty = Math.floor((y - 8) / 16); ty < roomGeometry(r).rows; ty++) if (terrainSolid(r, e, o, tx, ty)) return ty * 16;
  return WATER.floor;
}

/** Where the view draws a control (exported for tests: the drawing must sit inside the control's use band). */
export const controlPlacement = (r: WaterRoom, e: Expedition, o: RoomObjective, v: { x: number; y: number }): { ground: number; hanging: boolean } =>
  controlAnchor(roomGeometry(r), v.y, surfaceBelow(r, e, o, v.x, v.y));
function ceilingAbove(r: WaterRoom, e: Expedition, o: RoomObjective, x: number, y: number): number {
  const tx = Math.floor(x / 16);
  for (let ty = Math.floor((y - 24) / 16); ty >= 0; ty--) if (terrainSolid(r, e, o, tx, ty)) return (ty + 1) * 16;
  return roomGeometry(r).openTop * 16;
}
function drawLever(g: G, x: number, ground: number, active: boolean): void {
  // Base stands on the surface; the handle tips over (and turns green) once used.
  inkRect(g, x - 7, ground - 6, 14, 6, 0x6c5a3c);
  const hx = active ? x - 11 : x + 11, hy = ground - 22;
  stick(g, x, ground - 3, hx, hy, 2.2, 0xa98a58);
  inkCircle(g, hx, hy, 4.2, active ? 0x89c791 : 0xe9bd72);
  g.fillStyle(0xfff3cf).fillCircle(hx - 1.2, hy - 1.2, 1.3);
}

export function drawWaterRoom(g: G, r: WaterRoom, e: Expedition, food: WaterFood[], _trap: boolean, clock: number, cache: boolean, objective: RoomObjective, painted = false): void {
  const spec = roomSpec(r);
  // Light falling through top-route openings (decorative; the far background comes from RoomArt).
  const geo = roomGeometry(r), top = topEdgeY(geo), floor = floorY(geo);
  for (let x = 0; x < geo.cols; x++) if (!terrainSolid(r, e, objective, x, 0) && !terrainSolid(r, e, objective, x, geo.openTop - 1))
    g.fillStyle(0xd8f0c8, 0.07).fillTriangle(x * 16 - 2, top, x * 16 + 18, top, x * 16 + 8 + (x < geo.cols / 2 ? 40 : -40), floor);
  // Wooden columns (sluice, barriers) in place of the rock tiles RoomArt leaves out.
  const wood = new Map<number, { kind: "sluice" | "barrier"; rows: number[] }>();
  for (let y = 0; y < geo.rows; y++) for (let x = 0; x < geo.cols; x++) {
    const kind = woodColumn(r, e, objective, x, y);
    if (kind && terrainSolid(r, e, objective, x, y)) { const w = wood.get(x) ?? { kind, rows: [] }; w.rows.push(y); wood.set(x, w); }
  }
  for (const [x, w] of wood) drawWood(g, w.kind, x * 16, w.rows, painted);

  drawReeds(g, r.cover, r.cover + 96, 0, painted);
  for (const center of reedPatches(r).slice(1)) drawReeds(g, center - 28, center + 28, 4, painted);
  for (const f of food) if (!f.taken) drawFood(g, f);
  for (const w of geo.water) drawWater(g, w, surfaceY(w, e.basinRaised));
  if (r.current) for (const w of geo.water) for (let x = w.x0 + 32; x < w.x1 - 4; x += 64) { stick(g, x + 16, 258, x, 258, 1.6, 0xd6f0f2); stick(g, x, 258, x + 5, 253, 1.6, 0xd6f0f2); }
  if (r.branch !== -1) { // nursery branch: a vine-framed cave mouth
    g.fillStyle(0x0a1a1e).fillRoundedRect(112, 254, 28, 50, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.lineStyle(4, INK).strokeRoundedRect(110, 252, 32, 52, { tl: 15, tr: 15, bl: 0, br: 0 });
    g.lineStyle(2, 0x97be88).strokeRoundedRect(110, 252, 32, 52, { tl: 15, tr: 15, bl: 0, br: 0 });
    for (const [x, y] of [[111, 268], [118, 254], [134, 254], [141, 266]]) { g.fillStyle(0xa9d68a).fillEllipse(x, y, 5, 8); g.lineStyle(0.8, INK).strokeEllipse(x, y, 5, 8); }
  }
  if (r.reward && !e.unlocked.includes(r.reward)) { // adaptation discovery: a glowing sample
    g.fillStyle(0xe8d38e, 0.18 + 0.06 * Math.sin(clock * 3)).fillCircle(geo.width - 64, 282, 22);
    g.lineStyle(3, INK).strokeCircle(geo.width - 64, 282, 16); g.lineStyle(2, 0xe8d38e).strokeCircle(geo.width - 64, 282, 16);
    g.fillStyle(r.reward === "gills" ? 0x89c7ca : 0x9bd292).fillEllipse(geo.width - 64, 282, 18, 24); g.lineStyle(1.2, INK).strokeEllipse(geo.width - 64, 282, 18, 24);
  }
  if (r.goal) { g.lineStyle(5, INK).strokeEllipse(geo.width - 40, 287, 24, 32); g.lineStyle(3, 0xe4be71).strokeEllipse(geo.width - 40, 287, 24, 32); }
  for (const [n, v] of valves(r).entries()) {
    const a = controlPlacement(r, e, objective, v);
    if (a.hanging) stick(g, v.x, ceilingAbove(r, e, objective, v.x, v.y), v.x, a.ground - 6, 1.6, 0x5d6b5f); // chain to the relay
    drawLever(g, v.x, a.ground, objective.open || n === 0 && objective.first);
  }
  if (spec.keyed) { // class door or grotto shaft: an inked stone frame with a seal
    const k = spec.keyed, done = objective[k.opens], c = done ? 0x94e0bc : k.opens === "keyOpen" ? 0xd99a6c : 0xb8a3e0;
    g.lineStyle(5, INK).strokeRoundedRect(k.x - 14, k.y - 34, 28, 34, 6); g.lineStyle(3, c).strokeRoundedRect(k.x - 14, k.y - 34, 28, 34, 6);
    inkCircle(g, k.x, k.y - 17, 5, c);
  }
  if (leftExit(r)) { const c = objective.open ? 0x94e0bc : 0xb47558; g.lineStyle(5, INK).strokeRoundedRect(112, 204, 32, 36, 8); g.lineStyle(3, c).strokeRoundedRect(112, 204, 32, 36, 8); }
  if (encounterKinds(r).length) {
    const rig = netRig(r), net = netFrame(r);
    // Rigging: a coiled vine on a stake (green once collected).
    stick(g, rig.x, rig.y, rig.x, rig.y - 20, 2.2, 0x8e7046);
    for (const [ry, rw, rh] of [[rig.y - 10, 16, 10], [rig.y - 15, 12, 7]]) { g.lineStyle(3.2, INK).strokeEllipse(rig.x, ry, rw, rh); g.lineStyle(1.8, objective.rigging ? 0x8ed8ab : 0xc4dc96).strokeEllipse(rig.x, ry, rw, rh); }
    // Net frame: two posts and a crossbar; rolled net while unarmed, hanging mesh when armed.
    const fx0 = net.x - 22, fx1 = net.x + 22, fy = net.y - 62;
    stick(g, fx0, net.y + 16, fx0, fy, 3, 0x8e7046); stick(g, fx1, net.y + 16, fx1, fy, 3, 0x8e7046); stick(g, fx0 - 4, fy, fx1 + 4, fy, 3, 0xa98a58);
    if (objective.netArmed) { for (let d = -18; d <= 18; d += 6) g.lineStyle(1, 0xf2ba63, 0.85).lineBetween(net.x + d, fy + 2, net.x + d, net.y + 14); for (let y = fy + 10; y < net.y + 14; y += 10) g.lineStyle(1, 0xf2ba63, 0.6).lineBetween(fx0 + 2, y, fx1 - 2, y); }
    else if (painted && !objective.netCaught) {
      for (let d = 0; d <= 40; d += 5) {
        const x = fx0 + 2 + d, hang = 5 + Math.sin(d / 40 * Math.PI) * 10;
        g.lineStyle(0.8, 0xd6aa56, 0.9).lineBetween(x, fy + 2, x, fy + hang);
      }
      g.lineStyle(1, 0xd6aa56, 0.9).lineBetween(fx0 + 2, fy + 5, net.x, fy + 14).lineBetween(net.x, fy + 14, fx1 - 2, fy + 5);
    }
    else { g.fillStyle(objective.netCaught ? 0x8ed8ab : 0xb9c08a).fillRoundedRect(fx0 + 2, fy + 1, 40, 7, 3.5); g.lineStyle(1, INK).strokeRoundedRect(fx0 + 2, fy + 1, 40, 7, 3.5); }
  }
  for (const pit of spec.pits) {
    const x0 = pit.tiles[0] * 16, x1 = (pit.tiles[1] + 1) * 16;
    g.fillStyle(0x142027).fillRect(x0, 304, x1 - x0, 56);
    for (let x = x0; x < x1; x += 8) { g.fillStyle(0xd1a28b).fillTriangle(x, 348, x + 4, 332, x + 8, 348); g.lineStyle(1, INK).strokeTriangle(x, 348, x + 4, 332, x + 8, 348); }
    stick(g, x0 - 4, 300, x0 - 4, 277, 2, 0xe3bd69); stick(g, x1 + 4, 300, x1 + 4, 277, 2, 0xe3bd69);
  }
  if (switchback(r)) {
    stick(g, 276, 283, 276, 246, 1.6, 0x9edbd5); stick(g, 276, 246, 270, 253, 1.6, 0x9edbd5);
    stick(g, 390, 246, 390, 280, 1.6, 0x9edbd5); stick(g, 390, 280, 384, 273, 1.6, 0x9edbd5);
    if (!cache && spec.cache) { g.fillStyle(0xe2ca75).fillEllipse(spec.cache.x, spec.cache.y - 14, 17, 12); g.lineStyle(1.4, INK).strokeEllipse(spec.cache.x, spec.cache.y - 14, 17, 12); }
  }
  if (hasVent(r)) {
    const phase = ventPhase(clock), x = spec.vent!.x;
    g.fillStyle(0x333c40).fillEllipse(x, 300, 40, 10); g.lineStyle(1, INK).strokeEllipse(x, 300, 40, 10);
    if (phase !== "quiet") { g.lineStyle(2, phase === "active" ? 0xff9b65 : 0xf0d88d).strokeCircle(x, 284, 5).strokeCircle(x + 8, 275, 3); }
    if (phase === "active") g.fillStyle(0xec936c, 0.65).fillTriangle(x - 20, 304, x, 253, x + 20, 304);
  }
}
