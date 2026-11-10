// ---------------------------------------------------------------------------
// tuning.ts (space)
// Purpose : Every number of the space stage's Toy in one place (docs/stages/05-space.md): flight feel, the hulls
//           and their slots, the parts, the escorts you can recruit, T0|▼|'s two ships and how it hunts, how fast it
//           adapts, the economy, the end.
// Usage   : import { SPACE } from "./tuning";  SPACE.parts.spine.damage
// Notes   : PROTOTYPE numbers (Claude's pick, untested by a human hand): tune here, never in the rules. Distances
//           are px, times are seconds, angles are radians. Nothing here is taken from Endless Sky: same kind of
//           mechanics only (docs/adr/0001-gpl-license-and-endless-sky.md).
// Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
// ---------------------------------------------------------------------------

export const SPACE = {
  flight: {
    drag: 0.9, // per second: top speed = acceleration / drag
    brakeDrag: 2.5, // extra drag while braking (X)
    reverse: 0.55, // reverse thrusters (S) push this share of the main engine
    strafe: 0.5, // side thrusters (Z, C) push this share of the main engine
    massPerSpace: 0.04, // every unit of a part's bulk ("space") makes the ship heavier
    basePower: 3, // what a bare hull generates
    shotRadius: 3,
    aimCone: 0.22, // how well a pilot must line up before firing (autoplay, escorts and T0)
    escortGap: 70, // how far behind the flagship an idle escort keeps station
  },
  // slots: how many parts of each type the hull takes (BAMF69 2026-11-10: see your open slots). escortOnly hulls
  // are flown by recruited allies, never by you.
  hulls: {
    seedpod: { name: "Seedpod", hull: 100, mass: 1.0, radius: 11, cost: 0, blurb: "small and quick", escortOnly: false, slots: { gun: 2, turret: 1, defence: 2, engine: 2, power: 2 } },
    carapace: { name: "Carapace", hull: 190, mass: 1.7, radius: 14, cost: 260, blurb: "big and slow", escortOnly: false, slots: { gun: 4, turret: 2, defence: 4, engine: 2, power: 3 } },
    skiff: { name: "Skiff", hull: 70, mass: 0.8, radius: 9, cost: 0, blurb: "a Tidewright dart", escortOnly: true, slots: { gun: 1, turret: 0, defence: 1, engine: 1, power: 1 } },
    warden: { name: "Warden", hull: 150, mass: 1.5, radius: 13, cost: 0, blurb: "a Tidewright shield-ship", escortOnly: true, slots: { gun: 0, turret: 1, defence: 2, engine: 1, power: 2 } },
  },
  // maker: which species grows it (and which world sells it). slot: where it fits. family: what T0|▼| learns
  // (weapons and defences only). mount: gun = fires forward when you fire; turret = tracks and fires on its own in
  // any direction; missile = launches on its own and homes (homing: how hard it turns).
  parts: {
    spine: { name: "Spine Launcher", kind: "weapon", slot: "gun", mount: "gun", maker: "home", family: "kinetic", space: 2, power: -1, cost: 60, damage: 8, every: 0.25, speed: 420, range: 380 },
    needle: { name: "Needle Turret", kind: "weapon", slot: "turret", mount: "turret", maker: "home", family: "kinetic", space: 3, power: -2, cost: 110, damage: 6, every: 0.35, speed: 420, range: 300 },
    lance: { name: "Light Lance", kind: "weapon", slot: "gun", mount: "gun", maker: "ally", family: "beam", space: 3, power: -3, cost: 90, damage: 5, every: 0.1, speed: 900, range: 250 },
    lanceturret: { name: "Lance Turret", kind: "weapon", slot: "turret", mount: "turret", maker: "ally", family: "beam", space: 3, power: -4, cost: 140, damage: 4, every: 0.12, speed: 900, range: 230 },
    spore: { name: "Spore Bloom", kind: "weapon", slot: "gun", mount: "gun", maker: "ally", family: "spore", space: 3, power: -2, cost: 80, damage: 42, every: 1.2, speed: 230, range: 430 },
    seeker: { name: "Seeker Spore", kind: "weapon", slot: "gun", mount: "missile", maker: "ally", family: "spore", space: 3, power: -1, cost: 120, damage: 30, every: 1.6, speed: 210, range: 520, homing: 2.6 },
    plating: { name: "Shell Plating", kind: "defence", slot: "defence", maker: "home", family: "plating", space: 2, power: 0, cost: 50, hull: 70 },
    membrane: { name: "Tide Membrane", kind: "defence", slot: "defence", maker: "ally", family: "membrane", space: 2, power: -2, cost: 70, shield: 50, regen: 5 },
    fin: { name: "Fin Drive", kind: "engine", slot: "engine", maker: "home", space: 2, power: -1, cost: 50, thrust: 150, turn: 2.4 },
    burn: { name: "Burn Drive", kind: "engine", slot: "engine", maker: "ally", space: 3, power: -2, cost: 70, thrust: 280, turn: 1.1 },
    gland: { name: "Sun Gland", kind: "power", slot: "power", maker: "home", space: 2, power: 5, cost: 40 },
  },
  specialtyBonus: 0.25, // a maker's strongest temperament: +25 % on its shields, weapons or engines
  // Allied ships you recruit at their species' world: they fly and fight on their own, and are lost for good.
  escorts: {
    spineling: { name: "Spineling", maker: "home", hull: "seedpod", parts: ["spine", "fin", "gland"], cost: 160, blurb: "a Hearth fighter: spines, forward" },
    skiff: { name: "Skiff", maker: "ally", hull: "skiff", parts: ["lance", "burn", "gland"], cost: 200, blurb: "fast, a Light Lance, thin-skinned" },
    warden: { name: "Warden", maker: "ally", hull: "warden", parts: ["lanceturret", "membrane", "membrane", "burn", "gland", "gland"], cost: 340, blurb: "shielded, a Lance Turret, slow" },
  },
  fleet: { max: 3, patrolPerEscort: 1 }, // T0|▼| sends one more Shard for every escort you bring
  t0: {
    // burst: shots before it pauses; pause / chase / rest: the gulper rhythm (strike, pause, give up a long chase)
    shard: { name: "Shard", hull: 40, radius: 9, accel: 150, turn: 2.2, damage: 6, every: 0.55, shotSpeed: 300, range: 250, burst: 3, pause: 1.6, chase: 9, rest: 3, salvage: 45 },
    lattice: { name: "Lattice", hull: 170, radius: 14, accel: 70, turn: 0.9, damage: 15, every: 0.9, shotSpeed: 260, range: 330, burst: 4, pause: 2.2, chase: 14, rest: 4, salvage: 130 },
    // the boss (BAMF69 2026-11-10): slow, heavy, and it launches Shards (spawnEvery seconds, while fewer than spawnMax fly)
    mothership: { name: "Mothership", hull: 900, radius: 34, accel: 34, turn: 0.55, damage: 22, every: 0.45, shotSpeed: 280, range: 400, burst: 6, pause: 2.6, chase: 30, rest: 3, salvage: 700 },
  },
  boss: { streak: 3, escort: 2, spawnEvery: 9, spawnMax: 4 }, // win this many waves in a row at the Lattice to summon it
  wave: { secs: 12 }, // a hostile system sends its next patrol this long after the last one fell (BAMF69 2026-11-10)
  jump: { secs: 1.5 }, // the wormhole: half going in, half coming out
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
  jumpIn: 300, // how far from a system's centre you arrive
  landRange: 70, // how close to a planet E lands
} as const;
