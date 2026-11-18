// ---------------------------------------------------------------------------
// maniamap.ts (creature/levelgen)
// Purpose : Multi-cell room layout for the level generator (CREATURE_LEVELGEN.md step 1.6): rooms are grids of map
//           cells with doors on any side of any cell, so a room can span several screens and a level's map is built
//           by placing rooms whose doors line up, never overlapping. The minimap and the map-coherence checks read
//           the resulting layout.
// Usage   : const t = template("drain", [[cell({ west: door(), east: door(), south: door() })]]);
//           const layout = generateLayout(nodes, edges, rng)  -> Layout | null
// Notes   : Translated to TypeScript from ManiaMap (see the notice below): Cell, Door, DoorType, DoorDirection,
//           RoomTemplate.Intersects / PlaneAlignedDoors, ConfigurationSpace, Configuration, Layout and the
//           LayoutGenerator's AddRoom / InsertRoom placement with backtracking. Changes from the original, as the
//           licence asks a reader to be able to tell: 2D only (no Top/Bottom doors, z layers or shafts); an edge may
//           name the side its door leaves from (our graph records it); each node has one template instead of a
//           template group; chains are built from our level graph instead of ManiaMap's decomposers; positions are
//           {x: column, y: row} instead of (row, column).
// Authored: Ported for Ooze2Orbit by Claude (Opus 5.5), 2026-11-18, from ManiaMap commit 35f5244 (2025-10-14).
//
// ManiaMap — https://github.com/mpewsey/ManiaMap
// BSD 3-Clause License
//
// Copyright (c) 2022, Matt Pewsey
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived from
//    this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
// ---------------------------------------------------------------------------
import type { Rng } from "./rng";

export type DoorDirection = "north" | "south" | "east" | "west";
export type DoorType = "twoWay" | "twoWayExit" | "twoWayEntrance" | "oneWayExit" | "oneWayEntrance";
export interface Door { type: DoorType; code: number }
export interface Cell { doors: Partial<Record<DoorDirection, Door>> }
/** A room's shape: cells[row][col], null where the room has no cell. */
export interface RoomTemplate { id: string; cells: (Cell | null)[][] }
export interface Vec { x: number; y: number } // x = column, y = row
export interface DoorPosition { position: Vec; direction: DoorDirection; door: Door }
export interface Configuration { position: Vec; from: DoorPosition; to: DoorPosition }
export interface PlacedRoom { id: string; template: RoomTemplate; position: Vec }
export interface DoorConnection { from: string; to: string; fromDoor: DoorPosition; toDoor: DoorPosition }
export interface Layout { rooms: Map<string, PlacedRoom>; connections: DoorConnection[] }
export interface LayoutNode { id: string; template: RoomTemplate }
export interface LayoutEdge { from: string; to: string; side?: DoorDirection; code?: number }

export const OPPOSITE_DOOR: Record<DoorDirection, DoorDirection> = { north: "south", south: "north", east: "west", west: "east" };
export const door = (type: DoorType = "twoWay", code = 0): Door => ({ type, code });
export const cell = (doors: Partial<Record<DoorDirection, Door>> = {}): Cell => ({ doors });
export const template = (id: string, cells: (Cell | null)[][]): RoomTemplate => ({ id, cells });
const rows = (t: RoomTemplate): number => t.cells.length;
const cols = (t: RoomTemplate): number => t.cells[0]?.length ?? 0;
const at = (t: RoomTemplate, r: number, c: number): Cell | null => r >= 0 && c >= 0 && r < rows(t) && c < cols(t) ? t.cells[r][c] : null;

// Door.DoorCodesAlign and Door.DoorTypesAlign.
export const codesAlign = (a: number, b: number): boolean => a === b || (a & b) !== 0;
export function typesAlign(from: DoorType, to: DoorType): boolean {
  if (from === "twoWay") return true;
  if (from === "twoWayExit" || from === "oneWayExit") return to !== "twoWayExit" && to !== "oneWayExit";
  return to !== "twoWayEntrance" && to !== "oneWayEntrance";
}
const aligns = (a: Door | undefined, b: Door | undefined): boolean => !!a && !!b && codesAlign(a.code, b.code) && typesAlign(a.type, b.type);

/** RoomTemplate.Intersects: do the two templates share a cell when `other` sits at `offset` from this one? */
export function intersects(t: RoomTemplate, other: RoomTemplate, offset: Vec): boolean {
  const c0 = Math.max(0, offset.x), c1 = Math.min(cols(t), cols(other) + offset.x);
  const r0 = Math.max(0, offset.y), r1 = Math.min(rows(t), rows(other) + offset.y);
  for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (t.cells[r][c] && other.cells[r - offset.y][c - offset.x]) return true;
  return false;
}
/** RoomTemplate.PlaneAlignedDoors: door pairs facing each other across a shared cell edge. */
export function alignedDoors(t: RoomTemplate, other: RoomTemplate, offset: Vec): { from: DoorPosition; to: DoorPosition }[] {
  if (intersects(t, other, offset)) return [];
  const out: { from: DoorPosition; to: DoorPosition }[] = [];
  const c0 = Math.max(0, offset.x - 1), c1 = Math.min(cols(t), cols(other) + offset.x + 1);
  const r0 = Math.max(0, offset.y - 1), r1 = Math.min(rows(t), rows(other) + offset.y + 1);
  const step: Record<DoorDirection, Vec> = { west: { x: -1, y: 0 }, east: { x: 1, y: 0 }, north: { x: 0, y: -1 }, south: { x: 0, y: 1 } };
  for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
    const here = t.cells[r][c]; if (!here) continue;
    for (const dir of ["west", "north", "east", "south"] as DoorDirection[]) {
      const n = { x: c - offset.x + step[dir].x, y: r - offset.y + step[dir].y }, there = at(other, n.y, n.x);
      if (there && aligns(here.doors[dir], there.doors[OPPOSITE_DOOR[dir]]))
        out.push({ from: { position: { x: c, y: r }, direction: dir, door: here.doors[dir]! }, to: { position: n, direction: OPPOSITE_DOOR[dir], door: there.doors[OPPOSITE_DOOR[dir]]! } });
    }
  }
  return out;
}
/** ConfigurationSpace: every offset of `to` relative to `from` where a door pair aligns. */
export function configurationSpace(from: RoomTemplate, to: RoomTemplate): Configuration[] {
  const out: Configuration[] = [];
  for (let y = -rows(to); y <= rows(from); y++) for (let x = -cols(to); x <= cols(from); x++)
    for (const p of alignedDoors(from, to, { x, y })) out.push({ position: { x, y }, from: p.from, to: p.to });
  return out;
}
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
/** Layout.RoomsIntersect. */
export function layoutIntersects(layout: Layout, t: RoomTemplate, position: Vec): boolean {
  for (const r of layout.rooms.values()) if (intersects(r.template, t, sub(position, r.position))) return true;
  return false;
}
const copyLayout = (l: Layout): Layout => ({ rooms: new Map(l.rooms), connections: [...l.connections] });
/** Configuration.Matches, plus the side the edge's door must leave from (our addition). */
const matches = (c: Configuration, e: LayoutEdge): boolean => (!e.side || c.from.direction === e.side) && codesAlign(c.from.door.code, e.code ?? 0) && codesAlign(c.to.door.code, e.code ?? 0);

/**
 * LayoutGenerator: place the first node at the origin, then each chain edge. A node whose two chain neighbours are
 * already placed is inserted between them (closing a cycle); otherwise it is added next to its placed neighbour.
 * Failed chains backtrack, each layout being retried at most `maxRebases` times.
 */
export function generateLayout(nodes: LayoutNode[], edges: LayoutEdge[], rng: Rng, maxRebases = 20): Layout | null {
  const byId = new Map(nodes.map(n => [n.id, n])), spaces = new Map<string, Configuration[]>();
  const space = (a: RoomTemplate, b: RoomTemplate): Configuration[] => {
    const k = `${a.id}>${b.id}`; let s = spaces.get(k); if (!s) { s = configurationSpace(a, b); spaces.set(k, s); }
    return shuffled(s, rng);
  };
  const chains = buildChains(nodes, edges);
  const base: Layout = { rooms: new Map([[nodes[0].id, { id: nodes[0].id, template: nodes[0].template, position: { x: 0, y: 0 } }]]), connections: [] };
  const stack: { layout: Layout; rebases: number }[] = [{ layout: base, rebases: 0 }];
  let chainIndex = 0, guard = 0;
  while (stack.length && guard++ < 10000) {
    const top = stack[stack.length - 1];
    if (chainIndex >= chains.length) return top.layout;
    if (top.rebases++ > maxRebases) { stack.pop(); chainIndex--; continue; }
    const layout = copyLayout(top.layout);
    if (addChain(layout, chains[chainIndex], byId, space)) { stack.push({ layout, rebases: 0 }); chainIndex++; }
  }
  return null;
}
function addChain(layout: Layout, chain: LayoutEdge[], byId: Map<string, LayoutNode>, space: (a: RoomTemplate, b: RoomTemplate) => Configuration[]): boolean {
  for (let i = 0; i < chain.length; i++) {
    const back = chain[i], ahead = chain[i + 1];
    if (ahead && back.to === ahead.from && layout.rooms.has(back.from) && layout.rooms.has(ahead.to) && !layout.rooms.has(back.to)) {
      if (!insertRoom(layout, byId.get(back.to)!, back, ahead, space)) return false; i++;
    } else if (!layout.rooms.has(back.to)) { if (!addRoom(layout, byId.get(back.to)!, back, space)) return false; }
    else if (!connectPlaced(layout, back, space)) return false; // both ends placed: their doors must already meet
  }
  return true;
}
function addRoom(layout: Layout, node: LayoutNode, e: LayoutEdge, space: (a: RoomTemplate, b: RoomTemplate) => Configuration[]): boolean {
  const from = layout.rooms.get(e.from)!;
  for (const c of space(from.template, node.template)) {
    if (!matches(c, e)) continue;
    const position = add(c.position, from.position);
    if (layoutIntersects(layout, node.template, position)) continue;
    layout.rooms.set(node.id, { id: node.id, template: node.template, position });
    layout.connections.push({ from: e.from, to: node.id, fromDoor: c.from, toDoor: c.to });
    return true;
  }
  return false;
}
function insertRoom(layout: Layout, node: LayoutNode, back: LayoutEdge, ahead: LayoutEdge, space: (a: RoomTemplate, b: RoomTemplate) => Configuration[]): boolean {
  const b = layout.rooms.get(back.from)!, a = layout.rooms.get(ahead.to)!;
  for (const c1 of space(b.template, node.template)) {
    if (!matches(c1, back)) continue;
    const position = add(c1.position, b.position);
    if (layoutIntersects(layout, node.template, position)) continue;
    for (const c2 of space(node.template, a.template)) {
      if (!matches(c2, ahead) || c2.position.x !== a.position.x - position.x || c2.position.y !== a.position.y - position.y) continue;
      layout.rooms.set(node.id, { id: node.id, template: node.template, position });
      layout.connections.push({ from: back.from, to: node.id, fromDoor: c1.from, toDoor: c1.to }, { from: node.id, to: ahead.to, fromDoor: c2.from, toDoor: c2.to });
      return true;
    }
  }
  return false;
}
/** An edge between two placed rooms is kept only if their doors already face each other. */
function connectPlaced(layout: Layout, e: LayoutEdge, space: (a: RoomTemplate, b: RoomTemplate) => Configuration[]): boolean {
  if (layout.connections.some(c => c.from === e.from && c.to === e.to || c.from === e.to && c.to === e.from && (!e.side || c.toDoor.direction === e.side))) return true;
  const f = layout.rooms.get(e.from)!, t = layout.rooms.get(e.to)!, offset = sub(t.position, f.position);
  const c = space(f.template, t.template).find(c => matches(c, e) && c.position.x === offset.x && c.position.y === offset.y);
  if (!c) return false;
  layout.connections.push({ from: e.from, to: e.to, fromDoor: c.from, toDoor: c.to });
  return true;
}
/** Chains for our graphs: a spanning walk from the first node, then each node closing a cycle as a back/ahead pair. */
function buildChains(nodes: LayoutNode[], edges: LayoutEdge[]): LayoutEdge[][] {
  const placed = new Set([nodes[0].id]), chains: LayoutEdge[][] = [], used = new Set<LayoutEdge>();
  let progress = true;
  while (progress) {
    progress = false;
    // Cycle closers first: an unplaced node with edges from two placed nodes is inserted between them.
    for (const n of nodes) {
      if (placed.has(n.id)) continue;
      const ins = edges.filter(e => e.to === n.id && placed.has(e.from) && !used.has(e));
      if (ins.length >= 2) {
        const outEdge = edges.find(e => e.from === n.id && e.to === ins[1].from);
        const ahead: LayoutEdge = outEdge ?? { from: n.id, to: ins[1].from, side: ins[1].side ? OPPOSITE_DOOR[ins[1].side] : undefined, code: ins[1].code };
        chains.push([ins[0], ahead]); used.add(ins[0]); used.add(ins[1]); placed.add(n.id); progress = true;
      }
    }
    for (const e of edges) if (!used.has(e) && placed.has(e.from) && !placed.has(e.to)) {
      // Defer a node that a second placed neighbour will reach: it closes a cycle.
      const others = edges.filter(x => x.to === e.to && x !== e && !used.has(x));
      if (others.some(x => !placed.has(x.from)) && others.length) continue;
      chains.push([e]); used.add(e); placed.add(e.to); progress = true;
    }
  }
  for (const e of edges) if (!used.has(e) && placed.has(e.from) && placed.has(e.to)) chains.push([e]);
  return chains;
}
function shuffled<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = rng.int(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
