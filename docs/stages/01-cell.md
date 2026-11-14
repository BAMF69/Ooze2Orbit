# Stage 1: Cell

> Stage design doc. Short beats complete. Game-wide rules (pillars, lore, win and lose, what carries between stages)
> live in the spine, `docs/GDD.md`; this file covers only what is special to the cell stage.
> Split out of `docs/GDD.md` on 2026-11-08 (content unchanged except where marked). Last reviewed: 2026-11-08
> Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69.
> **Status:** original Toy done 2026-11-08. Cell division prototype active, built 2026-11-12;
> awaiting BAMF69's playtest before the vertical slice.

## Identity
### Full pond and lifecycle presentation — 2026-11-13
Pond fills the viewport with native HUD overlaid. Four growth sections represent the existing forms;
there are still only three food thresholds. Clear spike crown and part/perk icons show inherited gear.
Diet choice triggers a pause-safe birth sequence. Advancing to aquatic shows descent, the color-coded
temperament reveal, then arrival. User withdrew health-bar request; cell damage still loses food.

### HD/input first pass — 2026-11-13
BAMF69 approved automatic input schemes with manual override and smooth biological illustration
with inked cel shading. The cell is the first touch-stick/action adapter and first art/UI slice.
Three original diet bodies now appear in play/cards/mitosis. Food, enemies, part layers, form animation
and world-render resolution were the next pass. Food, enemies, pickups, organic part/upgrade equipment
and pond background now match; cells wriggle and face velocity. Form-specific art and world-render
resolution remain future work. Details and art provenance: `../HD_REMASTER.md`.

### Temperament shares — BAMF69, 2026-11-13
The three temperaments now compete for one 100% total. Existing cause weights become relative
evidence; increasing one category lowers the other shares. Equal cautious/aggressive evidence with
none adaptable reads 50/50/0. Defaults are balanced; display rounding totals exactly 100. Existing
saved lineages recalculate from their unchanged cause logs. Later stages retain the 50pp shift cap.

### Display foundations — 2026-11-13
Cell hybrid gameplay is approved as fun. The first platform slice adapts its camera framing and UI
to portrait/landscape without changing world size or progression. Status and choice/purchase panels
use readable native UI, stack/scroll on narrow screens and retain state across rotation. Rotation
pauses until Resume; desktop gets a Fullscreen button. Original sprite previews and mitosis remain.
Phone/tablet emulation is verified; physical device testing and touch movement controls are next.
See `docs/PLATFORM_FOUNDATIONS.md`. Offline play and new save adapters remain later work.

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
2. **You shape your creature** *(cell revision approved 2026-11-12: active leveling plus division)*: your diet (herbivore, carnivore, omnivore), the upgrades you buy (algae
   earns plant points for defense and mobility; meat earns meat points for attack and speed), and the parts you pick up
   from beaten creatures (spikes, shell, filter mouth) make the creature yours. Rules out evolutions picked for the
   player. The division loop below adds inherited bonuses and exclusive perks to these active rewards.
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

## Division plus active building (BAMF69 confirmed 2026-11-12; playtest pending)
The division-only prototype felt "shallow and boring without the part pickups and active stat leveling".
BAMF69 approved restoring both alongside daughters. This supersedes the earlier no-purchase cell rule.

Loop: choose initial diet -> swim / feed / fight -> collect parts and earn food points -> E to buy stat
levels -> food meter fills -> choose a daughter with inherited progress, bonus levels / compatible parts,
and a perk unavailable from pickups or the upgrade menu -> repeat -> final selection saves lineage.

- Fresh food earns plant/meat points again; lost food and duplicate parts cannot farm upgrade currency.
- Pond-cell deaths drop their parts again. Diet compatibility, slots, oldest-part replacement and duplicate
  food use the original rules. Stat purchases keep their original costs and level-5 cap; daughter bonuses can exceed it.
- Each division still offers one herbivore, one carnivore and one omnivore. Compatible parts, purchased
  levels, unspent points and previous perks carry forward; a carnivore sheds an unusable filter mouth.
- Behavior-weighted bonuses add 2 full levels, including beyond level 5 (BAMF69 confirmed 2026-11-12).
  Sample three distinct stats without replacement; capped purchased stats remain eligible.
- Three divisions retain four forms. Unchosen daughters keep their offered bodies/diets and compete
  for edible food; at most six, with no autonomous reproduction or combat yet.
- Daughter cards show diet, bonus levels, perk rank/effect and cause. Left/right or A/D + Enter,
  gamepad south or click chooses. Pond pauses; the E panel closes so purchases cannot alter previews.
- Perks are saved in `stages.cell.perks`; each selection records its perk, diet, bonus and evidence.
  Purchased and daughter stat levels both contribute temperament once. Temperament stays hidden until aquatic.

### Exclusive perk prototype (your picks, 2026-11-12)
Each daughter offers one of these, currently paired with diet to make the options easy to compare:
- Herbivore: **Food Sense** pulls nearby edible food, 90px per rank. Works on meat too if a later daughter changes diet.
- Carnivore: **Jet Burst**, Space / gamepad south: a 0.4s burst at 2.4x top speed; 5s recharge, reduced by 1s per rank.
- Omnivore: **Soft Landing** reduces food lost per hit by 25% multiplicatively per rank.
All perks persist when diet changes. Repeating one improves it to rank 3. Perk numbers and pairings await playtest.
Perk effects are cell-only for this prototype; the lineage preserves them for future stage work.

Tunables: `TUNING.division` and `TUNING.perks` in `src/game/cell/tuning.ts`.
Normal start is `/` (Form 1, no daughter choice or sibling competitors). Debug `?division&diet=omnivore`
forces a test division; `?autoplay&division` selects automatically. `?finish` tests the aquatic transition.

**Playtest:** Do pickups and leveling keep the time between divisions interesting? Do inherited bonuses
and exclusive perks make the daughter choice worth anticipating? Tune from BAMF69's next notes.

## Stage win and lose
- **Stage end:** reach the last form (`TUNING.maxForm`) and select its daughter: the lineage is saved and a banner offers
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
| Upgrade panel | E; arrows + Enter or click buy (pond keeps moving) | not yet |
| Jet Burst (perk required) | Space while swimming | south |
| Daughter choice | Left/right or A/D + Enter, or click (pond pauses) | d-pad + south |
| Diet picker (start only) | Left/right or A/D + Enter, or click (pauses the pond) | d-pad + south |

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

### Playtest tuning (BAMF69, 2026-11-12)
Food felt too scarce: algae count 28 -> 42, replenishment 50% faster, meat food per chunk 2 -> 3. Different daughter diets confirmed above. Playtest pending.

### Follow-up playtest (BAMF69, 2026-11-12)
"This is much more fun." Requested Form 1 food back at its previous values: 28 algae, 2.5s regrowth,
2 food per meat chunk; Forms 2–4 retain 42 algae, 2.5/1.5s regrowth, 3 food per meat chunk.
Growth thresholds remain 40 / 90 / 140. Form 4 must keep playing: swim, feed, pick up parts,
buy levels and use perks. Enter moves to aquatic only while the E panel is closed, saving the
current body again so post-Form-4 purchases and parts carry over. No Form 5 or extra divisions.

### Daughter bonuses exceed purchase caps (BAMF69, 2026-11-12)
E-menu purchases stop at level 5; daughter rewards always add the full +2, e.g. 5 -> 7 -> 9.
The menu shows `5+2` for level 7 and no further purchase. Bonus defense and mobility use diminishing
extra reductions/handling gains beyond 5 to avoid zero/negative movement values (your pick: coefficients
in `TUNING.overcap`). Visual stat layers retain the highest existing art tier. No new assets.

Mitosis presentation (BAMF69 requested 2026-11-12, completed 2026-11-13): filling the food meter
first swells the parent, separates three actual daughter bodies with membrane bridges, then docks
them into their card previews before enabling the choice menu. `cell/mitosis.ts` owns rendering and
the scene-controlled clock; `TUNING.mitosis` owns timing/layout. Pond simulation and selection input
wait during the sequence. Pausing stops its clock. Reduced motion uses a short fade. Shutdown
destroys presentation objects; confirming a daughter restores the live player body. No new assets or dependencies.
