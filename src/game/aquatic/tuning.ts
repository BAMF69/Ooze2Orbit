// ---------------------------------------------------------------------------
// tuning.ts (aquatic)
// Purpose : Every feel number for the aquatic stage Toy (docs/stages/02-aquatic.md), in one place: the lake and its
//           depth, the behind-view camera, your creature (stats, forms, parts, movement, abilities), the lake's
//           creatures, the behind-you warning, the lens (god mode) and the population that evolves under the
//           water temperature.
// Usage   : import { AQ, KINDS } from "./tuning"; AQ.camera.focal; KINDS.spinefish.hp
// Notes   : PROTOTYPE numbers (Toy tier v2, playtest 2026-11-08 "feels empty... more complex and dangerous"): first
//           guesses, tuned by playing. Distances are world px; z is height above the seabed.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

/**
 * The five stats. Plant points buy defense and mobility; meat points buy attack and speed (as in the cell stage);
 * health takes either, or a mix (BAMF69 2026-11-08): whichever pool is bigger pays first.
 */
export const AQ_STATS = ["attack", "speed", "defense", "mobility", "health"] as const;
export type AqStat = (typeof AQ_STATS)[number];
export type PaidWith = "algae" | "meat" | "either";
export const AQ_PAID_WITH: Readonly<Record<AqStat, PaidWith>> = {
  attack: "meat", speed: "meat", defense: "algae", mobility: "algae", health: "either",
};

/**
 * The aquatic stage's own parts (BAMF69 2026-11-08: all new; cell parts do not carry over as parts). The last two are
 * the river parts: found only in the river runs, one per river.
 */
export const AQ_PARTS = ["fins", "jaws", "plates", "gills", "endurance", "torrent"] as const;
export type AqPart = (typeof AQ_PARTS)[number];
/** The river parts have their own slots, on top of the normal ones (BAMF69 2026-11-08). */
export const UNIQUE_PARTS: readonly AqPart[] = ["endurance", "torrent"];

/** The lake's creatures. */
export const AQ_KINDS = ["darter", "finray", "spinefish", "shellback", "deepmaw"] as const;
export type AqKind = (typeof AQ_KINDS)[number];

export interface KindTuning {
  atlas: "aprey" | "afin" | "aspine" | "ashell" | "adeep";
  count: number; // how many the lake keeps
  hp: number;
  size: number; // world px tall
  speed: number;
  zMin: number; // the depth band it lives in (height above the seabed)
  zMax: number;
  bite: number; // damage it does when it bites you (0 = never)
  aggro: number; // it chases you inside this range (0 = never; the deepmaw uses its own mind instead)
  provoked: boolean; // bites back after you ram it
  flee: number; // it flees you inside this range (0 = never)
  meat: number; // meat chunks it drops when it dies
  chunk: "meat" | "meatM" | "meatL"; // how big those chunks are (worth AQ.food[chunk])
  part: AqPart | null; // the part it drops
  respawnS: number;
}

export const KINDS: Readonly<Record<AqKind, KindTuning>> = {
  darter: { atlas: "aprey", count: 30, hp: 4, size: 16, speed: 80, zMin: 30, zMax: 150, bite: 0, aggro: 0, provoked: false, flee: 170, meat: 1, part: null, chunk: "meat", respawnS: 5 },
  finray: { atlas: "afin", count: 10, hp: 10, size: 26, speed: 95, zMin: 150, zMax: 195, bite: 0, aggro: 0, provoked: false, flee: 220, meat: 2, part: "fins", chunk: "meatM", respawnS: 10 },
  spinefish: { atlas: "aspine", count: 12, hp: 14, size: 24, speed: 105, zMin: 40, zMax: 160, bite: 8, aggro: 260, provoked: true, flee: 0, meat: 3, part: "jaws", chunk: "meatM", respawnS: 9 },
  shellback: { atlas: "ashell", count: 9, hp: 30, size: 30, speed: 28, zMin: 6, zMax: 20, bite: 7, aggro: 0, provoked: true, flee: 0, meat: 4, part: "plates", chunk: "meatL", respawnS: 14 },
  deepmaw: { atlas: "adeep", count: 4, hp: 140, size: 90, speed: 135, zMin: 20, zMax: 180, bite: 24, aggro: 0, provoked: true, flee: 0, meat: 8, part: "gills", chunk: "meatL", respawnS: 30 },
};

export const AQ = {
  // ---- the lake (pillar 3: about four times the pond's area, and now deep: seabed to surface) ----
  world: { width: 1800, height: 1800 }, // 3.5x the pond's area (was 2400: "feels empty")
  water: {
    surface: 200, // height of the surface above the seabed
    floorZ: 6, // you cannot sink below this
    riseAccel: 260, // px/s^2 at full rise or sink
    vDrag: 2.4, // vertical water drag
    gravity: 520, // above the surface (a breach)
    breachBand: 18, // within this far of the surface, jump breaches
    breachSpeed: 300, // up speed of a breach
    kick: 140, // an underwater jump: a short upward kick
    kickCdS: 0.8,
  },

  // ---- the behind-view camera (pseudo-3D, BAMF69 2026-11-08) ----
  camera: {
    back: 70, // px behind the avatar
    eye: 55, // the camera rides this far above the avatar
    focal: 230, // projection scale: bigger = narrower view, things look bigger
    horizon: 0.3, // horizon line as a fraction of the screen height
    near: 18, // nothing closer than this is drawn (it would fill the screen)
    far: 900, // draw distance; fog hides the edge
    fogStart: 350, // things start fading into the water here...
    avatarY: 0.8, // where the avatar sits on screen (fraction of the height)
  },

  // ---- your creature: stats (max = the cell stage's max x 2, BAMF69 2026-11-08), forms, parts ----
  stats: {
    cellMaxLevel: 5, // the cell stage's max (its upgradeCost has 5 levels)
    stageMult: 2, // "the stats max doubles each phase": 5 -> 10
    // levels 1..10 (6+ are new here); cut about 45 % (BAMF69 2026-11-08 "upgrades are too expensive"; was 5, 9, ... 77)
    // nudged back up 2026-11-08 ("slightly too cheap"): about 30 % of the way back to the first prices
    upgradeCost: [4, 6, 10, 14, 19, 24, 30, 37, 45, 53] as readonly number[],
    hpBase: 30, hpPerLevel: 6, hpPerForm: 10, // health stat: hit points
    defensePerLevel: 0.05, // damage taken x (1 - this * level): level 10 halves it
    ramBase: 6, attackPerLevel: 2, ramPerForm: 3, // your ram's damage (was 4: 60 s of autoplay ramming killed nothing)
    dashRamMult: 1.5, // a ram while dashing hits this much harder: the dash is your attack
    speedPerLevel: 0.1, // top speed x (1 + this * level): level 10 doubles it
    rammingSpeed: 50, // px/s toward a creature for a bump to count as your ram (else it bites you)
  },
  forms: {
    // form 4 (2026-11-09 BAMF69 "add form 4 ... when unlocked, the player can evolve to the next stage"): the last;
    // it grows you and unlocks the evolve. It adds no part slot (three normal parts, as before).
    foodToEvolve: [70, 120, 180] as readonly number[], // food for form 2, 3, 4
    size: [26, 34, 44, 54] as readonly number[], // your world px tall per form (its length is the number of forms)
    heaviness: [2.0, 2.5, 3.0, 3.4] as readonly number[], // momentum per form with no mobility (cell stage rule)
    slots: [1, 2, 3, 3] as readonly number[], // part slots per form
  },
  parts: {
    finsMobility: 3, // fins count as this many mobility levels
    jawsDamage: 6, // jaws add this to your ram
    platesMult: 0.75, // plates: damage taken x this
    gillsDashMult: 0.5, // gills: dash cooldown x this, and you heal
    gillsRegen: 1.5, // hp per second with gills
    duplicateFood: 6, // a part you already have becomes food
    enduranceStaminaMult: 2, // endurance muscle (river 1 only; replaced the lateral line 2026-11-08): double stamina
    torrentDashCdMult: 0.6, // torrent tail (river 2 only): dash cooldown x this...
    torrentDashSpeedMult: 1.3, // ...and dash speed x this
  },
  food: { algae: 1, plankton: 1, meat: 2, darterWhole: 3, heal: 1, meatM: 4, meatL: 7, pod: 4 }, // heal: hp every food pickup gives back (BAMF69 2026-11-08)
  // ---- bigger rewards (BAMF69 2026-11-08: "progression is too slow") ----
  bloom: { hp: 16, pods: 6, size: 70, hitCdS: 0.35 }, // a great kelp bloom: ram it open, it spills big plant pods

  // ---- movement: the cell stage's momentum (heaviness), steered by turning ----
  move: {
    accel: 520, drag: 2.2, // the snappiest handling (heaviness 1); heaviness divides both
    maxSpeed: 170,
    turnRate: 2.4, turnPerMobility: 0.06, // rad/s, x (1 + this * mobility)
    spoolS: 0.7, spoolMin: 0.25, // thrust build-up (mobility shortens it; full mobility = instant)
    dashSpeed: 420, dashS: 0.35, dashCdS: 2.5, // the dash: a burst of top speed, then a cooldown
  },

  // ---- food in the water ----
  algaeCount: 110, // on the seabed
  planktonCount: 70, // near the surface: more food up there, and finrays, and the breach
  regrowS: 1.5,
  eatRadius: 28,
  meatLifeS: 14, // dropped meat sinks slowly and is gone after this long

  // ---- the deepmaw's mind: the gulper's (src/game/cell/predator.ts), at lake scale ----
  deepmaw: {
    restSpeedMult: 0.4,
    biteCooldownS: 1.2,
    knockback: 220,
    brain: {
      sight: 520, loseSight: 680, thinkS: 0.5, playerWeight: 0.7, preyWeight: 1, stickiness: 0.6,
      huntPlayerMaxS: 7, tiredS: 3, satedS: 6,
    },
  },
  biteCooldownS: 1.0, // the small biters

  // ---- fish fight fish (BAMF69 2026-11-08: "not seeing any parts from fights between other fish") ----
  schools: {
    count: 5, // the darters swim in this many schools
    everyS: [14, 30] as readonly number[], // a calm school picks a fight every this many seconds (random in range)
    range: 320, // ...with the nearest bigger fish (finray, spinefish, shellback) this close
    swarmS: 9, // and swarms it this long
    bite: 1.5, // each darter's nip
    youChance: 0.5, // with you in range, the chance a school picks you over the nearest fish
    breakOffAt: 0.25, // a school swarming you breaks off when your health falls below this share (a chance to recover)
    breakOffRestS: 25, // and leaves you alone this long
    spread: 70, // a darter drifts back toward its school's centre when farther than this
    biteCdS: 0.6,
  },
  deepmawVsFish: 1, // a deepmaw's bite on another fish x this (its bite on you is KINDS.deepmaw.bite)
  knockback: 180,

  // ---- the behind-you warning (pillar 1: every danger readable, even off screen) ----
  warn: {
    range: 420, // a hunter this close and outside the view lights the edge it comes from
    viewHalfAngle: 0.55, // rad: roughly what the camera shows to each side of straight ahead
    viewHalfPitch: 0.6, // rad: and above and below
    soundEveryS: 1.6, // the warning sound repeats at most this often while a threat is out of view
  },

  // ---- stamina (BAMF69 2026-11-08): not upgradeable in this stage; Shift toggles cruise and full speed ----
  stamina: {
    max: 100,
    fastDrain: 9, // per second at full speed: about 11 s of sprinting (halved 2026-11-08, was 18)
    cruiseRegen: 10, // per second while cruising (doubled 2026-11-08, was 5)
    minFast: 10, // below this you cannot switch to full speed, the bar turns red and you are "out of breath"; at 0 you drop to cruise
    stillRegen: 30, // per second while you hold still (no thrust)
    abilityCost: 50, // dash and breach each need and use this much stamina, even with the endurance muscle (2026-11-08)
    abilityShare: 0.5, // where the gauge marks it: abilityCost / the base max
    cruiseMult: 0.55, // cruise speed = full speed x this
  },

  // ---- dying (stakes rise each stage, pillar 1): a relative carries on ----
  death: { keepFoodShare: 0.5, losePart: true, blackS: 1.6, fadeS: 0.9 }, // blackS/fadeS: the screen goes black with the words, then fades in (2026-11-09)
  save: { everyS: 20 }, // autosave the run this often too (aquatic/runSave.ts, 2026-11-09)
  riverPartReach: 3, // the river's gold part: pickup reach x its size (2026-11-09: "make the pickup hitbox bigger")
  music: { calmLevel: 0.32, huntLevel: 1.0 }, // loop levels (x master x music): the hunt is louder than the calm (2026-11-09) // half your food toward the next form is kept (2026-11-08: all was too harsh)

  // ---- what the Gardener's lever does (2026-11-08: "why should the player care?"; aquatic/gardener.ts) ----
  gardener: {
    // your inherited body: at full thickness (1) / full slenderness (0); medium (0.5) is x1
    body: { hpThick: 0.4, hpSlim: 0.15, biteThick: 0.2, speedThick: 0.2, speedSlim: 0.2, turnSlim: 0.15 },
    // the water now: at the warmest (26 C) / coldest (2 C); mild (14 C) is x1
    water: {
      foodWarm: 0.8, foodCold: 0.5, // plant regrowth and how many plants the lake holds
      hunterSpeedWarm: 0.2, hunterSpeedCold: 0.25, hunterSightWarm: 0.25, hunterSightCold: 0.2,
      preySpeedCold: 0.25, staminaCold: 0.3,
    },
  },

  // ---- the lens (god mode) and the population (Toy 3: one lever, one trait) ----
  lens: { tempMin: 2, tempMax: 26, tempStart: 14, tempStep: 2 },
  population: {
    size: 12, // your kin swimming in the lake
    generationS: 60, // a generation passes on its own this often (Enter in the lens: at once)
    neutralTemp: 14, // at this temperature no thickness is favoured
    selection: 0.12, // how strongly the temperature favours thick (cold) or thin (warm) bodies, per degree
    mutation: 0.06, // spread of a child's thickness around its parent's
    startThickness: 0.5, // 0 = slender, 1 = thick
    kinSpeed: 60,
  },
  size: { kin: 26, algae: 20, plankton: 14, rock: 34, weed: 42, meat: 12, meatM: 18, meatL: 26, pod: 18, bloom: 70, orb: 16, log: 30, boulder: 54 },

  // ---- the seabed does things (BAMF69 2026-11-08) ----
  seabed: {
    rockBounce: 160, // px/s a rock pushes you off (no damage)
    rockHeight: 30, // a rock blocks you below this height
    weedHeight: 44, // seaweed tangles you below this height...
    weedSlow: 0.5, weedSlowS: 1.5, // ...at this share of your speed, for this long
    radius: 18, // how close counts as touching (plus your size)
  },

  // ---- the shark look (BAMF69 2026-11-08: "the more aggressive your creature gets the more shark-like it becomes") ----
  shark: {
    fromLineage: 0.5, // the cell stage's aggressive temperament counts this much...
    fromAttack: 0.35, // ...the attack level (out of 10) this much...
    fromKills: 0.15, killsForFull: 20, // ...and the creatures you kill this much
    tiers: [0.2, 0.45, 0.7] as readonly number[], // aggression where looks 1, 2, 3 begin (0 = none)
  },

  // ---- leaving a map: breach at the river mouth once you are big enough ----
  mouth: { radius: 140, ripple: 0.9 },
} as const;

/** The aquatic stage's three maps (BAMF69 2026-11-08): one per form, each bigger, deeper and deadlier. */
export interface MapSpec {
  id: "pond" | "lake" | "ocean";
  width: number;
  surface: number; // depth: height of the surface above the seabed
  exitForm: number | null; // reaching this form opens the river mouth (null: the last map)
  counts: Readonly<Record<AqKind, number>>;
  mult: { hp: number; bite: number; size: number }; // the lake's creatures are tougher than the pond's
  algae: number;
  plankton: number;
  rocks: number;
  weeds: number;
  blooms: number; // great kelp blooms: big plant rewards
  sharks: readonly SharkPlacement[]; // the apex hunters (2026-11-08): none in the pond
  palette: { top: number; fog: number; floor: number; speck: number; ripple: number };
}

export const MAPS: readonly MapSpec[] = [
  { id: "pond", width: 1800, surface: 200, exitForm: 2,
    counts: { darter: 30, finray: 10, spinefish: 12, shellback: 9, deepmaw: 3 }, mult: { hp: 1, bite: 1, size: 1 },
    algae: 110, plankton: 70, rocks: 30, weeds: 50, blooms: 8, sharks: [], // fewer rocks and weeds in the pond (2026-11-08)
    palette: { top: 0x0c2a32, fog: 0x10262f, floor: 0x24505c, speck: 0x3a6a72, ripple: 0x8ac8c8 } },
  { id: "lake", width: 2400, surface: 320, exitForm: 3,
    counts: { darter: 40, finray: 12, spinefish: 18, shellback: 10, deepmaw: 6 }, mult: { hp: 1.6, bite: 1.5, size: 1.15 },
    algae: 150, plankton: 90, rocks: 90, weeds: 110, blooms: 10,
    // one medium shark: on sight it hunts you until you breach or get far away; below half health, relentlessly
    sharks: [{ kind: "medium", count: 1, relentlessLow: true, mercyLow: false }],
    palette: { top: 0x061a28, fog: 0x0a1e2c, floor: 0x1c3a4c, speck: 0x2e5468, ripple: 0x7ab0c8 } },
  { id: "ocean", width: 3000, surface: 420, exitForm: null,
    counts: { darter: 60, finray: 16, spinefish: 24, shellback: 12, deepmaw: 9 }, mult: { hp: 2.4, bite: 2.2, size: 1.35 },
    algae: 170, plankton: 120, rocks: 100, weeds: 90, blooms: 12,
    // several medium sharks that leave you alone below half health unless you get close, and one large shark
    // with the lake shark's rules: slower, but its bite is crushing
    sharks: [{ kind: "medium", count: 3, relentlessLow: false, mercyLow: true }, { kind: "large", count: 1, relentlessLow: true, mercyLow: false }],
    palette: { top: 0x04122a, fog: 0x081a36, floor: 0x5a6a5a, speck: 0x8a8a6a, ripple: 0x8ab8e0 } },
];

/** The sharks (BAMF69 2026-11-08): the lake's and the coast's apex hunters. Not scaled by the map (their own numbers). */
export interface SharkSpec {
  size: number;
  speed: number; // the medium shark is faster than you at base (170): breach, dash or put distance between you
  bite: number;
  hp: number;
  sight: number; // it notices you this close
  loseDist: number; // a hunt ends when you get this far away (unless it is relentless)
  closeDist: number; // "too close": a merciful shark still hunts you this close
  meat: number; // large meat chunks if you ever kill one
  tint: number;
}

export const SHARKS: Readonly<Record<"medium" | "large", SharkSpec>> = {
  medium: { size: 150, speed: 190, bite: 40, // more than the lake's deepmaw (24 x 1.5 = 36)
    hp: 420, sight: 520, loseDist: 900, closeDist: 200, meat: 10, tint: 0xffffff },
  large: { size: 240, speed: 120, bite: 110, // the coast's deepmaw bites 53
    hp: 1400, sight: 620, loseDist: 1000, closeDist: 240, meat: 20, tint: 0xffffff }, // a hammerhead now: its own sprite (2026-11-08)
};

export interface SharkPlacement {
  kind: "medium" | "large";
  count: number;
  relentlessLow: boolean; // below half health, it hunts you anywhere and never gives up
  mercyLow: boolean; // below half health, it leaves you alone unless you get too close
}

export const SHARK_MIND = {
  breachRestS: 6, // you breached: it loses you and cruises off for this long
  biteRestS: 3, // after a bite it peels off (pillar 1: no chain bites)
  biteCooldownS: 1.5,
};

/** The river runs between the maps: a fast, narrow minigame with a part found nowhere else. */
export interface RiverSpec {
  length: number; // px to the end
  width: number;
  depth: number;
  current: number; // px/s it carries you
  boost: number; // + this while you swim forward (W)
  slow: number; // - this while you hold back (S)
  strafe: number; // px/s sideways at full turn
  rowEvery: number; // a row of obstacles this often
  gap: number; // the free passage in a wall row is at least this wide
  hit: number; // damage from hitting a rock or log
  part: "endurance" | "torrent";
  food: number;
}

export const RIVERS: readonly RiverSpec[] = [
  // twice as long as first built (BAMF69 2026-11-08: 3600 and 4600); hits hurt twice as much (was 6 and 9)
  { length: 7200, width: 300, depth: 110, current: 280, boost: 120, slow: 110, strafe: 210, rowEvery: 260, gap: 90, hit: 12, part: "endurance", food: 72 },
  { length: 9200, width: 260, depth: 110, current: 340, boost: 130, slow: 120, strafe: 220, rowEvery: 230, gap: 80, hit: 18, part: "torrent", food: 88 },
];
