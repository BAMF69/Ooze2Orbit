// ---------------------------------------------------------------------------
// Purpose: Engine-free tower-wars simulation: BFS mazes, economy, waves, hero and victory recording.
// Usage: newBattle -> place/train/send/setLever -> stepBattle; scene only supplies intents and draws.
// Notes: PROTOTYPE: deterministic rival, two resources, no random or engine dependency.
// Pseudocode: income -> previewed wave -> construction -> path-following -> tower/hero combat -> wins.
// Authored: Written with Codex (GPT-6).
// ---------------------------------------------------------------------------
import { WAR, TOWERS, SENDS, type TowerKind, type SendKind } from "./warsTuning";
import type { StageCause } from "../../core/lineage";
export interface Cell { x: number; y: number }
export interface Tower extends Cell { id: number; kind: TowerKind; cooldown: number; build: number; shot?: Cell; shotLeft?: number }
export interface Unit extends Cell { id: number; kind: SendKind; hp: number; maxHp: number; slow: number; target: 0 | 1; waypoint?: Cell }
export interface Side { hp: number; ore: number; food: number; income: number; gatherers: number; builders: number; farmers?: number; towers: Tower[] }
export interface Hero extends Cell { hp: number; maxHp: number; strength: number; climb: boolean; cooldown: number; ability: number; respawn: number; hurt: number }
export interface Battle { sides: [Side, Side]; units: Unit[]; hero: Hero; clock: number; incomeClock: number; waveClock: number; wave: number; nextId: number;
  rival: "raider" | "warden";
  lever: "ore" | "rocky"; status: "playing" | "base" | "economy" | "fallen";
  tally: { sends: number; defenses: number; kills: number; heroHits: number; longest: number; levers: number; sentKinds: Record<SendKind, number> }; message: string }
const key = (c: Cell) => c.y * WAR.cols + c.x;
const distance = (a: Cell, b: Cell) => Math.hypot(a.x - b.x, a.y - b.y);
export const cellOf = (p: Cell): Cell => ({ x: Math.max(0, Math.min(WAR.cols - 1, Math.round(p.x))), y: Math.max(0, Math.min(WAR.rows - 1, Math.round(p.y))) });
/** Breadth-first shortest route; caller reuses a field per board rather than searching per unit. */
export function route(towers: readonly Cell[], start: Cell = WAR.entry): Cell[] {
  const blocked = new Set(towers.map(key)), first = cellOf(start), todo = [first], parents = new Map<number, Cell | null>([[key(first), null]]);
  for (let n = 0; n < todo.length; n++) {
    const c = todo[n];
    if (key(c) === key(WAR.exit)) {
      const out = [c]; let prev = parents.get(key(c));
      while (prev) { out.unshift(prev); prev = parents.get(key(prev)); } return out;
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) {
      const next = { x: c.x + dx, y: c.y + dy }, k = key(next);
      if (next.x < 0 || next.x >= WAR.cols || next.y < 0 || next.y >= WAR.rows || blocked.has(k) || parents.has(k)) continue;
      parents.set(k, c); todo.push(next);
    }
  }
  return [];
}
export function newBattle(hero: Partial<Hero> = {}, rival: Battle["rival"] = "raider"): Battle {
  const side = (): Side => ({ hp: WAR.baseHp, ore: WAR.startOre, food: WAR.startFood, income: WAR.baseIncome, gatherers: 2, builders: 1, farmers: 0, towers: [] });
  const maxHp = WAR.heroHp + Math.min(20, Math.max(0, hero.maxHp ?? 0));
  const s: Battle = { sides: [side(), side()], units: [], hero: { x: 8, y: 3, hp: maxHp, maxHp, strength: Math.max(0, Math.min(20, hero.strength ?? 2)), climb: hero.climb ?? false, cooldown: 0, ability: 0, respawn: 0, hurt: 0 },
    clock: 0, incomeClock: 0, waveClock: WAR.firstWave, wave: 0, nextId: 1, rival, lever: "rocky", status: "playing",
    tally: { sends: 0, defenses: 0, kills: 0, heroHits: 0, longest: 10, levers: 0, sentKinds: { runner: 0, shell: 0, swarm: 0 } }, message: "Build a maze before the first wave. Every kill grows income." };
  s.sides[1].income = WAR.rivalIncome;
  s.sides[1].towers = [{ x: 4, y: 3, kind: "thorn" }, { x: 6, y: 2, kind: "frost" }].map(t => ({ ...t, kind: t.kind as TowerKind, id: s.nextId++, cooldown: 0, build: 0 }));
  if (rival === "warden") s.sides[1].towers.push({ x: 7, y: 4, kind: "mortar", id: s.nextId++, cooldown: 0, build: 0 });
  return s;
}
export function towerCost(s: Battle, kind: TowerKind): number { return Math.ceil(TOWERS[kind].cost * (s.lever === "rocky" ? WAR.rockyDiscount : 1)); }
export function place(s: Battle, c: Cell, kind: TowerKind): boolean {
  if (s.status !== "playing") return false;
  const side = s.sides[0], cost = towerCost(s, kind);
  if (!Number.isInteger(c.x) || !Number.isInteger(c.y) || c.x <= 0 || c.x >= WAR.cols - 1 || c.y < 0 || c.y >= WAR.rows || side.towers.some(t => key(t) === key(c))) { s.message = "Choose an empty cell; entrance and base columns stay clear."; return false; }
  if (side.ore < cost) { s.message = "Not enough ore for that defense."; return false; }
  if (s.units.some(u => u.target === 0 && (distance(u, c) < 0.8 || (u.waypoint && key(u.waypoint) === key(c))))) { s.message = "A creature occupies that cell."; return false; }
  const candidate = [...side.towers, c];
  if (!route(candidate).length || s.units.some(u => u.target === 0 && !route(candidate, u).length)) { s.message = "Keep a route open for every creature. A maze cannot seal the lane."; return false; }
  side.ore -= cost; side.towers.push({ ...c, id: s.nextId++, kind, cooldown: 0, build: WAR.buildSeconds });
  s.tally.defenses += cost; s.tally.longest = Math.max(s.tally.longest, route(candidate).length - 1); s.message = `${TOWERS[kind].name} queued. Builders share construction work.`; return true;
}
export function train(s: Battle, kind: "gatherer" | "builder" | "farmer"): boolean {
  const side = s.sides[0];
  const cost = kind === "gatherer" ? WAR.gatherCost : kind === "farmer" ? WAR.farmerCost : WAR.builderCost;
  const count = kind === "gatherer" ? side.gatherers : kind === "farmer" ? side.farmers ?? 0 : side.builders;
  if (s.status !== "playing" || side.ore < cost || count >= WAR.maxWorkers) { s.message = "Cannot train: need ore or worker capacity."; return false; }
  side.ore -= cost;
  if (kind === "gatherer") side.gatherers++;
  else if (kind === "farmer") side.farmers = count + 1;
  else side.builders++;
  s.message = `${kind} trained: ${kind === "gatherer" ? "more ore income and food each payday" : kind === "farmer" ? `+${WAR.farmerFood} food each payday` : "faster construction"}.`; return true;
}
export function send(s: Battle, kind: SendKind, target: 0 | 1 = 1, free = false): boolean {
  const side = s.sides[target === 1 ? 0 : 1], spec = SENDS[kind], count = kind === "swarm" ? 3 : 1;
  if (s.status !== "playing" || s.units.length + count > WAR.unitLimit) return false;
  if (!free && (side.ore < spec.ore || side.food < spec.food)) { s.message = "Need ore and food to send creatures."; return false; }
  if (!free) { side.ore -= spec.ore; side.food -= spec.food; side.income += spec.income; }
  for (let n = 0; n < count; n++) s.units.push({ ...WAR.entry, id: s.nextId++, kind, hp: spec.hp, maxHp: spec.hp, slow: 0, target });
  if (target === 1) { s.tally.sends += spec.ore; s.tally.sentKinds[kind]++; s.message = `${spec.name} sent; permanent income +${spec.income}.`; } return true;
}
export function setLever(s: Battle): void {
  if (s.status !== "playing") return;
  s.lever = s.lever === "ore" ? "rocky" : "ore"; s.tally.levers++;
  s.message = s.lever === "ore" ? "Rich ore: +60% ore per payday, funding sends." : "Rocky ground: defenses cost 35% less.";
}
export const income = (s: Battle, side: 0 | 1) => s.sides[side].income + s.sides[side].gatherers * WAR.gatherIncome;
export const foodIncome = (s: Battle, side: 0 | 1) => s.sides[side].gatherers * WAR.gatherFood + (s.sides[side].farmers ?? 0) * WAR.farmerFood;
function kill(s: Battle, u: Unit, hero = false): void {
  if (u.hp > 0) return;
  const side = s.sides[u.target]; side.ore += WAR.killOre; side.income += WAR.killIncome;
  if (u.target === 0) { s.tally.kills++; if (hero) s.message = "Hero kill: bounty and permanent defensive income."; }
}
export function heroAttack(s: Battle, ability = false): void {
  const h = s.hero; if (s.status !== "playing" || h.respawn > 0 || (ability ? h.ability : h.cooldown) > 0) return;
  if (ability) h.ability = WAR.abilityCooldown; else h.cooldown = WAR.heroCooldown;
  const targets = s.units.filter(u => u.target === 0 && u.hp > 0 && distance(u, h) <= (ability ? WAR.abilityRange : WAR.heroRange)).sort((a, b) => distance(a, h) - distance(b, h));
  for (const u of ability ? targets : targets.slice(0, 1)) {
    u.hp -= WAR.heroDamage + h.strength + (ability ? WAR.heroDamage : 0); s.tally.heroHits++; kill(s, u, true);
  }
}
export function moveHero(s: Battle, dx: number, dy: number, dt: number): void {
  const h = s.hero; if (h.respawn > 0 || s.status !== "playing") return;
  const length = Math.max(1, Math.hypot(dx, dy)), c = { x: h.x + dx / length * WAR.heroSpeed * dt, y: h.y + dy / length * WAR.heroSpeed * dt };
  if (!h.climb && key(cellOf(c)) !== key(cellOf(h)) && s.sides[0].towers.some(t => key(t) === key(cellOf(c)))) return;
  h.x = Math.max(0, Math.min(WAR.cols - 1, c.x)); h.y = Math.max(0, Math.min(WAR.rows - 1, c.y));
}
export function stepBattle(s: Battle, dt: number): void {
  if (s.status !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.1); s.clock += dt; s.incomeClock += dt; s.waveClock -= dt;
  const h = s.hero; h.cooldown = Math.max(0, h.cooldown - dt); h.ability = Math.max(0, h.ability - dt); h.hurt = Math.max(0, h.hurt - dt);
  if (h.respawn > 0) { h.respawn = Math.max(0, h.respawn - dt); if (!h.respawn) { h.hp = h.maxHp; h.x = 8; h.y = 3; } }
  if (s.incomeClock >= WAR.tick) {
    s.incomeClock -= WAR.tick;
    s.sides.forEach((side, n) => { side.ore += income(s, n as 0 | 1) * (n === 0 && s.lever === "ore" ? WAR.oreMult : 1); side.food += foodIncome(s, n as 0 | 1); });
  }
  if (s.waveClock <= 0) {
    s.wave++; s.waveClock += WAR.wave;
    const kind: SendKind = s.wave % 3 === 0 ? "shell" : s.wave % 2 === 0 ? "swarm" : "runner";
    for (let n = 0; n < 2 + Math.floor(s.wave / 3) + (s.rival === "raider" ? 1 : 0); n++) send(s, kind, 0, true);
    s.sides[1].income += WAR.rivalGrowth;
    if (s.wave % WAR.rivalBuildEvery === 0) {
      const c = { x: 2 + s.wave % 7, y: s.wave % 7 };
      if (!s.sides[1].towers.some(t => key(t) === key(c)) && !s.units.some(u => u.target === 1 && distance(u, c) < 1.5) && route([...s.sides[1].towers, c]).length) s.sides[1].towers.push({ ...c, id: s.nextId++, kind: "mortar", cooldown: 0, build: 0 });
    }
    s.message = `Wave ${s.wave}: ${SENDS[kind].name}. Use the hero and maze together.`;
  }
  for (const side of s.sides) {
    const queued = side.towers.filter(t => t.build > 0);
    for (const t of queued) t.build = Math.max(0, t.build - dt * side.builders / queued.length);
    for (const t of side.towers) { t.cooldown = Math.max(0, t.cooldown - dt); t.shotLeft = Math.max(0, (t.shotLeft ?? 0) - dt); if (!t.shotLeft) t.shot = undefined; }
  }
  for (let target = 0; target < 2; target++) {
    const side = s.sides[target];
    for (const t of side.towers) {
      const spec = TOWERS[t.kind]; if (t.build > 0 || t.cooldown > 0) continue;
      const victim = s.units.find(u => u.target === target && u.hp > 0 && distance(u, t) <= spec.range); if (!victim) continue;
      t.cooldown = spec.cooldown; t.shot = { x: victim.x, y: victim.y }; t.shotLeft = 0.14;
      for (const u of s.units.filter(u => u.target === target && u.hp > 0 && (u === victim || (spec.splash > 0 && distance(u, victim) <= spec.splash)))) {
        u.hp -= Math.max(1, spec.damage - SENDS[u.kind].armor); if (spec.slow) u.slow = spec.slow; kill(s, u);
      }
    }
  }
  // A small board and capped population keep this deterministic prototype inexpensive.
  for (const u of s.units) {
    if (u.hp <= 0) continue;
    const center = cellOf(u), onCenter = distance(center, u) < 0.01;
    if (!u.waypoint || distance(u, u.waypoint) < 0.01) u.waypoint = route(s.sides[u.target].towers, u)[1];
    const dest = u.waypoint;
    if (key(center) === key(WAR.exit) && onCenter) { s.sides[u.target].hp = Math.max(0, s.sides[u.target].hp - SENDS[u.kind].damage); u.hp = 0; continue; }
    if (dest) { const d = distance(u, dest), speed = SENDS[u.kind].speed * (u.slow > 0 ? 0.5 : 1), step = Math.min(d, speed * dt); if (d) { u.x += (dest.x - u.x) / d * step; u.y += (dest.y - u.y) / d * step; } }
    u.slow = Math.max(0, u.slow - dt);
    if (u.target === 0 && h.respawn === 0 && h.hurt === 0 && distance(u, h) < 0.65) {
      h.hp--; h.hurt = WAR.heroRecovery;
      if (h.hp <= 0) { h.respawn = WAR.heroRespawn; s.sides[0].ore = Math.max(0, s.sides[0].ore - WAR.killOre); s.message = "Hero wounded: recovering at home for 10s; 5 ore spent on care."; }
    }
  }
  s.units = s.units.filter(u => u.hp > 0);
  if (s.sides[0].hp <= 0) s.status = "fallen";
  else if (s.sides[1].hp <= 0) s.status = "base";
  else if (income(s, 0) >= income(s, 1) * WAR.incomeRatio) s.status = "economy";
}
export function warsRecord(s: Battle): { causes: StageCause[]; block: Record<string, unknown> } {
  const t = s.tally, types = (Object.keys(TOWERS) as TowerKind[]).sort((a, b) => s.sides[0].towers.filter(x => x.kind === b).length - s.sides[0].towers.filter(x => x.kind === a).length);
  const towers = types.filter(k => s.sides[0].towers.some(t => t.kind === k));
  const sends = (Object.keys(SENDS) as SendKind[]).filter(k => t.sentKinds[k] > 0).sort((a, b) => t.sentKinds[b] - t.sentKinds[a]);
  const machines = t.sends > t.defenses ? [...sends, ...towers] : [...towers, ...sends];
  return { causes: [
    { cause: `Sent creatures costing ${t.sends} ore`, effect: { aggressive: Math.min(0.5, t.sends / 500) } },
    { cause: `Built ${t.defenses} ore of defenses and defeated ${t.kills} attackers`, effect: { cautious: Math.min(0.5, t.defenses / 600 + t.kills / 100) } },
    { cause: `Maze length ${t.longest}; hero landed ${t.heroHits} hits`, effect: { adaptable: Math.min(0.5, Math.max(0, t.longest - 10) * 0.02 + t.heroHits * 0.015) } },
  ], block: { victory: s.status === "base" ? "base_destroyed" : "economic_supremacy", towers, machines, sentKinds: { ...t.sentKinds }, sends: t.sends, defenses: t.defenses, mazeLength: t.longest, heroHits: t.heroHits, kills: t.kills, tookT0Tech: false, lever: s.lever } };
}
// ---------------------------------------------------------------------------
