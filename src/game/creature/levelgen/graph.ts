// ---------------------------------------------------------------------------
// graph.ts (creature/levelgen)
// Purpose : Layer 1 of the generator (CREATURE_LEVELGEN.md §3.2): the progression graph of a biome, built
//           critical path first, then the loop, then key placements, then optional branches. Rooms do not exist
//           yet; every edge already names its sides and the materials that block it, so arrivals and
//           solvability are decided here and only confirmed by the physical layer.
// Usage   : generateWaterGraph(seed) -> BiomeGraph (validated, with rejection reasons and a fallback flag)
// Notes   : Pure, deterministic (levelgen/rng.ts). Seed 0 reproduces the v1 topology: 3 + nursery / 3 / 4 rooms.
//           Water-specific recipes live in waterRecipe(); the types are biome-agnostic.
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
import type { Difficulty } from "../waterWorld";
import type { EnemyKind } from "../waterEncounters";
import { LEVELGEN } from "./tuning";
import { makeRng, type Rng } from "./rng";
import { statKey, type Key, type MaterialId, type Stat, type FunPart, type ClassSkill, FUN_PARTS } from "./keys";
import { graphProblems } from "./graphProblems";
import { generateLayout, cell, door, template, type DoorDirection, type LayoutEdge, type LayoutNode, type Cell } from "./maniamap";

export type Side = "left" | "right" | "top" | "bottom";
export type RoomRole = "lever" | "nursery" | "arena" | "drain" | "shaft" | "pressure" | "hardEntry" | "classTrial" | "vault" | "channel";
export type Reward = "gills" | "fins" | FunPart;
export interface RoomNode {
  id: string; role: RoomRole; depth: number; onCritical: boolean; enemies: EnemyKind[];
  gate: boolean; current: boolean; goal: boolean; sealed: boolean; pit: boolean; reward: Reward | null;
  classVariant?: ClassSkill; vaultStat?: Stat; hostsTop?: string; hostsBottom?: string;
  /** A channel's width in chain steps: it covers span + 1 map cells, from the drain to the finale. */
  span?: number;
}
export interface Edge {
  id: string; from: string; to: string; fromSide: Side; toSide: Side;
  materials: MaterialId[]; keys?: Key[][]; opensWhen?: "controls"; reciprocal: string;
  /** The room whose controls open this edge (both directions of a channel hatch): passable only once it is reached. */
  openedBy?: string;
}
export interface Placement { kind: "storyKey" | "funPart" | "seal"; key: string; node: string }
/** Where each room sits on the level map (ManiaMap layout, levelgen/maniamap.ts): its cells and its doors. */
export interface MapCell { x: number; y: number }
export interface LevelMap { cells: Record<string, MapCell[]>; doors: { from: string; to: string; side: Side; a: MapCell; b: MapCell }[] }
/** Where a Gardener intervention is operated: the nest menu (a free toggle today) or a room of a level. */
export interface GardenerControl { key: "gardener:raise" | "gardener:divert"; at: "menu" | { tier: Difficulty; node: string } }
export interface LevelGraph { tier: Difficulty; entry: Key[][]; nodes: RoomNode[]; edges: Edge[]; placements: Placement[]; loops: number; map: LevelMap | null }
export interface BiomeGraph { version: 2; seed: number; biome: "water"; levels: LevelGraph[]; gardener: GardenerControl[]; fallback: boolean; rejected: string[] }
/** BAMF69 2026-11-18: the Gardener stays a free toggle at the nest for now. */
export const MENU_GARDENER: GardenerControl[] = [{ key: "gardener:raise", at: "menu" }, { key: "gardener:divert", at: "menu" }];
export const TIERS: readonly Difficulty[] = ["easy", "medium", "hard"];
export const OPPOSITE: Record<Side, Side> = { left: "right", right: "left", top: "bottom", bottom: "top" };

const node = (id: string, role: RoomRole, extra: Partial<RoomNode> = {}): RoomNode =>
  ({ id, role, depth: -1, onCritical: false, enemies: [], gate: false, current: false, goal: false, sealed: false, pit: false, reward: null, ...extra });

/** Adds a forward edge and its reciprocal; returns can always be walked unless `both` says the loop is gated both ways. */
function link(edges: Edge[], from: RoomNode, to: RoomNode, fromSide: Side, materials: MaterialId[], opts: { keys?: Key[][]; opensWhen?: "controls"; both?: boolean; openedBy?: string } = {}): void {
  const id = `${from.id}>${to.id}:${fromSide}`, back = `${to.id}>${from.id}:${OPPOSITE[fromSide]}`;
  edges.push({ id, from: from.id, to: to.id, fromSide, toSide: OPPOSITE[fromSide], materials, keys: opts.keys, opensWhen: opts.opensWhen, reciprocal: back, ...(opts.openedBy ? { openedBy: opts.openedBy } : {}) });
  edges.push({ id: back, from: to.id, to: from.id, fromSide: OPPOSITE[fromSide], toSide: fromSide, materials: opts.both ? materials : ["open"], opensWhen: opts.both ? opts.opensWhen : undefined, reciprocal: id, ...(opts.openedBy ? { openedBy: opts.openedBy } : {}) });
  if (fromSide === "top") { from.hostsTop = to.id; to.hostsBottom = from.id; }
  if (fromSide === "bottom") { from.hostsBottom = to.id; to.hostsTop = from.id; }
}

/** Which rooms may open a shaft upward into a branch: those whose template has a free top edge. */
// One keyed control per room (a class trial already has its door) and no climbing ledges over a pit.
const canHostTop = (n: RoomNode): boolean => (n.role === "lever" || n.role === "pressure" || n.role === "arena") && !n.hostsTop && !n.pit;

function waterRecipe(tier: Difficulty, rng: Rng, authored: boolean): LevelGraph {
  const nodes: RoomNode[] = [], edges: Edge[] = [], placements: Placement[] = [];
  const [lo, hi] = LEVELGEN.chain[tier], count = authored ? lo : lo + rng.int(hi - lo + 1);
  const id = (n: number | string) => `${tier}:${n}`;
  const extra = count - lo; // optional middle rooms
  const chain: RoomNode[] = [];
  if (tier === "easy") {
    chain.push(node(id(0), "lever"), node(id(1), "lever", { gate: true, enemies: ["charger"] }));
    for (let n = 0; n < extra; n++) chain.push(node(id(chain.length), "lever", { enemies: [rng.pick(["ambusher", "charger"] as const)] }));
    chain.push(node(id(chain.length), "arena", { goal: true, sealed: true, reward: "gills", enemies: ["ambusher"] }));
  } else if (tier === "medium") {
    chain.push(node(id(0), "drain", { enemies: ["charger", "ambusher"] }), node(id(1), "shaft", { gate: true, enemies: ["swimmer"] }));
    for (let n = 0; n < extra; n++) chain.push(node(id(chain.length), rng.chance(0.5) ? "classTrial" : "lever", { enemies: [rng.pick(["ambusher", "charger"] as const)] }));
    chain.push(node(id(chain.length), "pressure", { goal: true, enemies: ["dropper", "swimmer"] }));
  } else {
    chain.push(node(id(0), "hardEntry", { sealed: true, pit: true, enemies: ["charger"] }),
      node(id(1), "drain", { current: true, enemies: ["charger", "swimmer"] }), node(id(2), "shaft", { current: true, enemies: ["swimmer", "swimmer"] }));
    for (let n = 0; n < extra; n++) chain.push(node(id(chain.length), rng.chance(0.6) ? "classTrial" : "lever", { current: true, enemies: [rng.pick(["charger", "ambusher"] as const)] }));
    chain.push(node(id(chain.length), "pressure", { goal: true, sealed: true, pit: true, current: true, enemies: ["charger", "dropper", "swimmer"] }));
  }
  chain.forEach((n, depth) => { n.depth = depth; n.onCritical = true; nodes.push(n); });
  for (let n = 1; n < chain.length; n++) {
    const from = chain[n - 1], to = chain[n], materials: MaterialId[] = ["controls"];
    if (from.gate) materials.push("sluice");
    if (to.current) materials.push("torrent");
    if (from.role === "classTrial") materials.push("classDoor");
    link(edges, from, to, "right", materials);
  }
  const goal = chain[chain.length - 1];
  // The loop (Unexplored-style cyclic rule, invariant 9): a channel under the chain joins the solved drain's floor to
  // a hatch behind the finale's exit wall, a shortcut home once the seal is claimed. Until 2026-11-18 the "loop" was
  // a second edge between the drain and the shaft, which adds no route (review finding 3).
  const drainNode = chain.find(n => n.role === "drain");
  if (drainNode) {
    const ch = node(id("c"), "channel", { depth: drainNode.depth + 1, span: goal.depth - drainNode.depth });
    nodes.push(ch);
    // Each hatch opens with the controls of the room above it, so the channel never bypasses the shaft's sluice.
    link(edges, drainNode, ch, "bottom", ["controls"], { opensWhen: "controls", both: true, openedBy: drainNode.id });
    link(edges, goal, ch, "bottom", ["controls"], { opensWhen: "controls", both: true, openedBy: goal.id });
  }
  placements.push({ kind: "seal", key: tier, node: goal.id });
  if (goal.reward) placements.push({ kind: "storyKey", key: goal.reward, node: goal.id });
  if (tier === "easy") {
    const hosts = chain.filter(n => n.role === "lever" && n.depth > 0), host = authored ? hosts[0] : rng.pick(hosts);
    const nursery = node(id("n"), "nursery", { reward: "fins", depth: host.depth + 1 });
    nodes.push(nursery); link(edges, host, nursery, "top", ["open"]);
    placements.push({ kind: "storyKey", key: "fins", node: nursery.id });
  }
  if (!authored && rng.chance(LEVELGEN.branches.vaultChance)) {
    const hosts = nodes.filter(canHostTop);
    if (hosts.length) {
      const host = rng.pick(hosts), stat = rng.pick(["strength", "vitality", "agility", "intellect"] as const), part = rng.pick(FUN_PARTS);
      const vault = node(id("v"), "vault", { reward: part, vaultStat: stat, depth: host.depth + 1 });
      const material = `vault${stat[0].toUpperCase()}${stat.slice(1)}` as MaterialId;
      nodes.push(vault);
      link(edges, host, vault, "top", [material], { keys: [[statKey(stat, LEVELGEN.bonusTier[tier])], [`skill:${stat}:${stat === "intellect" ? 20 : 30}`]] });
      placements.push({ kind: "funPart", key: part, node: vault.id });
    }
  }
  const entry: Key[][] = tier === "easy" ? [["play"]] : tier === "medium" ? [["gills"]] : [["gills", "fins"]];
  const level: LevelGraph = { tier, entry, nodes, edges, placements, loops: 0, map: null };
  level.loops = cycleCount(level);
  level.map = layOut(level, rng.fork(7));
  return level;
}

/** Independent cycles of the level's room graph, from its edges: rooms joined by any edge count once, so parallel
 *  edges between the same two rooms add nothing (cyclomatic number E - V + C of the simple undirected graph). */
export function cycleCount(level: Pick<LevelGraph, "nodes" | "edges">): number {
  const pairs = new Set<string>(), parent = new Map(level.nodes.map(n => [n.id, n.id]));
  const find = (x: string): string => { while (parent.get(x) !== x) x = parent.get(x)!; return x; };
  for (const e of level.edges) {
    if (e.from === e.to || !parent.has(e.from) || !parent.has(e.to)) continue;
    pairs.add(e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`); parent.set(find(e.from), find(e.to));
  }
  const components = new Set(level.nodes.map(n => find(n.id))).size;
  return pairs.size - level.nodes.length + components;
}

const DIRECTION: Record<Side, DoorDirection> = { right: "east", left: "west", top: "north", bottom: "south" };
const SIDE: Record<DoorDirection, Side> = { east: "right", west: "left", north: "top", south: "bottom" };
/** Each room as a ManiaMap template: one cell with doors where its edges leave, a channel span + 1 cells wide with a
 *  ceiling door at each end. Doors are two-way; the edge's materials decide passage, not the map. */
function roomTemplate(level: LevelGraph, n: RoomNode) {
  const sides = new Set(level.edges.filter(e => e.from === n.id).map(e => e.fromSide));
  if (n.role === "channel") {
    const w = (n.span ?? 2) + 1;
    return template(n.id, [Array.from({ length: w }, (_, i): Cell => cell(i === 0 || i === w - 1 ? { north: door() } : {}))]);
  }
  return template(n.id, [[cell(Object.fromEntries([...sides].map(s => [DIRECTION[s], door()])))]]);
}
/** Lay the level out on the map grid; null when ManiaMap finds no placement (invariant "map layout"). */
export function layOut(level: LevelGraph, rng: Rng): LevelMap | null {
  const entry = entryNode(level), ordered = [entry, ...level.nodes.filter(n => n !== entry)];
  const nodes: LayoutNode[] = ordered.map(n => ({ id: n.id, template: roomTemplate(level, n) }));
  // One layout edge per reciprocal pair, in the forward direction the recipe linked it.
  const forward = level.edges.filter(e => e.fromSide === "right" || e.fromSide === "top" && findNode(level, e.from).role !== "channel" || e.fromSide === "bottom" && findNode(level, e.to).role === "channel");
  const edges: LayoutEdge[] = forward.map(e => ({ from: e.from, to: e.to, side: DIRECTION[e.fromSide] }));
  const layout = generateLayout(nodes, edges, rng);
  if (!layout) return null;
  const cells: Record<string, MapCell[]> = {};
  for (const r of layout.rooms.values()) cells[r.id] = r.template.cells.flatMap((row, y) => row.flatMap((c, x) => c ? [{ x: x + r.position.x, y: y + r.position.y }] : []));
  const doors: LevelMap["doors"] = [];
  for (const c of layout.connections) {
    const f = layout.rooms.get(c.from)!, t = layout.rooms.get(c.to)!;
    const a = { x: f.position.x + c.fromDoor.position.x, y: f.position.y + c.fromDoor.position.y }, b = { x: t.position.x + c.toDoor.position.x, y: t.position.y + c.toDoor.position.y };
    doors.push({ from: c.from, to: c.to, side: SIDE[c.fromDoor.direction], a, b }, { from: c.to, to: c.from, side: SIDE[c.toDoor.direction], a: b, b: a });
  }
  return { cells, doors };
}

/** The hand-made baseline (SOP-17 §4): the v1 topology, used for seed 0 and as the fallback after capped retries. */
export const authoredWaterGraph = (): BiomeGraph =>
  ({ version: 2, seed: 0, biome: "water", levels: TIERS.map(t => waterRecipe(t, makeRng(0), true)), gardener: MENU_GARDENER, fallback: false, rejected: [] });
export function generateWaterGraph(seed: number): BiomeGraph {
  const rejected: string[] = [];
  for (let attempt = 0; attempt < LEVELGEN.attempts; attempt++) {
    const rng = makeRng((seed + attempt * 0x9e3779b9) >>> 0);
    const g: BiomeGraph = seed === 0 && attempt === 0 ? authoredWaterGraph() :
      { version: 2, seed: seed >>> 0, biome: "water", levels: TIERS.map(t => waterRecipe(t, rng.fork(t.length), false)), gardener: MENU_GARDENER, fallback: false, rejected: [] };
    const bad = graphProblems(g);
    if (!bad.length) return { ...g, rejected };
    rejected.push(`attempt ${attempt}: ${bad.join(", ")}`);
  }
  return { ...authoredWaterGraph(), seed: seed >>> 0, fallback: true, rejected };
}
export const findNode = (g: LevelGraph, id: string): RoomNode => { const n = g.nodes.find(n => n.id === id); if (!n) throw new Error(`graph: no node ${id}`); return n; };
export const entryNode = (g: LevelGraph): RoomNode => g.nodes.find(n => n.depth === 0 && n.onCritical) ?? g.nodes[0];
