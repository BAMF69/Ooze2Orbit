# HUD integration contract for level-generation work

The approved HUD originally existed only in local commit `121c1f1`. The restoration branch `feat/restore-illustrated-huds` is based on `c938251`, after the room/art merge PR #29, and already reconciles the newer scene with the approved HUD. Use the published restoration commit, not the older whole scene, as the integration source. Do not rewrite or regenerate the visual family.

## Bring the code and artwork together

Fetch the published restoration branch and merge it into the level-generator feature branch. It contains current main at the restoration base; retain any newer generation changes on the feature branch while resolving overlaps. Do not copy an entire older `CreatureGenerationScene.ts` over newer gameplay. Do not reset main to either old HUD commit.

Run `git lfs pull` after integration. Both `public/assets/art/hud_creature_*_surfaces_v1.webp` runtime atlases, both PNG masters in `assets_src/art_masters/`, and both approved PNG references in `docs/art/` are LFS objects. An LFS pointer in a runtime image path is a failure, even if the TypeScript compiles.

## Boundaries to preserve

- `src/game/creature/hud.ts` / `hud.css` own creature presentation and the compact Journal/Gardener/Info strip. The scene feeds live state through `CreatureHud.update` and existing action callbacks through `actions`; it must not also build a generic StageUi footer. Keep constructor, pause/modal handling and shutdown cleanup wired.
- Feed exact room metadata from `roomLabel(currentRoom, seed)`, plus a short visible `roomIdentity`. Do not lose the seed, tier, puzzle, room id/name or generation from Info. Keep Equipped/Banked rack labels visible and the minimap available.
- Use the shared `isSubmerged` predicate in `creature/waterPhysics.ts` for both oxygen and HUD state. It checks the occupied room and water region, not the legacy single-screen surface. Preserve drained/raised water, dry gaps, gills and multi-screen rooms. Changes to the predicate require both unit and scene integration coverage.
- Preserve the current F-bite alias (electric action), J bite, controls at their usable positions, reward gates, room cycles, camera bounds, painted room/creature/enemy art and existing saves.
- `src/game/civ/hud.ts` and `civ/illustratedHud.css` own the compact civilization menus. Keep all four illustrated tabs above the window: Hero, Builder, Summons, Workers. Costs, disabled states, selection, worker training, hero commands and summons remain live.
- `laterHudSurfaces.ts` / `.css` own proportional atlas rendering. Keep muted materials, cream Vollkorn typography, diet-specific frames, projected civilization crests and open side gutters. Do not substitute generic panels, stretch a complete raster frame, hide art to solve a layout issue, or recreate labels inside bitmaps.

## Required evidence in the next PR

Run `python tools/dev.py check`, `python tools/dev.py test`, `python tools/dev.py build`, then run the HUD integration test with `O2O_HUD_OFFLINE=1` and `node tools/later-hud-playtest.mjs`. CI runs that browser gate for web PRs and uploads its review captures. Windows may use the installed Chrome via a host-only adapter; no machine-specific browser paths belong in repository code. Linux CI uses its standard Playwright Chromium.

The gate must continue to prove: both stages use illustrated skins and Vollkorn; 44px minimum tab targets stay inside desktop/phone bounds; no horizontal page overflow; 125% phone text fits; room identity survives changes; scene oxygen and HUD agree in a large multi-region room; J/F and touch controls still work; no duplicate controls; modal/pause and shutdown release input and remove overlays; all diet surfaces load; civilization commands still affect native state. Update fixtures when legitimate generator changes require it, preserving these behaviors rather than weakening assertions.

Attach actual gameplay captures for creature and civilization at desktop, 375x812 portrait and 812x375 landscape. Capture updated gameplay, not a regenerated concept image. Keep review images available through the CI artifact or PR attachments. A passing type check alone is not visual approval.
