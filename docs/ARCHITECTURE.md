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
All-stage display adapters (ADR 0005): `core/viewport.ts` selects stage-specific camera sizes;
`shell/viewport.ts` owns safe bounds and rotation notification. `game/stageUi.ts` owns native
status, dialogs, command buttons and atlas icons. Aquatic adapts its HUD and cell-style cards;
creature follows the avatar in a bounded room; `civ/layout.ts` shares maze draw/hit transforms;
space centers projected flight and exposes native shop/map commands. Shell stops the previous
scene before switching, so native panel lifecycles cannot outlive their stage.

Temperament shares: `core/lineage.ts` normalizes cell evidence and limits later-stage moves while
keeping a unit total. `temperamentPercentages` assigns integer rounding remainders. SaveStore
rebuilds the lineage slot's derived caches from original logs on read/write; no schema change.
`temperamentShares.test.ts` covers the mixed-build regression, rounding, signed shifts and old saves.

Display foundations (ADR 0004): `core/viewport.ts` is engine-free layout math; `shell/viewport.ts`
applies safe bounds and cell-only camera sizing. Cell UI uses native CSS-pixel panels via
`cell/responsiveUi.ts`, with original sprite-atlas previews. Shell owns rotation pause/resume;
scene shutdown removes panels/listeners. The remaining stage adapters now extend this foundation (ADR 0005).

Civilization Toy 2 registers `CivWarsScene` as `civ`. `civ/wars.ts` owns grid routes, placement validation,
construction, economy, deterministic rivals, combat and recording; `warsTuning.ts` owns balance data.
The scene handles shell actions and original sprites. `civWars.test.ts` covers routes, resources,
combat, victories and new/legacy space handoffs. See ADR 0003. Old CivScene remains unregistered.

Creature Toy 2 registers `CreatureGenerationScene` as `creature`. Engine-free `creature/generations.ts`
owns inheritance, climate, room graph and defensive checkpoint parsing; existing `creature/physics.ts`
owns movement. `creatureGenerations.test.ts` covers inherited gates, behavioral bonuses and export.
The old Toy 1 scene remains unregistered pending the replacement's playtest; no shared systems were removed.

| System | Responsibility | Entry point | Tests |
|---|---|---|---|
| Cell rules | Diet, eating, points, upgrades, growth, evolution, part slots, bump outcomes (no Phaser) | `src/game/cell/rules.ts` | `tests/cellRules.test.ts` |
| Cell tuning | Every feel number for the cell stage | `src/game/cell/tuning.ts` | via rules tests |
| Pond movement | Swim physics, wander, knockback, autoplay pilot maths (no Phaser) | `src/game/cell/steer.ts` | `tests/cellSteer.test.ts` |
| Atlas lookup | Sprite rows by name from pixel_sprite.py JSON | `src/game/cell/atlas.ts` | `tests/cellSteer.test.ts` |
| Cell HUD | Responsive native form/food/diet/points status, expandable parts/perks and upgrade button, independent of camera pixels | `src/game/cell/hud.ts` | phone/tablet browser scenarios |
| Cell division | Behavior-weighted bonus stats, compatible parts, unspent currency and perk inheritance; paused previews; unchosen siblings compete for food | `src/game/cell/division.ts`, `divisionPicker.ts`, `MainScene` | `tests/cellDivision.test.ts`, browser interaction checks |
| Diet picker | 3 diet cards at start only; pauses the pond | `src/game/cell/dietPicker.ts` | by hand |
| Upgrade looks | Overlay layers (fin, paddles, membrane, mandibles) synced to the body's frame | `MainScene.syncUpgradeLayers`, `assets_src/sprites/player_upgrades.py` | `upgradeTier` in `tests/cellRules.test.ts` |
| Pond mood | Dark falloff, top-left light wash, lamp pool (gradient images under the HUD, not a camera shader) | `src/game/cell/mood.ts` | smoke screenshot |
| Sound effects | Clips from data/audio_events.json through the kit AudioPlayer; one shared AudioContext | `src/game/cell/sfx.ts` | smoke (SFX_READY) |
| Pond organisms | Per-kind table (hp, speed, size, chase, bite, meat, count per form) incl. the gulper predator; refill toward `cellsWanted` | `TUNING.cell.kinds`, `MainScene` (spawnCell, moveCells, bumps, refill) | `tests/cellRules.test.ts` (predators, ramming) |
| Gulper mind | FSM: wander / hunt (you or prey; prey preferred at equal distance; sticky) / sated after eating / tired after chasing you | `src/game/cell/predator.ts`, `MainScene.thinkGulper`, `gulps` | `tests/cellPredator.test.ts` |
| Autoplay pilot | What the ?autoplay pilot swims at; scene auto-selects daughters | `src/game/cell/pilot.ts` | `tests/cellPilot.test.ts` |
| Lineage and temperament | The lineage file every stage hands on, the cause log, temperament maths with the 50 % per-stage shift cap (no Phaser; shared by all stages) | `src/core/lineage.ts` | `tests/lineage.test.ts` |
| Cell recording | Diet picks, rams, pops, bites, gulper escapes and lures; cell cause log and lineage, saved to slot `lineage` at the stage's end (log channel `lineage`) | `src/game/cell/record.ts`, `MainScene.saveLineage` | `tests/cellRecord.test.ts` |
| Pond scene | Wires rules + movement to sprites; spawns, bumps, pickups | `src/game/MainScene.ts` | `dev.py smoke --drive play:N --query autoplay` |
| **Aquatic stage (Toy)** | | | |
| Behind view | Pseudo-3D: camera behind the avatar at its height, point projection with height, back/side/front view choice, hidden-threat edge incl. above/below (no Phaser) | `src/game/aquatic/view.ts` | `tests/aquatic.test.ts` |
| Avatar physics | Turn-to-steer with the cell stage's momentum, rise and sink (seabed to surface), breach jump and underwater kick, dash | `src/game/aquatic/avatar.ts` | `tests/aquatic.test.ts` |
| Aquatic creature | Five stats (max = cell max x 2) from the cell lineage, plant/meat points, forms, parts, health, damage, dying, the movement numbers | `src/game/aquatic/creature.ts` | `tests/aquaticCreature.test.ts` |
| Critters | What darters, finrays, spinefish, shellbacks want (flee, chase, bite back, depth band), darter school targets; per-kind table `KINDS` | `src/game/aquatic/critters.ts`, `tuning.ts` | `tests/aquaticCreature.test.ts` |
| Maps and river runs | `MAPS` (pond, lake, coast: size, depth, counts, toughness, palette) and `RIVERS`; the run generator (every row passable), river physics (current, strafe, jump) | `src/game/aquatic/tuning.ts`, `river.ts` | `tests/aquaticRiver.test.ts` |
| Shark look | Aggression (lineage, attack, kills) -> 4 looks in the swimmer atlas | `creature.ts` aggression/sharkTier, `assets_src/sprites/aquatic_swimmer.py` | `tests/aquaticRiver.test.ts` |
| Aquatic upgrade panel | E: five rows to level 10, the cell panel's colours | `src/game/aquatic/upgradePanel.ts` | smoke + by hand |
| Stamina and unique parts | Pace (cruise / fast / still), drain and refill, ability costs; river parts in their own slots | `src/game/aquatic/creature.ts` | `tests/aquaticCreature.test.ts` |
| Admin panel (dev) | ` key: temperaments, go to any map or river, form, points, invincible | `src/game/aquatic/adminPanel.ts` | smoke `?admin` |
| The Gardener's lever | Body thickness -> health, bite damage, speed, turning; water temperature -> food, hunter and prey speed, hunter sight, stamina refill; the words for both | `src/game/aquatic/gardener.ts`, `AquaticScene.syncGardener` | `tests/aquaticGardener.test.ts` |
| Run saves and save files | The aquatic run packed for slot `aquatic_run` and read back clamped; the export bundle (lineage + run) and its checks; the menu's Continue / Export / Import | `src/game/aquatic/runSave.ts`, `src/shell/saveFiles.ts`, `AquaticScene.saveRun/loadRun` | `tests/aquaticRunSave.test.ts`, smoke `?continue` |
| Civilization stage (Toy 1) | Hex planet, three ways per region, machines, acts of god, the rival, tally and victory | `src/game/CivScene.ts`, `src/game/civ/rules.ts` | `tests/civ.test.ts`, smoke `?stage=civ&autoplay` |
| Creature stage (Toy 1) | World map + Fernwood sidescroller; three ways per obstacle | `src/game/CreatureScene.ts`, `src/game/creature/` (physics, level, ways, sight, worldMap, draw, tuning) | `tests/creature.test.ts`, smoke `?stage=creature&autoplay` |
| Sharks | Roam / hunt / rest; breach or distance ends a hunt; relentless or merciful below half health | `src/game/aquatic/sharks.ts`, `AquaticScene.moveSharks` | `tests/aquaticSharks.test.ts` |
| Body looks | Three temperament scores -> family and step -> swimmer atlas row; worn-part overlays | `creature.ts` lookScores/bodyLook, `aquatic_partlayers.py` | `tests/aquaticRiver.test.ts` |
| Seabed | Rocks push you off, seaweed tangles you | `src/game/aquatic/seabed.ts`, `AquaticScene.seabed` | `tests/aquaticCreature.test.ts` |
| Stage hand-over | The cell stage's end saves the lineage and offers the evolve; the shell starts the aquatic scene | `MainScene.evolveToAquatic`, `shell.startGame` | smoke `?autoplay&finish` |
| Population | Kin thickness evolves with water temperature; every generation returns a truthful cause line (seeded) | `src/game/aquatic/population.ts` | `tests/aquatic.test.ts` |
| Temperament reveal | Reads the cell lineage (save slot `lineage`) into rows with causes, or explains the default | `src/game/aquatic/reveal.ts` | `tests/aquatic.test.ts` |
| Aquatic HUD | Status, toasts, the red behind-you edge cue + chevron, reveal panel, lens panel | `src/game/aquatic/hud.ts` | smoke screenshots |
| Aquatic tuning | Every aquatic feel number (camera, avatar, prey, deepmaw, warning, lens, population) | `src/game/aquatic/tuning.ts` | via the tests above |
| Lake scene | Wires it together; reuses the gulper mind (deepmaws), cell swim maths and SFX loader | `src/game/AquaticScene.ts` | `dev.py smoke --drive play:N --query "stage=aquatic&autoplay"` |

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

Cell active building (2026-11-12): `MainScene` reconnects `UpgradePanel`, corpse part orbs and existing pure purchase/pickup rules. `cell/perks.ts` owns division-only perk ranks, food attraction, defensive multiplier and the Jet Burst cooldown state. `tuning.ts` owns all effect numbers. Upgrades close during selection, purchased progress carries through it, and Form 4 remains playable and the latest body is saved again immediately before aquatic starts.

Mitosis presentation (BAMF69 requested 2026-11-12, completed 2026-11-13): filling the food meter
first swells the parent, separates three actual daughter bodies with membrane bridges, then docks
them into their card previews before enabling the choice menu. `cell/mitosis.ts` owns rendering and
the scene-controlled clock; `TUNING.mitosis` owns timing/layout. Pond simulation and selection input
wait during the sequence. Pausing stops its clock. Reduced motion uses a short fade. Shutdown
destroys presentation objects; confirming a daughter restores the live player body. No new assets or dependencies.

Aquatic form division (2026-11-13): `aquatic/division.ts` generates deterministic food-weighted
inherited offers, and `aquatic/divisionPicker.ts` supplies actual aquatic body/part previews to the
shared `cell/mitosis.ts` choreography. `AquaticScene` gates world updates, upgrades, admin, river
progress and input until confirmation. Pending `me.divisionSeed`, `growthEvidence` and confirmed
`selections` survive the defensive run-save parser. `aquatic/record.ts` subtracts selected bonus levels
from purchased-level causes to avoid counting them twice. AQ tuning owns all new numeric parameters.

Aquatic sisters (2026-11-13): `aquatic/sisters.ts` separates perception/decision, steering, shared-food
consumption, telegraphed contacts and bounded autonomous reproduction. Data-only colony members have
permanent map IDs. `aquatic/sisterView.ts` projects inherited bodies and parts through the same camera
as other fish, owns labels/growth cues, and drops only visuals on map transitions. `AquaticScene` adapts
real item removals, player hits, ram kills/loot and warnings. `runSave.ts` shares its defensive creature
reader and persists the entire colony. Paused selections, lens/river modes and inactive maps never tick it.
