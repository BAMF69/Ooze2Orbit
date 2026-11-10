// ---------------------------------------------------------------------------
// tuning.ts (space)
// Purpose : Every number of the space stage's Toy 1 in one place (docs/stages/05-space.md): flight feel, the two
//           hulls, the eight parts, T0|▼|'s two ships and how it hunts, how fast it adapts, the economy, the end.
// Usage   : import { SPACE } from "./tuning";  SPACE.parts.spine.damage
// Notes   : PROTOTYPE numbers (Claude's pick, untested by a human hand): tune here, never in the rules. Distances
//           are px, times are seconds, angles are radians. Nothing here is taken from Endless Sky: same kind of
//           mechanics only (docs/adr/0001-gpl-license-and-endless-sky.md).
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------

export const SPACE = {
  flight: {
    drag: 0.9, // per second: top speed = acceleration / drag
    brakeDrag: 2.5, // extra drag while braking (S)
    massPerSpace: 0.04, // every unit of fitted space makes the ship heavier
    basePower: 3, // what a bare hull generates
    shotRadius: 3,
    aimCone: 0.22, // how well a pilot must line up before firing (autoplay and T0)
  },
  hulls: {
    seedpod: { name: "Seedpod", space: 10, hull: 100, mass: 1.0, radius: 11, cost: 0, blurb: "small and quick" },
    carapace: { name: "Carapace", space: 16, hull: 190, mass: 1.7, radius: 14, cost: 260, blurb: "big and slow" },
  },
  // maker: which species grows it. family: what T0|▼| learns (weapons and defences only).
  parts: {
    spine: { name: "Spine Launcher", kind: "weapon", maker: "home", family: "kinetic", space: 2, power: -1, cost: 60, damage: 8, every: 0.25, speed: 420, range: 380 },
    lance: { name: "Light Lance", kind: "weapon", maker: "ally", family: "beam", space: 3, power: -3, cost: 90, damage: 5, every: 0.1, speed: 900, range: 250 },
    spore: { name: "Spore Bloom", kind: "weapon", maker: "ally", family: "spore", space: 3, power: -2, cost: 80, damage: 42, every: 1.2, speed: 230, range: 430 },
    plating: { name: "Shell Plating", kind: "defence", maker: "home", family: "plating", space: 2, power: 0, cost: 50, hull: 70 },
    membrane: { name: "Tide Membrane", kind: "defence", maker: "ally", family: "membrane", space: 2, power: -2, cost: 70, shield: 50, regen: 5 },
    fin: { name: "Fin Drive", kind: "engine", maker: "home", space: 2, power: -1, cost: 50, thrust: 150, turn: 2.4 },
    burn: { name: "Burn Drive", kind: "engine", maker: "ally", space: 3, power: -2, cost: 70, thrust: 280, turn: 1.1 },
    gland: { name: "Sun Gland", kind: "power", maker: "home", space: 2, power: 5, cost: 40 },
  },
  specialtyBonus: 0.25, // a maker's strongest temperament: +25 % on its shields, weapons or engines
  t0: {
    // burst: shots before it pauses; pause / chase / rest: the gulper rhythm (strike, pause, give up a long chase)
    shard: { name: "Shard", hull: 40, radius: 9, accel: 150, turn: 2.2, damage: 6, every: 0.55, shotSpeed: 300, range: 250, burst: 3, pause: 1.6, chase: 9, rest: 3, salvage: 45 },
    lattice: { name: "Lattice", hull: 170, radius: 14, accel: 70, turn: 0.9, damage: 15, every: 0.9, shotSpeed: 260, range: 330, burst: 4, pause: 2.2, chase: 14, rest: 4, salvage: 130 },
  },
  patrol: { shardsBase: 2, shardsPerWins: 2, shardsMax: 5, spawnDist: 520 }, // one more Shard every 2 wins
  adapt: {
    learn: 0.35, // a weapon family that dealt all your damage is learned this much per battle
    defLearn: 0.25, // a defence family that was your whole defence
    fade: 0.15, // a family you did not use fades this much per battle
    cap: 0.75, // T0|▼| never fully cancels a family
    hybrid: 0.6, // a ship that mixes both makers' weapons and defences is learned this much slower (x0.6)
    t0TechStart: 0.25, // a species that took T0|▼| tech starts with every family this well known
  },
  economy: { start: 140, tradeBonus: 120, harshMarkup: 0.3, podLoss: 0.2 }, // podLoss: banked salvage lost with the ship
  temperPerWin: 0.03, // each win leans the lineage toward what the ship was built around
  winsToFinish: 5,
  jumpIn: 300, // how far from a system's centre you arrive
  landRange: 70, // how close to the planet E lands
} as const;
