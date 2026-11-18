# Creature and civilization illustrated HUDs

Restores the approved compact revision from `121c1f1` onto `origin/main` at `c938251`, including compatibility with the newer rooms and painted gameplay. Visual targets: [creature](HUD_CREATURE_APPROVED_V2.png) and [civilization](HUD_CIV_APPROVED_V2.png). Those boards have illustrative scenery; the implementation retains the current game environments, entities and rules. See [the integration contract](HUD_INTEGRATION.md) before changing the scene adapter.

## Visual contract

- Keep the painted surfaces, mature Vollkorn type, cream labels and semantic colors. Do not replace these surfaces with generic rounded rectangles or procedural gradients.
- Creature: compact Journal / Gardener / Info strip centered near the bottom, about 44% desktop width and a shallow phone row. Health and food sit inside the top-left frame; unbanked cargo is separate. Air appears underwater without gills; net/sealed-encounter notices remain visible when relevant. A small visible breadcrumb identifies room/tier/seed; Info and its tooltip retain the full room id/name/tier/puzzle/seed and generation. Conditional readouts flow without overlapping. Herbivore roots/foliage, carnivore bone/sinew and omnivore amber chitin/root materials share the same layout.
- Civilization: supplied four-bay art interpreted as muted Hero / Builder / Summons / Workers tabs along the **top of the bottom window**. Desktop width is 70%, leaving side gutters. Phone cards scroll horizontally. Keep 44px minimum control targets, low crests and concise effects; full tower stats remain in tooltips and Details. Economy, costs, affordability, construction, summons and hero behavior remain native.
- The later-stage crests and corner decoration are intentional; the quieter aquatic corner rule is not a blanket rule for these stages.

## Implementation

`laterHudSurfaces.ts` renders proportional crest pieces and border endcaps. Only quiet interiors/edge runs expand; rectangular windows use nine slices with bounded corner dimensions. Observers are disconnected on shutdown. `creature/hud.ts` adapts structured scene state and existing action callbacks, using the shared touch adapter with pause/shutdown cleanup. `civ/hud.ts` retains existing controls, state and localization, with shorter tower-effect labels and a short Workers tab label. Scoped styles leave cell/aquatic HUDs alone.

Two full-quality RGBA PNG masters live in `assets_src/art_masters/hud_creature_*_surfaces_v1.png`. Runtime WebP copies total 398,558 bytes, encoded using the repository's `compress_art.encode` at quality 90 with full-quality alpha and unchanged dimensions. Surface bounds are declared in TypeScript. Art was generated using the built-in imagegen tool from the approved boards and reserved terrestrial family references; the civilization ornaments trace to the user's supplied four-bay artwork. Live text, data and control states are not baked into images.

## Verification

- Type check and 11 shader recipes pass.
- All 792 tests pass, including runtime-art budget and region-specific submerged-state tests. Two default-five-second seed sweeps timed out in the initial contended run; both passed unchanged in isolation and in the full rerun. No assertions or timeouts were weakened.
- Production build passes. Vite reports the large shared game bundle; no build failure.
- `tools/later-hud-playtest.mjs` exercises real compiled scenes at 1440x900, 375x812 and 812x375, plus 125% phone text. Checks live tabs/cards, worker training, creature Journal/Info, room identity, focus retention, diet surface changes, real touch-stick movement/release, pause and scene cleanup. A two-region 1600x640 room fixture exercises actual scene oxygen and HUD agreement, dry gaps, raised water and gills. J/F bite bindings are tested. CI now runs this gate for the web engine and uploads review captures.
- Set `O2O_HUD_OFFLINE=1` to build the dedicated test fixture and fulfill its local files inside Playwright without HTTP sockets. This is the actual compiled game, not a CSS-only imitation. Screenshots omit transient settings notifications. Host-only Chrome launch adaptation is outside the repository. Browser emulation does not establish physical phone performance or touch feel.
- No approved artwork is regenerated. Original PNG masters and runtime WebP payloads are reused byte-for-byte from `121c1f1`.

Restoration branch: `feat/restore-illustrated-huds`. Publish its code and LFS objects together before another agent tries to integrate it.
