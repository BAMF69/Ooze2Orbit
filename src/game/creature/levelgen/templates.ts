// ---------------------------------------------------------------------------
// templates.ts (creature/levelgen)
// Purpose : Layer 2 of the generator (CREATURE_LEVELGEN.md §3.3, §4): hand-authored room templates, one per
//           room role, grown from the eleven v1 rooms that the controller bots and human play already proved.
//           A template yields the room's geometry and spec, where a shaft may open on each edge, and its own
//           solution script, which the solver (solver.ts) drives through the real controller to validate it.
// Usage   : buildRoom({ tier, node, rng, authored, index, roomId }) -> Built
// Notes   : Pixel constants are the v1 anchors; `authored` reproduces v1 seed 0 exactly (golden-tested).
// Authored: Written with Claude (Fable 5.1).
// ---------------------------------------------------------------------------
import type { Difficulty, WaterRoom } from "../waterWorld";
import type { RoomNode } from "./graph";
import type { Rng } from "./rng";
import type { RoomSpec, CollisionRule, Control, EnemySpawn, Point, KeyedControl } from "./roomSpec";
import type { ClassSkill, Key, Stat } from "./keys";
import { LEVELGEN } from "./tuning";

export interface Entry { x: number; y: number; facing: number; vy?: number }
/** One move of a solution script: swim/walk to a point, optionally jumping, then act there. */
export interface Step { to: [number, number]; via?: [number, number]; leap?: boolean; jumpOnce?: boolean; sprint?: boolean; xOnly?: boolean; surface?: boolean; use?: "valve" | "keyed" | "hatch" | "reward" | "top" | "left" | "right" }
export interface Hosting { tiles: [number, number]; probe: [number, number]; rules: CollisionRule[]; label: string; always: boolean }
export type RoomFields = Pick<WaterRoom, "name" | "gate" | "tunnel" | "current" | "goal" | "reward" | "gateX" | "platforms" | "food" | "foes" | "cover" | "variant">;
export interface Built {
  room: RoomFields; spec: RoomSpec; entries: { top?: Entry; bottom?: Entry };
  hostTop?: Hosting; hostBottom?: Hosting; solution: Step[]; vaultKeyed?: (requires: Key[][], stat: Stat, threshold: number) => KeyedControl;
}
export interface TemplateContext { tier: Difficulty; node: RoomNode; rng: Rng; authored: boolean; index: number; roomId: number }

const TIER_NAME: Record<Difficulty, string> = { easy: "Reed shallows", medium: "Drowned galleries", hard: "Torrent heart" };
const HINT = {
  lever: "Find the raised gold sluice lever; jump or swim UP to reach it and press E. Open the route, then bring discoveries back to the nest alive.",
  drain: "Find the lower drain control 1, then backtrack to upper release 2. E operates controls. Carry rewards home alive.",
  shaft: "Dive beneath the roof to upper relay 1, then over the rock to lower latch 2. The onward hatch is back LEFT; retrace the shaft.",
  pressure: "Charge lower control 1, return to raised wheel 2, then cross before pressure expires. The seal must come home alive.",
  nursery: "Nursery branch: open the upper lever, then study the ripplefins. Carry their sample home alive to unlock fins for daughters.",
  vault: "A hidden grotto. Open its lever, study what grows here and carry it home alive: a new part your daughters can express.",
  classTrial: { roar: "A brittle calcite seal blocks the way. Only a lineage with the Roar can shatter it: E at the seal.", burrow: "The passage is choked with silt. Only a Burrow lineage can dig the den through: E at the silt.", tool: "A chasm with a driftwood log beside it. Only a Tool-using lineage can lever the log across: E at the log." },
};
const PIT = { tiles: [7, 8] as [number, number], recoverX: 96 };
const NET = { rig: { x: 104, y: 304 }, frame: { x: 368, y: 288 } };
const hostTopLedges: CollisionRule[] = [{ solid: true, stateOnly: true, x0: 5, x1: 6, y0: 15, y1: 15 }, { solid: true, stateOnly: true, x0: 7, x1: 8, y0: 11, y1: 11 }];
const BRANCH_TOP: Hosting = { tiles: [7, 8], probe: [119, 137], rules: hostTopLedges, label: "↑ NURSERY", always: true };
const climbToTop: Step[] = [{ to: [60, 304] }, { to: [96, 240], leap: true }, { to: [128, 176], leap: true }, { to: [128, 92], leap: true, use: "top" }, { to: [56, 304] }]; // ends back on the floor after the return drop

function enemies(node: RoomNode, variant: number): EnemySpawn[] {
  return node.enemies.map((kind, n) => ({ kind, x: kind === "dropper" ? 368 : 416 + n * 48 + variant * 8, y: kind === "dropper" ? 128 : kind === "swimmer" ? 268 : 288 }));
}
function common(ctx: TemplateContext, variant: number, platforms: RoomFields["platforms"]): { room: RoomFields; enemies: EnemySpawn[]; spec: Omit<RoomSpec, "puzzle" | "controls" | "timed" | "collision" | "base" | "hint"> } {
  const { rng, authored, node } = ctx;
  const gateX = (18 + (authored ? 0 : rng.int(5))) * 16, food = [7, 13, 24, 32].map(x => (x + (authored ? 0 : rng.int(3))) * 16), cover = (12 + variant * 2) * 16;
  const foes = enemies(node, variant);
  return {
    room: { name: `${TIER_NAME[ctx.tier]} ${ctx.index + 1}`, gate: node.gate, tunnel: false, current: node.current, goal: node.goal, gateX, platforms, food,
      foes: foes.filter(e => e.kind !== "dropper").map(e => e.x), cover, variant, ...(node.reward ? { reward: node.reward } : {}) },
    enemies: foes,
    spec: { leftHatch: null, sealed: node.sealed, enemies: foes, reeds: [cover + 48, ...foes.filter(e => e.kind === "ambusher").map(e => e.x)], net: NET,
      vent: null, cache: null, pits: node.pit ? [PIT] : [], switchback: false, openings: [], verticalOpenFrom: null, returnArrival: null,
      arriveFromRight: { x: 600, y: 304, facing: -1 }, branchArchX: null, keyed: null },
  };
}
const guarded = (tier: Difficulty, role: string): boolean => tier === "hard" || tier === "medium" && role !== "shaft";
const control = (x: number, y: number, text: string, g = false): Control => ({ x, y, text, guarded: g });
/** Pit rooms start with a marked gap right after the entrance: jump it going in and coming back. */
const pitIn = (node: RoomNode): Step[] => node.pit ? [{ to: [104, 304] }, { to: [200, 304], jumpOnce: true, xOnly: true }] : []; // may land on a platform
// Jumping is suppressed under water, so the way back over a floor gap is a breach jump from the surface.
// x 150 is the strip between the water edge (144) and the leftmost platform (160): free to surface and breach.
// A diverted current still drifts a hovering body left of the water edge, so current rooms surface further in.
// Under current a hovering body never settles, so current rooms go straight to the surface point and jump.
const pitOut = (node: RoomNode): Step[] => node.pit ? node.current ? [{ to: [176, 226], surface: true }] : [{ to: [150, 290] }, { to: [150, 226], surface: true }] : [];

function lever(ctx: TemplateContext): Built {
  const variant = ctx.authored ? ctx.index % 3 : ctx.rng.int(3), platforms = [{ x: (10 + variant * 3) * 16, y: 224, width: 48 }];
  const c = common(ctx, variant, platforms), lx = platforms[0].x + platforms[0].width / 2;
  const spec: RoomSpec = { ...c.spec, puzzle: "lever", controls: [control(lx, 236, "Upper sluice lever")], timed: 0, collision: [],
    base: { platforms: true, tunnel: true, gate: true }, hint: { priority: null, fallback: HINT.lever } };
  // The lever is within reach from the water right under its platform (feet at 258): swim beneath, then up.
  const solution: Step[] = [...pitIn(ctx.node), { to: [lx, 250], via: [lx, 272], use: "valve" }, { to: [632, 288], use: "right" }, ...pitOut(ctx.node), { to: [8, 304], jumpOnce: ctx.node.pit, sprint: ctx.node.pit, use: "left" }];
  return { room: c.room, spec, entries: { top: { x: 128, y: 116, facing: 1 } }, hostTop: BRANCH_TOP, solution,
    vaultKeyed: (requires, stat, n) => ({ x: 144, y: 304, text: "The grotto shaft above gives way. Climb the ledges to the top.", requires, opens: "bonusOpen", locked: `Sealed grotto shaft. A lineage with ${stat} ${n} or more could force it; this one cannot yet.` }) };
}
function classTrial(ctx: TemplateContext): Built {
  const built = lever(ctx), skill = ctx.node.classVariant ?? "roar";
  const name: Record<ClassSkill, string> = { roar: "Calcite seal", burrow: "Silt den", tool: "Driftwood chasm" };
  built.room.name = name[skill];
  built.spec = { ...built.spec, variant: skill, hint: { priority: HINT.classTrial[skill], fallback: HINT.lever },
    collision: [{ solid: true, unless: "keyOpen", x0: 33, x1: 33, y0: 6, y1: 18 }],
    keyed: { x: 508, y: 304, text: { roar: "Your roar shatters the calcite seal!", burrow: "You dig the den through the silt.", tool: "You lever the log across the chasm." }[skill],
      requires: [[`class:${skill}`]], opens: "keyOpen", locked: `Only a lineage with the ${skill === "tool" ? "Tool use" : skill[0].toUpperCase() + skill.slice(1)} skill can pass here. Another daughter may carry it.` } };
  built.solution = [{ to: [built.spec.controls[0].x, 250], via: [built.spec.controls[0].x, 272], use: "valve" }, { to: [508, 304], use: "keyed" }, { to: [632, 288], use: "right" }, { to: [8, 304], use: "left" }];
  return built;
}
function branch(ctx: TemplateContext, kind: "nursery" | "vault"): Built {
  const variant = ctx.rng.int(3), c = common(ctx, variant, [{ x: 256, y: 224, width: 64 }]);
  c.room = { ...c.room, name: kind === "nursery" ? "Ripplefin nursery" : "Hidden grotto", gateX: 288, food: [112, 208, 384, 512], cover: 224, foes: [] };
  const spec: RoomSpec = { ...c.spec, enemies: [], reeds: [224 + 48], puzzle: "lever", controls: [control(288, 236, "Upper sluice lever")], timed: 0, collision: [],
    base: { platforms: true, tunnel: true, gate: true }, returnArrival: { x: 126, y: 304, facing: 1 }, hint: { priority: kind === "nursery" ? HINT.nursery : HINT.vault, fallback: HINT.lever } };
  // Leaving on foot means jumping the open floor shaft (falling in is also a valid way home).
  const solution: Step[] = [{ to: [288, 250], via: [288, 272], use: "valve" }, { to: [576, 296], use: "reward" }, { to: [184, 290] }, { to: [184, 226], surface: true }, { to: [8, 304], jumpOnce: true, sprint: true, use: "left" }];
  return { room: c.room, spec, entries: { bottom: { x: 152, y: 298, facing: 1 } },
    hostBottom: { tiles: [7, 8], probe: [119, 137], rules: [], label: kind === "nursery" ? "↓ REED SHAFT" : "↓ BACK DOWN", always: true }, solution };
}
function drain(ctx: TemplateContext): Built {
  const variant = ctx.authored ? ctx.index % 3 : ctx.rng.int(3), c = common(ctx, variant, []);
  const g = guarded(ctx.tier, "drain");
  const spec: RoomSpec = { ...c.spec, puzzle: "drain", controls: [control(480, 288, "1 · Drain control", g), control(200, 236, "2 · Upper release")], timed: 0,
    collision: [{ solid: true, x0: 11, x1: 13, y0: 15, y1: 15 }], base: { platforms: false, tunnel: true, gate: false }, hint: { priority: HINT.drain, fallback: HINT.lever } };
  // Launch well left of the water edge: the drained shallows would cancel a jump that enters them below the surface.
  const solution: Step[] = [{ to: [480, 288], use: "valve" }, { to: [128, 304] }, { to: [200, 236], leap: true, use: "valve" }, { to: [632, 288], use: "right" }, { to: [8, 304], use: "left" }];
  return { room: { ...c.room, gate: false }, spec, entries: { bottom: { x: 328, y: 298, facing: -1, vy: -220 } },
    hostBottom: { tiles: [19, 21], probe: [311, 345], rules: [], label: "↓ GALLERY DRAIN\nOpens with sluice", always: true }, solution };
}
function shaft(ctx: TemplateContext): Built {
  const variant = ctx.authored ? ctx.index % 3 : ctx.rng.int(3), c = common(ctx, variant, []);
  const g = guarded(ctx.tier, "shaft");
  const spec: RoomSpec = { ...c.spec, puzzle: "shaft", switchback: true, leftHatch: { x: 128, y: 236 }, cache: { x: 280, y: 228 }, arriveFromRight: { x: 128, y: 236, facing: -1 },
    controls: [control(280, 228, "1 · Shaft relay", g), control(496, 288, "2 · Lower latch")], timed: 0,
    collision: [{ solid: true, x0: 7, x1: 9, y0: 15, y1: 15 }, { solid: true, x0: 10, x1: 14, y0: -99, y1: 15 }, { solid: true, x0: 26, x1: 29, y0: -99, y1: 15 }, { solid: true, x0: 19, x1: 21, y0: 16, y1: 99 }],
    base: { platforms: false, tunnel: false, gate: true }, hint: { priority: null, fallback: HINT.shaft } };
  const solution: Step[] = [{ to: [200, 296] }, { to: [280, 232], use: "valve" }, { to: [380, 244] }, { to: [440, 296] }, { to: [496, 288], use: "valve" },
    { to: [440, 296] }, { to: [380, 244] }, { to: [280, 232] }, { to: [200, 296] }, { to: [100, 300] }, { to: [128, 240], leap: true, use: "hatch" }];
  return { room: c.room, spec, entries: { top: { x: 280, y: 116, facing: 1 } },
    hostTop: { tiles: [16, 18], probe: [263, 291], rules: [{ solid: true, stateOnly: true, when: "verticalOpen", x0: 16, x1: 17, y0: 10, y1: 10 }], label: "↑ DRAIN CHAMBER", always: false }, solution };
}
function pressure(ctx: TemplateContext): Built {
  const variant = ctx.authored ? ctx.index % 3 : ctx.rng.int(3), c = common(ctx, variant, []);
  const g = guarded(ctx.tier, "pressure");
  const spec: RoomSpec = { ...c.spec, puzzle: "pressure", vent: { x: 384, y: 300 }, controls: [control(480, 288, "1 · Charge pressure", g), control(192, 236, "2 · Timed release")], timed: 12,
    collision: [{ solid: true, x0: 11, x1: 13, y0: 15, y1: 15 }], base: { platforms: false, tunnel: true, gate: false }, hint: { priority: HINT.pressure, fallback: HINT.lever } };
  const solution: Step[] = [...pitIn(ctx.node), { to: [480, 288], use: "valve" }, { to: [192, 236], leap: true, use: "valve" }, { to: [632, 288], use: "right" }, ...pitOut(ctx.node), { to: [8, 304], jumpOnce: ctx.node.pit, sprint: ctx.node.pit, use: "left" }];
  return { room: { ...c.room, gate: false }, spec, entries: { top: { x: 128, y: 116, facing: 1 } }, hostTop: BRANCH_TOP, solution,
    vaultKeyed: (requires, stat, n) => ({ x: 144, y: 304, text: "The grotto shaft above gives way. Climb the ledges to the top.", requires, opens: "bonusOpen", locked: `Sealed grotto shaft. A lineage with ${stat} ${n} or more could force it; this one cannot yet.` }) };
}
export function buildRoom(ctx: TemplateContext): Built {
  switch (ctx.node.role) {
    case "lever": case "arena": case "hardEntry": return lever(ctx);
    case "classTrial": return classTrial(ctx);
    case "nursery": return branch(ctx, "nursery");
    case "vault": return branch(ctx, "vault");
    case "drain": return drain(ctx);
    case "shaft": return shaft(ctx);
    case "pressure": return pressure(ctx);
  }
}
export const climbScript = (): Step[] => climbToTop;
export const bonusThreshold = (tier: Difficulty): number => LEVELGEN.bonusTier[tier];
export type { Point };
