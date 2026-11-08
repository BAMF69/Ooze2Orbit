// ---------------------------------------------------------------------------
// tuning.ts
// Purpose : Every number that sets how the cell stage feels, in one place. Tweak here, never in the logic.
// Usage   : import { TUNING, PART_KINDS, CELL_KINDS } from "./tuning"
// Notes   : PROTOTYPE (toy tier). Speeds in px/s, distances in world px, times in seconds.
//           Kind names must match the sprite rows in assets_src/sprites/pond_cells.py and pond_props.py.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

export const PART_KINDS = ["spikes", "shell", "mouth"] as const;
export type PartKind = (typeof PART_KINDS)[number];

export const CELL_KINDS = ["prickle", "snail", "sipper", "gulper"] as const; // gulper: the predator (pond_predators.py)
export type CellKind = (typeof CELL_KINDS)[number];

export const DIETS = ["herbivore", "carnivore", "omnivore"] as const;
export type Diet = (typeof DIETS)[number];

export const FOOD_KINDS = ["algae", "meat"] as const;
export type FoodKind = (typeof FOOD_KINDS)[number];

/** Upgrades in panel order. Algae (plant points) buys defense and mobility; meat (meat points) buys attack and speed. */
export const UPGRADE_STATS = ["attack", "speed", "defense", "mobility"] as const;
export type UpgradeStat = (typeof UPGRADE_STATS)[number];
export const UPGRADE_PAID_WITH: Readonly<Record<UpgradeStat, FoodKind>> = {
  attack: "meat", speed: "meat", defense: "algae", mobility: "algae",
};

/** Which part each pond cell drops when beaten (it wears that part, so the player can see what they will get). */
export const DROPS: Readonly<Record<CellKind, PartKind | null>> = { prickle: "spikes", snail: "shell", sipper: "mouth", gulper: null };

export const TUNING = {
  // ---- the world ----
  world: { width: 1280, height: 720 },
  algaeCount: 28, // the pond keeps this many algae, regrowing eaten ones
  algaeRegrowS: 2.5, // seconds between regrowths while below the count

  // ---- the player ----
  player: {
    accel: 520, // px/s^2 while steering
    maxSpeed: 150,
    drag: 2.2, // velocity *= exp(-drag * dt): the water slows you gently
    formScale: [1.6, 2.0, 2.4] as readonly number[], // sprite scale per form (form 1, 2, 3)
    radiusPerScale: 10.5, // collision radius = scale * this (matches the drawn body at every form)
    eatRadiusBonus: 4,
  },

  // ---- diets (playtest 2026-11-07: herbivore / carnivore / omnivore) ----
  // What each diet gets from each food, as a multiplier. 0 = cannot eat it (it floats past).
  dietMult: {
    herbivore: { algae: 1, meat: 0 },
    carnivore: { algae: 0, meat: 1 },
    omnivore: { algae: 0.5, meat: 0.5 },
  } as Readonly<Record<Diet, Readonly<Record<FoodKind, number>>>>,
  meatFood: 2, // one meat chunk, before the diet multiplier (rarer than algae, so worth more)
  meatChunksOnPop: 3,
  meatLifeS: 15, // meat from a popped cell lasts this long before it sinks
  cantEatToastS: 4, // "can't eat that" reminder at most this often

  // ---- upgrades: points come from fresh food (algae -> plant points, meat -> meat points), 1 point per food ----
  // Cost of level 1..5 (its length is the max level). Points ~= food eaten, and the stage takes 130 food, so
  // maxing both of your diet's stats (2 x 75) should take about the whole stage. Was [3, 5, 8, 12, 16]: autoplay
  // maxed both in 90 s with 104 points to spare.
  upgradeCost: [5, 9, 14, 20, 27] as readonly number[],
  upgradeTierAt: [1, 3, 5] as readonly number[], // levels where the upgrade's look on the cell grows (tier 1, 2, 3)
  // Playtest 2026-11-07 "upgrades don't feel like they do anything": speed and mobility made dramatic.
  // Drag used to cap top speed at accel / drag (about 236 px/s), so speed levels past 3 did nothing.
  speedPerLevel: 0.2, // top speed x (1 + this * level): level 5 = double (was 0.1)
  speedDragPerLevel: 0.08, // drag x (1 - this * level): a streamlined body glides further (lets top speed be reached)
  attackPerLevel: 1, // bump damage + this * level
  defensePerLevel: 0.12, // food lost per bump x (1 - this * level)
  mobilityAccelPerLevel: 0.35, // acceleration x (1 + this * level): level 5 = 2.75x, near-instant turns (was 0.15)
  mobilityDragPerLevel: 0.2, // drag x (1 + this * level): you also stop on a dime instead of drifting
  mobilityKnockPerLevel: 0.15, // knockback you take x (1 - this * level) (was 0.1)

  // ---- growth and evolution ----
  algaeFood: 1,
  mouthFoodMult: 2, // the filter mouth doubles what algae gives
  mouthPullRadius: 70, // and pulls nearby food toward you
  mouthPullSpeed: 120,
  // Playtest 2026-11-07 "slower progression": was [12, 20] (both evolutions in about 90 s of autoplay)
  evolveFood: [40, 90] as readonly number[], // food to evolve from form 1, from form 2 (form 3 is the last)
  maxForm: 3,
  partFoodOnDuplicate: 3, // a part you already have becomes this much food instead

  // ---- bumps (the fight) ----
  bumpDamageBase: 1, // per bump, plus (form - 1)
  spikeDamageBonus: 2,
  // Smoke 2026-11-07: an idle player popped gulpers, because every bump hurt the cell, even when it bit you.
  // Now only ramming (swimming into it at least this fast) deals full damage; being rammed, only spikes hurt it.
  rammingSpeed: 40, // px/s of your velocity toward the cell
  bumpFoodLoss: 6, // food a pond cell knocks out of you per bump (was 3; playtest 2026-11-07 "too cozy")
  shellLossMult: 0.34, // the shell keeps most of your food in
  bumpCooldownS: 0.6, // one bump per pair per this long
  bumpKnockback: 200, // px/s pushed apart
  droppedFoodSpread: 40, // knocked-out food floats this far away (you can grab it back)
  droppedFoodLifeS: 4, // was 12: lost food has to be won back fast or it is gone

  // ---- pond cells ----
  cell: {
    wanderTurnS: 2.0, // pick a new drift direction about this often
    swimAccel: 300,
    swimDrag: 1.5,
    huntWarnS: 8, // "something is hunting you" at most this often
    /** One row per organism. alive = base + perForm * player form (more predators as you grow).
     *  chase: they swim at you inside this distance (0 = never). bumpMult: x bumpFoodLoss per bump.
     *  Playtest 2026-11-07 "bigger and more dangerous enemies": the gulper, a predator that hunts you. */
    kinds: {
      prickle: { atlas: "pond", hp: 4, speed: 85, scale: 1.7, radius: 13, chase: 240, bumpMult: 1.5, knockMult: 1, meat: 3, base: 3, perForm: 0, respawnS: 6, spawnAway: 220 },
      snail: { atlas: "pond", hp: 6, speed: 30, scale: 1.7, radius: 13, chase: 0, bumpMult: 1, knockMult: 1, meat: 3, base: 3, perForm: 0, respawnS: 6, spawnAway: 220 },
      sipper: { atlas: "pond", hp: 3, speed: 45, scale: 1.7, radius: 13, chase: 0, bumpMult: 1, knockMult: 1, meat: 3, base: 3, perForm: 0, respawnS: 6, spawnAway: 220 },
      // about 100 px wide; slower than you (150) but not by much; one bite takes 21 food (7 with a shell).
      // hp 24 -> 40 and meat 10 -> 5 after autoplay: two gulper kills sped a carnivore to form 3 in 60 s
      gulper: { atlas: "pred", hp: 40, speed: 105, scale: 1.6, radius: 30, chase: 0, /* its mind: TUNING.gulper */ bumpMult: 3.5, knockMult: 1.8, meat: 5, base: 0, perForm: 1, respawnS: 25, spawnAway: 450 },
    } as Readonly<Record<CellKind, Readonly<{
      atlas: "pond" | "pred"; hp: number; speed: number; scale: number; radius: number; chase: number; bumpMult: number;
      knockMult: number; meat: number; base: number; perForm: number; respawnS: number; spawnAway: number;
    }>>>,
  },

  // ---- the gulper's mind (src/game/cell/predator.ts; playtest 2026-11-07: "get distracted by other creatures") ----
  gulper: {
    sight: 340, // px: it notices creatures this close (was its only behavior: chase you inside 340)
    loseSight: 420, // px: it gives up a target that gets this far away
    thinkS: 0.5, // seconds between decisions (not every frame)
    playerWeight: 1, // scores are distance x weight; lower = more tempting
    preyWeight: 0.75, // small cells are tempting: at equal distance it goes for them
    stickiness: 0.6, // switch only if the new target scores under 60 % of the current one
    huntPlayerMaxS: 6, // it tires after chasing you this long...
    tiredS: 3, // ...and drifts slowly for this long
    satedS: 6, // after swallowing a small cell it ignores everything this long (your escape window)
    restSpeedMult: 0.4, // swim speed while sated or tired
    scrapsOnGulp: 1, // meat left floating when it swallows a small cell (carnivores can scavenge)
  },

  // ---- the look (GDD "lit and moody, under a microscope", mockup D) ----
  mood: {
    water: 0x173540, // pond base (was 0x2b6f8a, the bright cartoon teal)
    waterLight: 0x1f4450, // lighter patches
    waterDark: 0x10262f, // darker patches
    edge: 0x0a1a20,
    vignetteInner: 0.32, // the falloff starts this far out (fraction of the short screen side)
    vignetteAlpha: 0.82, // how dark the corners get
    tiltLight: 0.1, // warm light wash from the top-left
    tiltShade: 0.28, // extra shade toward the bottom-right
    lampRadius: 150, // px: the soft light pool around the player
    lampAlpha: 0.13,
  },

  // ---- feedback ----
  shakeOnBump: 3, // px, scaled by the player's shake setting
  evolveFlashS: 0.5,
} as const;
