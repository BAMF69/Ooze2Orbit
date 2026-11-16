// Purpose: Seeded Water-biome room grammar and the collision rubric used by both play and validation.
// Usage: generateWater(seed), worldProblems(world), roomSolid(room, basinRaised).
// Notes: PROTOTYPE: stable v1 grammar; seed 0 is the authored fallback. No engine/global RNG.
// Authored: Written with Codex (GPT-6).
import type { RoomSpec } from "./levelgen/roomSpec";
export const WATER = {
  version: 1, attempts: 4, tile: 16, width: 640, floor: 304, ceiling: 96,
  spawn: 48, exit: 600, interactReach: 38, swimSpeed: 85, finSpeed: 155,
  current: 200, divertedCurrent: 100, oxygenSeconds: 12, hungerSeconds: 210,
  weatherSeconds: 60, enemyTell: 0.8, foeSpeed: 32, foodRelief: 35,
} as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = typeof DIFFICULTIES[number];
export type Adaptation = "gills" | "fins";
export interface WaterRoom {
  id: number; tier: Difficulty; name: string; left: number; right: number; branch: number;
  gate: boolean; tunnel: boolean; current: boolean; goal: boolean; reward?: Adaptation;
  gateX: number; platforms: { x: number; y: number; width: number }[];
  food: number[]; foes: number[]; cover: number; variant: number;
  /** Generated rooms carry their content; absent on v1 rooms, whose spec is projected (levelgen/roomSpec.ts). */
  spec?: RoomSpec;
}
export interface WaterWorld { version: number; seed: number; rooms: WaterRoom[]; fallback: boolean; rejected: string[] }
const COUNTS = { easy: 3, medium: 3, hard: 4 };
const STARTS = { easy: 0, medium: 4, hard: 7 };
export const levelStart = (tier: Difficulty): number => STARTS[tier];
/** A nursery is a side branch, so returning through its arch must not teleport past the parent's sluice. */
export const returnX = (room: WaterRoom): number => room.spec?.returnArrival?.x ?? (room.id === 3 ? 126 : 600);

/** Actual tile collision: required corridors share the same 14x18 body and 16px lattice as physics.ts. */
export function roomSolid(room: WaterRoom, raised: boolean, tx: number, ty: number): boolean {
  if (ty >= 19 || ty < 6 || tx < 0 || tx >= 40) return true;
  // A sealed log sluice cannot be jumped over. Raising the basin floats it open for every descendant.
  if (room.gate && !raised && tx === room.gateX / WATER.tile) return true;
  // Submerged tunnel leaves 48px clearance above the floor; gills are an entry requirement.
  if (room.tunnel && tx >= 11 && tx <= 30 && ty >= 6 && ty <= 15) return true;
  return room.platforms.some(p => ty === p.y / WATER.tile && tx >= p.x / WATER.tile && tx < (p.x + p.width) / WATER.tile);
}

/** Invariants first: reject missing prerequisites, disconnected/unsafe geometry and out-of-order goals. */
export function worldProblems(w: WaterWorld): string[] {
  const bad = new Set<string>(), rooms = w.rooms;
  if (w.version !== WATER.version || rooms.length !== 11 || new Set(rooms.map(r => r.id)).size !== 11) bad.add("room identity");
  for (const tier of DIFFICULTIES) {
    let id = levelStart(tier), path: WaterRoom[] = [], seen = new Set<number>();
    while (id !== -1 && !seen.has(id)) {
      seen.add(id); const r = rooms.find(r => r.id === id);
      if (!r || r.tier !== tier) { bad.add("connected paths"); break; }
      path.push(r); id = r.right;
    }
    if (id !== -1 || path.length !== COUNTS[tier] || !path.at(-1)?.goal || path.slice(0, -1).some(r => r.goal)) bad.add("connected paths");
    if (!path.some(r => r.gate)) bad.add("Gardener crossing");
    if (tier === "easy" && path.some(r => r.tunnel || r.current)) bad.add("starter access");
  }
  if (!rooms.some(r => r.tier === "easy" && r.goal && r.reward === "gills") ||
      !rooms.some(r => r.tier === "easy" && r.id === 3 && r.reward === "fins" && r.left === 1) || rooms.find(r => r.id === 1)?.branch !== 3) bad.add("reachable adaptations");
  for (const r of rooms) {
    for (const other of [r.left, r.right, r.branch]) if (other !== -1 && !rooms.some(q => q.id === other && q.tier === r.tier)) bad.add("connected paths");
    if (r.right !== -1 && rooms.find(q => q.id === r.right)?.left !== r.id) bad.add("return routes");
    if (r.gateX % 16 || r.gateX < 256 || r.gateX > 400 || r.platforms.some(p => p.x % 16 || p.y % 16 || p.width % 16)) bad.add("lattice geometry");
    // Walk the entire corridor with the real body footprint, rather than guessing point reachability.
    for (let x = WATER.spawn; x <= WATER.exit; x += 4) {
      for (const tx of [Math.floor((x - 7) / 16), Math.floor((x + 6.999) / 16)]) {
        if (roomSolid(r, true, tx, 17) || roomSolid(r, true, tx, 18)) bad.add("body clearance");
      }
    }
    if (r.food.length < 4 || r.food.some(x => x < 96 || x > 560 || x % 16) || new Set(r.food).size !== r.food.length) bad.add("food spacing");
    if (r.foes.some(x => x < 400 || x > 560 || x % 16) || r.foes.length > (r.tier === "easy" ? 1 : r.tier === "medium" ? 2 : 3)) bad.add("encounter safety");
  }
  return [...bad];
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let n = Math.imul(s ^ s >>> 15, 1 | s); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return (n ^ n >>> 14) >>> 0; };
}

/** Skeleton first -> attach reachable nursery branch -> decorate from safe lattice slots. */
function candidate(seed: number, attempt: number): WaterWorld {
  const next = rng((seed + attempt * 0x9e3779b9) >>> 0), rooms: WaterRoom[] = [];
  for (const tier of DIFFICULTIES) {
    const start = STARTS[tier], count = COUNTS[tier];
    for (let n = 0; n < count; n++) {
      const id = start + n, variant = seed === 0 ? n % 3 : next() % 3;
      const gateX = (18 + (seed === 0 ? 0 : next() % 5)) * 16;
      const food = [7, 13, 24, 32].map(x => (x + (seed === 0 ? 0 : next() % 3)) * 16);
      rooms.push({ id, tier, name: `${tier === "easy" ? "Reed shallows" : tier === "medium" ? "Drowned galleries" : "Torrent heart"} ${n + 1}`,
        left: n === 0 ? -1 : id - 1, right: n === count - 1 ? -1 : id + 1, branch: id === 1 ? 3 : -1,
        gate: n === 1, tunnel: tier === "medium" && n === 1, current: tier === "hard" && n > 0,
        goal: n === count - 1, ...(tier === "easy" && n === count - 1 ? { reward: "gills" as const } : {}),
        gateX, platforms: tier === "medium" && n === 1 ? [] : [{ x: (10 + variant * 3) * 16, y: 224, width: 48 }],
        food, foes: n === 0 ? [] : tier === "hard" ? [416, 496] : [464 + variant * 16], cover: (12 + variant * 2) * 16, variant });
    }
  }
  rooms.push({ id: 3, tier: "easy", name: "Ripplefin nursery", left: 1, right: -1, branch: -1,
    gate: false, tunnel: false, current: false, goal: false, reward: "fins", gateX: 288,
    platforms: [{ x: 256, y: 224, width: 64 }], food: [112, 208, 384, 512], foes: [], cover: 224, variant: next() % 3 });
  return { version: WATER.version, seed: seed >>> 0, rooms: rooms.sort((a, b) => a.id - b.id), fallback: false, rejected: [] };
}

export function generateWater(seed: number): WaterWorld {
  const rejected: string[] = [];
  for (let attempt = 0; attempt < WATER.attempts; attempt++) {
    const w = candidate(seed, attempt), bad = worldProblems(w);
    if (!bad.length) return { ...w, rejected };
    rejected.push(`attempt ${attempt}: ${bad.join(", ")}`);
  }
  return { ...candidate(0, 0), seed: seed >>> 0, fallback: true, rejected };
}
