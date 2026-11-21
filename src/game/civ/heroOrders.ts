// Purpose: Deterministic, obstacle-aware hero move orders and optional autonomous patrol.
// Patrol uses the same speed, attacks, cooldowns, wounds and rewards as manual play.
import { cellOf, heroAttack, moveHero, type Battle, type Cell } from "./wars";
import { WAR } from "./warsTuning";

export interface HeroOrders { waypoint: Cell | null; returning: boolean }
export const newHeroOrders = (): HeroOrders => ({ waypoint: null, returning: false });
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const distance = (a: Cell, b: Cell) => Math.hypot(a.x - b.x, a.y - b.y);

/** The occupied starting cell may be left, including a tower constructed under the hero. */
export function heroRoute(s: Battle, destination: Cell): Cell[] {
  const start = cellOf(s.hero), goal = cellOf(destination);
  const blocked = (c: Cell) => !s.hero.climb && s.sides[0].towers.some(t => same(t, c));
  if (blocked(goal) && !same(start, goal)) return [];
  const queue = [start], parents = new Map<string, Cell | null>([[`${start.x},${start.y}`, null]]);
  for (let n = 0; n < queue.length; n++) {
    const c = queue[n];
    if (same(c, goal)) {
      const path = [c]; let previous = parents.get(`${c.x},${c.y}`);
      while (previous) { path.unshift(previous); previous = parents.get(`${previous.x},${previous.y}`); }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
      const next = { x: c.x + dx, y: c.y + dy }, key = `${next.x},${next.y}`;
      if (next.x < 0 || next.x >= WAR.cols || next.y < 0 || next.y >= WAR.rows || blocked(next) || parents.has(key)) continue;
      parents.set(key, c); queue.push(next);
    }
  }
  return [];
}

/** Finish each segment before replanning, avoiding rounding oscillation at cell boundaries. */
export function followHeroOrder(s: Battle, destination: Cell, dt: number, orders: HeroOrders): boolean {
  if (s.status !== "playing" || s.hero.respawn > 0 || !Number.isFinite(dt) || dt <= 0) return false;
  const h = s.hero, goal = cellOf(destination);
  if (distance(h, goal) < WAR.heroArrival) { orders.waypoint = null; return true; }
  const waypointBlocked = orders.waypoint && !h.climb && s.sides[0].towers.some(t => same(t, orders.waypoint!));
  if (waypointBlocked || (orders.waypoint && distance(h, orders.waypoint) < WAR.heroArrival)) orders.waypoint = null;
  if (!orders.waypoint) {
    const path = heroRoute(s, goal);
    if (!path.length) return false;
    orders.waypoint = distance(h, path[0]) >= WAR.heroArrival ? path[0] : path[1] ?? goal;
  }
  const d = distance(h, orders.waypoint);
  const step = Math.min(dt, WAR.heroArrivalStep, d / WAR.heroSpeed);
  const dx = orders.waypoint.x - h.x, dy = orders.waypoint.y - h.y;
  if (d) moveHero(s, dx / d, dy / d, step);
  return false;
}

export function patrolHero(s: Battle, dt: number, orders: HeroOrders): void {
  if (s.status !== "playing" || s.hero.respawn > 0 || !Number.isFinite(dt) || dt <= 0) { orders.waypoint = null; return; }
  const threats = s.units.filter(u => u.target === 0 && u.hp > 0)
    .sort((a, b) => distance(a, WAR.exit) - distance(b, WAR.exit) || a.id - b.id);
  const threat = threats.find(u => heroRoute(s, u).length > 0);
  if (threat) {
    if (distance(s.hero, threat) > WAR.heroRange * WAR.patrolRangeFactor) followHeroOrder(s, threat, dt, orders);
    else orders.waypoint = null;
  } else {
    const goal = orders.returning ? WAR.entry : WAR.exit;
    if (followHeroOrder(s, goal, dt, orders)) orders.returning = !orders.returning;
  }
  if (threats.some(u => distance(s.hero, u) <= WAR.heroRange)) heroAttack(s);
  if (threats.filter(u => u.hp > 0 && distance(s.hero, u) <= WAR.abilityRange).length >= WAR.patrolPulseTargets) heroAttack(s, true);
}
