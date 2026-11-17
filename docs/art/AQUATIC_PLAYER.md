# Aquatic player animation and modular appearance — A-0034

Built-in imagegen, 2026-11-16. Runtime sheets:
- public/assets/art/aquatic_player_herbivore_motion_v1.png
- public/assets/art/aquatic_player_carnivore_motion_v1.png
- public/assets/art/aquatic_player_omnivore_motion_v1.png

## Final prompt set
Three separate built-in imagegen calls using aquatic_hero_hd_v1.png as design reference. Each asks
for a production 4-column × 3-row transparent game sheet: front, right-facing side and back rows;
tail left / neutral / tail right / open-mouth chomp columns. Stable body centers and scale, complete
silhouettes and generous empty margins; no haze, shadows, scenery, labels or grids. Preserve the
one purple cyclops eye and illustrated cel shading with ink contours. Green herbivore: lime spotted
body, leafy fins/tail, cream belly. Red carnivore: coral spotted scales, spiky dorsal fins, peach forked
tail, cream belly and ivory fangs. Gold omnivore: amber scales, teal fins/forked tail, cream belly.
Base bodies omit equipment so modular layers can follow them. PNGs copied unchanged; measured frame
rectangles in motionFrames.ts preserve noses, fins and tails rather than relying on equal-cell slicing.

## Animation behavior
playerMotion.ts selects idle, swim, attack, dash, breach and stunned states. Swimming uses three tail
poses, with cadence driven by actual speed; idle slows to a gentle breathing motion. Eating and
successful rams trigger a 260ms chomp, including darters consumed whole. Dashing uses a tucked-fin
neutral pose, narrower body, elongated silhouette, bubble wake and streaks. Breaching switches to the
side view and pitches upward/downward with vertical velocity; re-entry creates a 500ms splash ring
and droplets. Dash/breach are procedural animation of the illustrated body, not separate raster sheets.
Existing damage tint and eel stun tint are retained. Both map and river movement feed the same renderer.

## Modular anatomy
Body and equipment use the same size, rotation, flip and action transforms. Equipment textures are
cached by diet, view, look, pose, tucked state, visible stat ranks, parts and tiers. Animated gear uses
finite cached poses rather than new canvases every frame. Fins articulate; tendrils change sweep;
jaws follow the chomp and are hidden in rear view; plates retain their tier identity. Existing gills,
endurance, torrent and electric organ remain supported. Curved painted gradients, ink outlines and
fine highlights replace flat equipment fills. Smaller scutes keep the body visible beneath armor.

Stats change anatomy in visible steps every two levels, capped at five visual ranks (gameplay bonuses
above purchase caps still apply normally):
- Attack: additional dorsal ridges.
- Speed: trailing streamlines and slightly slimmer body.
- Defense: small scutes; equipped plates add larger overlapping armor.
- Mobility: broader auxiliary fin membranes.
- Health: brighter growth markings and a fuller body.
Temperament silhouette ornaments and diet palette remain independent. Thickness/form scaling remains
owned by gameplay; visual anatomy does not modify collision geometry or upgrade effects.

## Pause and accessibility
Simulation-driven animation clocks freeze in touch upgrade menus and other gameplay pauses. Reduced
motion holds a neutral swim pose, keeps action cues, removes breach pitch and wake trails, and uses a
simple re-entry ring instead of flying droplets. No controls, damage rules, stamina costs or input
bindings were changed.

## Validation
492 unit tests; typecheck and 11 shader checks. GPU browser checks at 1440×900 and 375×650 verified
all three diet textures, swim pose cycling, actual keyboard dash, eating/chomp, surface breach/re-entry,
paused layered animation, reduced-motion pose and visible health-stat bulk. Production aquatic smoke
checks both the full map and river entry paths separately.
