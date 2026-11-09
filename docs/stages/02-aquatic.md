# Stage 2: Aquatic

> Stage design doc. Short beats complete. Game-wide rules (pillars, lore, win and lose, what carries between stages)
> live in the spine, `docs/GDD.md`; this file covers only what is special to the aquatic stage.
> Rebuilt from `docs/stages/_TEMPLATE.md` on 2026-11-08, when this became the active stage. Last reviewed: 2026-11-08
> Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69. Everything else was decided by BAMF69.
> **Status:** active stage, Toy tier. v1 built and played 2026-11-08 ("I like the movement... feels empty"); v2
> built the same day (vertical swimming, dash and breach, stats to 10, plant/meat points, forms, new parts, five
> creature kinds); v3 the same day: three maps joined by two river runs, the shark look, fish fighting fish,
> healing food, health bought with either points, E upgrades / U lens; v4 the same day: stamina (Shift cruise /
> full speed, Q dash), river parts in their own slots, part icons explained, the endurance muscle replaces the
> lateral line, rivers twice as long, real darter schools, the admin panel (`), and the cell stage now evolves
> into this one; v5 the same day: slender shark looks, invincible mode (admin), stamina retuned (min 10 for full
> speed, half the drain, double the cruise refill), Space kicks you up in rivers, the river part glows gold, the
> seabed does things (rocks bounce, weed slows) and has its own texture per map, cheaper upgrades, bigger rewards
> (kelp blooms, medium and large meat), generation notes at the bottom; v6 the same day: sharks (lake: one medium;
> coast: three mediums and one large), bodies shaped by all three temperaments, parts worn on the body, darter
> schools break off before killing you, a clickable admin panel, dash and breach cost a flat 50 stamina, upgrades a
> little dearer, the river part shows up later, no more seabed blobs growing into the camera; v7: river hits hurt
> twice as much, dying costs half your food progress, a health bar, full-speed streaks, a shark banner and hunt
> music, the large shark is a hammerhead, cutscenes for the leaps into and out of the rivers. Waiting for BAMF69's playtest.
> Play it: main menu "Aquatic stage (prototype)". Code: `src/game/AquaticScene.ts`, `src/game/aquatic/`.

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
   every stage). Your creature has health and can die; a relative carries on, and you lose the food toward your next
   form and your newest part (never a form or an upgrade). Spinefish chase and bite, shellbacks bite back when rammed,
   deepmaws hunt you. Predators are bigger and some attack from behind. **Every danger stays
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
-> swim behind your creature, seabed to surface: eat algae (seabed) and plankton (surface) for plant points,
   ram creatures (dash = your attack) for meat points and their parts; flee hunters (red cue + sound)
-> spend points on five stats (U, max 10), grow through three forms (bigger, tougher, more part slots)
-> look down the lens (god mode): change the water -> the population breeds, a trait drifts, the screen says why
-> back into a creature, now a little different -> swim again
```
Time per loop: about 30 to 60 seconds in avatar mode between looks through the lens *(Claude's pick)*.

| Scale | What the player does | Why they keep going |
|---|---|---|
| Every ~30 seconds | Eats, escapes or catches something | Grows; survives a threat |
| Every few minutes | Changes the water; a generation passes | Sees a trait drift and why |
| Whole stage | Steers the lineage through the lake | The body plan and temperament it hands to land/air |

## Maps and river runs (v3, BAMF69 2026-11-08)
One map per form, joined by a minigame:

| # | Where | Form | What changes |
|---|---|---|---|
| 1 | **Pond** | 1 | 1800 px, depth 200 (the v2 lake: "the current depth is perfect") |
| 2 | **River run 1** (the part: gold, spinning, sparkling, a twinkle when it comes into view; Space kicks you up) | reach 2 | breach in the river mouth's light; a fast, narrow channel (7200 px: twice the first build): steer through rock walls, over riverbed rocks, under logs (or jump them); the **endurance muscle** is found only here |
| 3 | **Lake** | 2 | 2400 px, depth 320; tougher (hp x1.6, bites x1.5), more deepmaws and spinefish |
| 4 | **River run 2** | reach 3 | faster and narrower (9200 px); the **torrent tail** is found only here |
| 5 | **Coast (ocean)** | 3 | 3000 px, depth 420, sandy seabed; the deadliest (hp x2.4, bites x2.2) |

The river mouth is a shaft of light by the shore; the HUD points to it once you are big enough. Dying in a river
sends you back to its start. Numbers: `MAPS` and `RIVERS` in `src/game/aquatic/tuning.ts`; the run generator
guarantees a way through every row (`src/game/aquatic/river.ts`, tested).

## Sharks (v6, BAMF69 2026-11-08)
A shark roams until it notices you, then hunts you until you **breach** (it loses you) or get far away
(`src/game/aquatic/sharks.ts`, tested). After a bite it peels off for a moment.

| Map | Sharks | Below half health |
|---|---|---|
| Lake | one medium (bigger and faster than the deepmaw, bite 40) | it hunts you relentlessly, from anywhere |
| Coast | three mediums | they leave you alone unless you get too close |
| Coast | one large (slower, bite 110) | relentless, like the lake's |

Numbers: `SHARKS`, `SHARK_MIND`, `MAPS[].sharks`.

## The body's look (v6: all three temperaments)
The strongest temperament picks the family, its strength the step (`creature.ts` lookScores / bodyLook):
aggressive -> a shark (below); cautious -> armoured (bronze, plates, a spiny ridge, then flank spines; also from
defense, health and plates); adaptable -> streamlined (teal-violet, long flowing fins, an iridescent stripe, tail
streamers; also from speed, mobility and breaches). Parts are worn on the body too (overlays: fins, jaws, plates,
gills, a red muscle band, a golden tail).

## The shark look (v3)
"The more aggressive your creature gets the more shark-like it becomes" (BAMF69). Aggression = the cell stage's
aggressive temperament (50 %), attack level (35 %) and your kills (15 %); four looks: the ochre fish; a taller
dorsal fin; grey countershading and teeth; a shark (slate grey, crescent tail, gill slits). Your kin share it.
Each step up is announced (pillar 2). Numbers: `AQ.shark`.

## Your creature (v2, BAMF69 2026-11-08)
- **Stats:** attack, speed, defense, mobility and health, max 10 (the cell stage's 5, doubled each stage). They
  start at the cell stage's final levels (health is new, from 0). Plant points buy defense, mobility; meat points
  buy attack, speed (the cell stage's split); health takes either, or a mix (v3). Bought in the upgrade panel (E,
  as in the cell stage); pillar 2 amended for this. Every food pickup heals 1 hp (v3).
- **Forms:** 3, by food (70, then 120). Each is bigger, has more health and one more part slot (1, 2, 3).
- **Parts (all new here):** fins (+3 mobility), jaws (+6 ram damage), plates (bites x0.75), gills (half dash
  cooldown, slow healing). Dropped by finrays, spinefish, shellbacks, deepmaws. Full slots swap out the oldest.
  The river parts are found only in their run and have their own two slots, on top of the normal ones (v4):
  endurance muscle (double stamina; replaced the lateral line, "not very helpful"), torrent tail (dash 1.3x faster,
  cooldown x0.6). Dying keeps them. The HUD shows every part as an icon with what it does.
- **Stamina (v4, retuned v5):** max 100 in this stage, not upgradeable (the endurance muscle doubles it). Shift
  toggles cruise (55 % speed, refills 10 a second) and full speed (drains 9 a second); holding still refills it fast.
  Full speed needs at least 10 to switch on; below 10 the bar is red and says "out of breath"; at 0 you drop to
  cruise. Dash (Q) and breach each need and use half. Gauge bottom right. Numbers: `AQ.stamina`.
- **The seabed (v5):** rocks are solid and push you off (no damage); seaweed tangles you (half speed for 1.5 s).
  The pond has fewer of both. Each map's seabed has its own look: pond mud and pebbles, lake stone slabs and
  gravel, coast sand ripples and shells. Numbers: `AQ.seabed`, `MAPS[].rocks/weeds`.
- **Bigger rewards (v5, "progression is too slow"):** great kelp blooms (ram or dash them open: 6 big plant pods);
  spinefish and finrays drop medium meat, shellbacks and deepmaws large meat. Upgrades cost about 45 % less.
- **Fish fight fish (v3):** deepmaws hunt every kind (darters swallowed whole, bigger fish bitten until they die);
  darter schools sometimes swarm a bigger fish, or you (v4: the schools now keep together, and swarm in 3D:
  v3 circled over a still player). Every death drops meat and the part, whoever caused it.
- **Abilities:** dash (Shift: a burst past top speed; a ram while dashing hits 1.5x) and jump (Space: at the surface
  a breach into the air and back; underwater a short kick up).
- **Creatures:** darters (schools of prey, a mouthful), finrays (shy, near the surface, drop fins), spinefish (chase
  and bite, drop jaws), shellbacks (armoured grazers on the seabed, bite back when rammed, drop plates), deepmaws
  (the gulper's mind, drop gills). Every death drops meat and the part.

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
| Levels / areas | 1 lake, seabed to surface (Toy) | toy |
| Creatures | your species + 5 kinds: darter, finray, spinefish, shellback, deepmaw (Toy v2) | toy |
| Parts | 4: fins, jaws, plates, gills (Toy v2) | toy |
| God-mode levers | 1: water temperature (Toy) | toy |
| Traits that drift | 1: body thickness (Toy) | toy |
| Music tracks | | |
| SFX sets | eat, bite (chomp), behind-you warning, dash, breach (reused cell sounds + 2 new) | toy |

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
| Turn | A/D or left/right arrows | D-pad |
| Swim forward / slow down | W/S or up/down arrows | D-pad |
| Swim up / down | R / F (BAMF69 2026-11-08) | Right / left trigger |
| Jump (breach at the surface, kick underwater) | Space | South |
| Cruise / full speed (toggle) | Shift | Left bumper |
| Dash | Q | Right bumper |
| Admin panel (dev) | ` (the key above Tab) | none |
| Upgrade panel | E toggles (as in the cell stage); arrows + Enter, or click | North |
| Look down the lens (god mode) and back | U (BAMF69 2026-11-08) | Select |
| Change the water (god mode) | Left/right (arrows or A/D) | D-pad |
| Let a generation pass (god mode) | Enter (one also passes on its own every 60 s) | South |
| Leave the temperament reveal | Enter or E | South or north |

## Tunables that define feel
File: `src/game/aquatic/tuning.ts`: camera height, distance behind the avatar, field of view, horizon
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
