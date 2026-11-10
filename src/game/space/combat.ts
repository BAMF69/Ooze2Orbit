// ---------------------------------------------------------------------------
// combat.ts (space)
// Purpose : Real-time top-down combat as rules with no engine (docs/stages/05-space.md, "Space combat" and "Fleet
//           management"): the flagship turns, thrusts forward, backward and sideways, and fires its guns; turrets
//           track and fire on their own in any direction and missiles launch and home; recruited escorts fly and
//           fight on their own; T0|▼|'s ships hunt the nearest of you the way the gulpers did (strike a burst,
//           pause, give up a long chase and rest); a hostile system sends wave after wave (reinforce); the
//           Mothership launches Shards; T0|▼| shrugs off the share of each weapon family it has learned.
// Usage   : const b = newBattle(stats, ["shard"], learned, 1, at, escorts);  const ev = step(b, controls, dt);  b.over
//           reinforce(b, ["shard", "shard"], learned)   // the next wave, without leaving the system
// Notes   : step() MUTATES the battle (it runs every frame; the campaign rules around it stay immutable) and is
//           deterministic: no randomness, so tests replay exactly. Angles: 0 = +x, heading = (cos a, sin a).
//           Numbers: SPACE in tuning.ts. Tested in tests/space.test.ts.
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------
import type { HullId, Learned, ShipStats, WeaponFamily } from "./fit";
import { SPACE } from "./tuning";

export type T0Kind = keyof typeof SPACE.t0;
export type FoeMode = "hunt" | "pause" | "rest";
export interface Body { x: number; y: number; vx: number; vy: number; a: number; hull: number; hullMax: number; r: number }
/** One of yours: the flagship (escort -1) or a recruited escort (its index in the fleet). */
export interface Ship extends Body { stats: ShipStats; shield: number; cool: number[]; thrusting: boolean; escort: number; hullId: HullId }
export interface Foe extends Body { id: number; kind: T0Kind; mode: FoeMode; modeT: number; cool: number; burst: number; struck: boolean; spawnT: number }
/** family null = T0|▼|'s shot. target/homing: a missile steering toward a T0|▼| ship (by id). */
export interface Shot { x: number; y: number; vx: number; vy: number; life: number; damage: number; family: WeaponFamily | null; r: number; homing: number; target: number }
/** thrust: 1 forward, -1 reverse thrusters. strafe: 1 right, -1 left (side thrusters). brake: kill your speed. */
export interface Controls { turn: number; thrust: number; strafe: number; brake: boolean; fire: boolean }
export const IDLE: Controls = { turn: 0, thrust: 0, strafe: 0, brake: true, fire: false };
export interface EscortSpec { stats: ShipStats; hullId: HullId }
export type BattleEvent =
  | { kind: "fire" } | { kind: "hit"; x: number; y: number; resisted: number } | { kind: "kill"; x: number; y: number; foe: T0Kind }
  | { kind: "hurt"; shield: boolean } | { kind: "allylost"; escort: number; x: number; y: number } | { kind: "giveup"; id: number }
  | { kind: "spawn"; id: number } | { kind: "won" } | { kind: "lost" };

export interface Battle {
  stats: ShipStats;
  learned: Learned;
  you: Ship;
  allies: Ship[]; // the escorts still flying
  lostEscorts: number[]; // fleet indexes destroyed in this wave: gone for good
  foes: Foe[];
  nextId: number; // the next T0|▼| ship's id (waves and the Mothership's Shards keep counting up)
  shots: Shot[];
  dealt: Record<WeaponFamily, number>; // damage before T0|▼|'s resistance, per family: what it saw (the whole fleet's)
  salvage: number;
  hostile: boolean; // a patrol is here and not yet beaten
  over: "won" | "lost" | null;
  t: number;
}

const TAU = Math.PI * 2;
/** The signed smallest turn from angle a to angle b, in -PI..PI. */
export const angleTo = (a: number, b: number): number => ((((b - a) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

function ship(stats: ShipStats, hullId: HullId, escort: number, x: number, y: number, hullFrac = 1): Ship {
  return { x, y, vx: 0, vy: 0, a: 0, hull: Math.max(1, stats.hull * hullFrac), hullMax: stats.hull, r: stats.radius, stats, shield: stats.shield, cool: stats.weapons.map(() => 0), thrusting: false, escort, hullId };
}

/** A patrol arrives in an arc `spawnDist` from (cx, cy) in direction dir: you see it before it reaches you. */
function spawnWave(b: Battle, patrol: readonly T0Kind[], cx: number, cy: number, dir: number): void {
  patrol.forEach((kind, i) => {
    const ang = dir + (i - (patrol.length - 1) / 2) * 0.3, t = SPACE.t0[kind];
    b.foes.push({ id: b.nextId++, kind, x: cx + Math.cos(ang) * SPACE.patrol.spawnDist, y: cy + Math.sin(ang) * SPACE.patrol.spawnDist, vx: 0, vy: 0, a: ang + Math.PI, hull: t.hull, hullMax: t.hull, r: t.radius, mode: "hunt", modeT: 0, cool: 1 + i * 0.3, burst: 0, struck: false, spawnT: 0 });
  });
}

/** A battle (or a quiet system: an empty patrol). hullFrac carries the flagship's damage in from the last system. */
export function newBattle(stats: ShipStats, patrol: readonly T0Kind[], learned: Learned, hullFrac = 1, at = { x: -SPACE.jumpIn, y: 0 }, escorts: readonly EscortSpec[] = [], hullId: HullId = "seedpod"): Battle {
  const you = ship(stats, hullId, -1, at.x, at.y, hullFrac);
  // escorts arrive in a wing behind the flagship
  const allies = escorts.map((e, i) => ship(e.stats, e.hullId, i, at.x - 40 - 14 * i, at.y + (i % 2 ? -1 : 1) * (34 + 16 * i)));
  const b: Battle = { stats, learned, you, allies, lostEscorts: [], foes: [], nextId: 1, shots: [], dealt: { kinetic: 0, beam: 0, spore: 0 }, salvage: 0, hostile: patrol.length > 0, over: null, t: 0 };
  spawnWave(b, patrol, at.x, at.y, 0);
  return b;
}

/**
 * The next wave arrives without you leaving (BAMF69 2026-11-10): a fresh patrol ahead of the flagship, T0|▼|'s new
 * learning applied, the last wave's tally cleared. Escorts are renumbered to their places in the fleet that is left.
 */
export function reinforce(b: Battle, patrol: readonly T0Kind[], learned: Learned): void {
  b.learned = learned;
  b.dealt = { kinetic: 0, beam: 0, spore: 0 };
  b.salvage = 0;
  b.lostEscorts = [];
  b.allies.forEach((s, i) => (s.escort = i));
  b.hostile = patrol.length > 0;
  b.over = null;
  spawnWave(b, patrol, b.you.x, b.you.y, b.you.a);
}

/** Thrust along the heading (fwd) and across it (lat, + = to the ship's right), then drag. */
function move(b: Body, fwd: number, lat: number, drag: number, dt: number): void {
  const c = Math.cos(b.a), s = Math.sin(b.a);
  b.vx += (c * fwd - s * lat) * dt; b.vy += (s * fwd + c * lat) * dt;
  const k = Math.exp(-drag * dt);
  b.vx *= k; b.vy *= k;
  b.x += b.vx * dt; b.y += b.vy * dt;
}

/** A shot leaving `b` along angle `a` (a gun fires along the ship's heading; a turret along its own aim). */
const shotFrom = (b: Body, a: number, speed: number, range: number, damage: number, family: WeaponFamily | null, homing = 0, target = 0): Shot =>
  ({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: b.vx + Math.cos(a) * speed, vy: b.vy + Math.sin(a) * speed, life: range / speed, damage, family, r: SPACE.flight.shotRadius, homing, target });

/** The living T0|▼| ship nearest to a point, or null in a quiet system. */
export function nearestFoe(b: Battle, from: { x: number; y: number } = b.you): Foe | null {
  let best: Foe | null = null, bd = Infinity;
  for (const f of b.foes) { if (f.hull <= 0) continue; const d = dist(f, from); if (d < bd) { bd = d; best = f; } }
  return best;
}

/** Everything of yours still flying: the flagship first. */
export const fleetOf = (b: Battle): Ship[] => [b.you, ...b.allies];

/** One of your ships' turn: fly, recharge, fire. Guns need the pilot; turrets and missiles pick their own target. */
function stepShip(b: Battle, s: Ship, c: Controls, dt: number, ev: BattleEvent[]): void {
  const st = s.stats, F = SPACE.flight;
  s.a += clamp1(c.turn) * st.turn * dt;
  s.thrusting = c.thrust > 0;
  const thr = clamp1(c.thrust);
  move(s, st.accel * (thr > 0 ? thr : thr * F.reverse), st.accel * F.strafe * clamp1(c.strafe), F.drag + (c.brake ? F.brakeDrag : 0), dt);
  s.shield = Math.min(st.shield, s.shield + st.regen * dt);
  const near = nearestFoe(b, s), nearD = near ? dist(near, s) : Infinity;
  st.weapons.forEach((w, i) => {
    s.cool[i] -= dt;
    if (s.cool[i] > 0) return;
    if (w.mount === "gun") {
      if (!c.fire) return;
      b.shots.push(shotFrom(s, s.a, w.speed, w.range, w.damage, w.family));
    } else if (!near || nearD > w.range) return;
    else if (w.mount === "turret") { // aim where the target will be, whatever way the ship faces
      const lead = nearD / w.speed;
      b.shots.push(shotFrom(s, Math.atan2(near.y + near.vy * lead - s.y, near.x + near.vx * lead - s.x), w.speed, w.range, w.damage, w.family));
    } else b.shots.push(shotFrom(s, s.a, w.speed, w.range * 1.5, w.damage, w.family, w.homing, near.id)); // a missile: out the nose, then it homes
    s.cool[i] = w.every;
    if (s === b.you) ev.push({ kind: "fire" });
  });
}

/** One T0|▼| ship's turn: hunt the nearest of you (close in, fire a burst), then pause; a long fruitless chase makes it rest. */
function stepFoe(b: Battle, f: Foe, dt: number, ev: BattleEvent[]): void {
  const t = SPACE.t0[f.kind];
  let prey: Ship = b.you, d = dist(b.you, f);
  for (const s of b.allies) { const ds = dist(s, f); if (ds < d) { d = ds; prey = s; } } // drawn to the easier (nearer) target
  const want = Math.atan2(prey.y - f.y, prey.x - f.x);
  f.modeT += dt; f.cool -= dt;
  let accel = 0;
  if (f.mode === "hunt") {
    const off = angleTo(f.a, want);
    f.a += Math.sign(off) * Math.min(Math.abs(off), t.turn * dt);
    if (d > t.range * 0.6) accel = t.accel;
    if (d < t.range && Math.abs(off) < SPACE.flight.aimCone && f.cool <= 0) {
      b.shots.push(shotFrom(f, f.a, t.shotSpeed, t.range * 1.3, t.damage, null));
      f.cool = t.every; f.struck = true;
      if (++f.burst >= t.burst) { f.mode = "pause"; f.modeT = 0; f.burst = 0; }
    } else if (f.modeT > t.chase && !f.struck) { f.mode = "rest"; f.modeT = 0; ev.push({ kind: "giveup", id: f.id }); }
  } else if (f.modeT > (f.mode === "pause" ? t.pause : t.rest)) { f.mode = "hunt"; f.modeT = 0; f.struck = false; }
  else { // pausing or resting: it turns side-on and drifts, an opening to strike or slip away
    const off = angleTo(f.a, want + Math.PI / 2);
    f.a += Math.sign(off) * Math.min(Math.abs(off), t.turn * 0.5 * dt);
    accel = t.accel * 0.3;
  }
  if (f.kind === "mothership" && (f.spawnT += dt) > SPACE.boss.spawnEvery && b.foes.filter((o) => o.kind === "shard" && o.hull > 0).length < SPACE.boss.spawnMax) {
    f.spawnT = 0; // it launches a Shard from its nose
    const s = SPACE.t0.shard, id = b.nextId++;
    b.foes.push({ id, kind: "shard", x: f.x + Math.cos(f.a) * f.r, y: f.y + Math.sin(f.a) * f.r, vx: f.vx, vy: f.vy, a: f.a, hull: s.hull, hullMax: s.hull, r: s.radius, mode: "hunt", modeT: 0, cool: 1, burst: 0, struck: false, spawnT: 0 });
    ev.push({ kind: "spawn", id });
  }
  for (const o of b.foes) { // keep the patrol from stacking into one ship
    if (o === f) continue;
    const ox = f.x - o.x, oy = f.y - o.y, od = Math.hypot(ox, oy) || 1;
    if (od < 40) { f.vx += (ox / od) * 60 * dt; f.vy += (oy / od) * 60 * dt; }
  }
  move(f, accel, 0, SPACE.flight.drag, dt);
}

/** A missile turns toward its target (or the nearest ship left), keeping its speed. */
function steerShot(b: Battle, s: Shot, dt: number): void {
  const target = b.foes.find((f) => f.id === s.target && f.hull > 0) ?? nearestFoe(b, s);
  if (!target) return;
  s.target = target.id;
  const speed = Math.hypot(s.vx, s.vy), now = Math.atan2(s.vy, s.vx);
  const off = angleTo(now, Math.atan2(target.y - s.y, target.x - s.x));
  const a = now + Math.sign(off) * Math.min(Math.abs(off), s.homing * dt);
  s.vx = Math.cos(a) * speed; s.vy = Math.sin(a) * speed;
}

/** Advance the battle by dt seconds. Returns what happened, for sounds, shakes and logs. */
export function step(b: Battle, c: Controls, dt: number): BattleEvent[] {
  const ev: BattleEvent[] = [];
  if (b.over === "lost") return ev;
  b.t += dt;
  stepShip(b, b.you, c, dt, ev);
  for (const s of b.allies) stepShip(b, s, escortControls(b, s), dt, ev);
  for (const f of [...b.foes]) stepFoe(b, f, dt, ev);
  for (const s of b.shots) {
    if (s.homing) steerShot(b, s, dt);
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
    } else { // T0|▼|'s: the first of yours it touches; shield first, then hull
      const hit = fleetOf(b).find((o) => o.hull > 0 && Math.hypot(o.x - s.x, o.y - s.y) < o.r + s.r);
      if (!hit) continue;
      s.life = 0;
      const soaked = Math.min(hit.shield, s.damage);
      hit.shield -= soaked; hit.hull -= s.damage - soaked;
      if (hit === b.you) ev.push({ kind: "hurt", shield: soaked >= s.damage });
      else if (hit.hull <= 0) { b.lostEscorts.push(hit.escort); ev.push({ kind: "allylost", escort: hit.escort, x: hit.x, y: hit.y }); }
    }
  }
  b.shots = b.shots.filter((s) => s.life > 0);
  b.foes = b.foes.filter((f) => f.hull > 0);
  b.allies = b.allies.filter((s) => s.hull > 0);
  if (b.you.hull <= 0) { b.over = "lost"; ev.push({ kind: "lost" }); }
  else if (b.hostile && !b.over && b.foes.length === 0) { b.over = "won"; ev.push({ kind: "won" }); }
  return ev;
}

/** How a ship flies itself against the nearest T0|▼| ship: face it, close to weapon range, back off when too close. */
function attackControls(s: Ship, f: Foe): Controls {
  const d = dist(f, s);
  const guns = s.stats.weapons.filter((w) => w.mount === "gun");
  const reach = Math.min(...(guns.length ? guns : s.stats.weapons).map((w) => w.range), 400);
  const lead = d / Math.max(1, (guns[0] ?? s.stats.weapons[0])?.speed ?? 400); // aim where it will be
  const off = angleTo(s.a, Math.atan2(f.y + f.vy * lead - s.y, f.x + f.vx * lead - s.x));
  const close = d < reach * 0.45;
  return { turn: clamp1(off * 4), thrust: d > reach * 0.75 && Math.abs(off) < 0.6 ? 1 : close ? -1 : 0, strafe: 0, brake: close, fire: d < reach && Math.abs(off) < SPACE.flight.aimCone };
}

/**
 * Fly to a point and stop there (E in a friendly system: go to the planet and land; an escort keeping station):
 * face it, thrust while far, and brake once the stopping distance is reached.
 */
export function approachControls(s: Body, tx: number, ty: number, arrive: number, faceWhenThere?: number): Controls {
  const d = Math.hypot(tx - s.x, ty - s.y), speed = Math.hypot(s.vx, s.vy);
  const there = d < arrive;
  const off = angleTo(s.a, there && faceWhenThere !== undefined ? faceWhenThere : Math.atan2(ty - s.y, tx - s.x));
  const stopIn = speed / SPACE.flight.brakeDrag; // roughly how far the brakes take to stop her
  const go = !there && d > arrive + stopIn && Math.abs(off) < 0.5;
  return { turn: clamp1(off * 4), thrust: go ? 1 : 0, strafe: 0, brake: !go && (there || Math.abs(off) < 1), fire: false };
}

/** An escort flies itself: it fights the T0|▼| ship nearest to it, and with none left it keeps station behind you. */
export function escortControls(b: Battle, s: Ship): Controls {
  const f = nearestFoe(b, s);
  if (f) return attackControls(s, f);
  const you = b.you, gap = SPACE.flight.escortGap * (1 + s.escort * 0.3);
  const back = you.a + Math.PI + (s.escort % 2 ? -1 : 1) * 0.6;
  return approachControls(s, you.x + Math.cos(back) * gap, you.y + Math.sin(back) * gap, 30, you.a);
}

/** The autoplay pilot (smoke) flies the flagship the way an escort flies itself; in a quiet system it brakes. */
export function pilotControls(b: Battle): Controls {
  const f = nearestFoe(b);
  return f ? attackControls(b.you, f) : IDLE;
}
