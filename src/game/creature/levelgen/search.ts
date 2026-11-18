// ---------------------------------------------------------------------------
// search.ts (creature/levelgen)
// Purpose : Step 1.5 of the large-room plan: a SEARCH-based room solver, so stitched rooms (which have no hand-written
//           script) can be validated, and so one-screen rooms are proved at minimum traits in every relevant state
//           instead of along one script at maximum traits. It is the platform-graph approach (Surfacer, arXiv
//           1804.09153): settled body positions are nodes; edges are short input "moves" (walk, jump arcs with and
//           without sprint, swims, breach jumps) simulated through the REAL controller (stepWaterBody) on the real
//           collision (specSolid plus objectiveBarrier). Controls and keyed controls change the objective state, which
//           changes collision, so the search runs in layers, one per objective state.
// Usage   : searchRoom(room, expedition, traits, keys, options) -> SearchResult
// Notes   : Engine-free and deterministic. Enemies are not bodies here: sealed arenas start sealed unless
//           `threatsHandled`, and guarded controls need a free operation unless `threatsHandled` (relations.ts models
//           the threats). Velocity is reset at each node (a player can always brake), which is slightly generous.
// Authored: Written with Claude (Opus 5.5). Algorithm idea from Surfacer (MIT) and the platform-graph literature;
//           no code copied.
// ---------------------------------------------------------------------------
import { newBody, type Body } from "../physics";
import { stepWaterBody, inWater, waterlineAt } from "../waterPhysics";
import { WATER, type WaterRoom } from "../waterWorld";
import { newObjective, useValve, useKeyed, canClaimSeal, type RoomObjective } from "../waterObjectives";
import { verticalArrival } from "../waterRoutes";
import { guardedControl, CONTROL_SECONDS } from "../waterCombatRooms";
import type { Expedition } from "../expedition";
import type { Traits } from "../generations";
import { roomSpec, roomGeometry } from "./roomSpec";
import { leftEdgeX, rightEdgeX, bottomEdgeY, goalX, type RoomGeometry } from "./geometry";
import type { Key } from "./keys";

const DT = 1 / 60, REACH = { x: 28, y: 25 };
export interface SearchOptions {
  start?: { x: number; y: number };   // entry point (default: the left spawn on the floor)
  threatsHandled?: boolean;           // arenas cleared and guards neutralized (true) or ignored by the player (false)
  timerSlack?: number;                // a timed gate must be crossable in (1 - slack) of its seconds (invariant 15)
  maxNodes?: number;
  avoid?: (x: number, y: number) => boolean; // positions the body may not pass through (threat zones)
  exhaustive?: boolean;               // explore each layer fully (slower; reports every reachable control and exit)
  collect?: boolean;                  // return every settled position reached (for relation rules)
}
export interface SearchResult {
  solved: boolean; returned: boolean;
  reached: { right: boolean; left: boolean; hatch: boolean; goal: boolean; reward: boolean; openings: number[]; controls: number[]; keyed: boolean };
  framesToExit: number | null; pitFalls: number; nodes: number; layers: number; reasons: string[];
  positions: { x: number; y: number }[]; // filled when `collect` is set
}
interface Node { x: number; y: number; frames: number }
type Move = { dir: number; vertical: number; jump: boolean; sprint: boolean; frames: number; hold: boolean };

const GROUND_MOVES: Move[] = [
  { dir: -1, vertical: 0, jump: false, sprint: false, frames: 10, hold: false }, { dir: 1, vertical: 0, jump: false, sprint: false, frames: 10, hold: false },
  ...[-1, 0, 1].flatMap(dir => [false, true].filter(s => dir !== 0 || !s).map(sprint => ({ dir, vertical: -1, jump: true, sprint, frames: 90, hold: true }))),
  // A short hop and a release mid-air reach ledges a full held jump overshoots.
  { dir: -1, vertical: 0, jump: true, sprint: false, frames: 12, hold: false }, { dir: 1, vertical: 0, jump: true, sprint: false, frames: 12, hold: false },
];
const WATER_MOVES: Move[] = [-1, 0, 1].flatMap(dir => [-1, 0, 1].filter(v => dir !== 0 || v !== 0).map(vertical => ({ dir, vertical, jump: false, sprint: false, frames: 14, hold: false })));
const BREACH_MOVES: Move[] = [-1, 0, 1].flatMap(dir => [false, true].filter(s => dir !== 0 || !s).map(sprint => ({ dir, vertical: -1, jump: true, sprint, frames: 90, hold: true })));

const keyOf = (o: RoomObjective): string => [o.first, o.open, o.keyOpen, o.bonusOpen, o.verticalOpen, o.arenaActive && !o.arenaCleared].map(Number).join("");

/** One move from a stopped body; returns where it settles, or an exit event. */
function simulate(r: WaterRoom, g: RoomGeometry, e: Expedition, t: Traits, o: RoomObjective, from: Node, m: Move, avoid?: (x: number, y: number) => boolean):
  { node?: Node; exit?: "left" | "right"; opening?: number; pit?: boolean } {
  const s = roomSpec(r), b: Body = newBody(from.x, from.y);
  let frames = 0;
  const step = (dir: number, vertical: number, jump: boolean, sprint: boolean): "left" | "right" | number | "pit" | "avoid" | null => {
    stepWaterBody(b, r, e, t, { dir, vertical, jump, crouch: false, sprint }, DT, o); frames++;
    if (b.x < leftEdgeX(g)) return "left";
    if (b.x > rightEdgeX(g)) return "right";
    const a = verticalArrival(r, b.x, b.y, o); if (a) return a.room;
    if (s.pits.length && b.y > bottomEdgeY(g)) return "pit";
    if (avoid && avoid(b.x, b.y - 9)) return "avoid";
    return null;
  };
  const wetAtStart = inWater(b, e, r);
  for (let n = 0; n < m.frames; n++) {
    const ev = step(m.dir, wetAtStart || m.hold ? m.vertical : 0, m.jump && n === 0, m.sprint);
    if (ev === "left" || ev === "right") return { exit: ev };
    if (typeof ev === "number") return { opening: ev };
    if (ev === "pit") return { pit: true };
    if (ev === "avoid") return {};
    if (m.hold && n > 3 && (b.onGround || inWater(b, e, r) && !wetAtStart)) break; // landed (or entered water)
  }
  // Settle on land with no input until stopped. In water the node is taken as is: a swimmer holds position against
  // currents by steering, and letting it drift would make every upstream swim net backwards.
  for (let n = 0; n < 60; n++) {
    if (inWater(b, e, r) || b.onGround && Math.abs(b.vx) < 5) break;
    const ev = step(0, 0, false, false);
    if (ev === "left" || ev === "right") return { exit: ev };
    if (typeof ev === "number") return { opening: ev };
    if (ev === "pit") return { pit: true };
    if (ev === "avoid") return {};
  }
  return { node: { x: b.x, y: b.y, frames: from.frames + frames } };
}

/** Search one room. Layers are objective states; each layer is a frame-weighted search over settled positions. */
export function searchRoom(r: WaterRoom, e: Expedition, t: Traits, keys: ReadonlySet<Key>, opt: SearchOptions = {}): SearchResult {
  const s = roomSpec(r), g = roomGeometry(r), maxNodes = opt.maxNodes ?? 6000, slack = opt.timerSlack ?? 0.25;
  const reached: SearchResult["reached"] = { right: false, left: false, hatch: false, goal: false, reward: false, openings: [], controls: [], keyed: false };
  const reasons: string[] = [], positions: { x: number; y: number }[] = []; let pitFalls = 0, nodes = 0, framesToExit: number | null = null, returned = false;
  const start0 = opt.start ?? { x: WATER.spawn, y: WATER.floor };
  // A sealed arena closes behind the player: without handling its threats, the seal is up.
  const initial: RoomObjective = { ...newObjective(), ...(s.sealed && !opt.threatsHandled ? { arenaActive: true, arenaCleared: false } : s.sealed ? { arenaActive: true, arenaCleared: true } : {}) };
  const layers: { o: RoomObjective; starts: Node[]; timed: boolean }[] = [{ o: initial, starts: [{ ...start0, frames: 0 }], timed: false }];
  const seenLayers = new Set<string>();
  let finalLeft = false;
  while (layers.length && nodes < maxNodes * 4) {
    const layer = layers.shift()!, lk = keyOf(layer.o);
    if (seenLayers.has(lk)) continue;
    seenLayers.add(lk);
    const o = layer.o, seen = new Map<string, number>();
    // Frame-ordered frontier (small arrays; a simple sorted insert is fast enough here).
    const frontier: Node[] = [];
    const push = (n: Node) => {
      const k = `${Math.round(n.x / 8)},${Math.round(n.y / 6)},${inWater(newBody(n.x, n.y), e, r) ? 1 : 0}`;
      if ((seen.get(k) ?? Infinity) <= n.frames) return;
      seen.set(k, n.frames); let i = frontier.length; while (i > 0 && frontier[i - 1].frames > n.frames) i--; frontier.splice(i, 0, n);
    };
    for (const st of layer.starts) { const settled = simulate(r, g, e, t, o, st, { dir: 0, vertical: 0, jump: false, sprint: false, frames: 1, hold: false }); if (settled.node) push(settled.node); }
    let layerLeft = false, layerExit = false, transitions = 0;
    // What solves this room: the seal for goal rooms, the sample for branch rooms, otherwise the onward exit.
    const target: "goal" | "reward" | "exit" = r.goal ? "goal" : r.reward && s.returnArrival ? "reward" : "exit";
    // A layer ends early once it changes the room's state (the next layer re-explores under the new collision), or once
    // it has both solved the room and found the way back; otherwise it explores everything reachable.
    while (frontier.length && nodes < maxNodes * (seenLayers.size) && !(transitions > 0 && opt.exhaustive !== true) && !(layerExit && layerLeft)) {
      const n = frontier.shift()!; nodes++;
      if (opt.collect) positions.push({ x: n.x, y: n.y });
      const body = newBody(n.x, n.y), wet = inWater(body, e, r), canClaim = canClaimSeal(o);
      // Interactions at this node.
      s.controls.forEach((c, i) => {
        if (Math.abs(n.x - c.x) >= REACH.x || Math.abs(n.y - c.y) >= REACH.y) return;
        const sealed = !!o.arenaActive && !o.arenaCleared; if (sealed) return; // the seal holds the controls
        if (guardedControl(r, i) && !opt.threatsHandled && guardWatches(r, c)) return; // an active guard interrupts
        const v = useValve(r, o, n.x, n.y); if (!v.used || keyOf(v.state) === lk) return;
        if (!reached.controls.includes(i)) reached.controls.push(i);
        transitions++;
        layers.push({ o: v.state, starts: [{ ...n, frames: n.frames + (guardedControl(r, i) ? CONTROL_SECONDS * 60 : 0) }], timed: v.state.remaining > 0 });
      });
      if (s.keyed && Math.abs(n.x - s.keyed.x) < REACH.x && Math.abs(n.y - s.keyed.y) < REACH.y) {
        const k = useKeyed(r, o, n.x, n.y, keys);
        if (k.used && keyOf(k.state) !== lk) { reached.keyed = true; transitions++; layers.push({ o: k.state, starts: [n], timed: false }); }
      }
      if (s.leftHatch && o.open && Math.abs(n.x - s.leftHatch.x) < REACH.x && Math.abs(n.y - s.leftHatch.y) < REACH.y) { reached.hatch = true; if (target === "exit") layerExit = true; noteExit(n.frames); }
      if (r.reward && n.x > goalX(g)) { reached.reward = true; if (target === "reward") layerExit = true; }
      if (r.goal && n.x > goalX(g) && canClaim && withinTimer(n.frames)) { reached.goal = true; if (target === "goal") layerExit = true; noteExit(n.frames); }
      const moves = wet ? [...WATER_MOVES, ...(n.y <= waterlineAt(r, e, n.x) + 8 ? BREACH_MOVES : [])] : GROUND_MOVES;
      for (const m of moves) {
        const res = simulate(r, g, e, t, o, n, m, opt.avoid);
        if (res.exit === "left") { reached.left = true; layerLeft = true; continue; }
        if (res.exit === "right") { if (withinTimer(n.frames + m.frames)) { reached.right = true; if (target === "exit") layerExit = true; noteExit(n.frames + m.frames); } else reasons.push("timer too short"); continue; }
        if (res.opening !== undefined) { if (!reached.openings.includes(res.opening)) reached.openings.push(res.opening); if (s.returnArrival) layerLeft = true; continue; }
        if (res.pit) { pitFalls++; push({ x: s.pits[0].recoverX, y: WATER.floor, frames: n.frames + m.frames + 30 }); continue; }
        if (res.node) push(res.node);
      }
    }
    // The room is returnable if, in the layer where it was solved, the way back is open too.
    if (layerExit && layerLeft) returned = true;
    if (layerLeft) finalLeft = true;
    function withinTimer(frames: number): boolean { return !layer.timed || frames - layer.starts[0].frames <= s.timed * 60 * (1 - slack); }
    function noteExit(frames: number): void { const f = frames - layer.starts[0].frames; framesToExit = framesToExit === null ? f : Math.min(framesToExit, f); }
  }
  const exitReached = reached.right || reached.hatch;
  const solved = r.goal ? reached.goal : r.reward && s.returnArrival ? reached.reward : exitReached;
  if (!solved) reasons.push(r.goal ? "goal unreachable" : r.reward ? "reward unreachable" : "exit unreachable");
  if (solved && !returned && !(r.reward && s.returnArrival && finalLeft)) reasons.push("no way back");
  return { solved, returned: returned || !!(r.reward && s.returnArrival && finalLeft), reached, framesToExit, pitFalls, nodes, layers: seenLayers.size, reasons: [...new Set(reasons)], positions };
}

/** A guard watches a control when a land or water enemy spawns within the operation radius (waterCombatRooms.ts). */
export function guardWatches(r: WaterRoom, c: { x: number; y: number }): boolean {
  return roomSpec(r).enemies.some(en => en.kind !== "dropper" && Math.hypot(en.x - c.x, en.y - (c.y - 16)) < 76);
}

/** For a room that fails, the smallest set of missing abilities or Gardener states that makes it solvable, in plain
 *  words ("basin raised", "torrent diverted", "swimming fins", "gills"); [] if it already solves, null if nothing helps. */
export function whatIsMissing(r: WaterRoom, e: Expedition, t: Traits, keys: ReadonlySet<Key>, opt: SearchOptions = {}): string[] | null {
  const options: { name: string; e?: Partial<Expedition>; t?: Partial<Traits> }[] = [
    { name: "basin raised", e: { basinRaised: true } }, { name: "torrent diverted", e: { basinRaised: true, torrentDiverted: true } },
    { name: "swimming fins", t: { fins: true } }, { name: "gills", t: { gills: true } }];
  const tryWith = (picked: typeof options) => searchRoom(r, { ...e, ...Object.assign({}, ...picked.map(p => p.e ?? {})) },
    { ...t, ...Object.assign({}, ...picked.map(p => p.t ?? {})) }, keys, opt).solved;
  if (tryWith([])) return [];
  const useful = options.filter(p => !(p.e && Object.entries(p.e).every(([k, v]) => e[k as keyof Expedition] === v)) && !(p.t && Object.entries(p.t).every(([k, v]) => t[k as keyof Traits] === v)));
  for (const p of useful) if (tryWith([p])) return [p.name];
  for (let i = 0; i < useful.length; i++) for (let j = i + 1; j < useful.length; j++) if (tryWith([useful[i], useful[j]])) return [useful[i].name, useful[j].name];
  return null;
}
