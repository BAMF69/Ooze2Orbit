# Ooze2Orbit: Game Design Document (the spine)

> Living document. Short beats complete. Update with `/gdd-sync` when reality diverges from this page.
> Last reviewed: 2026-11-09
> Written from the kit's start-up interview with BAMF69. Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69.
> **This file is the spine:** what holds for the whole game. Each stage plays like its own small game with its own
> loop, controls, art scale and tiers, so each has its own design doc in `docs/stages/` (split 2026-11-08, BAMF69).
> Read this file, then the **active stage's** doc. Story and world: `docs/LORE.md`. What passes from one stage to the
> next: `docs/HANDOFF_CONTRACT.md`.

## Identity
- **Title:** Ooze2Orbit (picked by BAMF69 2026-11-07, first as "Ooze to Orbit"). Repo: github.com/BAMF69/Ooze2Orbit, playable at bamf69.github.io/Ooze2Orbit
- **One-line pitch:** A moody, lit, top-down pixel-art game where you raise life from a single cell to the stars, as the creature and as the unseen Gardener shaping its world, to build the alliance that can defeat `T0|▼|`.
- **Genre:** Evolution adventure; five stages, each a small game of its own
- **Perspective:** 2D. Top-down in the cell stage and in god mode; in the aquatic stage, avatar mode is a
  **pseudo-3D view from behind the creature** (approved by BAMF69 2026-11-08), still drawn in 2D Phaser; in the
  creature stage, avatar mode is a **side-view roguelike metroidvania** (BAMF69 2026-11-10); the civilization stage is
  a top-down **tower wars battler** (BAMF69 2026-11-10)
- **Reference games (2 to 3) and what you borrow from each:** Spore for the stage-by-stage evolution (cell, aquatic, creature, civilization, space); Stardew Valley for the readable top-down pixel art; Endless Sky for the space stage (fleet management, ship customization, space combat, a star map with jumps between systems, landing on planets; BAMF69 2026-11-09). The game is GPL-3.0-or-later like Endless Sky (BAMF69 2026-11-09, `docs/adr/0001-gpl-license-and-endless-sky.md`), so the space stage may adapt Endless Sky's code, data and, file by file with credit, its art. For the creature stage (BAMF69 2026-11-10): **Super Metroid** first, for a world whose areas open only once you have the right stat or ability; Rogue Legacy for runs where each new run is an heir with inherited traits; Everything is Crab for climate events, a living ecosystem, visible evolution and bosses that evolve (not its top-down view or mid-run menu picks); Donkey Kong Country's lit, moody side-view look *(kept from the 2026-11-09 design)*. For the civilization stage (BAMF69 2026-11-10): "tower wars" games (Line Tower Wars, Legion TD) for an RTS tower defense where you send monsters through the enemy's maze and build a maze against theirs. Same kind of mechanics and era style only: no names, characters, creatures, ships, story, art, music, level designs or look from any of them; everything here is this game's own.
- **The twist:** You are not only the creature. You are the Gardener looking down the lens (the top-down view), shaping the environment so life evolves on its own, because the enemy, a rogue AI, can counter anything designed but not what evolved. Less creature editor, more shaping the world that shapes the creature.

## Pillars (3 max)
Pillars decide arguments, in every stage. If a feature does not serve one, it goes to the Parking lot. Stage docs say
how each pillar applies there.
1. **Tense but fair** *(rewritten 2026-11-07 after the first playtest: "too cozy"; 2026-11-08, BAMF69: no "getting popped", stakes rise each stage)*: other creatures can hurt you and setbacks cost something real (in the cell stage, food knocked out of you). **Stakes and difficulty rise with every stage.** Every danger is readable before it hits, including danger the camera cannot see (a predator behind you gets a red cue and a warning sound). Rules out game overs, ending the run, timers, and losing a form you already evolved into.
   **After the cell stage** *(approved by BAMF69 2026-11-08; see `docs/LORE.md`)*: creatures and branches of a species can be hurt, pushed back and die out, and a spacefaring species can die out (a new one is generated to replace it). The Gardener (the player) cannot lose: there is no game over. A branch can be lost; the garden cannot.
2. **You shape your creature, directly and indirectly** *(rewritten 2026-11-08, approved by BAMF69; see `docs/LORE.md`)*: directly through the avatar (what it eats, fights and does), indirectly through the world you make as the Gardener (what is there to eat, what hunts it, what the climate demands). From the aquatic stage on, the **species'** evolution is a simulation the player steers, not an editor, and the player must always see how their influence shaped the creature's traits. **Amended 2026-11-08 (BAMF69):** the avatar's own stats (attack, defense, speed, mobility, health) stay a direct choice in every stage, bought with the plant and meat points it earns, and their maximum doubles each stage (5 in the cell stage, 10 in the aquatic stage). Rules out picking the species' traits from a menu after the cell stage. (Cell stage specifics: `docs/stages/01-cell.md`.)
3. **Small world, growing bigger** *(Claude's pick)*: each stage plays in a bigger world than the last. Rules out a huge map at the start.

## Stages
Each stage is fun on its own, can be played on its own (it starts from a default lineage when there is no save from
the stage before), and hands its lineage to the next through `docs/HANDOFF_CONTRACT.md`.

| # | Stage | Doc | Modes | Tier | Status |
|---|---|---|---|---|---|
| 1 | Cell | `docs/stages/01-cell.md` | Avatar | Toy done, **Vertical slice** next | Fun (BAMF69 2026-11-08); paused while the aquatic Toy is built |
| 2 | Aquatic | `docs/stages/02-aquatic.md` | Avatar (behind view) + god | Toy done, **Vertical slice** next | Toy v1-v9 played (BAMF69 2026-11-09: "this is great"); paused |
| 3 | Creature (was Land/Air) | `docs/stages/03-creature.md` | Roguelike metroidvania: each run a generation (avatar) + the Gardener between runs (god) | **Toy** (redesigned) | Redesigned 2026-11-10: Toy 1 (sidescroller levels, PR #8) is replaced by a roguelike Toy 2, not built yet |
| 4 | Civilization | `docs/stages/04-civilization.md` | Tower wars RTS: builders, gatherers, sends and defenses, your creature as the hero (avatar) + the Gardener's levers (god) | **Toy** (redesigned) | Redesigned 2026-11-10: Toy 1 (hex strategy, PR #10) is replaced by a tower wars Toy 2, not built yet |
| 5 | Space | `docs/stages/05-space.md` | Captain of an Endless Sky style fleet (avatar) + seeding the outer gardens (god) | **Toy** | Toy 1 built 2026-11-09 (**active**), playtest pending |

**Active stage:** Space (`docs/stages/05-space.md`), since 2026-11-09 (BAMF69: "building stage 5, the space stage,
starting at the Toy tier"). The cell, aquatic and creature stages each left Toy after BAMF69 played them; their
vertical slices wait. The civilization Toy is built and waits for its playtest.

Current tier: **Toy** (the active stage, Space; see its doc for what Toy means there)

Claude scopes work by this line (SOP-08 "Tiers"). It always shows the **active stage's** tier. Tiers (Toy, Vertical
slice, MVP / Release, Stretch) are kept **per stage**: each stage doc has its own "Scope tiers" table and "Done means".
When `/next-tier` moves a stage, update both this line and the stage's row in the table above. Starting work on a
new stage means making it the active stage here (and at Toy, it gets a full doc from `docs/stages/_TEMPLATE.md`).

## The two modes (from the aquatic stage on)
| Mode | In the lore | What the player does |
|---|---|---|
| **God mode** | The Gardener looking down the lens | Shapes the environment (food, temperature, currents, terrain, climate, predators, events). The simulation evolves the creatures |
| **Avatar mode** | The Gardener living inside one creature | Plays one individual directly: seen from behind (pseudo-3D) in the aquatic stage, side-on in the creature stage's roguelike, as the hero on the civilization stage's battlefield. What the avatar does, the lineage leans toward |

Switching is a smooth camera move: the overhead lens swings down behind the creature, like a microscope's focus knob
*(Claude's pick: keeps every stage 2D)*. Avatar mode's behind view is approved (BAMF69 2026-11-08); god mode stays top-down. The space stage
replaces both with fleet play. Details per stage in each stage doc; the why in `docs/LORE.md`.

## The Gardener rule *(BAMF69 2026-11-10)*
**Every decision the Gardener makes has a clear benefit for either the aggressive (carnivore) player or the cautious
(herbivore) player. Without that benefit, the game is difficult.** God mode is never optional decoration: a player who
ignores it, or picks against their own style, finds the stage hard.
- **Adaptable (omnivore) players** use the Gardener's benefits as they see fit, moment to moment: they can switch which
  side a lever favors as the situation changes.
- **Every stage doc lists its levers** and which side each one helps. A lever that helps nobody, or both sides equally,
  breaks this rule.
- Examples *(Claude's picks)*: aquatic, warm water brings more prey fish (aggressive) and cold water more algae and
  fewer predators (cautious); creature, a drought crowds animals at the waterholes (aggressive) and a flood drowns the
  predators' dens (cautious); civilization, rich ore pays for monster sends (aggressive) and rocky ground makes walls
  cheap (cautious).
- **Diet and temperament are strongly linked** (BAMF69 2026-11-10): carnivores lean aggressive, herbivores lean
  cautious, and omnivores are the gray area in the middle, where adaptable play lives.

## Whole-game loop
| Scale | What the player does | Why they keep going |
|---|---|---|
| Inside a stage | That stage's loop (see its doc) | Its own goals and rewards |
| Between stages | Finishes a stage; its lineage carries into the next, bigger world | Sees how earlier choices shaped what comes next |
| Whole game | Raises three spacefaring species and builds their fleet | Defeating T0&#124;▼&#124; |

## Win and lose
- Win: defeat `T0|▼|` (the rogue AI, see `docs/LORE.md`) in the space stage with a fleet built from three spacefaring species. Reaching space is not the win. *(Changed 2026-11-08, BAMF69.)*
- Lose: there is no game over for the Gardener, in any stage (pillar 1). What can be lost grows by stage: in the cell stage, food; later, branches and even whole species. Each stage doc says what its setbacks are.

## What carries between stages
The contract for every stage's inputs and outputs is `docs/HANDOFF_CONTRACT.md`. The rule that matters most for design:
**the player must be able to see how their influence shaped each trait** (pillar 2), all the way to the ship tech in
the space stage (cautious creatures build strong shields, aggressive ones strong weapons, adaptable ones fast engines).
**Each stage can shift a temperament at most 50 % from where the stage before left it** (approved by BAMF69
2026-11-08): a 100 % aggressive cell is still at least 50 % aggressive after the aquatic stage, and can reach 0 % after
the creature stage. Early choices matter; no single stage locks the species in.
**Temperament stays hidden in the cell stage** (BAMF69 2026-11-08): it is recorded but never shown, and is revealed
for the first time at the transition into the aquatic stage. From then on it stays readable, with its causes.

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
- Sound source: made in code (the cell stage's organic synth, `assets_src/audio/make_sfx.py`, which writes WAVs with Wavesmith's `wavfile.py`) + free packs (`/asset-intake`).
- Fill the style fragments in `BRIEFS.md` from this section and the active stage's doc.

## Platform and engine target
- Engine: see `ENGINE.md` (Phaser 4, 2D). Storefront: web, played in the browser on Windows *(Claude's pick)*.
- **One engine for every stage, as long as it holds** *(Claude's pick, agreed 2026-11-08)*: all five stages, including the Endless Sky style space stage, fit 2D Phaser. A stage that needs another engine must make the case in an ADR (`docs/adr/`) and still read and write the lineage file from `docs/HANDOFF_CONTRACT.md`, so saves cross engines.
- Code layout: one folder per stage under `src/game/` (`cell/`, `aquatic/`, later `creature/`, `civ/`, `space/`), shared code in `src/core/`.
- Input: keyboard, gamepad optional *(Claude's pick)*

## Risks and unknowns (game-wide)
| Risk | Why it matters | How we test it cheaply |
|---|---|---|
| Scope: five stages are five small games | The project never finishes | Each stage must be fun as a Toy before the next starts; a stage can stay a Toy |
| A hands-off simulation feels random | Breaks "tense but fair" and pillar 2 | Aquatic Toy: can BAMF69 say why a trait changed, from what the screen showed? |
| Choices do not visibly carry over | The stages feel like unrelated games | Play the aquatic Toy from two very different cell lineages: do they start visibly different? |
| A stage wants a different engine | Two toolchains, saves that do not cross | The lineage file is engine-neutral JSON from day one |
| The behind view hides danger | Breaks "every danger is readable" (pillar 1) | Aquatic Toy: the behind-you warning (red cue + sound); can BAMF69 say what hit them? |

## Out of scope (explicit)
- The two outer gardens before the space stage (BAMF69 2026-11-08: they are seeded only when the player chooses to
  interact with them, which for now happens in the space stage)
- The machine path (playing as `T0|▼|`, unlocked by destroying its Mothership; BAMF69 2026-11-10): planned, not built.
  Story decisions must keep it possible (`docs/LORE.md`, "The flip")
- Online play, including the connected mode where other players' species fill your universe (`docs/LORE.md`; parking lot until solo works)
