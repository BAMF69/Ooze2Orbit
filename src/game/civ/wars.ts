// ---------------------------------------------------------------------------
// Purpose: Engine-free tower-wars simulation: BFS mazes, economy, waves, hero and victory recording.
// Usage: newBattle -> place/train/send/setLever -> stepBattle; scene only supplies intents and draws.
// Notes: Deterministic seeded terrain and difficulty-driven rival; two resources, no engine dependency.
// Pseudocode: income -> previewed wave -> construction -> path-following -> tower/hero combat -> wins.
// Authored: Written with Codex (GPT-6).
// ---------------------------------------------------------------------------
import { WAR, TOWERS, SENDS, type TowerKind, type SendKind } from "./warsTuning";
import { cellKey, DEFAULT_BOARD, DIFFICULTIES, generateBoard, heroHome, sameCell, type Board, type Difficulty } from "./battlefields";
import { cellOf, route } from "./battlefields";
export { cellOf, route } from "./battlefields";
import type { StageCause } from "../../core/lineage";
export interface Cell { x: number; y: number }
export interface Tower extends Cell { id: number; kind: TowerKind; cooldown: number; build: number; shot?: Cell; shotLeft?: number }
export interface Unit extends Cell { id: number; kind: SendKind; hp: number; maxHp: number; slow: number; target: 0 | 1; waypoint?: Cell }
export interface Side { hp: number; ore: number; food: number; income: number; gatherers: number; builders: number; farmers?: number; towers: Tower[] }
export interface Hero extends Cell { hp: number; maxHp: number; strength: number; climb: boolean; cooldown: number; ability: number; respawn: number; hurt: number }
export interface Battle { board: Board; difficulty: Difficulty; baselineLength: number; sides: [Side, Side]; units: Unit[]; hero: Hero; clock: number; incomeClock: number; waveClock: number; wave: number; nextId: number;
  rival: "raider" | "warden";
  lever: "ore" | "rocky"; status: "playing" | "base" | "economy" | "fallen";
  tally: { sends: number; defenses: number; kills: number; heroHits: number; longest: number; levers: number; sentKinds: Record<SendKind, number> }; message: string }
const distance = (a: Cell, b: Cell) => Math.hypot(a.x - b.x, a.y - b.y);
export function newBattle(hero: Partial<Hero> = {}, rival: Battle["rival"] = "raider", config?: { difficulty: Difficulty; seed: number }): Battle {
  const difficulty = config?.difficulty ?? "easy", board = config ? generateBoard(difficulty, config.seed) : { ...DEFAULT_BOARD, obstacles: [] };
  const tuning = DIFFICULTIES[difficulty], home = heroHome(board);
  const side = (): Side => ({ hp: WAR.baseHp, ore: WAR.startOre, food: WAR.startFood, income: WAR.baseIncome, gatherers: 2, builders: 1, farmers: 0, towers: [] });
  const maxHp = WAR.heroHp + Math.min(20, Math.max(0, hero.maxHp ?? 0));
  const s: Battle = { board, difficulty, baselineLength: route([], undefined, board).length - 1, sides: [side(), side()], units: [], hero: { ...home, hp: maxHp, maxHp, strength: Math.max(0, Math.min(20, hero.strength ?? 2)), climb: hero.climb ?? false, cooldown: 0, ability: 0, respawn: 0, hurt: 0 },
    clock: 0, incomeClock: 0, waveClock: tuning.firstWave, wave: 0, nextId: 1, rival, lever: "rocky", status: "playing",
    tally: { sends: 0, defenses: 0, kills: 0, heroHits: 0, longest: route([], undefined, board).length - 1, levers: 0, sentKinds: { runner: 0, shell: 0, swarm: 0 } }, message: "Build a maze before the first wave. Every kill grows income." };
  s.sides[1].income = tuning.rivalIncome;
  // Place both initial and later rival defenses through the same no-trap validator.
  const count = tuning.defenses + (rival === "warden" ? 1 : 0);
  for (let n = 0; n < count; n++) {
    const preferred = difficulty === "easy" && n === 2 ? { x: 7, y: 4 } : { x: Math.min(board.cols - 2, 4 + n * 2), y: Math.max(0, board.entry.y - n % 2) };
    const candidates = [preferred, ...Array.from({ length: board.cols * board.rows }, (_, i) => ({ x: i % board.cols, y: Math.floor(i / board.cols) }))];
    const c = candidates.find(c => canBlock(s, 1, c));
    if (c) s.sides[1].towers.push({ ...c, kind: n === 2 ? "mortar" : n % 2 ? "frost" : "thorn", id: s.nextId++, cooldown: 0, build: 0 });
  }
  return s;
}

/** Shared terrain/occupancy/connectivity gate for both sides, including moving units' next cells. */
export function canBlock(s: Battle, target: 0 | 1, c: Cell): boolean {
  const board = s.board, side = s.sides[target];
  if (!Number.isInteger(c.x) || !Number.isInteger(c.y) || c.x <= 0 || c.x >= board.cols - 1 || c.y < 0 || c.y >= board.rows) return false;
  if ([...board.obstacles, ...side.towers].some(t => sameCell(t, c))) return false;
  if (s.units.some(u => u.target === target && (distance(u, c) < .8 || (u.waypoint && sameCell(u.waypoint, c))))) return false;
  const candidate = [...side.towers, c];
  return !!route(candidate, undefined, board).length && s.units.every(u => u.target !== target || !!route(candidate, u.waypoint ?? u, board).length);
}
export function wavePreview(s: Battle, wave = s.wave + 1) {
  return { kind: (wave % 3 === 0 ? "shell" : wave % 2 === 0 ? "swarm" : "runner") as SendKind,
    count: 2 + Math.floor(wave / 3) + (s.rival === "raider" ? 1 : 0) + DIFFICULTIES[s.difficulty].extraSends };
}
export function towerCost(s: Battle, kind: TowerKind): number { return Math.ceil(TOWERS[kind].cost * (s.lever === "rocky" ? WAR.rockyDiscount : 1)); }
export type PlacementIssue = "cell" | "ore" | "occupied" | "route" | "ended";
/** Read-only preview shares the exact construction checks; no spend or message mutation. */
export function placementIssue(s: Battle, c: Cell, kind: TowerKind): PlacementIssue | null {
  if (s.status !== "playing") return "ended";
  const side = s.sides[0], key = (c: Cell) => cellKey(s.board, c);
  if (!Number.isInteger(c.x) || !Number.isInteger(c.y) || c.x <= 0 || c.x >= s.board.cols - 1 || c.y < 0 || c.y >= s.board.rows || [...s.board.obstacles, ...side.towers].some(t => key(t) === key(c))) return "cell";
  if (side.ore < towerCost(s, kind)) return "ore";
  if (s.units.some(u => u.target === 0 && (distance(u, c) < 0.8 || (u.waypoint && key(u.waypoint) === key(c))))) return "occupied";
  if (!canBlock(s, 0, c)) return "route";
  return null;
}
export function place(s: Battle, c: Cell, kind: TowerKind): boolean {
  const issue = placementIssue(s, c, kind);
  if (issue) {
    if (issue !== "ended") s.message = ({ cell: "Choose an empty cell; entrance and base columns stay clear.", ore: "Not enough ore for that defense.", occupied: "A creature occupies that cell.", route: "Keep a route open for every creature. A maze cannot seal the lane." })[issue];
    return false;
  }
  const side = s.sides[0], cost = towerCost(s, kind), candidate = [...side.towers, c];
  side.ore -= cost; side.towers.push({ ...c, id: s.nextId++, kind, cooldown: 0, build: WAR.buildSeconds });
  s.tally.defenses += cost; s.tally.longest = Math.max(s.tally.longest, route(candidate, undefined, s.board).length - 1); s.message = `${TOWERS[kind].name} queued. Builders share construction work.`; return true;
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
  for (let n = 0; n < count; n++) s.units.push({ ...s.board.entry, id: s.nextId++, kind, hp: spec.hp * (target === 0 ? DIFFICULTIES[s.difficulty].unitHealth : 1), maxHp: spec.hp * (target === 0 ? DIFFICULTIES[s.difficulty].unitHealth : 1), slow: 0, target });
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
  if (!h.climb && !sameCell(cellOf(c, s.board), cellOf(h, s.board)) && [...s.board.obstacles, ...s.sides[0].towers].some(t => sameCell(t, cellOf(c, s.board)))) return;
  h.x = Math.max(0, Math.min(s.board.cols - 1, c.x)); h.y = Math.max(0, Math.min(s.board.rows - 1, c.y));
}
export function stepBattle(s: Battle, dt: number): void {
  if (s.status !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.1); s.clock += dt; s.incomeClock += dt; s.waveClock -= dt;
  const h = s.hero; h.cooldown = Math.max(0, h.cooldown - dt); h.ability = Math.max(0, h.ability - dt); h.hurt = Math.max(0, h.hurt - dt);
  if (h.respawn > 0) { h.respawn = Math.max(0, h.respawn - dt); if (!h.respawn) { h.hp = h.maxHp; const home = heroHome(s.board); h.x = home.x; h.y = home.y; } }
  if (s.incomeClock >= WAR.tick) {
    s.incomeClock -= WAR.tick;
    s.sides.forEach((side, n) => { side.ore += income(s, n as 0 | 1) * (n === 0 && s.lever === "ore" ? WAR.oreMult : 1); side.food += foodIncome(s, n as 0 | 1); });
  }
  if (s.waveClock <= 0) {
    s.wave++; s.waveClock += DIFFICULTIES[s.difficulty].wave;
    const { kind, count } = wavePreview(s, s.wave), tuning = DIFFICULTIES[s.difficulty];
    for (let n = 0; n < count; n++) send(s, kind, 0, true);
    s.sides[1].income += tuning.rivalGrowth;
    if (s.wave % tuning.buildEvery === 0) {
      const c = { x: 1 + s.wave % (s.board.cols - 2), y: s.wave % s.board.rows };
      if (canBlock(s, 1, c)) s.sides[1].towers.push({ ...c, id: s.nextId++, kind: "mortar", cooldown: 0, build: 0 });
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
    const center = cellOf(u, s.board), onCenter = distance(center, u) < 0.01;
    if (!u.waypoint || distance(u, u.waypoint) < 0.01) u.waypoint = route(s.sides[u.target].towers, u, s.board)[1];
    const dest = u.waypoint;
    if (sameCell(center, s.board.exit) && onCenter) { s.sides[u.target].hp = Math.max(0, s.sides[u.target].hp - SENDS[u.kind].damage); u.hp = 0; continue; }
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
    { cause: `Maze length ${t.longest}; hero landed ${t.heroHits} hits`, effect: { adaptable: Math.min(0.5, Math.max(0, t.longest - s.baselineLength) * 0.02 + t.heroHits * 0.015) } },
  ], block: { mode: "tower", difficulty: s.difficulty, seed: s.board.seed, baselineLength: s.baselineLength, towerCounts: Object.fromEntries(types.map(k => [k, s.sides[0].towers.filter(t => t.kind === k).length])), victory: s.status === "base" ? "base_destroyed" : "economic_supremacy", towers, machines, sentKinds: { ...t.sentKinds }, sends: t.sends, defenses: t.defenses, mazeLength: t.longest, heroHits: t.heroHits, kills: t.kills, tookT0Tech: false, lever: s.lever } };
}
// ---------------------------------------------------------------------------
