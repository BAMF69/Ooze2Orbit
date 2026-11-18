// Purpose: Engine-free patrol, committed attacks and resolution for the Jungle Medium rooms.
import { makeRng } from "./levelgen/rng";

interface Point { x: number; y: number }
export interface JungleSpec {
  id: number; kind: "thrower" | "diver" | "pouncer"; name: string; room: string; tell: number; strike: number; recover: number; hp: number; damage: number;
  patrol: Point[]; roost: Point; color: number; warning: string; trap: string;
}
export const JUNGLE = {
  width: 640, floor: 304, spawn: 48, retreat: 24, exit: 576, reach: 24,
  start: 200, pass: 456, coverEnd: 480, trapX: 280, trapRadius: 34, detectEnd: 470,
  damageRadius: 22, biteReach: 43, patrolSeconds: 5, returnSeconds: 0.55, seedSalt: 0x4a554e47,
} as const;

export const JUNGLE_MEDIUM: readonly JungleSpec[] = [
  { id: -4, kind: "thrower", name: "Vine thrower", room: "Vine Well", tell: 1.25, strike: 0.65, recover: 1.55, hp: 5, damage: 2,
    patrol: [{ x: 360, y: 186 }, { x: 360, y: 260 }, { x: 360, y: 186 }, { x: 360, y: 123 }], roost: { x: 360, y: 285 },
    color: 0xb27043, warning: "Fruit incoming. Leave the marked landing patch.", trap: "Vine snare" },
  { id: -5, kind: "diver", name: "Spearbeak diver", room: "Canopy Gap", tell: 1.30, strike: 0.60, recover: 1.85, hp: 5, damage: 2,
    patrol: [{ x: 380, y: 140 }, { x: 485, y: 178 }, { x: 385, y: 214 }, { x: 282, y: 170 }], roost: { x: 390, y: 284 },
    color: 0xd3bf98, warning: "Wings folding. Step away from the marked dive lane.", trap: "Raised snare" },
  { id: -6, kind: "pouncer", name: "Wall pouncer", room: "Wall Loop", tell: 1.35, strike: 0.50, recover: 1.80, hp: 6, damage: 2,
    patrol: [{ x: 624, y: 282 }, { x: 624, y: 116 }, { x: 370, y: 116 }, { x: 624, y: 116 }, { x: 624, y: 282 }, { x: 460, y: 284 }],
    roost: { x: 410, y: 284 }, color: 0x7b8abe, warning: "Pads braced. Leave the marked landing patch.", trap: "Floor net" },
];

export const jungleRoom = (id: number): JungleSpec | undefined => JUNGLE_MEDIUM.find(room => room.id === id);
export interface JungleEnemy {
  phase: "patrol" | "tell" | "strike" | "recover" | "return";
  clock: number; elapsed: number; hp: number; struck: boolean;
  from: Point; target: Point; at: Point; armed: boolean; hiddenCrossing: boolean;
  verdict: "fight" | "sneak" | "trap" | null;
}

const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function patrol(spec: JungleSpec, clock: number): Point {
  const index = (clock / JUNGLE.patrolSeconds % 1) * spec.patrol.length;
  const current = Math.floor(index);
  return mix(spec.patrol[current], spec.patrol[(current + 1) % spec.patrol.length], index - current);
}

export function jungleEnemy(spec: JungleSpec, seed: number): JungleEnemy {
  const clock = makeRng(seed ^ JUNGLE.seedSalt ^ spec.id).int(500) / 100;
  const at = patrol(spec, clock);
  return { phase: "patrol", elapsed: 0, clock, hp: spec.hp, struck: false, from: at, target: at, at, armed: false,
    hiddenCrossing: false, verdict: null };
}

export function jungleCover(x: number, flood: boolean): boolean {
  return x >= JUNGLE.start - (flood ? 36 : 24) && x <= JUNGLE.coverEnd;
}

export function jungleStrikePoint(spec: JungleSpec, e: JungleEnemy, t: number): Point {
  const strike = mix(e.from, e.target, t);
  if (spec.kind === "thrower") strike.y -= 84 * t * (1 - t) * 4;
  return strike;
}

export function stepJungleEnemy(spec: JungleSpec, e: JungleEnemy, player: Point & { crouch: boolean }, dt: number, flood: boolean): number {
  if (e.verdict || dt <= 0) return 0;
  const hidden = player.crouch && player.y >= 272 && jungleCover(player.x, flood);
  if (!hidden || e.phase !== "patrol") e.hiddenCrossing = false;
  else if (player.x <= JUNGLE.start) e.hiddenCrossing = true;
  if (e.hiddenCrossing && player.x >= JUNGLE.pass) { e.verdict = "sneak"; return 0; }

  e.elapsed += dt;
  switch (e.phase) {
    case "patrol":
      e.clock += dt;
      e.at = patrol(spec, e.clock);
      if (!hidden && player.x >= JUNGLE.start && player.x <= JUNGLE.detectEnd) {
        e.phase = "tell"; e.elapsed = 0; e.struck = false;
        e.from = e.at;
        e.target = { x: player.x, y: JUNGLE.floor - 12 };
      }
      return 0;
    case "tell":
      if (e.elapsed >= spec.tell) { e.phase = "strike"; e.elapsed = 0; }
      return 0;
    case "strike": {
      const t = Math.min(1, e.elapsed / spec.strike);
      const strike = jungleStrikePoint(spec, e, t);
      if (spec.kind !== "thrower") e.at = strike;
      if (t >= 1 && e.armed && Math.abs(e.target.x - JUNGLE.trapX) <= JUNGLE.trapRadius) {
        e.verdict = "trap"; e.armed = false; if (spec.kind === "thrower") e.at = spec.roost;
        return 0;
      }
      const hit = !e.struck && Math.hypot(strike.x - player.x, strike.y - (player.y - 12)) <= JUNGLE.damageRadius;
      if (hit) e.struck = true;
      if (t >= 1) { e.phase = "recover"; e.elapsed = 0; e.from = e.at; }
      return hit ? spec.damage : 0;
    }
    case "recover":
      e.at = mix(e.from, spec.roost, Math.min(1, e.elapsed / 0.24));
      if (e.elapsed >= spec.recover) { e.phase = "return"; e.elapsed = 0; }
      return 0;
    case "return":
      e.at = mix(spec.roost, patrol(spec, e.clock), Math.min(1, e.elapsed / JUNGLE.returnSeconds));
      if (e.elapsed >= JUNGLE.returnSeconds) { e.phase = "patrol"; e.elapsed = 0; }
      return 0;
  }
}

export function biteJungleEnemy(e: JungleEnemy, player: Point, strength: number): void {
  if (e.verdict || e.phase !== "recover" || Math.hypot(e.at.x - player.x, e.at.y - (player.y - 12)) > JUNGLE.biteReach) return;
  e.hp = Math.max(0, e.hp - Math.max(1, strength) * 2);
  if (!e.hp) e.verdict = "fight";
}
