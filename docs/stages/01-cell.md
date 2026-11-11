# Stage 1: Cell

> Stage design doc. Short beats complete. Game-wide rules (pillars, lore, win and lose, what carries between stages)
> live in the spine, `docs/GDD.md`; this file covers only what is special to the cell stage.
> Split out of `docs/GDD.md` on 2026-11-08 (content unchanged except where marked). Last reviewed: 2026-11-08
> Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69.
> **Status:** built. Toy done 2026-11-08 (BAMF69: "the cell stage is fun"); next tier Vertical slice, paused while
> the aquatic Toy is built (the stage's tier lives in the spine's stage table).

## Identity
- **Pitch:** Eat, fight and evolve your way up from a single cell, in a dark little pond under the microscope.
- **The twist:** A top-down evolution game with real stakes, seen as if under a lit microscope: what you eat and which
  creatures you beat decides the parts your creature is built from.
- **Reference games for this stage:** Spore's cell stage for the eat-and-grow loop (mechanics only, nothing else).
- **Modes:** avatar mode only. There is no god mode in the cell stage: it is the hidden first act, and the player does
  not yet know they are the Gardener (`docs/LORE.md`).
- **Where it sits in the game:** first of five. It receives nothing (it always starts fresh) and hands the first
  lineage to the aquatic stage (`docs/HANDOFF_CONTRACT.md`).

## How the pillars apply here
1. **Tense but fair:** other creatures hurt you: every bump or bite knocks food out of you, and you have to win it back
   fast. You are never popped (BAMF69 2026-11-08: "I like how it plays currently"). This is the lowest-stakes stage;
   later stages raise them. Every danger is readable before it hits. Rules out game overs, ending the run,
   timers, and losing a form you already evolved into.
2. **You shape your creature** *(pillar 2 rewritten 2026-11-10: the upgrade panel below is replaced by division, see "Division"; the built Toy still has it)*: your diet (herbivore, carnivore, omnivore), the upgrades you buy (algae
   earns plant points for defense and mobility; meat earns meat points for attack and speed), and the parts you pick up
   from beaten creatures (spikes, shell, filter mouth) make the creature yours. Rules out evolutions picked for the
   player. This is the only stage where traits are chosen directly; from the aquatic stage on, evolution is a simulation.
3. **Small world, growing bigger:** the smallest world in the game, one pond on one slide.

## Core loop
```
pick a diet -> swim around -> eat what your diet allows (algae or meat) or fight a creature -> grow, earn plant or meat points, or collect its part -> spend points on upgrades, add the part -> decide what to go after next -> back to swim around (evolve: pick your diet again)
```
Time per loop: about 15 to 30 seconds *(Claude's pick)*. The fun must be present in this loop before anything else gets built.

| Scale | What the player does | Why they keep going |
|---|---|---|
| Every ~30 seconds | Eats food or beats a cell | Grows a little, or gets a new part |
| Every ~10 minutes | Evolves into a new form with the parts chosen | Sees the creature visibly change |
| Whole stage | Reaches the last form | The pond floods from outside the slide: on to the aquatic stage *(ending: parking lot)* |

## Pond rules (2026-11-08)
- **Momentum:** your cell is heavy in the water: it starts, stops and turns slowly, and each form is heavier
  (`TUNING.player.heaviness`). Each mobility level lightens it; full mobility gives the snappiest handling at any form.
  Top speed is not affected (that is the speed upgrade). Thrust also builds up while you hold a direction
  (`TUNING.player.spoolS`), so getting going is the slowest part.
- **Gulpers favour you:** at equal distance they come for you; a small cell distracts one only when it is clearly
  closer (`TUNING.gulper.playerWeight`, `preyWeight`).
- **The pond fights itself:** pond cells that touch bump each other, each taking half of what the other's bump costs
  you (`TUNING.cell.cellOnCellMult`).
- **Every death drops loot:** whatever kills a cell (you, another cell, a gulper swallowing it), it drops its part and
  its meat where it died. A cell killed by the pond drops only half its meat (`TUNING.cell.otherKillMeatMult`).

## Division: evolving for real *(proposed 2026-11-10, BAMF69; confirmed the same day as how pillar 2 works in every stage; not built yet)*
**"Choose your favorite daughter"** (BAMF69 2026-11-10): division **replaces the upgrade panel and its plant and meat
points**. What you did since the last division (what you ate, what you fought, what you fled) makes some changes more
likely in the daughters *(Claude's pick)*; you pick the one to keep. The cell stage is the first test of the new pillar 2
(`docs/GDD.md`): if choosing daughters is fun here, the later stages follow.
Why: a playtester pointed out that picking up parts is not evolution. Division adds the missing pieces (variation,
inheritance, selection) to the cell stage. It works for the machine path too: there it is `T0|▼|` copying itself with
errors (`docs/LORE.md`, "The flip").
- **When the food meter fills, your cell divides** into a few daughters, each a slightly changed copy of you. *(Claude's
  picks:)* three daughters; each gets one random change (a part swapped for a variant, a stat nudged up or down, a body
  shape shift); the screen shows each change before you choose.
- **You pick one daughter to keep playing** (BAMF69).
- **The others stay in the pond as rivals** (BAMF69): same diet, after the same food. You have to out-compete them.
  *(Claude's picks:)* you see how the variants you passed up do; a sibling that fills its meter first divides too, so
  its line can spread through the pond. That is pressure, not a loss: no game over (pillar 1).
- **Real science behind the parts:** bacteria do take up genetic material from dead cells nearby (transformation, a
  kind of horizontal gene transfer), and mitochondria began as swallowed cells. Absorbing a dead cell's part can be
  framed that way in the game's text *(Claude's pick)*.
- **Open:** does the diet picker stay at each division? Does picking a daughter record temperament (choosing the spiky
  one leans aggressive)? How many siblings before the pond is too crowded? Does it replace the form count or sit on top?

## Stage win and lose
- **Stage end:** reach the last form (`TUNING.maxForm`) and pick its diet: the lineage is saved and a banner offers
  the evolve; Enter starts the aquatic stage with that lineage (2026-11-08). The ` key (or `?finish`) ends the
  stage at once, for testing. The flood cutscene is still in the ROADMAP.
- **Lose:** none. Bumps and bites cost food. You are never popped, never lose a part to damage, and never lose a form
  you already reached (2026-11-08).
- **Played on its own:** the cell stage always starts fresh, so it needs no default lineage.

## Scope tiers (this stage)
| Tier | Contents | Done means |
|---|---|---|
| **Toy** | Swim a pond, eat food, beat other cells to collect 2 or 3 parts (for example spikes = attack, shell = defense, filter mouth = plant diet); adding a part visibly changes your cell; evolve twice | Someone wants to keep playing for 2 minutes |
| **Vertical slice** | 1 polished level or loop, art, audio, UI, save | Looks and feels like the final game |
| **MVP / Release** | Minimum content that makes a shippable stage (the lineage export is already built) | Passes `/release-check` |
| **Stretch** | Everything else | Only after release scope is locked |

The current tier is recorded in the spine (`docs/GDD.md`, "Stages" table and the `Current tier:` line).

## Content list (MVP)
| Item | Count | Status |
|---|---|---|
| Levels / areas | 1 pond | toy |
| Enemies / obstacles | 3 small cells (prickle, snail, sipper) + 1 predator (gulper, more per form) | toy |
| Player abilities | | |
| Music tracks | | |
| SFX sets | | |

## Systems overview
List each system in one line and link to `ARCHITECTURE.md` for how it is built.
Mark which ones the **vertical slice** needs. Everything marked "no" waits, otherwise the AI invents assumptions you never tested.
| System | One line | In the vertical slice? |
|---|---|---|
| Health and damage | | yes |
| Weapons / abilities | | one only |
| Enemies and bosses | | 1 or 2 types, 1 boss |
| XP, skill trees, economy, world map, save | | no |
| Lineage export (handoff) | Records diet picks and behavior; at the stage's end writes the lineage per `docs/HANDOFF_CONTRACT.md` (save slot `lineage`). Built 2026-11-08; never shown in this stage (temperament is revealed at the transition into the aquatic stage, BAMF69 2026-11-08) | built |

## Controls
| Action | Keyboard/Mouse | Gamepad |
|---|---|---|
| Move | Arrow keys or WASD *(Claude's pick)* | D-pad (left stick: parking lot) |
| Upgrade panel | E toggles; arrows + Enter or click buy (the pond keeps moving) | not yet (parking lot) |
| Diet picker (start, each evolution) | Left/right or A/D + Enter, or click (pauses the pond) | d-pad + south |

## Tunables that define feel
These live in data, not code. File: `src/game/cell/tuning.ts` (swim speed, heaviness and thrust build-up (momentum), food to evolve, part strengths,
bump food loss, pond counts, diet multipliers, meat value, upgrade costs and per-level effects, upgrade look tiers,
the mood colors and light)

## Art and audio (this stage)
Game-wide direction is in the spine. Cell-stage specifics:
- Look: *(changed 2026-11-07 from "cute cartoon", BAMF69: "less childish"; mockup D in
  `captures/progress/08-style-mockups.png`)* a nature documentary under a microscope. Creatures are organisms, not
  mascots: membranes with rim light, visible nucleus and organelles, cilia, small beady eye spots (no big cartoon eyes,
  no blush). Light comes from the top-left; the pond is dark, with a dark falloff toward the screen edges.
- Palette / resolution / camera: muted, desaturated organics (ochre player, wine, slate blue, olive enemies) on deep
  teal water; food stays the brightest thing on screen (faintly glowing algae, raw red meat) so it is never lost in
  the dark. 32x32 sprites, 640x360, top-down camera following the player.
- Music: ambient, watery, a little tense.
- SFX: soft, wet and organic (blips, squelches, pops), short and low in the mix.
- `T0|▼|` hint *(parking lot)*: rarely, a perfect hexagonal fleck drifts in the background. Gulpers avoid it. Nothing
  explains it.

## First-time user experience (FTUE, from E05 in `docs/EVIDENCE.md`)
Teach the mechanics by playing, not by a wall of text. Lock out advanced options until the lesson is passed.
| Lesson | Mechanic taught | How we know they got it |
|---|---|---|
| 1 | | |

## Assumptions to test (feeds the vertical slice)
| Assumption | How we will know (observable) |
|---|---|
| Surviving the pond is tense and fun for two minutes | BAMF69 keeps playing after the two evolutions |
| An evolution feels like a reward | BAMF69 wants to see the next form |
| Picking parts feels like a real choice | BAMF69 tries different part combinations |
| A bite stings but feels fair | BAMF69 plays on after losing food and can say what bit them |

## Risks and unknowns
| Risk | Why it matters | How we test it cheaply |
|---|---|---|
| | | |

## Out of scope for this stage
- God mode (it starts in the aquatic stage)
- Online play
