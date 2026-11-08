# Architecture

> How the code is organized and why. Keep it short and true. Update when structure changes.
> Last reviewed: 2026-11-07

## Big picture
```
<Boot> -> <Main loop/scene> -> <Systems> -> <Rendering/Audio/UI>
```
Replace with a real diagram as soon as one exists (ASCII is fine).

## Layers (dependency direction: top depends on bottom, never upward)
1. **Game**: gameplay rules, entities, levels, content
2. **Systems**: input, physics helpers, audio, UI, save, camera
3. **Core**: logging, time, math, events, config, RNG
4. **Engine/platform**: provided by Web (Phaser 4 + TypeScript + Vite)

Rule: Core knows nothing about Game. Pure logic in Core and Game should be testable without the engine.

## Directory map
Engine-specific folder layout is documented in `docs/ENGINE.md`. Universal folders:
| Folder | Contents |
|---|---|
| `docs/` | All documentation and SOPs |
| `tools/` | Dev scripts, `dev.py` command wrapper, hooks |
| `tests/` | Automated tests |
| `.claude/` | Claude Code settings, skills, subagents |

## Key systems
| System | Responsibility | Entry point | Tests |
|---|---|---|---|
| Cell rules | Diet, eating, points, upgrades, growth, evolution, part slots, bump outcomes (no Phaser) | `src/game/cell/rules.ts` | `tests/cellRules.test.ts` |
| Cell tuning | Every feel number for the cell stage | `src/game/cell/tuning.ts` | via rules tests |
| Pond movement | Swim physics, wander, knockback, autoplay pilot maths (no Phaser) | `src/game/cell/steer.ts` | `tests/cellSteer.test.ts` |
| Atlas lookup | Sprite rows by name from pixel_sprite.py JSON | `src/game/cell/atlas.ts` | `tests/cellSteer.test.ts` |
| Cell HUD | Form, food meter, part slots, diet, points, toasts | `src/game/cell/hud.ts` | smoke screenshot |
| Upgrade panel | E panel: 4 upgrades, levels, costs; pond keeps moving | `src/game/cell/upgradePanel.ts` | smoke + by hand |
| Diet picker | 3 diet cards at start and each evolution; pauses the pond | `src/game/cell/dietPicker.ts` | by hand |
| Upgrade looks | Overlay layers (fin, paddles, membrane, mandibles) synced to the body's frame | `MainScene.syncUpgradeLayers`, `assets_src/sprites/player_upgrades.py` | `upgradeTier` in `tests/cellRules.test.ts` |
| Pond mood | Dark falloff, top-left light wash, lamp pool (gradient images under the HUD, not a camera shader) | `src/game/cell/mood.ts` | smoke screenshot |
| Sound effects | Clips from data/audio_events.json through the kit AudioPlayer; one shared AudioContext | `src/game/cell/sfx.ts` | smoke (SFX_READY) |
| Pond organisms | Per-kind table (hp, speed, size, chase, bite, meat, count per form) incl. the gulper predator; refill toward `cellsWanted` | `TUNING.cell.kinds`, `MainScene` (spawnCell, moveCells, bumps, refill) | `tests/cellRules.test.ts` (predators, ramming) |
| Gulper mind | FSM: wander / hunt (you or prey; prey preferred at equal distance; sticky) / sated after eating / tired after chasing you | `src/game/cell/predator.ts`, `MainScene.thinkGulper`, `gulps` | `tests/cellPredator.test.ts` |
| Autoplay pilot | What the ?autoplay pilot swims at and buys | `src/game/cell/pilot.ts` | `tests/cellPilot.test.ts` |
| Pond scene | Wires rules + movement to sprites; spawns, bumps, pickups | `src/game/MainScene.ts` | `dev.py smoke --drive play:N --query autoplay` |

## Data flow and events
Direct calls. MainScene owns all pond objects and asks the pure rules module what each event does (eat, addPart, bump). The Creature record is immutable: rules return a new one.

## State and save data
- What persists, format, version field, migration plan.
- Rule: save files carry a version number from day one.

## Determinism and randomness
- Seeded RNG, one source. Needed for replays, tests, and reproducing bugs.
- Pond: one `Phaser.Math.RandomDataGenerator(["amber-pond"])` per scene start, so every run lays out the same pond.

## Budgets
| Budget | Target | Measured on | Last measured |
|---|---|---|---|
| Frame time | e.g. 16.6 ms (60 FPS) | min-spec machine, release build | |
| Memory ceiling | e.g. 2 GB | | |
| Load time | e.g. under 5 s to menu | | |
| Triangles per asset class | see `docs/sop/SOP-11-3d-pipeline.md` (prop, kit, hero, NPC) | `tools/blender/validate_asset.py` | |
| Min-spec hardware | CPU, GPU, RAM | | |
Set these early (`SOP-10`), measure before optimizing, update the last column when you measure.

## Debug tooling
- Debug overlay, console commands, cheat keys, log channels. List them here so Claude and testers can find them.
- `?debug`: collision circles (player magenta, mouth pull green, pond cells yellow), gulper sight rings, state labels and target lines; log channel `cell` (EVOLVED, PART, POP, GULP, HUNT player).
- `?autoplay` (+ `&diet=herbivore|carnivore|omnivore`): a pilot plays the pond and buys upgrades; the diet picker is skipped. Log lines: DIET, UPGRADE. `python tools/dev.py smoke --drive play:<seconds> --query autoplay --screenshot <png>`.

## Open questions
- 
