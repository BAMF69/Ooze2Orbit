# Ooze2Orbit: Game Design Document

> Living document. Short beats complete. Update with `/gdd-sync` when reality diverges from this page.
> Last reviewed: 2026-11-07
> Written from the kit's start-up interview with BAMF69. Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69.

## Identity
- **Title:** Ooze2Orbit (picked by BAMF69 2026-11-07, first as "Ooze to Orbit"). Repo: github.com/BAMF69/Ooze2Orbit, playable at bamf69.github.io/Ooze2Orbit
- **One-line pitch:** A moody, lit, top-down pixel-art game where you play a little creature that eats and battles its way up from a single cell to the stars.
- **Genre:** Evolution adventure
- **Perspective:** 2D top-down
- **Reference games (2 to 3) and what you borrow from each:** Spore for the stage-by-stage evolution (cell, water, land, civilization, space) and building your own creature; Stardew Valley for the readable top-down pixel art. Same kind of mechanics only: no Spore names, creatures, art, music or look; everything here is this game's own.
- **The twist:** A top-down evolution game with real stakes, seen as if under a lit microscope: what you eat and which creatures you beat decides the parts your creature is built from.

## Pillars (3 max)
Pillars decide arguments. If a feature does not serve one, it goes to the Parking lot.
1. **Tense but fair** *(rewritten 2026-11-07 after the first playtest: "too cozy")*: other creatures can hurt and pop you, and getting popped sets you back for real (food, a part, progress toward the next form). Every danger is readable before it hits. Rules out game overs, ending the run, timers, and losing a form you already evolved into.
2. **You build your creature**: your diet (herbivore, carnivore, omnivore), the upgrades you buy (algae earns plant points for defense and mobility; meat earns meat points for attack and speed), and the parts you pick up from beaten creatures (spikes, shell, filter mouth) make the creature yours. Rules out evolutions picked for the player.
3. **Small world, growing bigger** *(Claude's pick)*: each stage plays in a bigger world than the last. Rules out a huge map at the start.

## Core loop
```
pick a diet -> swim around -> eat what your diet allows (algae or meat) or fight a creature -> grow, earn plant or meat points, or collect its part -> spend points on upgrades, add the part -> decide what to go after next -> back to swim around (evolve: pick your diet again)
```
Time per loop: about 15 to 30 seconds *(Claude's pick)*. The fun must be present in this loop before anything else gets built.

Loop at three time scales (if you cannot fill all three, the game's structure is not clear yet):
| Scale | What the player does | Why they keep going |
|---|---|---|
| Every ~30 seconds | Eats food or beats a cell | Grows a little, or gets a new part |
| Every ~10 minutes | Evolves into a new form with the parts chosen | Sees the creature visibly change |
| Whole session | Advances to the next stage (cell, water, land, civilization, space) | A bigger world and new ways to play; winning means reaching space |

## Player fantasy and target audience
- Fantasy: watching your own odd little creature grow up, shaped by your choices.
- Audience: BAMF69. The player should feel the pressure of a dangerous pond and the pride of surviving it, never cheated.
- Comparable games (2 to 3) and what we do differently: Spore (we stay top-down 2D, with real setbacks but no game over), Stardew Valley (you are the creature, not a farmer).

## Win and lose
- Win: reach the space stage.
- Lose: no game over. Bumps cost food; getting popped costs more (food, a part, progress toward the next form) and you come back nearby. You never lose a form you already reached.

## Scope tiers
| Tier | Contents | Done means |
|---|---|---|
| **Toy** | Cell stage only: swim a pond, eat food, beat other cells to collect 2 or 3 parts (for example spikes = attack, shell = defense, filter mouth = plant diet); adding a part visibly changes your cell; evolve twice | Someone wants to keep playing for 2 minutes |
| **Vertical slice** | 1 polished level or loop, art, audio, UI, save | Looks and feels like the final game |
| **MVP / Release** | Minimum content that makes a shippable product | Passes `/release-check` |
| **Stretch** | Everything else | Only after release scope is locked |

Current tier: **Toy**

Claude scopes work by this line (SOP-08 "Tiers"). Move it with `/next-tier` when the tier's "Done means" is met.

## Content list (MVP)
| Item | Count | Status |
|---|---|---|
| Levels / areas | | |
| Enemies / obstacles | Cell stage (toy): 3 small cells (prickle, snail, sipper) + 1 predator (gulper, more per form) | toy |
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

## Controls
| Action | Keyboard/Mouse | Gamepad |
|---|---|---|
| Move | Arrow keys or WASD *(Claude's pick)* | D-pad (left stick: parking lot) |
| Upgrade panel | E toggles; arrows + Enter or click buy (the pond keeps moving) | not yet (parking lot) |
| Diet picker (start, each evolution) | Left/right or A/D + Enter, or click (pauses the pond) | d-pad + south |

## Tunables that define feel
List the numbers that make the game feel right (gravity, jump height, coyote time, hit stop, camera lag).
These live in data, not code. File: `src/game/cell/tuning.ts` (swim speed and drag, food to evolve, part strengths, bump food loss, pond counts, diet multipliers, meat value, upgrade costs and per-level effects, upgrade look tiers, the mood colors and light)

## Art and audio direction
- Style, tone, and the kinds of enemies/NPCs the player sees: *(changed 2026-11-07 from "cute cartoon", BAMF69: "less childish"; mockup D in `captures/progress/08-style-mockups.png`)* lit and moody, like a nature documentary under a microscope. Creatures are organisms, not mascots: membranes with rim light, visible nucleus and organelles, cilia, small beady eye spots (no big cartoon eyes, no blush). Light comes from the top-left; the pond is dark, with a dark falloff toward the screen edges.
- Art source (who or what makes the finished art; the toy uses art drawn in code): code-drawn + free packs (Kenney and others, each license checked; `/asset-intake`)
- Palette / resolution / camera: muted, desaturated organics (ochre player, wine, slate blue, olive enemies) on deep teal water; food stays the brightest thing on screen (faintly glowing algae, raw red meat) so it is never lost in the dark. 32x32 sprites, 640x360, top-down camera following the player.
- Music mood and references (see `RESOURCES.md`): ambient, watery, a little tense
- SFX style: soft, wet and organic (blips, squelches, pops), short and low in the mix
- Sound source (who or what makes the finished sound): made in code (Wavesmith, `tools/audio/wavesmith/`) + free packs (`/asset-intake`)
- Fill the style fragments in `BRIEFS.md` from this section.

## First-time user experience (FTUE, from E05 in `docs/EVIDENCE.md`)
Teach the mechanics by playing, not by a wall of text. Example from a shipped browser game: level 1 introduces the basic tool, level 2 forces the harder tool (a stain the basic tool cannot clear), level 3 adds the timer. Lock out advanced options until the lesson is passed.
| Lesson | Mechanic taught | How we know they got it |
|---|---|---|
| 1 | | |

## Platform and engine target
- Engine: see `ENGINE.md`. Storefront: web, played in the browser on Windows *(Claude's pick)*.
- Input: keyboard, gamepad optional *(Claude's pick)*

## Assumptions to test (feeds the vertical slice)
Write these BEFORE building so you know what the slice is for.
| Assumption | How we will know (observable) |
|---|---|
| Surviving the pond is tense and fun for two minutes | BAMF69 keeps playing after the two evolutions |
| An evolution feels like a reward | BAMF69 wants to see the next form |
| Picking parts feels like a real choice | BAMF69 tries different part combinations |
| Getting popped stings but feels fair | BAMF69 plays on after being popped and can say what popped them |

## Risks and unknowns
| Risk | Why it matters | How we test it cheaply |
|---|---|---|
| | | |

## Out of scope (explicit)
- Every stage after the cell stage (water, land, civilization, space) until the cell stage is fun
- Online play
