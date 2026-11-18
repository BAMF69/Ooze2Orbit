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

export type Side = "left" | "right" | "top" | "bottom";
export type RoomRole = "lever" | "nursery" | "arena" | "drain" | "shaft" | "pressure" | "hardEntry" | "classTrial" | "vault";
export type Reward = "gills" | "fins" | FunPart;
export interface RoomNode {
  id: string; role: RoomRole; depth: number; onCritical: boolean; enemies: EnemyKind[];
  gate: boolean; current: boolean; goal: boolean; sealed: boolean; pit: boolean; reward: Reward | null;
  classVariant?: ClassSkill; vaultStat?: Stat; hostsTop?: string; hostsBottom?: string;
}
export interface Edge {
  id: string; from: string; to: string; fromSide: Side; toSide: Side;
  materials: MaterialId[]; keys?: Key[][]; opensWhen?: "controls"; reciprocal: string;
}
export interface Placement { kind: "storyKey" | "funPart" | "seal"; key: string; node: string }
export interface LevelGraph { tier: Difficulty; entry: Key[][]; nodes: RoomNode[]; edges: Edge[]; placements: Placement[]; loops: number }
export interface BiomeGraph { version: 2; seed: number; biome: "water"; levels: LevelGraph[]; fallback: boolean; rejected: string[] }
export const TIERS: readonly Difficulty[] = ["easy", "medium", "hard"];
export const OPPOSITE: Record<Side, Side> = { left: "right", right: "left", top: "bottom", bottom: "top" };

const node = (id: string, role: RoomRole, extra: Partial<RoomNode> = {}): RoomNode =>
  ({ id, role, depth: -1, onCritical: false, enemies: [], gate: false, current: false, goal: false, sealed: false, pit: false, reward: null, ...extra });

/** Adds a forward edge and its reciprocal; returns can always be walked unless `both` says the loop is gated both ways. */
function link(edges: Edge[], from: RoomNode, to: RoomNode, fromSide: Side, materials: MaterialId[], opts: { keys?: Key[][]; opensWhen?: "controls"; both?: boolean } = {}): void {
  const id = `${from.id}>${to.id}:${fromSide}`, back = `${to.id}>${from.id}:${OPPOSITE[fromSide]}`;
  edges.push({ id, from: from.id, to: to.id, fromSide, toSide: OPPOSITE[fromSide], materials, keys: opts.keys, opensWhen: opts.opensWhen, reciprocal: back });
  edges.push({ id: back, from: to.id, to: from.id, fromSide: OPPOSITE[fromSide], toSide: fromSide, materials: opts.both ? materials : ["open"], opensWhen: opts.both ? opts.opensWhen : undefined, reciprocal: id });
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
    // Unexplored-style loop: a solved drain opens a drop into the following shaft, and the shaft's ledge leads back up.
    if (from.role === "drain" && to.role === "shaft") link(edges, from, to, "bottom", ["controls"], { opensWhen: "controls", both: true });
  }
  const goal = chain[chain.length - 1];
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
  const loops = edges.filter(e => e.fromSide === "bottom" && e.id < e.reciprocal).length;
  return { tier, entry, nodes, edges, placements, loops };
}

/** The hand-made baseline (SOP-17 §4): the v1 topology, used for seed 0 and as the fallback after capped retries. */
export const authoredWaterGraph = (): BiomeGraph =>
  ({ version: 2, seed: 0, biome: "water", levels: TIERS.map(t => waterRecipe(t, makeRng(0), true)), fallback: false, rejected: [] });
export function generateWaterGraph(seed: number): BiomeGraph {
  const rejected: string[] = [];
  for (let attempt = 0; attempt < LEVELGEN.attempts; attempt++) {
    const rng = makeRng((seed + attempt * 0x9e3779b9) >>> 0);
    const g: BiomeGraph = seed === 0 && attempt === 0 ? authoredWaterGraph() :
      { version: 2, seed: seed >>> 0, biome: "water", levels: TIERS.map(t => waterRecipe(t, rng.fork(t.length), false)), fallback: false, rejected: [] };
    const bad = graphProblems(g);
    if (!bad.length) return { ...g, rejected };
    rejected.push(`attempt ${attempt}: ${bad.join(", ")}`);
  }
  return { ...authoredWaterGraph(), seed: seed >>> 0, fallback: true, rejected };
}
export const findNode = (g: LevelGraph, id: string): RoomNode => { const n = g.nodes.find(n => n.id === id); if (!n) throw new Error(`graph: no node ${id}`); return n; };
export const entryNode = (g: LevelGraph): RoomNode => g.nodes.find(n => n.depth === 0 && n.onCritical) ?? g.nodes[0];
