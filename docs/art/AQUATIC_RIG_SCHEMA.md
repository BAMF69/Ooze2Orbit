# Aquatic rig and attachment schema v1

## Scope

At the original snapshot, the first authored body contract was `aquatic.adaptable.mature.v1`, covering adaptable forms 3 and 4.
Form 4 explicitly uses provisional shared artwork. Juvenile, aggressive and cautious bodies continue using
the existing renderer until their rigs are authored. Unsupported anatomy is rejected by the new compiler,
not silently fitted with adaptable coordinates. No save format or gameplay capacity is changed.

The current offline `avatar-attachment-inspector.html` selects all 36 runtime sheets and uses the same attachment compiler, schemas and canvas backend
as native daughter previews. The world sprite backend consumes those same compiled attachment instances.
The inspector is a development artifact, not a new HUD or an in-game equipment editor.

## Source of truth

| File | Owns |
|---|---|
| `src/game/aquatic/avatarRig.ts` | Named body sockets, supported forms, per-form offsets, per-pose socket overrides, body-owned tail/spine data |
| `src/game/aquatic/attachmentSchema.ts` | All eight parts' semantic mounts, view visibility, tier structures, sizes, hinges, sway, pulse, fitting profiles and expected behavior |
| `src/game/aquatic/attachmentCompiler.ts` | Resolves a body rig and part definitions into backend-independent drawing instances |
| `src/game/aquatic/spineArticulation.ts` | Curve following and flexible scute sections; caches finite paths per body rig |
| `src/game/aquatic/avatarCanvas.ts` | Shared canvas backend and action transforms |
| `src/game/aquatic/landmarkEquipment.ts` | World sprite backend; follows the authoritative anchor's transform |
| `src/dev/avatarInspector.ts` | Independent toggles, Solo, descriptions, overlays, playback, and exports |

`organPlacements.ts` remains a compatibility export. The former part-specific `anatomyMount` coordinate
function has been removed. Parts now name sockets such as `shoulder.left`, `mouth.lower`, `flank.left`,
`abdomen` and `tail.fin`. A new body rig supplies different positions while reusing the same organ definition.

## Body contract

- `version`, `id`, `family`: explicit schema/rig identity.
- `units: 128`, `logicalFrame: 384`: one coordinate convention across renderers and overlays.
- `forms`: supported form IDs, artwork status, optional named-socket growth offsets.
- `sockets`: label, visible-view bind positions, optional four-pose overrides and mount angles.
- `poseLandmarks`: measured tail-fin junctions owned by this body rig.
- `paths`: measured dorsal control points per diet/view/pose, owned by this body rig.

Rig data is treated as immutable while running. Authoring changes should reload or replace the rig object so
its finite curve cache is rebuilt. Adding a new body topology requires an authored compatible rig, not
automatic landmark detection from arbitrary artwork. The current non-spine/non-tail sockets remain provisional
bind positions; the schema already supports refining them with per-pose and per-form offsets.

## Part contract

Each part defines its label, diagnostic color, deformation class, atlas row, artwork status, intended mounting
description, expected animation, view-filtered socket layers, and optional tier/motion profiles. The renderer
does not choose coordinates based on a part name.

- **Hinge:** named roots, mirrored members, pose rotation, bite/tuck dimensions and optional rooted sway.
- **Surface:** a compact patch mounted on the named body surface; optional organ pulse.
- **Curve:** body-owned dorsal path plus coverage, spacing, taper, overlap and flexible section parameters.

Each compiled instance identifies its part, logical organ, socket/path and deformation. Scute crop sections
share one logical organ ID, so the inspector reports seven plates rather than 21 rendering strips.
Toxic tendrils pivot in three overlapping sections along a painted centerline. Jaws hinge at the lower
midpoint in the front chomp. Canvas and world renderers share gill, endurance and teeth atlas frames.
Torrent is derived from the actual tail pixels and cached with the body atlas. Authored mouth/tail and
surface fits live in `attachmentFits.ts` and `surfaceAttachmentFits.ts`. The body measurement script
can regenerate frame metadata without replacing those fits.

## Inspection workflow

1. Toggle a checkbox or use **Solo** to remove visual interference from the other parts.
2. Read **Where it should mount** and **Expected animation** for the selected organ.
3. Use **Inspect mounts** even with the organ hidden to inspect its intended roots on the bare body.
4. Compare front/side/back, or enlarge one view. Rear-hidden jaws are explicitly identified as expected.
5. Enable mount labels and selected-part bounds to expose roots, the dorsal path and crop sections.
6. Pause, step through all four source poses, change speed, or hold idle/chomp/dash states.
7. Switch diet/form/tier to check fitting. Reduced motion retains chomp cues while suppressing sway/pulse.
8. Download the setup JSON to preserve the exact combination being assessed. Download the complete schema
   to review or hand off the anatomical contract separately from the artwork.

The lab permits diagnostic overcapacity combinations and labels them. It never changes gameplay limits or
loads the player's saves. It embeds the runtime body and organ WebP sheets and decodes one body selection at a time. It works offline.

## Build and validation

Build artifact: `node tools/build_avatar_inspector.mjs <output-directory>`.
Inspect artifact: `node tools/avatar_inspector_review.mjs <output-directory>`.
Standard project validation remains `python tools/dev.py check`, `test` and `build`.

503 unit tests pass, including schema coverage across all supported diet/form/view/pose combinations, explicit
rejection of missing rigs, a differently shaped test rig, and reduced-motion action cues. TypeScript, all 11
shader checks and production build pass. The 184-combination game renderer fixture passes after migration.
Offline browser QA covers all eight Solo/toggle controls, tiers, pause/step, actions, diets/forms, visibility,
schema/setup downloads, and mobile layout. No page errors or external HTTP requests were recorded.

## Maturation follow-up
The runtime now has twelve body-specific profiles. New-form fits are provisional; see AQUATIC_MATURATION.md.
The exported attachment lab remains a preserved mature-adaptable snapshot for later review.
