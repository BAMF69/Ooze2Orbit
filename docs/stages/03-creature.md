# Stage 3: Creature

> Stage design doc. Short beats complete. Game-wide rules (pillars, lore, win and lose, what carries between stages)
> live in the spine, `docs/GDD.md`; this file covers only what is special to the creature stage.
> **Not started.** Nothing here gets coded until the stages before it are fun (spine, "Out of scope"). When this
> becomes the active stage, fill the rest from `docs/stages/_TEMPLATE.md` and keep what still holds.
> Renamed from "Land/Air" and redesigned 2026-11-09 (BAMF69). Items marked *(Claude's pick)* were chosen by Claude:
> confirm them with BAMF69. Everything else was decided by BAMF69.

## Identity
- **Pitch:** Life leaves the water. Look down at a world map and reshape it as the Gardener, then drop into each level
  as your creature: a 16-bit sidescroller you can fight, puzzle or sneak your way through.
- **Reference games for this stage (mechanics and era style only):**
  - Super Mario World: the top-down world map and level selector, with paths that open as you play.
  - Donkey Kong Country: the sidescroller's atmosphere, lit and moody, dark jungles, silhouettes. Chosen over
    Super Mario's bright cartoon look, which would clash with the game-wide "lit and moody" direction and the
    2026-11-07 decision against a childish look *(Claude's pick, agreed 2026-11-09)*.
  - Kirby and Mega Man: picking up new abilities in a level.
  - Stealth games and immersive sims: one level with several ways through it.
  - Nothing beyond that: no Nintendo or other names, characters, art, music or level designs.
- **Modes** *(agreed 2026-11-09)*:
  - **God mode = the world map.** The Gardener looks down the lens at a top-down map and reshapes it: drain a lake,
    raise a mountain, start an ice age, move a predator's range. Changes alter the levels and open or close paths on
    the map.
  - **Avatar mode = the levels.** Each level is a sidescroller played as one creature.
- **Receives:** the aquatic stage's lineage (`docs/HANDOFF_CONTRACT.md`): temperament, diet, the aquatic body plan.
- **Hands on:** the `creature` block, branches, `gardener.harshness`, and the temperament after this stage (moved at
  most 50 % from where the aquatic stage left it).
- **Played on its own:** starts from a default or generated aquatic lineage.

## How the pillars apply here
1. **Tense but fair (stakes rise):** harder than the aquatic stage. Falling into a pit or losing a fight sends you
   back to the last checkpoint, and you lose the part you were carrying *(agreed 2026-11-09)*. Branches of the species
   can die out on the map. No game over for the Gardener.
2. **You shape your creature, directly and indirectly:**
   - Directly: how you clear each level, the parts you use, and the avatar's stats (bought with points, maximum 20
     this stage, following the spine's doubling rule).
   - Indirectly: god mode on the map changes the environment, and the species' traits evolve from it as a
     simulation.
3. **Small world, growing bigger:** a coastline, then a continent.

## The three ways through a level *(agreed 2026-11-09)*
Every level can be played three ways, and each way builds one temperament:

| How you clear it | Temperament it builds | Ship tech it leads to (space stage) |
|---|---|---|
| Fighting | Aggressive | Weapons |
| Solving puzzles | Adaptable | Engines |
| Stealth | Cautious | Shields |

**One level, three ways through.** Levels are not built three times. Each obstacle has three answers, for example
smash the gate, work the counterweight, or sneak through the root tunnel. The player can mix styles within a level.

Each obstacle records how it was passed. At the end of a level, one line goes into the cause log, for example
"Cleared the Riverbank: 4 of 5 obstacles by stealth" *(Claude's pick for the wording)*. The 50 % per-stage cap applies.

## Parts: temporary powers that become traits *(agreed 2026-11-09)*
- Parts are picked up in a level, like Kirby or Mega Man abilities: claws, camouflage, a grabbing tongue, horns
  *(examples, Claude's pick)*.
- A part lasts for the level. You lose it if you fall back to a checkpoint.
- Each part suits one style (claws for fighting, camouflage for stealth, a grabbing tongue for puzzles) but can be
  used creatively.
- **The parts you use most become inherited traits** for the species, through the rule that the avatar's behavior
  shapes its lineage. This keeps pickups fun while species evolution stays a simulation (pillar 2). Each inherited
  trait names its cause ("Your creatures used claws in 6 levels: claws are now inherited").

## Core loop (first draft, Claude's pick)
```
world map (god mode): look at the regions, reshape one (drain, raise, freeze, move predators)
-> the population evolves from the change; the map says why a trait moved
-> pick a level on the map -> play it as your creature (avatar mode): fight, solve or sneak past each obstacle,
   pick up parts -> clear it: a cause line, points for stats -> new paths open on the map -> back to the map
```

| Scale | What the player does | Why they keep going |
|---|---|---|
| Every ~30 seconds | Passes one obstacle, fighting, solving or sneaking | Their own way through |
| Every ~5 minutes | Clears a level | New paths on the map, a trait drifting |
| Whole stage | Steers the species across the continent | The body plan and temperament it hands to civilization |

## World map ideas *(Claude's pick, to discuss)*
- **Branches as regions:** the land, air and sea branches each live in their own regions of the map. A branch's
  levels play differently: fliers glide and flap, climbers grip walls, swimmers dive.
- **Reshaping the map changes levels:** a drained lake turns a swimming level into a mudflat; an ice age freezes a
  river into a bridge. A level's version depends on the map.
- **Gentle vs. harsh tracking starts here:** how violent the Gardener's map changes are (`gardener.harshness`),
  which matters in the civilization and space stages.

## Look and camera
- **Levels:** a 16-bit sidescroller, side view, with Donkey Kong Country-style atmosphere: lit and moody, deep
  backgrounds, silhouettes, one lens step further out than the aquatic stage.
- **World map:** top-down, the Gardener's lens.
- This stage replaces the aquatic stage's behind view: avatar mode is side-on here.
- **Engine:** Phaser 4 fits (arcade physics and tilemaps suit a platformer). No new engine.

## Toy proposal *(Claude's pick, for when this becomes the active stage)*
- A tiny map with 3 level nodes and 1 god-mode change (drain a lake) that changes one level.
- 1 level of about 5 obstacles, each with a fight, puzzle and stealth answer.
- 2 parts.
- **Done means:** BAMF69 wants to replay the level a different way, and can say which temperament each run built.

## `T0|▼|` hint
The lens flickers and sometimes a map change fails. A dead moon in the night sky is perfectly smooth. Perhaps a level
with perfectly geometric ruins that nothing alive goes near *(Claude's pick)*.

## Open questions
| Question | Why it matters |
|---|---|
| How many levels and regions in the full stage? | Content cost: levels are the expensive part |
| How do flying and swimming branches play in a sidescroller? | Each needs its own movement and level rules |
| Can a branch die out because of how levels went, or only from map changes? | Decides how much a level's result matters |
| What do points buy here, and are stats shared across branches? | Pillar 2's direct stat choice, at maximum 20 |
