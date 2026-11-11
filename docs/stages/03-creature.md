# Stage 3: Creature

> Stage design doc. Short beats complete. Game-wide rules (pillars, the Gardener rule, lore, win and lose, what
> carries between stages) live in the spine, `docs/GDD.md`; this file covers only what is special to the creature
> stage.
> **Redesigned 2026-11-10 (BAMF69): a roguelike metroidvania.** The 2026-11-09 design (a world map plus sidescroller
> levels) was built as Toy 1 (PR #8) and is replaced; Toy 1 stays in the game until Toy 2 exists, then is removed
> (BAMF69 2026-11-10). Its full design and build notes are in this file's git history.
> Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69. Everything else was decided by BAMF69.

## Identity
- **Pitch:** Life leaves the water. Explore one big side-view world whose areas open only when your lineage has the
  right stat or ability. Each run is one creature's life; when it dies, one of its offspring carries on.
- **Reference games (mechanics only):**
  - **Super Metroid, the main inspiration** (BAMF69 2026-11-10): one connected world, areas gated by stats and
    abilities, backtracking to places you could not reach before.
  - **Rogue Legacy** (BAMF69 2026-11-10): runs that end in death, with each new run played as an heir carrying
    inherited traits.
  - **Everything is Crab** (BAMF69 2026-11-10), an animal-evolution roguelite in a living ecosystem. What we borrow:
    - **Climate events that change a biome's rules,** as the Gardener's levers (each still helps aggressive or
      cautious play: the Gardener rule).
    - **A living ecosystem:** other creatures have their own goals and evolve during the stage, so the world is not
      static.
    - **Visible evolution:** every change shows on the creature's body (pillar 2).
    - **Bosses that evolve between runs,** a small-scale echo of `T0|▼|` adapting.
    - **Readable play styles** (its trickster, predator and nomad builds map onto cautious, aggressive and adaptable).
    - **Two limits** (BAMF69 2026-11-10): the stage stays a **side-view metroidvania**, not a top-down arena; and traits
      come from **inheritance across generations**, not from picking evolutions off a menu mid-run (pillar 2, and the
      playtester's point that picking parts is not evolution). It is a close neighbor (another Spore-inspired
      evolution roguelite), so Ooze2Orbit keeps its own identity: the Gardener, lineages that last across generations,
      and Metroid-style gates.
  - Donkey Kong Country's lit, moody side-view look *(kept from the 2026-11-09 design)*.
  - Still being decided by BAMF69: how much (if anything) to take from Bardbarian. Not taken: Terraria's digging and
    world-building, and anything tower defense, which belongs to the civilization stage.
- **Modes:**
  - **Avatar mode = the run.** Play one creature through the world, side-on.
  - **God mode = the Gardener between runs** *(Claude's pick)*. Between one generation and the next, the Gardener
    changes the environment, and every change helps either aggressive or cautious play (the Gardener rule, below).
- **Receives:** the aquatic stage's lineage (`docs/HANDOFF_CONTRACT.md`): temperament, diet, the aquatic body plan.
- **Hands on:** the `creature` block, the lineage's abilities, `gardener.harshness`, the temperament after this stage
  (moved at most 50 % from where the aquatic stage left it), and **the hero** for the civilization stage (BAMF69
  2026-11-10: your creature stays playable there).
- **Played on its own:** starts from a default or generated aquatic lineage.

## How the pillars apply here
1. **Tense but fair (stakes rise):** a run ends when the creature dies, and that run's progress is lost. The lineage
   is not: the next run starts as an offspring. No game over for the Gardener ("a branch can be lost; the garden
   cannot").
2. **You shape your creature, directly and indirectly:**
   - Directly: how you play each run, which shapes the offspring's likely traits, and which offspring you keep
     (pillar 2, rewritten 2026-11-10; stats cap at 20 this stage, by the spine's doubling rule, reached through
     selection, never points).
   - Indirectly: the Gardener's changes between runs, and which offspring you choose to carry on.
3. **Small world, growing bigger:** a coastline that opens, area by area, into a continent.

## Runs are generations *(Claude's pick for how, built on BAMF69's roguelike)*
This is where the playtester's point (picking up parts is not evolution) gets its full answer: the stage runs on
inheritance, variation and selection.
- **One run is one creature's life.** It explores, feeds, fights or hides, and eventually dies.
- **At death, it leaves offspring.** You see a few of them, each with a small random difference (a stat nudged, a
  trait varied), and pick one to play next, like an heir in Rogue Legacy and like the cell stage's planned division
  (`docs/stages/01-cell.md`, "Division").
- **What the creature did in its life makes related traits more likely in its offspring** (the Baldwin effect: a
  lineage that keeps using its claws is selected for claws that come easily). This replaces the 2026-11-09 rule that
  the most-used parts are simply inherited, which was Lamarckian.
- **Every inherited change names its cause** ("Your last three generations fought their way through the Thorn
  Caves: claws are now inherited"), as pillar 2 asks.

## Gates: stats and abilities open the world *(BAMF69 2026-11-10)*
- Parts of the world can only be reached once the lineage has certain stats or abilities. Examples *(Claude's picks)*:
  strength to break a rock wall, a climbing claw for cliffs, gills or lungs for a flooded cave, thick fur for the
  snowline, a leaping tail for gaps.
- **Abilities arrive through evolution, not pickups:** they are traits the lineage gains across generations, so
  opening a new area is an evolution milestone.
- **The map remembers** *(Claude's pick)*: areas you have opened stay open for later generations, as in Super Metroid,
  so each run goes further.
- Each gate should have more than one key where it can *(Claude's pick)*: a cliff can be climbed (claws), leapt (tail)
  or reached through a cave (gills), so different lineages open the world in different orders.

## Temperament in a run *(Claude's pick, carried over from Toy 1 where it fits)*
- Rooms and guardians can still be passed three ways, as in Toy 1: **fight** (aggressive), **sneak past**
  (cautious), or **solve** with the environment (adaptable). Toy 1's readable stealth (sight cones, crouching, wake
  meters) and its verdicts carry over.
- Diet ties in (spine): carnivores lean aggressive, herbivores cautious, omnivores sit in between.
- Every run writes its cause lines; the 50 % per-stage cap applies.

## The Gardener's levers *(the Gardener rule, BAMF69 2026-11-10; levers are Claude's picks)*
Between runs, the Gardener picks one change. Each clearly helps one side; adaptable players switch as they need.

| Lever | Helps | Why |
|---|---|---|
| Drought | Aggressive | Animals crowd at the waterholes: more to hunt |
| Flood | Cautious | Predators' dens drown; more places to hide and graze |
| Ice age | Cautious | Fewer, slower predators; thick fur pays off |
| Warm bloom | Aggressive | Prey multiplies; carnivores eat well |

Without the matching lever, the world stays hostile to your style and runs are hard. Changes can also open or close
gates (a flood fills a cave for gill-breathers; a drought drains it for walkers) *(Claude's pick)*.

## Core loop (first draft, Claude's pick)
```
choose an offspring -> explore: feed, fight / sneak / solve, reach new gates -> die (or reach a goal)
-> offspring vary; the Gardener picks a lever -> choose the next offspring -> further into the world
```

| Scale | What the player does | Why they keep going |
|---|---|---|
| Every ~30 seconds | Gets past a room or a creature | Their own way through |
| Every run (~5 to 10 min) | Lives one life, dies | The next offspring is stronger in some way |
| Whole stage | Opens the continent gate by gate | The body plan, temperament and hero it hands on |

## Look and camera
- Side view, lit and moody (Donkey Kong Country atmosphere); deep backgrounds, silhouettes.
- Engine: Phaser 4 fits (arcade physics and tilemaps suit a side-view game). No new engine.

## Toy 2 proposal *(Claude's pick)*
- A small world of about 6 rooms with 2 gates (one stat, one ability).
- A run ends at death; pick from 3 offspring; one inherited ability that opens a gate after a few runs.
- 2 Gardener levers, one per side.
- **Done means:** BAMF69 starts another run right away to get further, and can say why the new offspring is
  different.
- When it works, Toy 1 (`src/game/CreatureScene.ts`, `src/game/creature/`) is removed (BAMF69 2026-11-10).

## `T0|▼|` hint
The lens flickers and sometimes a Gardener change fails. A dead moon in the night sky is perfectly smooth. Perhaps a
room of perfectly geometric ruins that nothing alive goes near *(Claude's pick)*. On the machine path these are moments
in `T0|▼|`'s life (`docs/LORE.md`, "The flip").

## Open questions
| Question | Why it matters |
|---|---|
| What, if anything, comes from Bardbarian? | BAMF69 is still deciding |
| Hand-built world or partly generated each run? | Super Metroid is hand-built; roguelikes usually generate. Decides content cost |
| What ends the stage: a final gate, a boss, a number of generations? | The stage's goal |
| How does the hero for the civilization stage get chosen? (The last creature? The best?) | What carries into the tower defense |
| Do the air and sea branches still exist here, or is it one lineage? | Scope |
