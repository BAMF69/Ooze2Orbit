# Handoff

**Last updated:** 2026-11-13
**Branch:** `feat/cell-division`. User authorized committing all repository changes on 2026-11-13; no push requested.
**Active:** Full-pond cell HUD, clear equipment, birth and aquatic entry presentations built. Other stage touch adapters and remaining HD rendering/form art follow. User says all stages play well (2026-11-13).

## Civilization controls branch — 2026-11-14
- `feat/civilization-remaster` is based on fd0f29d in sibling `Ooze2Orbit-civilization`.
- User approved playtest and authorized commit/push of this civilization work on 2026-11-14.
- 1 Hero / 2 Builder / 3 Summons, matching native touch buttons, independent build cursor,
  obstacle-aware hero move orders and optional automatic combat patrol.
- User revised the pause-menu preference: compact submenus run live above the controls and leave
  both mazes visible. Details and explicit shell/rotation pause still freeze the battle.
- Farmer workers cost 35 ore and add 6 food per payday; gatherer output stays unchanged.
- 476 tests, type/11-shader checks and civilization GPU production smoke pass. Browser checks
  cover desktop, emulated touch/controller, live menus/paydays, placement, rematch and space.
- No shared shell/core changes, assets/dependencies or creature/space/save contract changes.
  Physical-device validation remains. Detailed record: `docs/HANDOFF_CIVILIZATION.md`.

## Full-pond HUD, birth and aquatic entry (2026-11-13)
- User requested clearer spikes, birth after diet choice, five stage icons, aquatic animations around the
  temperament reveal, red/green/blue temperament graphics, full-pond HUD overlay and four growth sections.
- User explicitly withdrew health-bar request after learning cell damage loses food. No health mechanics added.
- Picked-up spikes now render an eight-thorn ivory crown independent of purchased attack mandibles. The same
  equipment painter supplies world bodies, daughters and mitosis; HUD SVG symbols show parts/perks and Jet cooldown.
- Cell canvas fills the viewport. Its camera zoom prevents exposing space outside the pond on tall screens;
  native HUD respects cutouts. Growth sections track existing 40/90/140 food gates; Form 4 is complete without
  another food requirement. Colors follow the diet in each form. Controls sit top-center; inventory top-right.
- Stage menu uses five original SVG icon cards with text options below, preserving menu action IDs and input routing.
- `LifeSequence` plays a scene-clock birth after diet selection, descent before aquatic temperament and arrival
  after confirmation. Simulation/input wait; pause/rotation hold progress. Reduced Motion uses a brief static
  presentation. Continue/autoplay/debug aquatic starts skip these entry presentations as appropriate.
- Shared native temperament chart is red aggressive, green cautious, blue adaptable, with separate diet badge.
  Percentages still derive from the normalized cause log and sum to 100. Hide removes aquatic chart before other panels.
- Validation: 470 unit tests; type/shader checks; cell/aquatic GPU production smokes; pseudo-locale passes.
  Browser GPU checks cover desktop/phone stage cards, birth pause/input freeze, edge-to-edge canvas, actual spike
  pickup, parts/perk icons, growth, pre/chart/post aquatic flow, exact simulation freeze, rotation and fully
  equipped short-landscape touch-controls/bar separation. Screenshots are in sibling outputs.


## Cell motion, asset rollout and game start (2026-11-13)
- User approved style, asked for wriggling/velocity-facing cells, matching remaining cell assets, logo and landing.
- `cell/swimMotion.ts` smoothly follows velocity by shortest angle, keeps heading at rest, adds speed-sensitive
  squash/wriggle. Reduced Motion removes oscillation; pause/choices freeze it; game speed scales its clock.
- Illustrated renderer covers player, sisters, four pond organisms, food and pickups. Inked organic equipment
  follows body rotation and appears in cards/mitosis. Hidden container retains legacy simulation anchors,
  fading and pop tweens without rendering old sprites; scene shutdown owns cleanup. Art log A-0021.
- Game start now has an original logo, illustrated evolution-to-orbit key art, translated copy and entry button;
  keyboard/controller entry and consent stay intact. Main menu shares branding and retains all actions.
- 468 unit tests; type/shader checks; GPU production gameplay and pseudo-locale smoke. GPU browser tests at
  1440x900 and 375x812 exercised title/menu entry, art loading, facing/wriggle, reduced motion, pause freeze,
  equipment/daughter cards, division and transition cleanup. Screenshots in sibling outputs.
- Future: distinct form illustrations, richer swimming poses and higher-resolution world rendering. Other
  stage assets remain prototypes; actual phone/controller hardware checks remain pending.

## Input schemes and cell remaster (2026-11-13)
- Auto defaults by pointer capability, follows deliberate keyboard/mouse, controller or touch input; ignores
  passive mouse movement/isolated stray taps. Settings → Controls → Control scheme persists an override.
- Scheme and viewport remain separate. Modes update without scene restart or losing selections.
- Default pad left stick supplements D-pad. Native dialogs navigate/focus/confirm via real buttons;
  injected scene actions are guarded against recursive activation. Existing key/pad rebindings retained.
- Cell has a captured multi-touch left stick and right action buttons (Upgrades, conditional Jet/Evolve).
  Inputs release on pause, modal, cancellation, rotation, scheme change and shutdown. Other stages retain
  their native responsive controls; dedicated touch movement/action adapters remain to implement.
- User selected smooth biological illustration with inked cel shading (Borderlands reference). First
  original three-diet body strip is integrated in cell play, sisters, cards and mitosis. Native previews
  use higher-density canvases. Cell UI has its first polished panel/status treatment. A-0020 logs art.
- `docs/HD_REMASTER.md` explicitly tracks remaining world-render resolution, form animation, enemies,
  food/parts and later-stage art; this is not the complete remaster. No new dependency.
- Validation: 466 unit tests, type/shader check, production cell smoke; Chromium emulation for actual
  touch movement/release, rotation, menus and cleanup; simulated PS pad for menu navigation/left stick.
  Physical phone/tablet/controller checks remain pending. ADR 0006 records input policy.

## All-stage display rollout (2026-11-13)
### Space outfitting diagram restored
- Responsive hangar now includes a live ship/slot diagram, reusing original atlas frames, slot positions
  and colors. Desktop places it beside the purchase/removal controls; phones stack it above them.
- Preview redraws only on hull/part changes; it hides outside the hangar and is removed with StageUi.
- Verified: add/remove changes pixels, hull switch redraws, phone bounds, launch hiding, scene cleanup;
  461 unit tests, type/shader checks and space production smoke. Screenshots in sibling outputs.

### Creature entry / stage handoff repair
- Creature Toy 2 now opens the shared temperament reveal; gameplay and queued inputs wait for confirmation.
- Stage writes synchronize the surviving diet. Reveals also recover the aquatic daughter's diet from older
  stage blocks whose species-level diet was stale. Creature checkpoints carry their upstream lineage source;
  matching generations resume, different sources/diets start fresh. Legacy matching-diet saves remain usable.
- Verified crash: CreatureScene.draw read a destroyed camera after startGame stopped its scene synchronously.
  Creature and civilization result handlers now return immediately after advancing to the next stage.
- Regression: 461 unit tests; type/shader checks; production creature smoke; isolated Playwright scenario
  reproduced old crash, then passed reveal freeze, legacy herbivore handoff, G2 reload and creature→civ→space.

- User explicitly requested aquatic, creature, civilization and space receive cell's display changes.
- Shared safe-area bounds, Pause/Fullscreen buttons, adaptive framing and explicit rotation resume
  now cover all five stages. `stageViewport` policies preserve world/simulation coordinates.
- `game/stageUi.ts` provides readable native status/details, scrollable dialogs and command buttons.
- Aquatic: native reveal, health/stamina bars, purchases and layered daughter cards; Gardener sheet
  leaves the habitat visible. Camera projection, warning edges, backgrounds and cutscene text adapt.
- Creature: bounded following camera in portrait, native status and generation choices, offscreen
  approaching-predator message. Room geometry and inherited generation state unchanged.
- Civilization: pure `civ/layout.ts` stacks mazes in portrait; pointer cells share the draw transform.
  Native commands/details pause battle clocks; tower selection closes immediately before placement.
- Space: native icon outfitter/fitted-part removal, map routes and commands; flight camera centers,
  edge warnings and wormholes adapt. Commands/details pause combat. Raw held keys clear on pause.
- Shell stops the old stage before starting another: no stale simulation or orphan native panels.
- Validation: 459 tests, type/shader checks, production GPU smoke for four stages; browser pointer
  checks for purchases, placement, heir/daughter selection, command pause, rotation freezes, held
  input clearing, fullscreen and cleanup. Phone/tablet checks are emulated, not physical-device proof.
- No new dependencies/assets/save schema. Thumb stick, expanded controller bindings, offline
  preparation and HD asset replacement remain separate work. ADR 0005 records the adapter choice.

## Cell display foundation slice (2026-11-13)
### Temperament follow-up (BAMF69 2026-11-13)
Computer layout approved. User reported 100% cautious plus 100% aggressive; replaced independent
meters with competing normalized shares totaling 100%. Later stages normalize prior + evidence
and interpolate to keep the existing 50pp cap. Empty histories are balanced; largest-remainder
display rounding totals exactly 100. Old lineage caches refresh on SaveStore reads/writes from
unchanged cause logs, preserving progression and unknown fields. Tied leaders are named as tied.
Regression coverage includes 800 varied signed transitions and a browser-rendered legacy 100/100
save becoming 50/50/0. Touch/controller work remains next; other prototype playtests still pending.

- Pure `core/viewport.ts` computes cell camera/physical bounds; `shell/viewport.ts` reads safe-area
  CSS and viewport changes. Cell opts into variable camera dimensions; remaining stages keep 640x360.
- Status, diet/daughter cards and upgrade rows use native responsive DOM/CSS with readable text and
  scrolling. Original atlases supply animated layered daughter previews. Pause freezes preview clock.
- Pause/Fullscreen buttons, minimum 44px button targets and details/parts panel. Existing keyboard
  and gamepad choice actions retained; no new input defaults. Native focused buttons accept Enter/Space.
- Rotation pauses and clears held/queued input. Explicit resume required; rotation in Settings keeps
  its stack and paused world. Mood and mitosis reflow without regenerating the pond or offers.
- Same food, world dimensions, physics, purchases, daughter/perk rules. Upgrade panel still leaves
  the pond running, as previously approved. No new art/dependencies/save changes.
- Validation: 445 unit tests, type/shader checks, production/browser scenarios, existing mitosis
  regressions. Phone/tablet sizes are Chromium emulation, not physical Safari/Android certification.
- Next: touch stick/right action controls and controller improvements; then user's real-device tests.
- Foundation plan: `docs/PLATFORM_FOUNDATIONS.md`; implementation decision: ADR 0004.

## Foundation planning interview (2026-11-13)
User requested simple guided questions; interview complete. Confirmed choices and implementation
order are recorded in `docs/PLATFORM_FOUNDATIONS.md`, linked from GDD/ROADMAP. The first display slice
is now implemented. Initial slice: shared viewport/safe areas, rotation pause/resume and cell
layout; then input/touch, offline/checkpoints, and individual stage adapters. Art style stays open.

## Civilization Toy 2 (2026-11-13)
- `CivWarsScene` now registers as civ. Pure `civ/wars.ts` owns deterministic simulation and BFS routes;
  `warsTuning.ts` owns balance values. Old Toy 1 is unregistered pending replacement playtest.
- Two 11x7 mazes, ore/food economy, gatherers and builders, thorn/mortar/mist defenses,
  reedrunner/shellback/briar-brood sends, previewed rival waves and permanent kill/send income.
- Keep routes open: placement validates entrance and existing units; builders divide work among queues.
- Hero inherits creature strength/vitality/claws. Claws cross defenses. J/F bite, Space pulse, WASD move;
  Q/U cycle command, E execute at hero cell. Click command buttons and own grid for construction.
- Rich ore helps sends (+60% payday ore); rocky ground helps defense (35% cheaper construction).
- Cautious/balanced lineage faces a raider with larger waves; aggressive lineage faces a warden with
  an extra tower. Deterministic rivals are a prototype pick.
- Destroy rival base or reach 5x nominal rival income. Fallen settlement offers immediate rematch;
  hero wounds cost 5 ore and 10s recovery. Neither ends the garden.
- Victory writes base_destroyed/economic_supremacy, spending/maze/hero causes and technology heritage.
  Space accepts both new names and older conquest/trade/faith saves; most-used tech grants a part.
- No mid-match save, selling/upgrades, research/probe or campaign in this first toy. Original sprites reused;
  no new assets/dependencies. Creature hero art stays the shared terrestrial placeholder.
- Validation: unit suite, type/shader checks, production GPU smoke; real browser pointer construction,
  sends, keyboard hero, pulse, pause freeze, win recording/rematch; ordinary-resource strategy simulations.

## Creature Toy 2 (2026-11-13)
- Normal menu Creature starts `CreatureGenerationScene`, a connected six-room side-view world.
- Two routes: strength 4 breaks the stone wall; inherited claws climb the upper wall (hold W against it).
- J/F bite, S hide, Space jump, E interact/trap/nest/seed; shared action bindings also support gamepad.
- Die or return to the nest after exploring: pick drought/flood, then one of three daughters.
- Deterministic contrasting heirs are a prototype pick: bites improve Stonejaw, cliff/jumping unlocks
  Vinefoot claws, plants/stealth improve Mossheart, traps add its strength. No mid-life upgrades.
- Drought supplies more meat and +1 bite damage; flood supplies plants, slows predators and conceals crouching.
- Opened routes, discovered rooms, traits and history persist; unfinished lives restart at the nest.
- Checkpoint slot `creature_generations` is validated and included in normal export/import. Choose Creature
  from the menu to resume it (the existing Continue button still targets aquatic).
- Crown seed writes a creature hero/abilities into lineage and offers civilization (still its old Toy).
- Existing original sprites reused; no new dependencies/assets. Old creature scene unregistered pending playtest.
- Limits: handmade screen-sized rooms, guaranteed contrasting heirs rather than weighted random rolls,
  simple trap/guardian, terrestrial sprite baseline (aquatic diet/temperament carry, body-plan art pending).
- Validation: type check, unit tests, production GPU smoke and real browser scenarios; see stage doc.

## Confirmed direction
- BAMF69 likes the hybrid cell stage (2026-11-13) and requested its split + daughter choices in aquatic.
- Keep active pickups and E-menu purchases in both stages. Daughter bonuses supplement that loop.
- Normal cell starts at Form 1, no immediate choice or siblings. Form 1 food restored to 28 algae,
  2.5s regrowth, meat 2; later forms keep 42 algae, x1.5 regrowth, meat 3.
- Cell Form 4 keeps playing; Enter with E closed refreshes lineage and moves into aquatic.
- Cell daughter bonuses grant full +2 above purchase cap 5; aquatic purchases stop at 10 and daughters
  likewise add full +2 above it. Purchase panels display extra levels as 5+N / 10+N.

## Aquatic implementation (2026-11-13)
- Each food-driven advancement to Forms 2, 3, 4 freezes the world, plays the split using aquatic
  swimmer/part sprites, then opens three choices. Reduced motion is a brief fade.
- One herbivore/carnivore/omnivore; inherit stats, parts, river uniques, currency and thickness.
  Distinct food-weighted stats add +2; a free normal slot can grow a corresponding aquatic part.
- Unchosen sisters now found persistent map-local lineages: shared food, growth, autonomous splitting,
  telegraphed bites/bumps, player ram kills and loot. Rivers leave them in the departure map.
- No new aquatic exclusive-perk set. Sister timing/population/NPC stat cap are your picks; playtest pending.
- Water, threats, population, timers and river current wait; early input clears. Keyboard/gamepad or click.
- Selection resumes the existing swim/river loop and exit/mouth rules; Form 4 keeps swimming.
- Deterministic pending seed + feeding evidence survive Continue; exact offers return. Confirmed
  choices never repeat. Existing no-mid-river-save policy remains: reload returns to prior map save.
- History and final levels go to aquatic lineage; bonus levels count once in the cause log.
- Save parser validates optional metadata and preserves valid over-cap levels (health to 16, others 17).
- Modules: aquatic/division.ts, aquatic/divisionPicker.ts; cell/mitosis.ts now accepts stage body factories.
- Numbers: AQ.division, AQ.mitosis. No new dependencies, art or audio.

## Validation
- Wrapper check passes, 11 shaders compile; all 424 tests pass.
- Recorded aquatic picker smoke passes; split frames and choice screen visually inspected.
- Interactive Chromium passes all three growth choices, inherited progress, keyboard/click selection,
  frozen world/river current, exact pending Continue, confirmed Continue, and final lineage records.
- Cell animation regression passes: input lock, pause clock, restored player, reduced motion, cleanup.
- Preview: parent outputs/aquatic-daughters.png. Test scripts in sibling work/ are not repo changes.

## Sister ecology and future requirements (2026-11-13)
- `aquatic/sisters.ts`: engine-free AI/food/combat/reproduction; `sisterView.ts`: actual body/part sprites,
  growth, family labels and attack tells. AQ.sisters owns all tuning. Old saves remain compatible.
- All map populations persist in optional run `sisters`; inactive maps freeze. Continue preserves IDs,
  ancestry, health, food and bodies. Render sprites clear on leaving; inhabitants never migrate.
- Live ecology checks pass: rejected variants, shared-food removal, growth/three-descendant birth,
  visible windup/damage, ram death/loot, map leave-return, river origin, coast separation and Continue.
- Future confirmed plan: HD/fullscreen, complete controllers and mobile after prototypes prove fun.
  Shared render/UI/input foundations first; per-stage polish afterward. GDD records open production specs.

## Windows runtime
- Git 2.56.1, LFS 3.8.1, Node 26.13.1, Python 3.15.2. Server via wrapper at localhost:5173.
- PATH needs C:\Program Files\Git\cmd; C:\Program Files\nodejs; C:\Python315.
- PLAYWRIGHT_BROWSERS_PATH = absolute sibling work/playwright; npm_config_cache = sibling work/npm-cache.
- Pillow not installed; smoke PNG bursts supported. No dependency installed for video/GIF export.

## Next
BAMF69 plays aquatic normally: are form choices worth anticipating and do they fit the swim/river pacing?
Do not make further design changes until notes. Cell vertical slice waits; space Toy playtest still pending.
