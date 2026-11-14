// Map-bound offspring ecology. Engine-free perception, decisions, steering, feeding and reproduction.
// The scene owns sprites, real food removal, player damage and loot. Inactive maps never tick.
import { aquaticDaughters } from "./division";
import { dietShare, eatFood, maxHp, maxStamina, movement, ramDamage, takeHit, size, type AqCreature, type FoodKind } from "./creature";
import { AQ, MAPS, AQ_STATS } from "./tuning";

export type SisterIntent = "feed" | "hunt" | "wander" | "windup" | "crowded";
export interface AqSister {
  id: number; family: number; parent: number | null; generation: number; home: number;
  body: AqCreature;
  x: number; y: number; z: number; vx: number; vy: number; vz: number; heading: number;
  grace: number; contactCd: number; attackCd: number; windup: number; provoked: number;
  ready: boolean; age: number; growth: number; intent: SisterIntent;
}
export interface SisterColony { nextId: number; members: AqSister[] }
export interface SisterFood { id: number; x: number; y: number; z: number; food: FoodKind; base: number }
export interface SisterPlayer { x: number; y: number; z: number; vx: number; vy: number; vz: number; body: AqCreature; dashing: boolean }
export interface SisterEvents {
  eaten: number[]; hits: { id: number; damage: number; bite: boolean; dx: number; dy: number }[];
  deaths: { sister: AqSister; byPlayer: boolean }[]; births: number; grew: number[];
}
export const newSisterColony = (): SisterColony => ({ nextId: 1, members: [] });
const distance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** NPC bodies inherit the actual variant; their autonomous ancestry is stored on the sister, not player history. */
function inheritedBody(body: AqCreature): AqCreature {
  const { divisionSeed: _seed, selections: _history, ...rest } = body;
  void _seed; void _history;
  const next = { ...rest, food: 0, points: { algae: 0, meat: 0 }, growthEvidence: { algae: 0, meat: 0 },
    ups: Object.fromEntries(AQ_STATS.map(stat => [stat, Math.min(AQ.sisters.statCap, body.ups[stat])])) as AqCreature["ups"],
    parts: [...body.parts], uniques: [...body.uniques] };
  return { ...next, hp: maxHp(next) };
}

function bound(s: AqSister): void {
  const map = MAPS[s.home], r = size(s.body) * AQ.sisters.radiusMult;
  const beforeX = s.x, beforeY = s.y;
  s.x = Math.max(r, Math.min(map.width - r, s.x));
  s.y = Math.max(r, Math.min(map.width - r, s.y));
  s.z = Math.max(AQ.water.floorZ, Math.min(map.surface - 4, s.z));
  if (beforeX !== s.x) s.vx = Math.sign(map.width / 2 - s.x) * Math.abs(s.vx) * AQ.sisters.boundaryBounce;
  if (beforeY !== s.y) s.vy = Math.sign(map.width / 2 - s.y) * Math.abs(s.vy) * AQ.sisters.boundaryBounce;
  if (beforeX !== s.x || beforeY !== s.y) s.heading = Math.atan2(s.vy, s.vx);
}

function newborn(colony: SisterColony, body: AqCreature, home: number, at: { x: number; y: number; z: number }, random: () => number, parent?: AqSister): AqSister {
  const id = colony.nextId++, angle = random() * Math.PI * 2;
  const s: AqSister = { id, family: parent?.family ?? id, parent: parent?.id ?? null,
    generation: parent ? parent.generation + 1 : 0, home, body: inheritedBody(body),
    x: at.x + Math.cos(angle) * AQ.sisters.birthSpread, y: at.y + Math.sin(angle) * AQ.sisters.birthSpread,
    z: at.z, vx: 0, vy: 0, vz: 0, heading: angle,
    grace: AQ.sisters.birthGraceS, contactCd: 0, attackCd: 0, windup: 0, provoked: 0,
    ready: false, age: 0, growth: AQ.sisters.birthGrowS, intent: "wander" };
  bound(s); return s;
}

/** Human daughter choices get reserved places even when autonomous lineages have filled their budget. */
export function seedSisters(colony: SisterColony, bodies: readonly AqCreature[], home: number, at: { x: number; y: number; z: number }, random: () => number): AqSister[] {
  const room = AQ.sisters.maxPerMap - colony.members.filter(s => s.home === home).length;
  const born = bodies.slice(0, Math.max(0, room)).map(body => newborn(colony, body, home, at, random));
  colony.members.push(...born); return born;
}

/** Perception/decision: edible food first; meat eaters can hunt you when you are the closer meal. */
export function sisterIntent(s: AqSister, foods: readonly SisterFood[], player: SisterPlayer): { intent: SisterIntent; target: { x: number; y: number; z: number } | null; food?: SisterFood } {
  if (s.ready) return { intent: "crowded", target: null };
  let closest: SisterFood | undefined;
  let nearest: number = AQ.sisters.senseRange;
  for (const food of foods) {
    if (dietShare(s.body, food.food) <= 0) continue;
    const d = distance(s, food);
    if (d < nearest) { closest = food; nearest = d; }
  }
  const d = distance(s, player);
  const hunter = s.body.diet !== "herbivore" || s.provoked > 0;
  if (s.grace <= 0 && hunter && d < AQ.sisters.huntRange && (s.provoked > 0 || !closest || d < nearest * AQ.sisters.foodPreference))
    return { intent: "hunt", target: player };
  return closest ? { intent: "feed", target: closest, food: closest } : { intent: "wander", target: null };
}

/** Steering and arrival are separate from the choice of target. */
function move(s: AqSister, target: { x: number; y: number; z: number } | null, dt: number): void {
  const speed = movement(s.body).maxSpeed * AQ.sisters.speedMult;
  const dx = target ? target.x - s.x : Math.cos(s.heading) * speed;
  const dy = target ? target.y - s.y : Math.sin(s.heading) * speed;
  const dz = target ? target.z - s.z : 0;
  const len = Math.hypot(dx, dy, dz) || 1;
  const v = target ? Math.min(speed, len * AQ.sisters.arriveRate) : speed;
  const rate = Math.min(1, dt * AQ.sisters.steeringRate);
  s.vx += (dx / len * v - s.vx) * rate;
  s.vy += (dy / len * v - s.vy) * rate;
  s.vz += (dz / len * v - s.vz) * rate;
  s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
  if (Math.hypot(s.vx, s.vy) > 1) s.heading = Math.atan2(s.vy, s.vx);
  bound(s);
}

/** Only the active habitat advances. A shared consumed-id set stops two sisters eating one item. */
export function stepSisters(colony: SisterColony, home: number, foods: readonly SisterFood[], player: SisterPlayer, dt: number, random: () => number): SisterEvents {
  const t = AQ.sisters;
  const events: SisterEvents = { eaten: [], hits: [], deaths: [], births: 0, grew: [] };
  const consumed = new Set<number>();
  const active = colony.members.filter(s => s.home === home);
  for (const s of active) {
    s.age += dt; s.growth = Math.max(0, s.growth - dt);
    s.grace = Math.max(0, s.grace - dt); s.contactCd = Math.max(0, s.contactCd - dt);
    s.attackCd = Math.max(0, s.attackCd - dt); s.provoked = Math.max(0, s.provoked - dt);
    const choice = sisterIntent(s, foods.filter(f => !consumed.has(f.id)), player);
    s.intent = choice.intent;
    move(s, choice.target, dt);
    if (choice.food && distance(s, choice.food) < size(s.body) * t.radiusMult + t.eatBonus) {
      const before = s.body.form;
      const eaten = eatFood(s.body, choice.food.food, choice.food.base);
      s.body = eaten.creature; consumed.add(choice.food.id); events.eaten.push(choice.food.id);
      if (eaten.evolved || (s.body.form === AQ.forms.size.length && s.body.food >= t.adultFood)) {
        s.ready = true;
        if (!eaten.evolved) s.body = { ...s.body, food: s.body.food - t.adultFood };
      }
      if (s.body.form !== before) { s.growth = t.growthS; events.grew.push(s.id); }
    }
    const dx = s.x - player.x, dy = s.y - player.y, dz = s.z - player.z;
    const d = Math.hypot(dx, dy, dz);
    const reach = (size(player.body) + size(s.body)) * t.radiusMult;
    const into = (player.vx * dx + player.vy * dy + player.vz * dz) / Math.max(1, d);
    const ram = player.dashing || into >= AQ.stats.rammingSpeed;
    if (s.grace > 0) { s.windup = 0; continue; }
    if (d < reach && ram && s.contactCd <= 0) {
      s.body = takeHit(s.body, ramDamage(player.body) * (player.dashing ? AQ.stats.dashRamMult : 1)).creature;
      s.contactCd = t.contactCooldownS; s.provoked = t.provokeS; s.windup = 0;
      s.vx += dx / Math.max(1, d) * t.knockback; s.vy += dy / Math.max(1, d) * t.knockback;
      if (s.body.hp <= 0) { events.deaths.push({ sister: s, byPlayer: true }); continue; }
    }
    if (d < reach && !ram && s.attackCd <= 0) {
      if (s.windup <= 0) s.windup = t.attackWindupS;
      else {
        s.intent = "windup"; s.windup = Math.max(0, s.windup - dt);
        if (s.windup === 0) {
          const bite = s.body.diet !== "herbivore";
          events.hits.push({ id: s.id, bite, damage: (bite ? ramDamage(s.body) * t.biteDamageMult : t.bumpDamage) * MAPS[home].mult.bite,
            dx: dx / Math.max(1, d), dy: dy / Math.max(1, d) });
          s.attackCd = t.attackCooldownS;
          s.vx += dx / Math.max(1, d) * t.knockback; s.vy += dy / Math.max(1, d) * t.knockback;
        }
      }
    } else s.windup = 0;
  }
  const dead = new Set(events.deaths.map(d => d.sister.id));
  colony.members = colony.members.filter(s => !dead.has(s.id));
  let count = colony.members.filter(s => s.home === home).length;
  for (const parent of active) {
    if (dead.has(parent.id) || !parent.ready || count + t.broodSize - 1 > t.maxPerMap - t.founderReserve) continue;
    const offers = aquaticDaughters(parent.body, random);
    const children = offers.slice(0, t.broodSize).map(d => newborn(colony, d.creature, home, parent, random, parent));
    colony.members = colony.members.filter(s => s.id !== parent.id);
    colony.members.push(...children); count += children.length - 1; events.births += children.length;
  }
  // Soft separation keeps food competitors from collapsing into a stack of identical bodies.
  const alive = colony.members.filter(s => s.home === home);
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
    const a = alive[i], b = alive[j], dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy), reach = (size(a.body) + size(b.body)) * t.radiusMult;
    if (d >= reach || Math.abs(a.z - b.z) > reach) continue;
    const push = (reach - d) * Math.min(1, dt * t.separationRate);
    const nx = d > 0 ? dx / d : 1, ny = d > 0 ? dy / d : 0;
    a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
    bound(a); bound(b);
  }
  return events;
}

/** Defensive optional save extension. Body parsing is shared with the player without a module cycle. */
export function readSisterColony(raw: unknown, parseBody: (raw: unknown) => AqCreature): SisterColony {
  const out = newSisterColony();
  if (!raw || typeof raw !== "object") return out;
  const source = raw as { nextId?: unknown; members?: unknown };
  const number = (v: unknown, low: number, high: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(low, Math.min(high, v)) : fallback;
  const used = new Set<number>();
  const counts = MAPS.map(() => 0);
  for (const value of Array.isArray(source.members) ? source.members : []) {
    if (!value || typeof value !== "object") continue;
    const r = value as Record<string, unknown>, home = Number(r.home), id = Number(r.id);
    if (!Number.isInteger(home) || !MAPS[home] || !Number.isInteger(id) || id < 1 || id > 1e9 || used.has(id) || counts[home] >= AQ.sisters.maxPerMap) continue;
    if (!r.body || typeof r.body !== "object" || Array.isArray(r.body)) continue;
    const body = parseBody(r.body);
    const sourceBody = r.body as { ups?: unknown };
    if (sourceBody.ups && typeof sourceBody.ups === "object") {
      const ups = sourceBody.ups as Record<string, unknown>;
      body.ups = Object.fromEntries(AQ_STATS.map(stat => [stat, Math.floor(number(ups[stat], 0, AQ.sisters.statCap, 0))])) as AqCreature["ups"];
    }
    body.hp = Math.min(body.hp, maxHp(body)); body.stamina = Math.min(body.stamina, maxStamina(body));
    if (r.body && typeof r.body === "object" && Number((r.body as { hp?: unknown }).hp) <= 0) continue;
    const s: AqSister = { id, home, family: Math.floor(number(r.family, 1, 1e9, id)),
      parent: typeof r.parent === "number" && Number.isFinite(r.parent) ? Math.floor(number(r.parent, 1, 1e9, id)) : null, generation: Math.floor(number(r.generation, 0, 1e6, 0)),
      body, x: number(r.x, 0, MAPS[home].width, MAPS[home].width / 2), y: number(r.y, 0, MAPS[home].width, MAPS[home].width / 2),
      z: number(r.z, AQ.water.floorZ, MAPS[home].surface - 4, AQ.water.floorZ),
      vx: number(r.vx, -1e3, 1e3, 0), vy: number(r.vy, -1e3, 1e3, 0), vz: number(r.vz, -1e3, 1e3, 0), heading: number(r.heading, -Math.PI, Math.PI, 0),
      grace: number(r.grace, 0, AQ.sisters.birthGraceS, 0), contactCd: number(r.contactCd, 0, AQ.sisters.contactCooldownS, 0),
      attackCd: number(r.attackCd, 0, AQ.sisters.attackCooldownS, 0), windup: number(r.windup, 0, AQ.sisters.attackWindupS, 0),
      provoked: number(r.provoked, 0, AQ.sisters.provokeS, 0), ready: r.ready === true, age: number(r.age, 0, 1e9, 0),
      growth: number(r.growth, 0, Math.max(AQ.sisters.birthGrowS, AQ.sisters.growthS), 0), intent: "wander" };
    delete s.body.divisionSeed;
    out.members.push(s); used.add(id); counts[home]++;
    out.nextId = Math.max(out.nextId, id + 1);
  }
  out.nextId = Math.max(out.nextId, Math.floor(number(source.nextId, 1, 1e9, out.nextId)));
  return out;
}
