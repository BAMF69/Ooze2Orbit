# Aquatic wildlife and predator motion — A-0031 / A-0032

Built-in imagegen, 2026-11-16. Current runtime sheets:
- public/assets/art/aquatic_jellyfish_motion_v2.png
- public/assets/art/aquatic_eel_motion_v2.png
- public/assets/art/aquatic_deepmaw_motion_v1.png
- public/assets/art/aquatic_shark_motion_v1.png
- public/assets/art/aquatic_hammer_motion_v1.png

All sheets are 1448 × 1086, four poses and three view rows, transparent alpha.
Predator poses cross the nominal grid: motionFrames.ts supplies measured silhouette rectangles
and centers them in a common logical frame, preserving full noses, fins and tails. Rows are front,
right-facing side and back. Columns are three swimming poses and a species-specific attack.
Jellyfish use a pulsing bell and trailing tendrils with an extended tentacle sweep as the attack.
Eels use tail bends and an open-jaw bite. No cropped tentacle layer remains.

## Final prompt set
Built-in tool, one call per sheet, no bitmap edits by scripts. A-0032 uses the user-provided
previously generated two-species concept as a style reference; the reference itself is not shipped.

Jellyfish: production game sprite sheet, only jellyfish; match chunky purple lobed bell, fleshy pink
rim, green frilly inner tendrils and purple outer tentacles, rich cel-shaded illustration with ink
contours. Remove all face: no eyes, eyebrows, mouth, teeth or face-like features. True transparent
alpha, no haze, shadows, labels or grid. Exact 4×3 equal cells with complete isolated silhouettes,
generous margins and consistent bell scale. Front / right-facing side / back rows. Each row:
relaxed bell, compressed propulsive swim, expanded bell, tentacles sweeping forward dramatically.

Eel: production game sprite sheet, only electric eel; match turquoise muscular body, golden fins,
amber organ spots, bold ink contours and richly painted cel shading. Exact 4×3 equal cells on true
transparent alpha, no haze or shadows. Front / right-facing side / back rows; tail bent left,
neutral S bend, tail bent right, wide-open toothy bite. Stable centers and scale, complete silhouettes
inside cells, generous margins. No labels, grids, jellyfish or external lightning.

Predators: aquatic_predators_hd_v1.png as design reference; separate 4×3 transparent sheet per species;
front / side / back rows; tail-left / neutral / tail-right / open-jaw bite columns. Preserve anatomy,
colors, ink contours and cel shading. A-0031 single-pose wildlife cutouts are retained but superseded.

## Combat and accessibility
Bites retain their existing damage. An eel bite arms a 220 ms shock wind-up if ready. Discharge stuns
players within 180 world units for 1.2 seconds, starts a five-second per-eel shock cooldown and a
2.5-second retreat at 1.5× swim speed. Shock does not add a second damage hit. Eels cannot bite during
retreat; stunning an eel interrupts its wind-up. Airborne players avoid the discharge.
Electric rays use simulation state, so ordinary bites during cooldown do not show a false shock.
Touch upgrade pause freezes frames, cooldown, retreat and player stun. Reduced motion holds a neutral
swim pose while retaining a static attack pose and steady lightning cue.

## Cadence and passive jellyfish follow-up
Per-creature animation clocks run at the original cadence during chase/hunt, half cadence during
ordinary swimming and quarter cadence for jellyfish (relative to their original 200ms frame interval).
Switching states preserves animation phase. Attack timing and movement speed remain independent.
Jellyfish never pursue, even when provoked. Only player movement into a jellyfish or a dash/ram triggers
its cooldown-limited tentacle retaliation; idle overlap and proximity do not cause attacks. The generic
provoked-fish bite path explicitly excludes jellyfish.
Validation: 487 tests, type/shader checks; desktop/phone GPU browser fixtures checked hunt/cruise rates,
quarter-speed jellyfish, real bump-only retaliation and touch pause freezing animation clocks.

## Remaining fauna, foliage and food — A-0033
New runtime sheets (built-in imagegen, 2026-11-16):
- public/assets/art/aquatic_darter_motion_v1.png
- public/assets/art/aquatic_finray_motion_v1.png
- public/assets/art/aquatic_spinefish_motion_v1.png
- public/assets/art/aquatic_shellback_motion_v1.png

Final prompt set: use aquatic_fauna_hd_v1.png as the design/style reference, one species per
4-column × 3-row transparent sheet, front / right-facing side / back rows. Preserve rich illustrated
cel shading and ink contours. Three coherent swimming poses then an open-mouth attack; consistent
body centers/scale, complete silhouettes and generous empty margins in each cell. No scenery, haze,
shadows, grids or text. Darter: silver body, turquoise stripe/fins, gold dorsal stripe, tail flicks.
Finray: turquoise spotted body, broad yellow-edged fins flapping up/flat/down. Spinefish: round purple
spotted body, ivory spikes, salmon fins; tail/fin strokes and bristling open-jaw bite. Shellback:
teal fish, rigid gold/turquoise spiral armor, peach fins; articulate fins/tail/head while keeping the
shell shape consistent. Four separate calls; output PNGs copied unchanged. Measured silhouette
rectangles registered in motionFrames.ts to avoid nominal-grid clipping.

Fauna bite poses trigger from actual bites, including darter school attacks. Flee/retreat states use
the same fast cadence as hunting (twice cruising cadence), including eel retreats and shark peel-offs.
Seaweed and kelp blooms sway slowly around their floor anchor; rocks stay still. Code-native food
motion uses a 1.00–1.16 breathing scale and colored halo (green for plants, warm coral for meat).
Food remains distinct from parts and scenery; collision radii and food values are unchanged.
Reduced motion keeps foliage still and food emphasis static.

A jellyfish's successful tentacle retaliation starts two seconds of murky green world obscuration,
with gentle drifting cloud shapes and a short final fade. HUD and touch controls remain readable.
Simulation pause freezes the murk timer and all ambient animation. Reduced motion keeps the fog still.
Validation: 489 tests; typecheck and 11 shader checks; desktop/phone GPU checks of fauna frames/bites,
food pulse, anchored foliage, fast retreat, actual jellyfish murk duration, touch pause and reduced
motion; production coast GPU smoke passed without runtime errors.
