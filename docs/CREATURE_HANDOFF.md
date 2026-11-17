# Creature worktree handoff

Updated 2026-11-15. Owner: this creature chat. Branch `feat/creature-remaster`, isolated sibling
worktree `Ooze2Orbit-creature`, based on `fd0f29d`. User authorized committing and pushing this branch on 2026-11-15; no merge requested.

## Danger, trap objectives and vertical routes (2026-11-15)
User requested stronger enemies, charger stun, healthy-enemy trap alternatives, ceiling threats,
pits, top/bottom pathways and spatially correct returns. Implemented in the isolated worktree:

- Charger damage 3 + 0.75s stun; ambusher/swimmer damage 2; canopy dropper damage 3.
  Stun suppresses steering/jump/bite/use, keeps knockback/gravity and freezes in menus/pause.
  Damage grace remains 1.2s, longer than stun. Two unhealed hits end a base-health life.
- Rigging coil near x104: E collects parts. Net at x368: E arms/rearms one capture. Bait a
  rush/dive through the amber frame to immobilize a healthy enemy; no weakening/bites required.
  Captures consume the armed net, award solution evidence, persist for the life and release seals.
  NETTED sprites remain visible. The old remote hanging-stone instant-kill interaction is replaced.
- Canopy droppers in rooms 6/10 warn with a ceiling sprite and ground shadow, drop vertically,
  recover, then climb back. They do not track horizontally while falling. Nets also catch them.
- Marked spiked pits at x112–144 in rooms 7/10 cost 3 HP and recover at the near ledge (x96),
  with a brief stun. Jump over them. They do not erase cargo unless damage ends the life.
- Room 1's starter-accessible ledges lead through the TOP to room 3's BOTTOM. Falling down that
  nursery shaft returns through room 1's top. Room 4's solved drain opens a BOTTOM route to room
  5's TOP; its upper ledge permits the reciprocal return. This route cannot bypass the drain puzzle.
  All links use existing room IDs/seed/save version. No new biome or unrestricted graph generator.
- Horizontal returns enter at the corresponding edge/hatch, with appropriate height and facing.
  Returning room 6/10 to 5/9 uses the raised left hatch, not its blocked right wall. Hub returns
  face toward the nest. Vertical arrivals enter at the actual opposite edge with safe clearance.

New pure modules: `waterRoutes.ts`, `waterTraps.ts`; damage/AI tunables in `waterEncounters.ts`.
Debug remains `?debug` (enemy phases/ranges). All rendering/physics/LOS share objective-aware collision.
No shell/core/contracts/dependencies changed; unfinished life state is still not serialized.

Validation: wrapper check, **530 tests** and GPU smoke pass. New regressions cover all 4 enemy
types trapped healthy, 16 remote-swimmer seed/climate cases, 8 starter-climb seeds, reciprocal
routes and arrival facing. `tools/creature-depth-playtest.mjs` uses scene/input fixtures to verify
actual AI trap-only clears (including all three Hard-final enemies, zero bites), 3-damage/stun/
two-hit death, dropper dodge, ledge climbing, both vertical pairs, pit recovery and backtracking.
Desktop/portrait/landscape captures inspected. Fixtures include evolved anatomy/health; full natural
progression and physical-device combat balance remain human playtest work.

Debug ledger: naive Hard lure at330 failed (hidden in seed42 reeds and out of swimmer range);
approaching430 still failed because the swimmer reset home after a flood-shortened rush. Verified
with pure simulation and a read-only second review. Swimmers now retain a separate patrol anchor
at the last valid lunge endpoint, clamped/rolled back by collision; original home remains for
evasion evidence. The successful bot holds position above reeds against current, arms/rearms from
the near edge, and never bites. No damage/HP were weakened to make that clear pass.

## Stakes and physical route pass (2026-11-15)
Follow-up: user requested rooms that lock behind the creature and less accessible switches.
Reef/Easy final (room 2), Hard entry (7), and Hard final (10) now seal at x > 96, after an
entrance sign. Both exits and controls stay locked until every enemy is dead or subdued;
`passed`/stealth evidence cannot clear the seal. Cleared encounters remain cleared on same-life
revisit. Other encounters retain evasion/retreat. Remote hanging stones are disabled in sealed
rooms, avoiding the old instant clear from the entrance.

Subdual: wound to half HP or less, dodge the committed strike, then E within 36px during
recovery (with clear line of sight). `E: SUBDUE` appears when possible; subdued enemies remain
visible, inert and labeled. No meat reward for subdual; it awards environmental-solution evidence.
Room snapshots preserve incapacitation; a new life resets enemies normally.

Lower controls in rooms 4/6/8/9/10 take two uninterrupted active seconds: E starts, remain
still. Nearby non-recovering guards with line of sight, movement or damage discard progress.
Gripping resists current/buoyancy; move to release. Lure, defeat or subdue guards first.
Menus/pause freeze operation clocks. Tunables/rules: `waterCombatRooms.ts`; existing `?debug`
enemy ranges/states remain. Bite knockback now respects collision so enemies cannot become
unreachable inside a sealed wall.

Latest validation: 522 tests pass (8 new combat-room regressions); browser scene/input checks
cover guard interruption versus successful timed operation, evasion failing a seal, recovery
bite + subdual releasing it, revisit persistence and wall-safe knockback. Desktop/portrait/
landscape inspected. Fixtures isolate these rules; full natural combat/progression balance still
needs human playtesting. Gardener rain/drought and permanent terrain powers remain available.

User reported D+Shift bypassing the game. Every room now has a physically reached sluice lever;
Medium/Hard add ordered drain/upper controls, dive/rise/dive relays returning to a LEFT onward
hatch, and a 12-active-second pressure crossing. Solved gates remain open during the life,
except pressure gates until the seal is secured. An expired-pressure emergency latch permits
return but grants no seal, including when goal enemies remain uncleared.

Samples/seals are life-local cargo. Carry them through the rooms and shoreline to the actual
nest alive. Death/reload loses cargo; banked traits, Gardener changes and exploration survive.
The free Return to nest button is removed. Hard's hero handoff occurs on safe banking.
No save-contract/dependency/shared-shell changes. Old checkpoints retain previously banked unlocks.

Validation: wrapper check, 514 tests and GPU smoke pass. D+Shift is blocked in 88 room/seed
combinations at maximum traits; starting anatomy reaches 32 Easy levers; real controller solves
and returns through 16 drain chambers. Current browser regression is
`tools/creature-stakes-playtest.mjs`: scene/input fixtures verify controls, left hatch, loss/banking,
pressure freeze/emergency return, desktop and phone layouts. Screens inspected. The older
`creature-playtest.mjs` is historical and assumes removed teleport behavior.
Full natural progression and physical touch/controller balance remain unverified. Human playtesting
must judge danger/pacing; gates alone are not evidence that encounters are fun or balanced.

## Water Medium encounter/content pass (2026-11-15)
User approved another content pass before aesthetics. Added pure `waterEncounters.ts` state
machines (charger, reed ambusher, submerged swimmer) and `waterChallenges.ts` switchback
collision/sight. Medium now pairs distinct threats, forces dive/rise/dive traversal and adds a
timed bubble-vent crossing plus optional food-cache detour. Easy teaches separate behaviors;
Hard combines them with existing current requirements. Warning/committed strike/recovery,
terrain blocking, double damage during recovery and native danger messages support counterplay.
Swimmers remain in water; reaching dry shore counts as evasion. Traps no longer clear whole
rooms; missed stones don't grant behavior evidence. S is not universal open-water concealment.

Tests include charger dodge/stationary comparison across 16 seeds and actual-controller
switchback traversal. Browser regression navigates the new geometry and checks physical
progression, heroes, inherited diet/source, rotation and phone layouts. See CREATURE_WATER_SLICE.md.
No other-stage/core/dependency changes; no commits. Human difficulty tuning is next.

## Post-playtest repair (2026-11-14)
BAMF69 reported broken avatars and clarified that the overworld must be a level explored with
the creature. Replaced menu-first navigation with a 1,920px overworld and 960px Water shoreline.
Walk to biome/cave entrances and use them; return to the physical nest after lives/retreat.
An optional Journal retains history/new-world confirmation only.

Verified avatar root cause: PNG HTTP requests could succeed while Phaser's XHR/blob image
decoding failed, leaving both sprite sheets uncached. This also explains the old animation crash.
Creature-local HTMLImageElement loading bypasses the blob path. Full-sheet readiness checks,
next-tick retry and a persistent-failure retry panel prevent missing-texture bodies and protect saves.
The prior assumption that missing boxes were only accelerated-test artifacts was incorrect.

New files: creature/overworld.ts, overworldView.ts, avatarAssets.ts; tests/creatureOverworld.test.ts;
tools/creature-avatar-smoke.mjs. Physical entry/return now clears queued action presses without
stopping held movement, avoiding duplicate use actions crossing back through adjacent entrances.

## Current approved scope and implementation

BAMF69 chose content/gameplay before controls or visual refinement. Approved a procedurally generated
roguelike world that persists across generations: four overworld biome paths, three difficulties
per biome, inherited adaptations and mandatory Gardener environmental solutions. First playable
slice is Water; Jungle/Mountains/Ice and the any-two-hard-biomes final region remain future work.

`src/main.ts` still registers `CreatureGenerationScene.ts`. It now runs the Water expedition.
Full rules, seed grammar, module list, checkpoint extension and limits: `CREATURE_WATER_SLICE.md`.

- Four-path overworld, Water easy/medium/hard (11 rooms including nursery branch).
- Gills discovered at Easy's reef; fins in its nursery. Study with E. Only future daughters gain
  discoveries. Tidefoot grows gills, Reedheart grows fins; already expressed adaptations persist.
- Aquatic diet/temperament retained; aquatic gills/fins/torrent parts have relevant starting effects.
- Medium needs gills, Hard needs gills/fins. Sealed log sluices require Gardener Raise basin.
  Hard's current requires both Gardener diversion and inherited fins, enforced by actual movement.
- Permanent world changes persist. Rain/drought events last 60 seconds of active level time;
  modal/pause/rotation/nest time does not consume them. Background climate chosen between lives.
- Existing bite/hide/trap alternatives, hunger/compatible food, death/nesting and contrasting daughters
  remain. Safe retreat retains life state; revisiting rooms does not respawn food/enemies/traps.
- World seed, visits, discoveries, interventions and level completion checkpoint through the existing
  creature save slot/export/import. Unfinished lives restart at the nest. Old generation saves migrate.
- Standalone source identity now remains stable after its own hero write creates a default home;
  only missing/default upstream identities are canonicalized. Different incoming sources/diets reset.
- Water Hard offers the temporary one-biome ending and existing civilization hero handoff. The result
  explicitly distinguishes this from the future full-stage final region. Old creature scene stays inactive.
- Pose frames use the scene clock, avoiding the prior Phaser animation-start `duration` crash path.
  Reduced Motion freezes frame cycling. No new art/dependencies/shared shell or other-stage code changes.

## Validation completed 2026-11-14

- Project wrapper `check`: TypeScript and 11 shader recipes pass.
- Project wrapper `test`: **507 tests pass** across 44 files.
- Project wrapper production GPU creature smoke: seed 42, play:2, clean boot/no errors.
- Generator rubric: 501 seeds, 501 distinct layouts, 0 rejections/fallbacks; authored seed 0 and v1
  fingerprints pinned. Deliberately broken worlds exercise every validator rule.
- Actual-controller bots: 297 room traversals, authored + eight generated worlds, three strategies.
  Separate tests prove the compulsory sluice, fins/current/diversion requirements and safe branch return.
- `tools/creature-playtest.mjs`: browser entry and actual keyboard movement; native menus plus deterministic
  scene/action advancement through both discoveries, two heirs, all three difficulties, terrain/weather,
  hero recording and civilization transition; completed-world reload after hero handoff; exact rotation
  and Gardener clock freezes; incoming herbivore diet/temperament/parts/unknown fields; explicit new seed
  confirmation. No browser errors. Its `window.waterTest` fixture exists only in the test browser.
- Desktop 1440x900/1280x720, phone 375x812, short landscape 812x375 visually inspected. Normal-clock motion
  PNG burst inspected. Physical-device/controller checks remain pending; touch movement adapter deferred.
- Actual user browser tab verified: walked from the nest through Water and Easy entrances,
  reached a predator room with both sprites correctly rendered, and returned to the physical nest.
- Normal-clock movement burst and browser-tab play inspected; player and predators render normally.
  Avatar fault tests cover cold starts, corrupt-image HTTP 200, first-request failure and persistent
  failure followed by retry. Never accept missing-frame warnings as a harmless capture artifact.
- `git diff --check` clean (Windows newline notices only).

## Playtest and limitations

Open http://localhost:5184/ → Creature → confirm reveal. Walk east from the nest to Water, use
its arch, then walk along the shoreline to the Easy entrance.
A/D move; W or held Space swims up; S swims down/hides; Space jumps on land;
J/F bites; E studies/uses; Shift runs; U or Gardener opens the lens.
Study the nursery branch and reef, raise daughters at the nest, then revisit harder levels.
Retrace the rooms to the physical nest; there is no Return to nest teleport. Death/reload loses
unbanked samples/seals. Secondary details include cargo, seed, food, air and history.
On narrow phones the existing footer scrolls horizontally; dedicated touch movement is still deferred.

Generator v1 varies room patterns, sluice/food/predator/cover placement, not room counts or the overall
progression graph. Difficulty/encounter balance is unproven by human play. Original pixel creatures and
simple terrain are intentional placeholders. Future: richer topology, remaining biomes/final region,
weighted offspring/ecology, dedicated controls and the approved illustrated art pass.

## Workspace/runtime

Work only in `Documents/Codex/2026-11-12/files-pasted-by-the-user-you/Ooze2Orbit-creature`.
Port 5184 belongs to this worktree. `dev.py run -h` has no port flag; a process-local adapter invokes
its `cmd_run` with Vite `--port 5184 --strictPort`, without changing tracked wrapper/config code. The current preview runs
via hidden `work/run_creature_server.py` so it is not tied to an interactive terminal.
No other checkout/dependencies/server was changed. This worktree has its own copied node_modules.
PATH: `C:/Program Files/nodejs;C:/Python315;C:/Program Files/Git/cmd`.
PLAYWRIGHT_BROWSERS_PATH: absolute sibling `work/playwright` under the original clone's parent.

No further redesign pending approval. Next: BAMF69 playtests the Water content loop and reports what
is fun/confusing/too easy or difficult. Keep approved mechanics, adjust the top gameplay issue first.
