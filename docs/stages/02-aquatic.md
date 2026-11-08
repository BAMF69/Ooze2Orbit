# Stage 2: Aquatic

> Stage design doc. Short beats complete. Game-wide rules (pillars, lore, win and lose, what carries between stages)
> live in the spine, `docs/GDD.md`; this file covers only what is special to the aquatic stage.
> Rebuilt from `docs/stages/_TEMPLATE.md` on 2026-11-08, when this became the active stage. Last reviewed: 2026-11-08
> Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69. Everything else was decided by BAMF69.
> **Status:** active stage, Toy tier, not built yet.

## Identity
- **Pitch:** The pond becomes a lake. You swim behind your creature through deep, dark water, and for the first time
  the Gardener's hand shapes the world it lives in.
- **Reference games for this stage:** Spore's creature stages for "the body you built is the body you play"
  (mechanics only); classic pseudo-3D "Mode 7" racers for the camera technique only (a flat floor tilted toward a
  horizon, sprites scaled by distance). Nothing taken from either beyond the technique.
- **Modes:**
  - **Avatar mode** *(BAMF69 2026-11-08)*: a **pseudo-3D view from behind the creature**, like third person, drawn in
    2D Phaser. You steer one individual: eat, hunt, flee.
  - **God mode:** the Gardener looking down the lens, top-down. Shapes the water (temperature first, *(Claude's pick)*);
    the population evolves from that pressure.
- **Receives:** species `home` from the cell stage (`docs/HANDOFF_CONTRACT.md`): temperament, diet, final form, parts
  and upgrades (the starting body plan).
- **Hands on:** the `aquatic` block, branches, `gardener.harshness`, and the temperament after this stage (moved at most
  50 % from where the cell stage left it).
- **Played on its own:** starts from the default lineage, a balanced omnivore cell with all temperaments low.

## How the pillars apply here
1. **Tense but fair (stakes rise):** higher stakes than the cell stage (spine pillar 1: stakes and difficulty rise with
   every stage). *(Claude's pick, to confirm:)* your avatar can be killed; you carry on as a relative from the same
   lineage, and the individual's growth is lost. Predators are bigger and some attack from behind. **Every danger stays
   readable:** a predator outside the view, behind or beside you, gets a red cue on that edge of the screen and a
   warning sound before it can reach you (BAMF69 2026-11-08). Never lost: the stage, the lineage, a form already reached.
2. **You shape your creature, directly and indirectly:** directly through what the avatar eats, fights and flees;
   indirectly through god mode (the water's temperature in the Toy). Every trait change names its cause on screen
   ("the water cooled, so thicker bodies are spreading").
3. **Small world, growing bigger:** one lake, about four times the pond's area, with depth you can see into
   *(Claude's pick)*. Later tiers grow it toward a sea.

## Core loop
```
(stage opens: your temperament is revealed for the first time, with its causes from the cell stage)
-> swim behind your creature: eat, hunt, flee (red cue: something behind you) -> grow
-> look down the lens (god mode): change the water -> the population breeds, a trait drifts, the screen says why
-> back into a creature, now a little different -> swim again
```
Time per loop: about 30 to 60 seconds in avatar mode between looks through the lens *(Claude's pick)*.

| Scale | What the player does | Why they keep going |
|---|---|---|
| Every ~30 seconds | Eats, escapes or catches something | Grows; survives a threat |
| Every few minutes | Changes the water; a generation passes | Sees a trait drift and why |
| Whole stage | Steers the lineage through the lake | The body plan and temperament it hands to land/air |

## Stage win and lose
- **Stage end** *(Claude's pick; decide at the slice):* the lineage reaches a body plan ready to leave the water, or a
  set number of generations.
- **Lose:** none for the Gardener. The avatar can die (you carry on as a relative); the lineage cannot end in this
  stage *(Claude's pick)*.
- **Opening:** the transition from the cell stage is where temperament is shown for the first time (BAMF69
  2026-11-08). The flood ending of the cell stage (parking lot) can lead into it later.

## Scope tiers (this stage)
| Tier | Contents | Done means |
|---|---|---|
| **Toy** | 1. **Behind-view swim:** one lake in pseudo-3D from behind your creature, reusing the cell stage's movement, momentum, eating and bump rules; one predator with the behind-you warning (red edge cue + sound). 2. **Temperament reveal:** the stage opens by showing the cell lineage's temperament and its causes (or the default lineage). 3. **One lever, one trait:** god mode (a hard cut to top-down is fine for the Toy) changes water temperature; a small population of your species breeds over generations, and one trait drifts with a named cause | BAMF69 wants to keep swimming for 2 minutes, **and** can say why the trait changed from what the screen showed |
| **Vertical slice** | 1 polished lake loop, art, audio, UI, save, the smooth lens move between modes | Looks and feels like the final game |
| **MVP / Release** | Minimum content for a shippable stage (more levers, branches, lake to sea, the stillness zone) | Passes `/release-check` |
| **Stretch** | Everything else | Only after release scope is locked |

## Content list (MVP)
| Item | Count | Status |
|---|---|---|
| Levels / areas | 1 lake (Toy) | not started |
| Creatures | your species + prey + 1 predator (Toy) | not started |
| God-mode levers | 1: water temperature (Toy) | not started |
| Traits that drift | 1 (Toy) | not started |
| Music tracks | | |
| SFX sets | swim, eat, bite, behind-you warning (Toy) | not started |

## Systems overview
How each is built goes in `docs/ARCHITECTURE.md` once it exists. Code lives in `src/game/aquatic/` (spine, "Platform").
| System | One line | In the vertical slice? |
|---|---|---|
| Behind-view camera | Logic stays top-down (x, y, heading); a projection draws the floor and the sprites from behind the avatar | yes |
| Behind-you warning | Predators outside the view light the screen edge they come from, red, plus a warning sound | yes |
| Avatar movement | The cell stage's swim rules (`src/game/cell/steer.ts`, momentum from `rules.ts`), steered by turning | yes |
| Temperament reveal | Reads the lineage (save slot `lineage`) and shows each temperament with its causes | yes |
| Population and generations | A small population breeds; one trait drifts with the lever's pressure; every change names its cause | yes |
| God-mode lever | Water temperature, set from the top-down lens | yes |
| Branches, outer gardens, stillness zone | Later tiers or other stages | no |

## Controls
| Action | Keyboard/Mouse | Gamepad |
|---|---|---|
| Turn | A/D or left/right arrows *(Claude's pick)* | Left stick or d-pad |
| Swim forward / slow down | W/S or up/down arrows | Stick up/down or d-pad |
| Look down the lens (god mode) and back | Tab *(Claude's pick)* | North button |
| Change the water (god mode) | Left/right or click | D-pad |

## Tunables that define feel
File: `src/game/aquatic/tuning.ts` (to create): camera height, distance behind the avatar, field of view, horizon
height, draw distance and fog; turn rate; warning distance and angle; predator speed and sight; generation length;
how far a trait drifts per generation per degree of temperature.

## Art and audio (this stage)
- **Look:** the same lit, moody nature documentary as the cell stage, one lens step out. Deep water fades into dark
  teal toward the horizon (fog hides the draw distance); the lake floor has specks, stones and weed for speed and
  depth cues. Light from the top-left above the surface.
- **Sprites:** the avatar is seen from behind, so creatures need back and side views (not just top-down). The first-art
  floor still applies (`CLAUDE.md`): real pixel-art sprites from `tools/art/pixel_sprite.py`, with a brief per creature.
- **Camera:** pseudo-3D behind view in avatar mode; top-down in god mode.
- **Music:** ambient, deeper and slower than the pond.
- **SFX:** soft and wet like the cell stage; the behind-you warning is a distinct, low sound that cuts through the mix.
- **`T0|▼|` hint:** a meteor fragment with lattice markings on the lake floor; near it, traits stop varying (the
  first "stillness zone"). Not in the Toy.

## First-time user experience (FTUE)
| Lesson | Mechanic taught | How we know they got it |
|---|---|---|
| 1 | Steering from behind (turn, swim, momentum) | They reach a first food without circling |
| 2 | The red cue means "behind you" | They turn or dodge when it lights up |
| 3 | The lens changes the water, the water changes the creatures | They say why a trait changed |

## Assumptions to test (feeds the vertical slice)
| Assumption | How we will know (observable) |
|---|---|
| Swimming from behind feels good with the cell stage's momentum | BAMF69 keeps swimming for 2 minutes |
| The behind-you warning keeps danger readable | BAMF69 can say what attacked them, and dodges more often after a few tries |
| Seeing the cell temperament makes the cell stage matter | BAMF69 recognizes their cell's choices in the reveal |
| A steered simulation does not feel random | BAMF69 says why the trait changed, from what the screen showed |

## Risks and unknowns
| Risk | Why it matters | How we test it cheaply |
|---|---|---|
| Phaser has no built-in pseudo-3D floor | The camera is the stage's look | Toy: project sprite positions and floor specks in code (as in the 2026-11-08 demo); a floor shader (`/shader`) only if the Toy needs more |
| The behind view hides danger | Breaks pillar 1 | The red edge cue + sound; playtest question above |
| Sprites seen from behind need more art | More frames per creature | Toy: back and side views only, crude on purpose |
| The simulation feels random | Breaks pillar 2 | One lever and one trait, each change named on screen |

## Out of scope for this stage
- The two outer gardens (the space stage, for now: spine "Out of scope")
- Branches, the stillness zone and lake-to-sea growth until the Toy is fun
- Online play
