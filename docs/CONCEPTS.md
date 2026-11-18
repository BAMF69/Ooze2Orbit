# Concept Board

> Lock one FINAL concept per scene or asset, and log what changed in each version. Inspired by a concept-board workspace seen in a
> video screenshot. Fed back into `docs/BRIEFS.md` style fragments.

## Rules
- One row per scene/asset. Exactly one version is marked FINAL. FINAL images live in the repo (LFS) under `docs/concepts/final/`, outside the engine's content folder, so they never ship
  in a build or get imported by the engine (the same images inside Godot's or Unity's asset tree would).
- Every version records the prompt, tool, and what changed from the last version.
- Drift check on every new version: palette, faction colors, proportions, camera angle, UI style. Note drift and the planned fix.
- Anything built from a concept references its row ID, so art and game stay in sync.

## Color bible
Palette with names and hex per role (ground, sky, light, danger, UI, each faction). If your mood reference is daylight and the game is night, write the translated colors here. Nothing visual ships outside it. See `docs/sop/SOP-12-job-plan-and-model-roles.md`.

| Role | Name | Hex | Notes |
|---|---|---|---|
| | | | |

## Board
| ID | Scene / asset | Direction (1 line) | Final version | Status | Drift notes / pending fixes | Used by (scene, prefab, asset ID) |
|---|---|---|---|---|---|---|
| C-0001 | | | v1 | direction | | |
| C-0101 | Creature Form 5 avatars, one per temperament family | Shipped aquatic Form 4 bodies stand up on four legs: coral Ridgejaw (shark line), leaf-shell Shellback, gold Ribbonstrider; purple cyclops eye kept | v1 FINAL | approved by BAMF69 2026-11-17 | Flatter and less painterly than the Form 4 art; see version log | creature avatar, A-0041 |
| C-0102 | Creature diet variation sheet (Ridgejaw) | Diet = palette and markings only; silhouette belongs to temperament | v1 FINAL | approved by BAMF69 2026-11-17 | Omnivore colour open: gold-teal (shipped bodies) or blue (brief, HUD meters) | creature avatar, A-0041 |
| C-0103 | Worn traits on the creature avatar | One silhouette change per trait: gill crown, fin membranes, ivory claws, Roar mane, Burrow spades, carried tool, bone armor, frost glands | v1 FINAL | approved by BAMF69 2026-11-17 | Traits blur on today's 640x360 canvas; read clearly only with screen-resolution world rendering | creature avatar, A-0041 |
| C-0104 | Creature core poses | Idle, walk, jump, bite, crouch: one key frame each, all three families | v1 FINAL | approved by BAMF69 2026-11-17 | Same as C-0101 | creature avatar, A-0041 |
| C-0105 | Enemy: Bristle charger | Squat mud-boar amphibian, quill crest, tusks, two amber eyes; tell pose raises the quills | v1 FINAL | approved by BAMF69 2026-11-17 | Same as C-0101 | Water charger enemy, A-0042 |
| C-0106 | Water room mock-up (Easy room 1, seed 0) | Moody cave over the real collision grid; sluice, barrier, lever, net, rigging, reeds, arch stay readable | v1 FINAL | approved by BAMF69 2026-11-17 | Rock is flat tiles; no painted background texture yet | Water rooms, A-0043 |
| C-0107 | HUD equipment icon rack | uiIcons.ts language; story / class / grotto groups; temperament colour only on class discs | v1 FINAL | approved by BAMF69 2026-11-17 | The current rack code (creatureIcons.ts) is not on origin/feat/creature-levelgen: drawn from the brief | none yet |

## Version log
| ID | Version | Date | Tool and prompt (or Prompt Library ID) | What changed | Drift found? |
|---|---|---|---|---|---|
| C-0001 | v1 | 2026-11-07 | | | |
| C-0101..C-0107 | v1 FINAL | 2026-11-17 (approved "all as v1" by BAMF69 the same day) | Hand-authored parametric SVG (Claude Opus 5.5), rasterized in headless Chromium: `node docs/concepts/creature-hd/src/build_concepts.mjs`. No image generator was available in this session, so nothing was prompted; source is `docs/concepts/creature-hd/src/*.mjs`. Form 4 references are read from origin/main (A-0036). Images (FINAL): `docs/concepts/final/C-01xx_*_v1_{enlarged,gameplay}.png` | First version. In-session iterations before v1: legs shortened and given knees (they read as stilts); bite jaw opened 40° and crouch lowered (too subtle at 32 px); gills moved from neck to head and drawn last (armor hid them); every trait enlarged; shell redrawn as overlapping leaf scutes and back spine crest added to match Form 4 | **Palette:** matches. Diet bodies use the cell/aquatic body hues, ink #0d1a20 like the cell outline, cream belly, ivory bone. **Ink:** one weight, 4 units in a 128 box = 1 px at 32 px. **Light:** upper left everywhere (lower-right cel band, upper-left highlight). **Proportions and texture: DRIFT.** Chunkier and flatter than the painterly Form 4 sheets, with less hand-painted texture than the cell art. Planned fix after direction approval: a painted texture pass in production art. **Brief vs shipped:** the brief describes the older aquatic looks (slate shark, bronze armour, teal-violet). The shipped Form 4 art on main is coral shark-limbed, leaf-shell turtle and gold feline salamander. v1 follows the shipped art |
