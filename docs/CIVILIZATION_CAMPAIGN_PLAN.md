# Civilization campaign: approved implementation plan

Approved by BAMF69 on 2026-11-18. Planning only; no new mode is implemented by this document.

## Framework

Keep CivWarsScene as the presentation/input adapter. Add pure mode and difficulty registries,
campaign state/validation, deterministic battlefield generation and aggregate recording under civ/.
Register tower wars, hero lane wars and tug-of-war; expose unfinished modes as unavailable until built.
Each uses the shared art, economy, inherited hero, live temperament/cause display, aggressive and
cautious victory methods, and a mode-specific pair of Gardener benefits. No optional frenzy yet.

```
mode registry -> simulation adapter, supported commands, victory rules, Gardener pair
difficulty registry -> dimensions, obstacle generation, rival pressure tuning
easy = 11x7; medium = 15x9; hard = 19x11
normal launch -> validate campaign -> next unfinished slot
explicit mode/difficulty query -> isolated standalone battle
```

## Campaign and saving

Campaign order (Claude's pick): tower, hero, tug at easy, then the same sequence at medium and hard.
Nine accepted victories are required. Save campaign version, ID, species identity, inherited baseline,
seed, generator version, ordered battle slots, accepted records and active slot in a civilization-owned
save slot. Check its inclusion in export/import; limit any shared edit to that integration.

```
defeat -> preserve completed slots -> offer same-seed rematch
victory -> accept slot result exactly once -> save -> enable Next
reload unfinished battle -> restart that battle with same seed
nine victories -> aggregate records -> write lineage -> enable Space after successful save
save failure -> retain pending result -> explicit retry without duplicate credit
```

Battle-boundary checkpoints, same-seed rematches, first-win-only heritage and isolated standalone
sessions are (Claude's pick), approved with this plan. Standalone matches do not automatically mutate
campaign progress or lineage. Pending completion must survive/retry final lineage writing safely.
Defensively validate saves, preserve unknown fields and never silently discard a newer save.

## Generalize wars.ts

```
BattleConfig = mode + difficulty + seed + resolved board/tuning
Board = cols + rows + entry + exit + permanent obstacles per side
newBattle(config, inheritedHero) -> terrain -> valid initial defenses -> valid hero spawn
route(board, obstacles, buildings, start, goal) -> BFS
placementIssue -> reject terrain/endpoints/occupancy -> preserve entry and every unit's route
stepBattle -> existing economy/construction/hero -> tuned rival -> mode victory
```

Replace global dimension assumptions in simulation, hero navigation, rival construction, renderer,
previews, cursor bounds and pointer conversion. Use one board model and one draw/hit transform.
Permanent obstacles participate in navigation, placement and hero collision; preserve climbing semantics.
All tuning belongs in data modules. Simulation remains free of Phaser imports.

```
seeded obstacle candidates -> exclude protected endpoints/spawns
  -> tentatively add -> retain only while entry-to-exit route exists
  -> bounded attempt count -> validate final setup -> deterministic safe fallback
```

Equivalent obstacle layouts per side are (Claude's pick). Validate rival initial buildings too.
Keep fixed-size command tabs and stacked portrait boards; verify hard-board small-phone readability
and placement accuracy. Live commands, Details freeze and existing pause/rotation behavior stay intact.

## Lineage and heritage

Aggregate spending, technology usage and causes from nine accepted victories. Apply the civilization
temperament shift cap once against the inherited stage baseline, not once per battle. Diet stays separate.
Use the most frequent victory method for the existing space-facing victory field; nine binary results
cannot tie. Retain existing technology identifiers and record fields; preserve unknown lineage data.
Do not change the creature hero or space technology contracts without coordination.

## Delivery gates

1. Framework and tower difficulties: seeded generation, scaling, campaign save, standalone launch,
   phone layouts. PR, then STOP for BAMF69's easy/medium/hard playtest.
2. Hero lane wars: hero lane defense plus sends, rival hero/base pressure and both win paths.
   PR, then STOP for playtest.
3. Tug-of-war: constructed spawners produce autonomous marching/fighting units; no unit orders.
   PR, then STOP for playtest.
4. Frenzy only on request. Survival and stealth are outside this task.

Test thousands of seeds per difficulty for determinism, connectivity, safe starting states and bounded
generation. Exercise actual construction/pathfinding, worker resource flow, hero/patrol, both victory
paths, rematch, duplicate result prevention, save failure/reload, unknown data preservation and Space
transition. Run wrapper check/test/smoke; visually inspect desktop and phone orientations, keyboard,
mouse, touch and controller flows. Physical hardware verification must be reported separately.

At each implementation gate update the stage doc as built (mark own decisions as Claude's pick),
prepend a short HANDOFF section, update ROADMAP, and open a feature-branch PR with gh. BAMF69 merges.
Reuse existing art; log any future new art/dependencies in ASSET_LOG/ADR. Battle mockups are concepts,
not production assets or evidence that a mode is implemented.
