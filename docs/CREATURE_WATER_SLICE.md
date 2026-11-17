# Creature Water gameplay slice

BAMF69 approved 2026-11-13: prioritize content/gameplay before control and visual refinement.
A seeded roguelike overworld has four biome paths: Water, Jungle, Mountains, Ice. Each eventually
has easy/medium/hard levels. Stable worlds persist across generations; new playthroughs get new
seeds. Inherited adaptations and Gardener interventions jointly determine access. The full-stage
plan is any two hard biomes unlocking a final region. This build implements **Water only**.

## Playable loop

Depth follow-up (2026-11-15): Chargers deal 3 damage and briefly stun; swimmers/ambushers deal 2.
Ceiling droppers in the Medium/Hard final rooms warn with a shadow, then fall and recover. To clear
without biting: E collects entrance rigging, E at the net arms it, then lure a rush/dive through the
frame. One healthy enemy is immobilized per arming; rearm for more. This replaces the remote stone.
Marked Hard pits damage/recover the creature. Easy's raised ledges connect room 1 TOP ↔ nursery
BOTTOM; the solved Medium drain connects room 4 BOTTOM ↔ gallery TOP. Room 5's upper ledge lets
you return. Entry positions/facing now correspond to the edge or elevated hatch you traversed.
Detailed rules/tests and remaining balance limits: `CREATURE_HANDOFF.md`.

Combat follow-up (2026-11-15): Easy's final room and Hard's entry/final rooms are marked sealed
encounters. Crossing the entrance threshold closes both exits until all threats are defeated or
subdued. Passing unseen does not clear these rooms. Wound an enemy to half health or less, then
E nearby during recovery to subdue it for the rest of the life. Other encounters still permit evasion.
Selected lower controls require E followed by two stationary, uninterrupted seconds. Active nearby
guards, movement or damage reset operation; lure guards away or disable them. All clocks pause
with gameplay. Existing Gardener effects remain available during these encounters.

Choose Creature and confirm the incoming temperament/diet reveal. You now start in a physical
1,920px-wide overworld at the nest. Walk east to Water and use its signed trail entrance. Its
960px shoreline has separate Easy/Medium/Hard cave entrances reached on foot; there is no biome
or difficulty-selection dialog. Jungle, Mountains and Ice have distinct signed paths farther east.
Easy is open to every starting creature. Explore its nursery branch for swimming fins and its
breathing reef for gills. Study glowing discoveries with E, then carry samples home alive to bank them. They unlock daughter variations;
the living parent does not gain them. Return to the nest, choose a climate and daughter:

- Stonejaw: strength; successful biting improves its bonus.
- Tidefoot: existing vitality/claw variation plus gills when the reef has been discovered.
- Reedheart: existing vitality/trap variation plus fins when the nursery has been discovered.

All daughters retain already expressed adaptations and the incoming diet. Gills/fins (or torrent)
from aquatic stage parts already satisfy the corresponding creature gate. Medium requires gills;
Hard requires gills and fins. Food, predators and traps reset each life, but not when leaving and
revisiting a room in the same life. Fighting, hiding/passing unseen, and rig/arm/lure nets are
alternative ways through enemies. E at each level goal takes an unbanked seal after its threats are
cleared/passed. Death ends one life and loses carried samples/seals, retaining banked progress.

Gardener (U or native button) pauses play while choosing:

- **Raise basin:** permanent; floats log sluices open and deepens swimming channels. A sluice spans
  the playable height and cannot be jumped, climbed or bitten through. It is a mandatory Gardener
  obstacle, including on Easy. No resource is required to perform this necessary intervention.
- **Divert torrent:** permanent; requires a raised basin. Wild upstream current exceeds even finned
  swimming speed. Diversion reduces it below fin speed, but ordinary swimming remains insufficient.
- **Rain / drought:** 60 seconds of active level time. Rain slows predators and conceals hiding;
  drought strengthens bites and speeds predators. Existing food does not respawn. Background climate
  is chosen between generations and determines new rooms' plant/meat mix; temporary events do not
  retroactively replace room food. Weather resets each life; terrain does not.

A/D move, W or held Space swims up, S swims down/hides, Space jumps on land, J/F bites, E uses
landmarks, Shift runs, U opens Gardener. Existing shared action bindings/controller support remain.
There is no Return to nest teleport. Retrace rooms and shoreline to the physical nest to bank cargo.
The nest pauses hunger/weather. Raising daughters
requires exploration during the current life. All modal/pause/rotation time is excluded from clocks.

Bringing the Water Hard seal home writes a surviving hero through the existing creature-to-civilization contract.
The result explicitly identifies this as the **one-biome prototype ending**, not the planned full-stage
final region. Keep exploring or test civilization. Other biome paths honestly say coming later.

## Generation rubric v1

2026-11-15 physical-route layer: all rooms require a raised sluice control. Medium/Hard drain
chambers require lower control then backtracking to an upper release. Shaft rooms require an
upper relay, far lower latch and return to the left onward hatch. Final chambers require charging
the lower wheel, returning to the raised pressure release, then crossing within 12 active seconds.
Claiming the seal latches the return gate; expiry offers a return-only emergency latch. These rules
are in `waterObjectives.ts`; collision/rendering share `waterChallenges.ts`. Dedicated control ledges
replace overlapping generated perches. The Hard drain chamber's local controls replace its log wall;
Hard retains its mandatory Gardener-dependent torrent; diversion itself requires a raised basin.

The authored seed-0 skeleton is three Easy rooms plus a nursery branch, three Medium rooms, and
four Hard rooms. It is deliberately small enough to test end-to-end before expanding the grammar.
The seeded PRNG varies platform patterns, sluice locations, food positions, predator starting
positions, cover positions and scenery variants. Room counts and the teach/practice/test topology
remain fixed in this first grammar; it is not an unrestricted random dungeon generator.

Generator invariants (same checks run before accepting a world and in tests):

1. Unique room identities and the correct connected difficulty paths, ending at a goal.
2. A reachable Easy source for both adaptations, before their level-entry gates.
3. Easy never requires gills or fins to enter or complete.
4. The base grammar places a sluice in each difficulty. The physical-route layer replaces Hard's
   log wall with drain controls, retaining its mandatory Gardener torrent/diversion requirement.
5. Every forward connection has a return. Nursery returns at its own entrance arch, before the sluice.
6. Lattice-aligned geometry with standing-body clearance along the critical path after intervention.
7. Spread food, no duplicates and safe bounds. Predators never spawn at the entrance.

Generation has four capped attempts with reported rejection reasons, then seed-0 fallback. Seed and
version appear in the UI and logs. `?creatureSeed=42` reproduces a **new** garden; an existing matching
checkpoint retains its stored seed. Export a world to preserve it. Journal → Start a different
world asks for confirmation before replacing the creature checkpoint, while retaining incoming
lineage. Invalid future generator versions are rejected rather than silently regenerating layouts.

## Modules and persistence

`creature/waterWorld.ts`: seeded grammar, invariants, collision tiles and tunables.
`creature/waterPhysics.ts`: swimming/current forces over existing `physics.ts` collisions.
`creature/expedition.ts`: adaptation discovery, Gardener interventions, weather and save validation.
`creature/waterTraps.ts` / `waterRoutes.ts`: trap objectives, vertical openings and arrivals.
`creature/waterView.ts`: Water room drawing. `overworld.ts`/`overworldView.ts`: physical hubs,
collision, landmarks and signs. `avatarAssets.ts`: complete-sheet validation and retry queuing.
Creature-local direct HTMLImageElement loading bypasses the intermittent XHR/blob decode failure.
`CreatureGenerationScene.ts`: registered scene, traversal/combat, native menus, clock and hero recording.

Optional `Garden.expedition` v1 holds seed, discoveries, visited rooms, completed difficulties,
raised basin/diverted torrent and Gardener cause history. `traits.gills/fins` are optional booleans.
Existing generation/source matching, diet validation and old checkpoints remain supported. A legacy
garden retains its traits/history and receives an expedition once; old room IDs are retained as
legacy metadata, not mistaken for new-world exploration. The existing `readGarden` export/import
validation handles this extension; no shell/core or aquatic files were changed. Unknown valid fields
are preserved by structured clone/spread. Unfinished lives still restart at the nest; persistent world
milestones autosave on intervention, exploration, safe banking and new generation. Carried discoveries
are life-local and lost on death/reload. New generation life
state (positions, enemies, health, temporary weather) is not serialized.

## Validation and limits

`tests/creatureWater.test.ts` exercises every invariant with a deliberately broken world, validates
501 seeds without fallback, pins v1 fingerprints and runs actual-controller traversal on seed 0 plus
eight generated worlds (three movement strategies, 297 rooms). Additional tests cover mandatory
Gardener obstruction, both current requirements, offspring-only acquisition, aquatic parts,
unknown fields, source/diet mismatch, generation persistence and export/import validation.
`tools/creature-stakes-playtest.mjs` is the current browser regression: real entry/native menus,
then evolved-anatomy/room fixtures advancing the real scene/input through drain controls,
shaft backtracking, the left onward hatch, cargo loss/banking, paused pressure and phone layouts.
It does not certify a full natural progression run. `creature-playtest.mjs` is historical and assumes
the removed teleport. Use wrapper check/test/smoke too.

Deferred: remaining biomes/final region, richer topology/encounter ecology, random weighted heirs,
full body-plan inheritance/art, dedicated touch movement adapter, polished controls/visuals, balance
and physical-device/controller certification. Existing original sprites and simple terrain are
intentional gameplay placeholders. No new art, dependencies, shared shell or lineage contract changes.

## Playtest correction: physical overworld and reliable avatars (2026-11-14)
The original menu-first overworld did not match BAMF69's requested explorable level. Entry,
new generations, completion and retreat now return to physical navigation. Nesting requires
using the actual nest; Water difficulty gates are cave entrances rather than menu items.
The Journal is optional history/new-world management, not a navigation replacement.

The missing-avatar issue was real, not limited to accelerated captures. Both PNG responses could
be HTTP 200 while Phaser's XHR-to-blob image decode failed and left no textures. Transport-only
loader counters incorrectly appeared successful. Creature now uses Phaser's supported direct
image-loading path, checks every sheet frame before creating player/enemies, retries on the
next scene tick, and offers explicit retry for persistent failures. Failed loads do not overwrite
checkpoints or create missing-texture avatars. `?debug` logs queue/cache/completion diagnostics.
`tools/creature-avatar-smoke.mjs` tests repeated cold loads, failed first request, corrupt HTTP-200
image data and persistent failures/retry. `tests/creatureOverworld.test.ts` checks physical hub
traversal and cached/absent/incomplete sprite sheets.

## Water encounter pass (2026-11-15)
Approved next content pass: strengthen Medium before illustrated art. No new art/dependencies.

- Bristle charger: broad, brown body. Warns before a committed ground rush, then pauses. Jump,
  change height or get behind it; recovery takes double bite damage.
- Reed ambusher: small green body and visible reed eyes. Concealment prevents its proximity
  trigger. If exposed, its warning precedes a short lunge and long recovery.
- Needle swimmer: blue body patrolling submerged routes. Only targets submerged prey, locks
  its lunge after a warning, respects terrain and stays in water. Escape onto dry shore, use
  another height, hide in reeds or fight during recovery.

Easy teaches charger and ambusher separately. Medium's first room pairs them; the second
combines a swimmer with a dive/rise/dive rock switchback; the third pairs an ambusher and
swimmer with a bubble vent. Hard combines these with its existing torrent/Gardener requirements.
Vent bubbles warn for 1.1s before a 0.65s plume in a 4s cycle. Wait for the quiet interval or
swim above it. The shaft has an optional upper food cache (+2 health and hunger relief),
which resets each life but cannot be farmed by leaving and returning in the same life.

Hanging stones hit only nearby shore predators, not every enemy in the room or swimmers.
Only a successful catch earns solving evidence. Holding S steers a swimmer down and does not
conceal it in open water; rain conceals land crouching and reeds conceal near-bottom swimmers.
All attacks use the same tile collision and line-of-sight checks as the level. Short overhead
labels show DODGE/RUSH/OPEN; native warnings explain the threat. `?debug` adds detection ranges
and committed attack vectors. Reduced Motion does not add decorative pulsing. Combat, enemy
patrols, vents and recovery clocks stop with gameplay and native choices/rotation.

Rules/tunables: `waterEncounters.ts`; challenge collision and sight: `waterChallenges.ts`.
Room identities, seeded layout-v1 grammar and checkpoint format remain intact; this content
revision enriches those rooms at the next life/start rather than regenerating the saved world.
Tests: 16-seed charger scenario pair (reading tells: 0 hits; stationary: 112 hits), 297 actual
controller room traversals including the switchbacks, enemy/perception/trap/evasion regressions.
The browser progression bot now dives/rises through shafts and uses the upper lane at vent
crossings; the original flat/down-only route is no longer a sufficient general solution.
Human balance/fun assessment is still pending.
