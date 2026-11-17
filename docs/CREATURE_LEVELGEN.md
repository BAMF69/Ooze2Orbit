# Creature level generation: diagnosis, schema and invariants

> Owner: the levelgen chat. Branch `feat/creature-levelgen`, based on `origin/feat/creature-remaster` at `5a2f3a9`.
> Written 2026-11-16 after the design discussion with BAMF69. Status (2026-11-17): **migration steps 0 to 3 built**;
> see §10 for what is implemented, how it is tested and what is not yet done.
> Read with `CREATURE_WATER_SLICE.md` (what is built), `CREATURE_HANDOFF.md` (validation so far) and
> `HANDOFF_CONTRACT.md` (what the lineage file promises).

## 1. Diagnosis: what the generator does today, and who actually decides gameplay

`generateWater(seed)` in `creature/waterWorld.ts` builds eleven rooms with fixed IDs, fixed tiers, fixed counts
(3 Easy + nursery, 3 Medium, 4 Hard) and a fixed left/right chain. Per seed it varies only: platform x (three
variants), sluice x (five lattice slots), four food x offsets, foe x offsets, cover x and a scenery variant.
`worldProblems()` validates that skeleton plus a flat corridor walk at floor height with the standing body.

Everything that made the Water slice feel like a game since 2026-11-15 is keyed on **room ID**, outside the
generator, and is therefore identical for every seed. The table below is the complete list of consumers that must
move onto one generated model. Line references are to the branch above.

| Module | Hardcoded by room ID | What it decides |
|---|---|---|
| `waterObjectives.ts` `valves()` | 4, 8 drain pair; 5, 9 shaft pair; 6, 10 pressure pair; else one lever at platform 0 | Control positions, order and the puzzle type |
| `waterObjectives.ts` `leftExit`, `drainedRoom`, `emergencyRelease` | 5, 9; 4, 8; 6, 10 | Left onward hatch, drained collision, timer latch |
| `waterObjectives.ts` `objectiveBarrier` | tiles 3 and 35 | Seal walls and the right exit wall |
| `waterRoutes.ts` | 1↔3 top/bottom, 4↔5 bottom/top, 7 and 10 pits, returns into 5 and 9 | Every vertical connection, arrival position and facing |
| `waterChallenges.ts` `challengeSolid` | 1, 4, 5, 6, 8, 9, 10 | Extra collision: switchback walls, control ledges, nursery ledges, removal of the seed's perch |
| `waterCombatRooms.ts` | arenas 2, 7, 10; guarded control 0 in 4, 6, 8, 9, 10 | Which rooms seal, which controls need two still seconds |
| `waterEncounters.ts` `encounterKinds`, `spawnEncounters`, `hasVent`, `reedPatches` | 4..10 kinds table; dropper at x 368; vent in 6, 10 | Enemy kinds, counts and spawn positions, the vent, reed cover |
| `waterTraps.ts` `NET` | constant x 104 rigging, x 368 net | Trap placement in every room |
| `waterWorld.ts` `returnX`, `levelStart`, `roomSolid` tunnel span | 3; 0, 4, 7; tiles 11..30 | Nursery return, level entry rooms, Medium tunnel |
| `expedition.ts` `validExpedition` | `visited` ids < 11, `version === 1` | Save validation |
| `CreatureGenerationScene.ts` `enter()` | 1, 3, 4, 5, 6, 8, 10 | Landmark labels, hint messages, `verticalOpen` derived from room 4 |
| `CreatureGenerationScene.ts` update/interact | `x > 625` right exit, `x < 20` left, `x > 550` reward/goal, 126 branch arch, 128/236 hatch | Exit edges and interaction anchors |

Two consequences follow. First, `WaterRoom.foes`, `platforms` and `cover` are partly dead data: `foes` is never
used for spawning, and `challengeSolid` discards `platforms` in rooms 4, 6, 8 and 10. Second, the three validation
layers disagree about what a room is: `worldProblems` sees `roomSolid`, the controller bots see `challengeSolid`
with an objective, and the scene adds `objectiveBarrier`. A passing `worldProblems` therefore proves nothing about
the real level, which `CREATURE_HANDOFF.md` already says.

What is worth keeping unchanged: `physics.ts` and `waterPhysics.ts` (the controller is good and tested),
`waterEncounters.ts` enemy state machines, `waterCombatRooms.ts` operation and subdual rules, `waterTraps.ts` net
rules, `expedition.ts` inheritance semantics, and every scenario the existing tests pin. The migration below moves
their **inputs** from room IDs to a model and leaves their **rules** alone.

## 2. Design decisions agreed with BAMF69 (2026-11-16)

### 2.1 Stats
Five stats, cap **30** this stage (the GDD's 5/10/20 doubling rule changes to 5/10/30 because the aquatic ceiling
is really 17 with daughter bonuses; record in `GDD.md` when implemented). Seeded one to one at the creature reveal:

| Stat | Seed | Passive per point | Skill at 20 (lesser) | Skill at 30 (ultimate) |
|---|---|---|---|---|
| strength | aquatic attack | bite damage (unchanged) | Berserk: claw through enemies | also through `berserk` walls |
| vitality | aquatic health | +1 health per 3 points (was 1 per 1) | Armor up: ball form, damage immunity | also crash through `ball` barriers |
| agility | floor((speed + mobility) / 2) | run, jump, swim scale, at most +15 % at 30 | Phase dash: through enemies | also through `phase` obstacles |
| intellect | adaptable share × 10, once at the reveal | shorter guarded operation, wider tells, faster rearm | Pack: one companion | two companions with commands |
| armor | aquatic defense + cautious share × 5 | damage reduction, section 2.4 | no skill: grows only through parts and temperament | |

Growth stays selection-only: a chosen daughter gains 2 or 3 in one stat. Target stage length is 12 to 15
generations across four biomes × three difficulties.

### 2.2 Keys
Three families. The generator treats them differently.

- **Story keys** (critical path, binary, monotonic): `gills`, `fins`, `climb`, future biome parts, and the three
  **class skills**, one per temperament (BAMF69 2026-11-16): **Roar** (aggressive: scatters enemies, shatters
  brittle seals), **Burrow** (cautious: burrow or camouflage passes sight gates and narrow dens), **Tool use**
  (adaptable: bridges gaps with logs, jams mechanisms). The dominant share at the reveal grants its class skill as
  a permanent part. If a later generation's dominant share differs, that class skill is offered to a daughter too.
  Keys are never lost. Ties offer the choice. Story keys are outside the fun-part cap.
- **Fun parts** (optional, up to **3 expressed per daughter**, all banked parts kept forever and re-selectable at the
  nest). Found behind stat-gated bonus areas. Never required on any critical path. Each opens optional shortcuts or
  alternate solutions through the material table. **First Water pass (BAMF69 2026-11-16):** `part:fullArmor`
  (limited invincibility on activation, opens pressure and vent crossings without timing, adds armor) and
  `part:iceBreath` (freezes enemies in place for a bounded time, long enough to operate a guarded control; not a
  capture, so it does not clear a seal and the enemy resumes). Webslinging, gecko feet, wings and fire breath wait
  for later biomes.
- **Companions** (intellect skill, BAMF69 2026-11-16): at 20 the companion **distracts only**: draws attention and
  breaks line of sight for guarded controls, cannot wound. At 30 it **can wound but not clear**: it deals damage
  and can set up subdual, but a seal still needs the player to finish, subdue or trap every threat. Net-only and
  subdual bots remain the fairness proof; companions are never assumed by the validator.
- **Gardener terrain**: raise basin, divert torrent, future equivalents. Permanent, world-side, must themselves be
  reachable (no circular prerequisites).

### 2.3 Locks
- **Critical locks** key on story keys and Gardener terrain only. A class-locked critical gate is a **triad**: the
  generator instantiates the variant for a class the lineage has expressed, so no lineage is ever locked out.
- **Bonus locks** key on stat thresholds, enforced physically (a wall with hit points that only a bite of strength
  ≥ N chips, a passage whose guaranteed damage needs vitality ≥ N, a gap needing agility ≥ N, a mechanism needing
  intellect ≥ N). Tiers: **8 for Easy, 16 for Medium, 24 for Hard** bonus areas.
- **Shortcut walls** key on ultimates and fun parts. Sluices, sealed hatches, deep water and class doors are never
  on their material list, so berserk, ball form, phase dash and wings cannot bypass a story lock.

### 2.4 Damage and armor
Enemy base damage scales per **tier** 1..12, derived from a level's depth in the key graph, not a fixed biome list:
`damage = base × (1 + 0.11 × (tier − 1))`. Armor uses a diminishing-returns curve with an attacker-tier term:
`reduction = armor / (armor + 12 + 4 × tier)`, capped at 75 %. Health is tracked fractionally and displayed rounded.
Base health stays 6. The table BAMF69 accepted (hits to kill by a charger):

| Tier | vit 0 / armor 0 | vit 8 / armor 8 | vit 16 / armor 22 | vit 30 / armor 30 |
|---|---|---|---|---|
| 1 | 2 | 4 | 9 | 16 |
| 6 | 2 | 3 | 4 | 7 |
| 12 | 1 | 2 | 3 | 4 |

All constants live in one tuning table (`creature/levelgen/tuning.ts`, section 6).

## 3. Generation schema

Three layers, generated in order, each validated before the next. All engine-free, deterministic from
`(seed, generatorVersion)`, lattice-aligned (16 px tiles, 640×360 rooms), with bounded retries, explicit rejection
reasons and seed 0 as the authored fallback (SOP-17).

### 3.1 Key and material vocabulary
```ts
type Stat = "strength" | "vitality" | "agility" | "intellect" | "armor";
type StoryKey = "gills" | "fins" | "climb" | "class:aggressive" | "class:cautious" | "class:adaptable";
type TerrainKey = "gardener:raise" | "gardener:divert";
type StatKey = `stat:${Stat}>=${number}`;           // bonus locks
type SkillKey = `skill:${Stat}:20` | `skill:${Stat}:30`;
type PartKey = `part:${string}`;                     // fun parts
type Key = StoryKey | TerrainKey | StatKey | SkillKey | PartKey;

/** A material opens if ANY inner list is fully satisfied (disjunctive normal form). */
interface Material { id: string; opens: Key[][]; critical: boolean }
// Examples. critical materials may only list StoryKey | TerrainKey.
//   sluice:        opens [["gardener:raise"]]                         critical
//   torrent:       opens [["gardener:divert", "fins"]]                critical
//   deepTunnel:    opens [["gills"]]                                  critical
//   classDoor:     opens [["class:aggressive"],["class:cautious"],["class:adaptable"]]  critical (triad)
//   crackedWall8:  opens [["stat:strength>=8"], ["skill:strength:30"]]
//   ventCrossing:  opens [["timing"], ["part:fullArmor"]]            "timing" = solvable by play, no key
//   guardedPanel:  opens [["lure"], ["part:iceBreath"], ["skill:intellect:20"]]
```

### 3.2 Layer 1: the progression graph
```ts
interface LevelGraph {
  version: 2; seed: number; biome: "water"; tier: Difficulty; depthTier: number;   // 1..12
  nodes: RoomNode[]; edges: Edge[]; placements: Placement[];
}
interface RoomNode { id: string; role: RoomRole; depth: number; onCritical: boolean; template?: string }
type RoomRole = "entry" | "traversal" | "branch" | "guardedObjective" | "sluicePuzzle" | "drainPuzzle" | "shaftRelay"
  | "pressureCrossing" | "trapEncounter" | "ceilingThreat" | "sealedArena" | "recovery" | "classTrial" | "bonusVault" | "goal";
type Side = "left" | "right" | "top" | "bottom";
interface Edge {
  from: string; to: string; fromSide: Side; toSide: Side;
  material: string;                 // what blocks it until opened
  opensWhen?: ObjectiveCondition;   // life-local: "controls solved", "arena cleared", "pressure live"
  oneWay?: boolean;                 // a drop; the generator must then supply a return edge
  reciprocal: string;               // id of the return edge (invariant 5)
}
interface Placement { kind: "storyKey" | "funPart" | "seal" | "terrainControl"; key: Key | Difficulty; node: string; requires: Key[][] }
```
Construction, in order: critical path (entry → … → goal, with the tier's mandatory Gardener crossing and ordered
controls) → one guaranteed loop (a side room that rejoins the path later, Unexplored-style cyclic rule) → story-key
placement before the first gate that needs it → bonus branches with stat gates off non-critical nodes → class trial
variant selection → recovery and food cache nodes between difficulty spikes. Every edge carries explicit sides, so
arrivals are derived, never guessed.

### 3.3 Layer 2: rooms
A room is a **template instance**: a hand-authored template (SOP-17 "generate from a level you know is fun") with
typed exits and named anchors, filled from the graph.
```ts
interface RoomTemplate {
  id: string; roles: RoomRole[]; exits: Partial<Record<Side, { tiles: [number, number]; elevated?: boolean }>>;
  tiles: string[];                         // 40×13 chars, ASCII, lattice-exact; '#' solid, '~' water, '.' air
  anchors: Record<string, { x: number; y: number }>;  // control1, control2, net, rigging, cache, reward, seal, vent, pit, ledgeA..
  slots: { enemies: { kind: EnemyKind; at: string }[]; food: string[]; cover: string[] };
  requires: Key[][];                       // abilities the template's own traversal assumes (validated, not trusted)
  hint: string;                            // the entrance message, replaces the scene's per-ID strings
}
interface GeneratedRoom {
  id: string; node: string; template: string; variant: number;
  solid: (tx: number, ty: number, state: RoomState) => boolean;   // THE collision, shared by physics, view, bots
  controls: Control[]; enemies: EnemySpawn[]; net?: { rig: Point; frame: Point }; pits: Span[]; vent?: Point;
  cache?: Point; reward?: Placement; seal?: Point; cover: number[]; food: number[];
  exits: Record<Side, Exit>;               // position, elevation, facing, destination edge
  flags: { sealed: boolean; guarded: number[]; leftHatch: boolean; timed?: number };
}
```
`solid()` is the only collision function. `roomSolid`, `challengeSolid`, `objectiveBarrier` and `verticalOpening`
become internal details of it or disappear.

### 3.4 Layer 3: encounters and relations
Enemies, controls, traps, cover, pits and food are placed by **relation rules**, not coordinates:
- a net needs rigging reachable before the frame and a lure lane the enemy's strike actually crosses;
- a guarded control needs a line-of-sight break (cover, height or a corner) within reach;
- a ceiling dropper needs its shadow visible from where the player approaches and a dodge lane 2 tiles wide;
- a pit needs readable edges (marked tiles) and a crossing the body can make at minimum agility;
- a sealed arena needs a credible net-only solution for every enemy in it;
- a branch needs a visible reason (reward sign, food, a hatch seen from the main path).
Each rule is a function `(room, state) => Problem[]` so the validator, the debug overlay and tests share it.

## 4. Room vocabulary (Water)
Ingredients, not a checklist. Easy teaches one each; Medium combines two; Hard combines three with execution.

| Role | Teaches / demands | Existing rules reused |
|---|---|---|
| traversal | ledges, shafts, upper and lower lanes | physics |
| sluicePuzzle | one raised lever, mandatory Gardener crossing | `useValve` single |
| drainPuzzle | lower control then upper release, drained collision | `useValve` pair, `drainedRoom` |
| shaftRelay | dive/rise/dive, left onward hatch | switchback collision, `leftExit` |
| pressureCrossing | charge, release, 12 s crossing, emergency latch | `tickObjective`, `emergencyRelease` |
| guardedObjective | two still seconds under guard | `advanceOperation` |
| trapEncounter | rig, arm, lure | `useNet`, `netCatches` |
| ceilingThreat | dropper warning and dodge | `stepDropper` |
| sealedArena | commit, clear or subdue all | `encounterLock`, `canIncapacitate` |
| recovery | food cache, safe backtrack junction | cache rules |
| classTrial | triad room, one variant per class | new |
| bonusVault | stat gate, fun part reward | new |
| goal | seal, reward, return pressure | existing claim rules |

## 5. Progression invariants
Checked on the graph before rooms exist, then again on the physical model with the real controller. Each has a
test that feeds a deliberately broken input and expects its named problem (SOP-17 §1).

1. **Identity**: unique node and room ids; one entry per level; exactly one goal; every edge names existing nodes.
2. **Critical materials are honest**: a `critical` material lists only story keys and Gardener terrain.
3. **Keys before gates, per generation**: simulate a lineage from the reveal with (a) the minimum seed (all zeros,
   one class) and (b) the maximum seed; grant keys only when their placement is reachable and banked; every
   critical gate must open for both before the goal. Fun parts and skills are never assumed.
4. **Class triads**: every class-locked critical gate has a variant for each of the three classes, and the chosen
   variant matches an expressed class.
5. **Reciprocity**: every forward edge has a return edge; a one-way drop has a return path that needs no key the
   player could lack after taking the drop, and no cargo is stranded.
6. **Gardener non-circularity**: every mandatory intervention's control is reachable without the effect it causes.
7. **Easy is open**: the Easy critical path needs no story key and no stat above the seed minimum.
8. **Bonus isolation**: removing every bonus branch leaves the critical path intact; no critical placement sits
   behind a stat gate.
9. **Loop**: at least one cycle per level; the goal is not a leaf of a pure chain.
10. **Pacing**: no two consecutive critical rooms of the same role; no more than two `sealedArena`/`trapEncounter`
    in a row; a `recovery` within three rooms of every Hard spike.
11. **Arrivals**: every exit has a destination entrance on the corresponding side, a spawn position with standing
    clearance, no enemy within tell range of it, no pit beneath it, and no bounce-back.
12. **Physical solvability**: the controller bots solve each room in every relevant `RoomState` (controls unsolved
    and solved, seal active and cleared, pressure live and expired, basin low and raised, torrent wild and diverted)
    at the minimum traits the graph allows there, and return to the entrance afterwards.
13. **Bypass denial**: a sprint-only bot (`D + Shift`) fails every room whose role demands a solution.
14. **Encounter fairness**: every sealed arena is clearable by a net-only bot; every guarded control has a
    line-of-sight break; every dropper has a dodge lane.
15. **Timers**: every timed crossing is completable at minimum agility with 25 % slack, and its expiry offers a
    return but no reward.
16. **Determinism**: same seed and version give identical fingerprints; pinned fingerprints for seed 0 and a
    handful of others.

## 6. Tunables (one module)
`creature/levelgen/tuning.ts`: stat cap and skill thresholds (30 / 20 / 30), bonus tiers (8 / 16 / 24), expressed
part cap (3), seed mapping, armor curve (12, 4, 0.75), damage growth (0.11), health per vitality (3), room counts
per tier (ranges, not constants), loop and branch counts, pacing limits, retry cap, timer slack. No literal in the
generator or validator.

## 7. Migration: smallest coherent path, each step shippable
Strangler pattern. The v1 world is frozen as data and projected into the new model first, so every consumer can
move with a fingerprint test proving identical behaviour before any room changes.

| Step | Work | Proof |
|---|---|---|
| 0 | `legacyModel.ts`: project the v1 world plus every table in section 1 into `GeneratedRoom[]` and a `LevelGraph`. Switch physics, view, bots and the scene to `room.solid()`, `room.controls`, `room.enemies`, `room.exits`, `room.flags` one consumer at a time. Delete the ID checks as each consumer moves. | Existing 530 tests unchanged; collision, valve, spawn and arrival fingerprints identical for seeds 0..500 |
| 1 | Graph generator + graph invariants 1..10 + lineage simulator. No scene change. | Property tests over hundreds of seeds; broken-graph tests per invariant |
| 2 | Templates (start with the eleven rooms we have, as templates), placement, relation rules, physical invariants 11..16. | Bots on authored + 8 generated seeds, bypass and net-only scenarios |
| 3 | Scene consumes generated Water; `Expedition.version 2`; trait extension. | Browser scripts, desktop/mobile captures |
| 4 | Bonus vaults, class trials, fun parts, skills, armor curve. | Scenario tests per key family |

Save compatibility: a v1 `Expedition` keeps its seed and is replayed through `legacyModel`, so an existing world
never changes under the player. `visited` migrates from integers to room ids (`w1:<n>`). Only an explicit
"start a different world" produces a version 2 world. `validExpedition` accepts both versions and rejects unknown
future versions, as today. `Traits` gains `agility`, `intellect`, `armor`, `classSkills`, `parts`, `banked`
with defaults; `readGarden` keeps accepting old checkpoints.

## 8. Shared-interface dependencies to raise before changing
These touch files or contracts the creature chat or other stages own. Raise each as a concrete proposal first.
- `generations.ts` `Traits` shape and `readGarden` validation (creature chat).
- `stages.creature.hero` gains agility, intellect, armor, classSkills, parts: additive; civilization keeps reading
  strength, vitality, climb (contract rule 4 covers it, still tell the civ chat).
- `GEN.health` per-vitality rate and fractional health in the scene HUD (creature chat).
- `ENEMIES[kind].damage` becomes a base scaled by tier (creature chat owns balance).
- `levelLock()` moves from two booleans to a key check against the level's entry material.
- `GDD.md` stat cap sentence (5/10/20 → 5/10/30), `ROADMAP.md` Now item, `ARCHITECTURE.md` module table.

## 9. Resolved questions (BAMF69 2026-11-16)
1. Class skills: Roar, Burrow, Tool use (section 2.2).
2. First Water fun parts: full armor and ice breath (section 2.2). Ice breath is a timed freeze, not a capture.
3. Companions: distract only at intellect 20; wound but never clear at 30 (section 2.2).
4. Bonus vaults hold fun parts only in Water. One source per story key; revisit when Jungle adds cross-biome keys.

Next step: migration step 0 (section 7), which changes no gameplay.

## 10. Implementation status and handoff (2026-11-17)

### What is built
| Module (`src/game/creature/levelgen/`) | Role |
|---|---|
| `roomSpec.ts` | The room model and `specSolid`, the single collision test used by physics, view, bots and sight |
| `legacyWater.ts` | The only place a v1 room ID is branched on: the frozen seed-v1 tables, projected into specs |
| `keys.ts` | Key vocabulary, material table (critical materials open only with story keys or Gardener terrain), `keysOf` |
| `graph.ts` | Progression graph: critical chain, drain-to-shaft loops in Medium and Hard, nursery, optional class trials and stat vaults |
| `graphProblems.ts` | Graph invariants with named problems (identity, reciprocity, critical materials, critical chain, bonus isolation, loop, pacing, class triad, Gardener circularity, keys before gates, easy open) |
| `lineageSim.ts` | Plays a lineage generation by generation, banking story keys as the game does |
| `templates.ts` | One template per room role, grown from the eleven v1 rooms, each with a solution script |
| `world.ts` | Graph to rooms: numbering, links, shaft openings, keyed controls, static validation, level entries |
| `solver.ts` | Drives the real controller along a script with the scene's own control, keyed, pit and timer rules; the D+Shift bot |
| `tuning.ts`, `rng.ts` | All generator numbers; deterministic integer PRNG |

Scene: a garden whose expedition is version 1 replays its frozen skeleton unchanged; every new garden gets a
version 2 graph world (`generateWaterV2`). The class skill comes from the dominant temperament at the reveal
(Roar, Burrow, Tool use) and is stored on traits. Class doors and grotto shafts are keyed controls (E at them).
Grotto vaults hold `fullArmor` or `iceBreath`, banked like gills and fins.

### How it is tested
| Claim | Evidence | Level |
|---|---|---|
| Step 0 changed no behavior | `creatureLegacyRooms.test.ts`: collision in every objective state plus every rule, 53 seeds, generated before the refactor | technically identical |
| Graphs are valid and varied | `creatureLevelGraph.test.ts`: 501 seeds, 0 fallbacks, a broken-graph test per invariant, vault thresholds | technically reachable |
| Seed 0 is the v1 world | `creatureLevelWorld.test.ts`: v1 golden records match, plus the new Hard loop | technically identical |
| Generated rooms are solvable and returnable | Real controller solves every room of ten generated worlds along its script and returns | real controller |
| Sprinting does not bypass | D+Shift blocked in every room of those ten worlds at maximum traits | real controller |
| Keys gate correctly | Class doors and grotto shafts refuse a key-less lineage and open with the key, 60 seeds | real controller |
| Arrivals are safe | Every shaft arrival lands outside geometry and on stable ground | real controller |
| Saves | `creatureLevelSaves.test.ts`: v1 replay, v2 round trip, class skill persistence | unit |
| Scene wiring | `tools/creature-levelgen-playtest.mjs` (dev server on 5186): v2 world, class door refuse/open, grotto refuse/open/climb into the vault, desktop and phone captures | browser, scene fixtures |
| Fun | Not tested | needs human playtest |

### Not yet done (honest gaps)
- Enemies are not simulated by `solver.ts`; encounters keep their own tests. Generated rooms reuse the v1 enemy
  placements per role, so net-only arena clears are covered by the existing encounter tests, not per seed.
- Fun parts are discovered and banked but have no in-play ability yet, and daughters do not express them.
- Agility, intellect, armor, the armor curve, tiered enemy damage and 1-health-per-3-vitality are designed
  (§2) but not wired: they change `generations.ts`, `GEN` and `ENEMIES`, owned by the creature chat. Until
  then, agility and intellect vaults cannot be opened, which is allowed (vaults are optional) but noted.
- A daughter's later class skill is not offered yet; the reveal class is the only one granted.
- Room geometry still comes from the v1 templates, so variety is topology, room order, branches, vaults and
  class trials rather than new room shapes. New templates are the next content lever.
- The lever label can overlap the net label in some lever positions (also true in v1).

### Playtest follow-up (2026-11-17, BAMF69 seeds pt7 and pt15)
Reports: Hard stayed locked after choosing Reedheart; a Reedheart lineage could not swim upstream. Both reproduced
as missing traits, not broken levels: a daughter adds one adaptation and keeps the others, Reedheart only
expresses fins when the nursery sample was banked, and upstream swimming needs fins and a diverted torrent.
Changes (`creature/guidance.ts`, `creature/creatureIcons.ts`):
- Current rooms say exactly what is missing (fins, diversion, or both) on entry and on stepping into the water.
- Locked Medium/Hard entrances name the missing trait and the route, including "this takes two generations".
- Daughter cards say whether she will express gills or fins, or not because the sample was never carried home.
- The daughter screen opens with a lineage plan when banked adaptations still need more generations.
- An equipment rack in the top right, styled like the cell stage's, shows Equipped traits (gills, fins, claws,
  class skill) and dimmed Banked discoveries; tapping an icon explains it.
Tests: `creatureGuidance.test.ts`; `tools/creature-levelgen-playtest.mjs` checks each message and the rack in the
real scene, desktop and phone.
