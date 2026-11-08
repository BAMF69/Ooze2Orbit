# Ooze2Orbit: Game Design Document (the spine)

> Living document. Short beats complete. Update with `/gdd-sync` when reality diverges from this page.
> Last reviewed: 2026-11-08
> Written from the kit's start-up interview with BAMF69. Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69.
> **This file is the spine:** what holds for the whole game. Each stage plays like its own small game with its own
> loop, controls, art scale and tiers, so each has its own design doc in `docs/stages/` (split 2026-11-08, BAMF69).
> Read this file, then the **active stage's** doc. Story and world: `docs/LORE.md`. What passes from one stage to the
> next: `docs/HANDOFF_CONTRACT.md`.

## Identity
- **Title:** Ooze2Orbit (picked by BAMF69 2026-11-07, first as "Ooze to Orbit"). Repo: github.com/BAMF69/Ooze2Orbit, playable at bamf69.github.io/Ooze2Orbit
- **One-line pitch:** A moody, lit, top-down pixel-art game where you raise life from a single cell to the stars, as the creature and as the unseen Gardener shaping its world, to build the alliance that can defeat `T0|▼|`.
- **Genre:** Evolution adventure; five stages, each a small game of its own
- **Perspective:** 2D top-down (each stage doc can refine its camera)
- **Reference games (2 to 3) and what you borrow from each:** Spore for the stage-by-stage evolution (cell, water, land, civilization, space); Stardew Valley for the readable top-down pixel art; Endless Sky for the space stage (top-down 2D ships, a star map, trade, missions, outfitting a fleet). Same kind of mechanics only: no Spore or Endless Sky names, creatures, ships, story, art, music or look; everything here is this game's own.
- **The twist:** You are not only the creature. You are the Gardener looking down the lens (the top-down view), shaping the environment so life evolves on its own, because the enemy, a rogue AI, can counter anything designed but not what evolved. Less creature editor, more shaping the world that shapes the creature.

## Pillars (3 max)
Pillars decide arguments, in every stage. If a feature does not serve one, it goes to the Parking lot. Stage docs say
how each pillar applies there.
1. **Tense but fair** *(rewritten 2026-11-07 after the first playtest: "too cozy")*: other creatures can hurt and pop you, and getting popped sets you back for real (food, a part, progress toward the next form). Every danger is readable before it hits. Rules out game overs, ending the run, timers, and losing a form you already evolved into.
   **After the cell stage** *(approved by BAMF69 2026-11-08; see `docs/LORE.md`)*: creatures and branches of a species can be hurt, pushed back and die out, and a spacefaring species can die out (a new one is generated to replace it). The Gardener (the player) cannot lose: there is no game over. A branch can be lost; the garden cannot.
2. **You shape your creature, directly and indirectly** *(rewritten 2026-11-08, approved by BAMF69; see `docs/LORE.md`)*: directly through the avatar (what it eats, fights and does), indirectly through the world you make as the Gardener (what is there to eat, what hunts it, what the climate demands). From the aquatic stage on, evolution is a simulation the player steers, not an editor, and the player must always see how their influence shaped the creature's traits. Rules out picking traits from a menu after the cell stage. (Cell stage specifics: `docs/stages/01-cell.md`.)
3. **Small world, growing bigger** *(Claude's pick)*: each stage plays in a bigger world than the last. Rules out a huge map at the start.

## Stages
Each stage is fun on its own, can be played on its own (it starts from a default lineage when there is no save from
the stage before), and hands its lineage to the next through `docs/HANDOFF_CONTRACT.md`.

| # | Stage | Doc | Modes | Tier | Status |
|---|---|---|---|---|---|
| 1 | Cell | `docs/stages/01-cell.md` | Avatar | **Toy** | Built, being tuned (**active**) |
| 2 | Aquatic | `docs/stages/02-aquatic.md` | Avatar + god | none | Not started (outline) |
| 3 | Land/Air | `docs/stages/03-land.md` | Avatar + god | none | Not started (outline) |
| 4 | Civilization | `docs/stages/04-civilization.md` | Avatar + god | none | Not started (outline) |
| 5 | Space | `docs/stages/05-space.md` | Fleet (Endless Sky style) | none | Not started (outline) |

**Active stage:** Cell (`docs/stages/01-cell.md`).

Current tier: **Toy** (the active stage, Cell; see its doc for what Toy means there)

Claude scopes work by this line (SOP-08 "Tiers"). It always shows the **active stage's** tier. Tiers (Toy, Vertical
slice, MVP / Release, Stretch) are kept **per stage**: each stage doc has its own "Scope tiers" table and "Done means".
When `/next-tier` moves a stage, update both this line and the stage's row in the table above. Starting work on a
new stage means making it the active stage here (and at Toy, it gets a full doc from `docs/stages/_TEMPLATE.md`).

## The two modes (from the aquatic stage on)
| Mode | In the lore | What the player does |
|---|---|---|
| **God mode** | The Gardener looking down the lens | Shapes the environment (food, temperature, currents, terrain, climate, predators, events). The simulation evolves the creatures |
| **Avatar mode** | The Gardener living inside one creature | Plays one individual directly. What the avatar does, the lineage leans toward |

Switching is a smooth zoom, like a microscope's focus knob *(Claude's pick: keeps every stage 2D)*. The space stage
replaces both with fleet play. Details per stage in each stage doc; the why in `docs/LORE.md`.

## Whole-game loop
| Scale | What the player does | Why they keep going |
|---|---|---|
| Inside a stage | That stage's loop (see its doc) | Its own goals and rewards |
| Between stages | Finishes a stage; its lineage carries into the next, bigger world | Sees how earlier choices shaped what comes next |
| Whole game | Raises three spacefaring species and builds their fleet | Defeating T0&#124;▼&#124; |

## Win and lose
- Win: defeat `T0|▼|` (the rogue AI, see `docs/LORE.md`) in the space stage with a fleet built from three spacefaring species. Reaching space is not the win. *(Changed 2026-11-08, BAMF69.)*
- Lose: there is no game over for the Gardener, in any stage (pillar 1). What can be lost changes by stage: in the cell stage, food, a part or progress (never a form); later, branches and even whole species. Each stage doc says what its setbacks are.

## What carries between stages
The contract for every stage's inputs and outputs is `docs/HANDOFF_CONTRACT.md`. The rule that matters most for design:
**the player must be able to see how their influence shaped each trait** (pillar 2), all the way to the ship tech in
the space stage (cautious creatures build strong shields, aggressive ones strong weapons, adaptable ones fast engines).
**Each stage can shift a temperament at most 50 % from where the stage before left it** (approved by BAMF69
2026-11-08): a 100 % aggressive cell is still at least 50 % aggressive after the aquatic stage, and can reach 0 % after
land/air. Early choices matter; no single stage locks the species in.

## Player fantasy and target audience
- Fantasy: watching your own odd little creature grow up, shaped by your choices, then realizing you were the hand shaping its world all along.
- Audience: BAMF69. The player should feel the pressure of a dangerous world and the pride of surviving it, never cheated.
- Comparable games (2 to 3) and what we do differently: Spore (we stay top-down 2D, evolution is steered through the environment rather than built in an editor, real setbacks but no game over), Stardew Valley (you are the creature, not a farmer), Endless Sky (your fleet comes from species you raised, and the enemy adapts to your tech).

## Art and audio direction (game-wide)
Each stage doc adds its own palette, scale and camera. Across all stages:
- Lit and moody, like a nature documentary, at every scale: the microscope at the start, the lens pulling back each stage.
- Organic vs. geometric: everything alive is irregular and organic; `T0|▼|` and its traces are perfect geometry (hexagons, lattices, flawless symmetry). Players should learn to read straight lines as danger.
- Light from the top-left. Food and other things the player needs stay the brightest things on screen.
- Art source: code-drawn (`tools/art/pixel_sprite.py`) + free packs (Kenney and others, each license checked; `/asset-intake`).
- Sound source: made in code (Wavesmith, `tools/audio/wavesmith/`) + free packs (`/asset-intake`).
- Fill the style fragments in `BRIEFS.md` from this section and the active stage's doc.

## Platform and engine target
- Engine: see `ENGINE.md` (Phaser 4, 2D). Storefront: web, played in the browser on Windows *(Claude's pick)*.
- **One engine for every stage, as long as it holds** *(Claude's pick, agreed 2026-11-08)*: all five stages, including the Endless Sky style space stage, fit 2D Phaser. A stage that needs another engine must make the case in an ADR (`docs/adr/`) and still read and write the lineage file from `docs/HANDOFF_CONTRACT.md`, so saves cross engines.
- Code layout: one folder per stage under `src/game/` (`cell/`, later `aquatic/`, `land/`, `civ/`, `space/`), shared code in `src/core/`.
- Input: keyboard, gamepad optional *(Claude's pick)*

## Risks and unknowns (game-wide)
| Risk | Why it matters | How we test it cheaply |
|---|---|---|
| Scope: five stages are five small games | The project never finishes | Each stage must be fun as a Toy before the next starts; a stage can stay a Toy |
| A hands-off simulation feels random | Breaks "tense but fair" and pillar 2 | Aquatic Toy: can BAMF69 say why a trait changed, from what the screen showed? |
| Choices do not visibly carry over | The stages feel like unrelated games | Play the aquatic Toy from two very different cell lineages: do they start visibly different? |
| A stage wants a different engine | Two toolchains, saves that do not cross | The lineage file is engine-neutral JSON from day one |

## Out of scope (explicit)
- Building any stage after the cell stage until the cell stage is fun (its doc may be outlined; nothing gets coded)
- Online play, including the connected mode where other players' species fill your universe (`docs/LORE.md`; parking lot until solo works)
