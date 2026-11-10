// ---------------------------------------------------------------------------
// combat.ts (space)
// Purpose : Real-time top-down combat as rules with no engine (docs/stages/05-space.md, "Space combat"): the
//           flagship turns, thrusts and fires; T0|▼|'s ships hunt the way the gulpers did (strike a burst, pause,
//           give up a long chase and rest); shots fly and hit; T0|▼| shrugs off the share of each weapon family it
//           has learned. Also the autoplay pilot's controls.
// Usage   : const b = newBattle(stats, ["shard", "shard"], learned, 1);  const ev = step(b, controls, dt);  b.over
// Notes   : step() MUTATES the battle (it runs every frame; the campaign rules around it stay immutable) and is
//           deterministic: no randomness, so tests replay exactly. Angles: 0 = +x, heading = (cos a, sin a).
//           Numbers: SPACE in tuning.ts. Tested in tests/space.test.ts.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import type { Learned, ShipStats, WeaponFamily } from "./fit";
import { SPACE } from "./tuning";

export type T0Kind = keyof typeof SPACE.t0;
export type FoeMode = "hunt" | "pause" | "rest";
export interface Body { x: number; y: number; vx: number; vy: number; a: number; hull: number; hullMax: number; r: number }
export interface You extends Body { shield: number; cool: number[]; thrusting: boolean }
export interface Foe extends Body { id: number; kind: T0Kind; mode: FoeMode; modeT: number; cool: number; burst: number; struck: boolean }
export interface Shot { x: number; y: number; vx: number; vy: number; life: number; damage: number; family: WeaponFamily | null; r: number }
export interface Controls { turn: number; thrust: boolean; brake: boolean; fire: boolean }
export type BattleEvent =
  | { kind: "fire" } | { kind: "hit"; x: number; y: number; resisted: number } | { kind: "kill"; x: number; y: number; foe: T0Kind }
  | { kind: "hurt"; shield: boolean } | { kind: "giveup"; id: number } | { kind: "won" } | { kind: "lost" };

export interface Battle {
  stats: ShipStats;
  learned: Learned;
  you: You;
  foes: Foe[];
  shots: Shot[];
  dealt: Record<WeaponFamily, number>; // damage before T0|▼|'s resistance, per family: what it saw
  salvage: number;
  hostile: boolean; // the system had a patrol when you arrived
  over: "won" | "lost" | null;
  t: number;
}

const TAU = Math.PI * 2;
/** The signed smallest turn from angle a to angle b, in -PI..PI. */
export const angleTo = (a: number, b: number): number => ((((b - a) % TAU) + TAU + Math.PI) % TAU) - Math.PI;

/** A battle (or a quiet system: an empty patrol). hullFrac carries damage in from the last system. */
export function newBattle(stats: ShipStats, patrol: readonly T0Kind[], learned: Learned, hullFrac = 1, at = { x: -SPACE.jumpIn, y: 0 }): Battle {
  const you: You = { x: at.x, y: at.y, vx: 0, vy: 0, a: 0, hull: Math.max(1, stats.hull * hullFrac), hullMax: stats.hull, r: stats.radius, shield: stats.shield, cool: stats.weapons.map(() => 0), thrusting: false };
  const foes = patrol.map((kind, i): Foe => {
    // the patrol waits in an arc ahead of where you arrive: you see it before it reaches you
    const ang = (i - (patrol.length - 1) / 2) * 0.35;
    const t = SPACE.t0[kind];
    return { id: i + 1, kind, x: at.x + Math.cos(ang) * SPACE.patrol.spawnDist, y: at.y + Math.sin(ang) * SPACE.patrol.spawnDist, vx: 0, vy: 0, a: Math.PI, hull: t.hull, hullMax: t.hull, r: t.radius, mode: "hunt", modeT: 0, cool: 1 + i * 0.3, burst: 0, struck: false };
  });
  return { stats, learned, you, foes, shots: [], dealt: { kinetic: 0, beam: 0, spore: 0 }, salvage: 0, hostile: patrol.length > 0, over: null, t: 0 };
}

function move(b: Body, accel: number, drag: number, dt: number): void {
  b.vx += Math.cos(b.a) * accel * dt; b.vy += Math.sin(b.a) * accel * dt;
  const k = Math.exp(-drag * dt);
  b.vx *= k; b.vy *= k;
  b.x += b.vx * dt; b.y += b.vy * dt;
}

const shotFrom = (b: Body, speed: number, range: number, damage: number, family: WeaponFamily | null): Shot =>
  ({ x: b.x + Math.cos(b.a) * b.r, y: b.y + Math.sin(b.a) * b.r, vx: b.vx + Math.cos(b.a) * speed, vy: b.vy + Math.sin(b.a) * speed, life: range / speed, damage, family, r: SPACE.flight.shotRadius });

/** One T0|▼| ship's turn: hunt (close in, fire a burst), then pause; a long chase without a strike makes it rest. */
function stepFoe(b: Battle, f: Foe, dt: number, ev: BattleEvent[]): void {
  const t = SPACE.t0[f.kind], you = b.you;
  const dx = you.x - f.x, dy = you.y - f.y, dist = Math.hypot(dx, dy);
  const want = Math.atan2(dy, dx);
  f.modeT += dt; f.cool -= dt;
  let accel = 0;
  if (f.mode === "hunt") {
    const off = angleTo(f.a, want);
    f.a += Math.sign(off) * Math.min(Math.abs(off), t.turn * dt);
    if (dist > t.range * 0.6) accel = t.accel;
    if (dist < t.range && Math.abs(off) < SPACE.flight.aimCone && f.cool <= 0) {
      b.shots.push(shotFrom(f, t.shotSpeed, t.range * 1.3, t.damage, null));
      f.cool = t.every; f.struck = true;
      if (++f.burst >= t.burst) { f.mode = "pause"; f.modeT = 0; f.burst = 0; }
    } else if (f.modeT > t.chase && !f.struck) { f.mode = "rest"; f.modeT = 0; ev.push({ kind: "giveup", id: f.id }); }
  } else if (f.modeT > (f.mode === "pause" ? t.pause : t.rest)) { f.mode = "hunt"; f.modeT = 0; f.struck = false; }
  else { // pausing or resting: it turns side-on and drifts, an opening to strike or slip away
    const off = angleTo(f.a, want + Math.PI / 2);
    f.a += Math.sign(off) * Math.min(Math.abs(off), t.turn * 0.5 * dt);
    accel = t.accel * 0.3;
  }
  for (const o of b.foes) { // keep the patrol from stacking into one ship
    if (o === f) continue;
    const ox = f.x - o.x, oy = f.y - o.y, d = Math.hypot(ox, oy) || 1;
    if (d < 40) { f.vx += (ox / d) * 60 * dt; f.vy += (oy / d) * 60 * dt; }
  }
  move(f, accel, SPACE.flight.drag, dt);
}

/** Advance the battle by dt seconds. Returns what happened, for sounds, shakes and logs. */
export function step(b: Battle, c: Controls, dt: number): BattleEvent[] {
  const ev: BattleEvent[] = [];
  if (b.over === "lost") return ev;
  b.t += dt;
  const you = b.you, st = b.stats;
  you.a += Math.max(-1, Math.min(1, c.turn)) * st.turn * dt;
  you.thrusting = c.thrust;
  move(you, c.thrust ? st.accel : 0, SPACE.flight.drag + (c.brake ? SPACE.flight.brakeDrag : 0), dt);
  you.shield = Math.min(st.shield, you.shield + st.regen * dt);
  st.weapons.forEach((w, i) => {
    you.cool[i] -= dt;
    if (!c.fire || you.cool[i] > 0) return;
    you.cool[i] = w.every;
    b.shots.push(shotFrom(you, w.speed, w.range, w.damage, w.family));
    ev.push({ kind: "fire" });
  });
  for (const f of b.foes) stepFoe(b, f, dt, ev);
  for (const s of b.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.family) { // yours: hits the first T0|▼| ship it touches
      const f = b.foes.find((o) => o.hull > 0 && Math.hypot(o.x - s.x, o.y - s.y) < o.r + s.r);
      if (!f) continue;
      s.life = 0;
      const resisted = b.learned[s.family];
      b.dealt[s.family] += s.damage;
      f.hull -= s.damage * (1 - resisted);
      ev.push({ kind: "hit", x: s.x, y: s.y, resisted });
      if (f.hull <= 0) { b.salvage += SPACE.t0[f.kind].salvage; ev.push({ kind: "kill", x: f.x, y: f.y, foe: f.kind }); }
    } else if (Math.hypot(you.x - s.x, you.y - s.y) < you.r + s.r) { // T0|▼|'s: shield first, then hull
      s.life = 0;
      const soaked = Math.min(you.shield, s.damage);
      you.shield -= soaked; you.hull -= s.damage - soaked;
      ev.push({ kind: "hurt", shield: soaked >= s.damage });
    }
  }
  b.shots = b.shots.filter((s) => s.life > 0);
  b.foes = b.foes.filter((f) => f.hull > 0);
  if (you.hull <= 0) { b.over = "lost"; ev.push({ kind: "lost" }); }
  else if (b.hostile && !b.over && b.foes.length === 0) { b.over = "won"; ev.push({ kind: "won" }); }
  return ev;
}

/** The nearest T0|▼| ship, or null in a quiet system. */
export function nearestFoe(b: Battle): Foe | null {
  let best: Foe | null = null, bd = Infinity;
  for (const f of b.foes) { const d = Math.hypot(f.x - b.you.x, f.y - b.you.y); if (d < bd) { bd = d; best = f; } }
  return best;
}

/** The autoplay pilot (smoke): face the nearest ship, close to weapon range, fire when lined up, back off when hurt. */
export function pilotControls(b: Battle): Controls {
  const f = nearestFoe(b);
  if (!f) return { turn: 0, thrust: false, brake: true, fire: false };
  const you = b.you, dist = Math.hypot(f.x - you.x, f.y - you.y);
  const reach = Math.min(...b.stats.weapons.map((w) => w.range), 400);
  const lead = dist / Math.max(1, b.stats.weapons[0]?.speed ?? 400); // aim where it will be
  const off = angleTo(you.a, Math.atan2(f.y + f.vy * lead - you.y, f.x + f.vx * lead - you.x));
  const turn = Math.max(-1, Math.min(1, off * 4));
  return { turn, thrust: dist > reach * 0.75 && Math.abs(off) < 0.6, brake: dist < reach * 0.45, fire: dist < reach && Math.abs(off) < SPACE.flight.aimCone };
}
