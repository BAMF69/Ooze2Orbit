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
10. **Pacing**: no four consecutive critical rooms of the same role; no more than two sealed rooms
    (`sealedArena`/`trapEncounter`) in a row; a `recovery` (a food cache room) within three rooms of every Hard spike.
    Amended 2026-11-18 from "no two of the same role": Easy teaches the sluice lever twice (a plain lever, then the
    gated one that demands the Gardener) before its arena, and a fourth-room Easy adds a third. Teaching by
    repetition is the point of Easy, so three in a row is allowed; four is rejected.
11. **Arrivals**: every exit has a destination entrance on the corresponding side, a spawn position with standing
    clearance, no pit beneath it, and no bounce-back. Tell range, stated as time: no enemy (swimmers included) within
    60 px, and every enemy that can detect the arrival gives at least 1.2 s (its tell plus its approach at full speed)
    before it can strike.
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

### How far each invariant is proved (2026-11-18)
Levels: **graph** (checked on the progression graph), **search** (search solver, `levelgen/search.ts`, real controller
moves over real collision, every reachable route), **script** (one hand-written route through the real controller),
**human** (played and judged). No invariant has reached **human** yet.

| # | Level | Notes |
|---|---|---|
| 1, 2, 7 | graph | sound |
| 3 | graph | sphere search: one expressed adaptation per daughter; 3 generations to Hard for every class (step 1.6) |
| 4 | graph + world | each class door's variant must be one of the lineage's classes; built from its first class, so adding a class never changes it (step 1.6) |
| 5 | graph + map | reciprocity; the map is the ManiaMap layout and must show every real link on its side |
| 6 | graph | checks where each Gardener control is placed (nest menu today, which is always reachable); a room placement must be reachable without its own effect (step 1.6) |
| 8 | graph | removing branches keeps the chain; no story key in a vault (broken-input tests; the generator never produces either) |
| 9 | graph + search | counted from the edges (cyclomatic number), so parallel edges count 0; Medium and Hard each have a channel cycle, solved by the real controller and the search (step 1.6) |
| 10 | graph | §5 amended (three same-role allowed, reason stated); a food cache within three rooms of each Hard spike (step 1.6) |
| 11 | search + script + world | arrivals land on stable ground; static check uses `specSolid`, includes swimmers and the tell-range time (step 1.6) |
| 12 | search | minimum traits per tier; basin low, raised, raised and diverted; controls, keyed doors and seals as layered states; pressure expiry not searched |
| 13 | search | enemy-ignoring player fails every room that demands a solution; D+Shift still also by script |
| 14 | search | net reachable and lurable for every enemy, guards lurable, dodge lanes, pit crossings, net-only arenas; the guard "opening" is the net, not a line-of-sight break |
| 15 | search | crossings within 75 % of the timer at base movement (agility is not wired yet); expiry return not searched |
| 16 | tests | pinned fingerprints |

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
| `graph.ts` | Progression graph: critical chain, an underchannel cycle in Medium and Hard, nursery, optional class trials and stat vaults; lays each level out with ManiaMap |
| `maniamap.ts` | ManiaMap port (BSD-3, ADR 0008): multi-cell room templates, door alignment, configuration spaces, layout with cycle insertion |
| `graphProblems.ts` | Graph invariants with named problems (identity, reciprocity, critical materials, critical chain, bonus isolation, loop, pacing, class triad, Gardener circularity, keys before gates, easy open) |
| `lineageSim.ts` | Sphere search: plays a lineage generation by generation, one expressed adaptation per daughter |
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
| Seed 0 is the v1 world | `creatureLevelWorld.test.ts`: v1 golden records match once the deliberate loop and threat-placement changes are reverted; two channels added | technically identical |
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

### Minimap (2026-11-17)
`levelgen/mapLayout.ts` places each level's rooms on a grid from their real connections and checks the map is
coherent: no two rooms share a cell, every door joins cells that touch on its side (with a matching return
door), every room is reached, and each room's shape is connected. This runs in `worldProblemsV2`, so the
generator rejects any seed whose map would not make sense. Drawing the map exposed one spatial quirk carried over
from v1: a drain room links to the next shaft both through its right exit and through its floor drop. The shaft is
therefore drawn as an L-shape that reaches under the drain, which is the only consistent single-screen reading.
`creature/minimap.ts` shows explored rooms, the current room, dashed outlines for unexplored rooms that adjoin
explored ones, door ticks, the goal once seen and uncollected rewards. It sits under the equipment rack, below the
status line, and hides in the overworld and shoreline. Tests: `creatureMinimap.test.ts` (300 seeds coherent, a
broken-map test per rule, generator rejection, contents) and the browser regression (shown in rooms, hidden in
hubs, desktop and phone captures).

### Independent review and the large-room plan (2026-11-18)
An independent review of origin/main 4dca05c found that several proofs show less than their names say: physical
validation follows hand-written scripts at maximum traits in one Gardener state; the D+Shift check cannot see enemies;
the loop and class-triad invariants trust fields the generator sets itself; the lineage simulator lets one daughter
express both adaptations (real minimum to Hard is 3 generations, not 2); some invariants can never fail; variety is
low; enemies are forced to the right third of every room. It also confirmed that the Easy reward can be taken before
its arena is cleared (the pickup tests x > 550 while the exit wall leaves the body at about x 553); fixed at
BAMF69's request in f32bbae (`canCollectReward`). BAMF69's answers: Gardener stays a free global toggle for now; port ManiaMap's room
model with attribution.

Agreed order: step 1 size-agnostic engine; step 1.5 search-based solver with a threat model and the §3.4 relation
rules; step 1.6 foundation fixes (real cycles, stable class variants, sphere search, pacing, Gardener circularity,
specSolid in validation, no enemy x-range, ManiaMap multi-cell rooms); step 2 segment stitcher; steps 3 and 4 as before.

**Step 1 (done, 7ab42fc).** Rooms carry a geometry (`levelgen/geometry.ts`): tile size, open band, water regions,
enemy bounds, and derived exits, exit wall, seal walls, goal zone, pressure latch and shaft edges. `V1_GEOMETRY`
reproduces the one-screen numbers, so existing rooms are byte-identical (golden fingerprints). Collision, objectives,
routes, water physics, enemy bounds, arena sealing, the scene camera and exits, the solver, the static validator, the
rock tile layer, the tiling backdrop and the room view read it. Evidence: `creatureRoomSize.test.ts` (a generated room
stretched to two screens: bounds, walls, seal, water, enemy limits, latch, a real-controller solve, D+Shift failing)
and the browser regression walking that room with the camera following. Level: real controller, not human play.

**Step 1.5 (done, uncommitted).** `levelgen/search.ts` is a search-based room solver in the platform-graph style:
settled body positions are nodes, short input moves (walks, held and short jumps, sprint jumps, swims, breach jumps)
are edges simulated through the real controller over the real collision, and controls, keyed doors and seals change
the objective state in layers. It needs no hand-written script, so stitched rooms can be validated. `whatIsMissing`
names the smallest missing ability or Gardener state. `levelgen/relations.ts` holds the §3.4 relation rules (net
reachable and lurable for every enemy, guards lurable, dropper dodge lanes, pit crossings, net-only arenas, branch
reasons) and a threat-zone model. Collision is now cached per room state (`specSolid`), and pits read the room's floor row.

The search found and fixed four real problems, all approved or within the agreed rules:
- **Breach-hop exploit:** chained breach jumps beat every Hard current with no fins and no diversion, skipping Hard's
  critical lock. Fix (BAMF69's choice): no breach against a current the body cannot out-swim (`waterPhysics.ts`).
- **Unguarded guarded relay:** the Hard shaft's relay had no guard within the 76 px interrupt radius; the first
  swimmer now patrols beside it, between the relay and the net.
- **Untrappable drain guard:** the Medium drain's ambusher lunged 84 px but stood about 104 px from the net; guarded
  drain rooms now put the net between both guards.
- **No net-only finale:** the Hard finale's swimmer stood beyond one lunge of the net; it now patrols within reach.
The validator's enemy x-range (x >= 352, review finding 9) was replaced by "not at the entrance, not past the exit",
which the relay guard needed.

Evidence (`tests/creatureSearch.test.ts`; default 12 seeds in the unit suite, full sweep with `LEVELGEN_SEEDS=120`):
120 seeds, 166 distinct rooms, all solved and returned at minimum traits in every Gardener state they declare, and
none solved without their requirement; no current passable without fins; no relation problem; the enemy-ignoring
player fails all 43 rooms that demand a solution. Broken rooms are rejected (unreachable control, walled exit, too-
short timer, each relation rule), and the missing state is named. Seed 0 still matches the v1 goldens once the loop and
the four placement fixes are reverted (`creatureLevelWorld.test.ts`). Level: search, not human play.

**Step 1.6 (done, uncommitted).** Foundation fixes, each with a deliberately broken input rejected by name:
- **Real cycles (finding 3).** `levelgen/maniamap.ts` is a 2D TypeScript port of ManiaMap's room model and layout
  (BSD-3, notice in the file and in `THIRD_PARTY_LICENSES.md`, which ships in `dist/`; ADR 0008): rooms are grids of
  map cells with doors on any side of any cell, placed so doors meet and no cells overlap, with cycles closed by
  inserting a room between two placed rooms. Medium and Hard now have an **underchannel**, a room 3 or 4 screens
  wide under the chain, from the drain's floor (opens with the drain's controls) to a hatch behind the finale's exit
  wall (opens once the seal is claimed): a shortcut home after the finale. The old drain-to-shaft second edge is gone.
  Each hatch is opened by the room above it (`Edge.openedBy`), so the channel never bypasses the shaft's sluice.
  Loops are counted from the edges. The graph's layout is the minimap's model (`WorldV2.maps`), and the validator
  requires the map to show every real link on its side.
- **Class doors (finding 4).** A door is built for the lineage's first class (class skills are only appended), so a
  second class leaves every door unchanged; the graph and world checks reject a door for a class the lineage lacks.
- **Sphere search (finding 5).** `sphereSearch` replaces the simulator: one sphere per generation, the next daughter
  expresses one found story key, all choices searched. Seed 0: G1 Easy finds gills and fins, G2 expresses one and
  opens Medium, G3 expresses the other and reaches Hard's seal: 3 generations (every class, 8 seeds).
- **Pacing and Gardener (finding 6).** §5 amended with its reason; Hard spikes need a food cache within three rooms;
  Gardener controls carry a placement (`BiomeGraph.gardener`, the nest menu today) checked for reachability.
- **Validator (finding 7).** Floor clearance through `specSolid` in the solved state (switchback rooms excepted: the
  search proves their dive route); arrival safety includes swimmers and the tell-range time. World connectivity is a
  search over every link, not a walk along right exits.

The chain itself still runs left to right because every template has its exits on the left and right; the model,
the map and the validator no longer assume it. Mirrored templates and new shapes come with the stitcher (step 2).

Open for BAMF69: in 76 of 102 open rooms (no seal, no watched control) a player can avoid every threat zone. The
original design keeps some rooms open to stealth and evasion, but the review cites "enemies that can always be
ignored" as rejected; the right share is a design call.
