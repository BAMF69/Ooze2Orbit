# Aquatic maturation coverage — 2026-11-16

The user deferred detailed part-attachment review and requested completion of the remaining forms.
This pass completes the body art catalog: 3 temperament families × 4 forms × 3 diets = 36 sheets,
with 12 measured poses per sheet (432 frames). Existing mature adaptable art is retained unchanged.

## Body progression
- Aggressive: simple shark larva → pronounced fins/ridges → muscular mature swimmer → four developed support limbs.
- Adaptable: fine aquatic larva → slender elongated adolescent → approved narrow-waisted mature design → long feline support limbs.
- Cautious: soft protective hood → developing shell bands → broad segmented shell → sturdy turtle-like support paddles.
- Diet remains independent: green botanical herbivore, coral carnivore, gold/teal omnivore. The purple cyclops eye persists.
- Form 4 stays aquatic while preparing the anatomy for the creature-stage transition; no locomotion or collision rules changed.

## Rendering
evolutionBodies.json supplies the actual family/form/diet atlas, measured source rectangles, optical alignment offsets
and body-owned rig. evolutionArt.ts resolves it; evolutionTextures.ts loads current/next form palettes on demand.
The body-atlas cache has a soft 64 MiB target, protects referenced bodies and keeps ownership across scene restarts.
An active population can legitimately exceed the soft target when referenced atlases alone require it.
There is no per-frame body texture generation. Source artwork is unchanged by measurement.
Existing simulation sprites remain the sole movement/collision anchors. Body growth sizing and inherited thickness remain authoritative.
World players, sisters and daughter previews resolve the same family/form. While loading, an existing authored body is retained.

## Attachment status
All profiles have compatible socket/path schemas, measured tail landmarks and first-pass dorsal curves.
New-form sockets are coarse body-relative fits, explicitly provisional. This is NOT a claim of completed part fitting.
The approved mature-adaptable rig is preserved; its existing articulated scutes continue working.
Equipment, tiers, stats, temperament and inherited anatomy remain separate. No attachment-refinement review is requested now.
The original offline attachment inspector is a preserved mature-adaptable snapshot. Inspector v2 selects
all runtime profiles. The jaw and Torrent trial uses authored corrections in attachmentFits.ts, which the
measurement script does not rewrite.

## Assets and reproduction
A-0036 in ASSET_LOG.md registers the new art. AQUATIC_EVOLUTION_PROMPTS.json records generation prompts, design briefs,
original generated filenames and hashes; three adaptable form-2 eye-correction sheets are version 2. Version 1 originals remain.
measure_evolution_bodies.py reads significant alpha, detects actual gutters, checks complete silhouettes and aligns optical anchors.
It writes evolutionBodies.json and AQUATIC_EVOLUTION_FRAME_AUDIT.json. It never edits pixels.
New rigs use aquatic_rig_template_v1.json as a structural template; detailed fits remain future work.
Run with Pillow/numpy available in PYTHONPATH.

Body gallery: node tools/evolution_review.mjs <output-directory>, with the local dev server on port 5178.
It uses drawCanvasAvatar and current manifest, then embeds rendered preview frames in a standalone offline HTML.
Large cards use a common reference scale; 64 px cards inspect readability. Gameplay retains its own form sizing.

## Validation
506 unit tests, TypeScript, 11 shader checks and production build pass.
The game browser fixture passed 184 family/form/diet/view/part/action combinations, pause/reduced motion,
swaps and four daughter/sister cases with toxicTendrils/electricOrgan. Pond/lake/coast and river views passed.
Form-4 cautious portrait (375×812) and aggressive landscape (812×375) passed without page/console errors.
The body-only gallery checks all 432 source frames, palette/view controls, pause/step/chomp and phone overflow.
Production GPU smoke: boot marker, 180 frames, no errors.
Physical phone/controller performance remains untested; browser emulation is not a device benchmark.
Work is isolated on feat/aquatic-avatar-development. The user authorized committing/pushing this branch on 2026-11-17; no merge or hosted-site deployment was requested.

Atlas stress/restart check passed: 10 retained body sheets / 62,901,120 bytes (60 MiB), before and after actual scene restart.
Existing atlases are adopted into ownership, including development renderer reloads.
