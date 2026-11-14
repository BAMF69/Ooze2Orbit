# HD remaster: first cell slice

Approved direction, BAMF69, 2026-11-13: smooth illustrated biological creatures with the bold outlines,
shadow bands and hand-drawn texture of cel-shaded games. The Borderlands reference supplied by the user
describes the treatment; organisms, environments and interface are original to Ooze2Orbit.

The first pass introduces three diet-colored cell bodies (green/coral/amber), inked outlines and simplified
organelles. The same bodies appear in play, sisters, diet cards, daughter cards and mitosis. Existing
camera anchors, collision radii and form sizes are retained. High-resolution card canvases
and native CSS type avoid scaling a 96px preview up on a dense screen. The cell menus and status receive
organic color panels, clear outlines and restrained depth; reduced motion remains respected.

Asset: `public/assets/art/cell_illustrated_v1.png`, generated with imagegen then refined to remove external
texture/halos. Three equal tiles are read directly from the strip. Original generation and refinement
outputs remain in Codex generated_images; runtime copy is in the repository. Logged as A-0020.

This is the beginning of the remaster, not a completed HD renderer or a replacement of all art. The game
world still renders at the existing stage resolution. The new bodies have one drawn pose per diet;
smooth velocity-facing turns and procedural swimming now animate those poses. Native panels/previews
are independent of world resolution. Other stages retain their prototype assets.

## Expanded cell art and start screen (2026-11-13)

User approved the first style and requested wriggling, direction-facing movement, the rest of the cell
assets, a logo and a game-start landing page. The pond now uses illustrated background art, four
organism designs (prickle/snail/sipper/gulper), two foods and three part pickups. Inked code-native
shell plates, spikes, siphon, fins, mandibles and cilia replace visible pixel upgrade layers. Equipment
is shared between world bodies, daughter cards and mitosis. Assets are A-0021.

Velocity controls a smoothed shortest-path heading, maintained at rest. A speed-sensitive squash and
small angular wriggle are presentation only. Reduced Motion disables oscillation; pause and choice
screens freeze the clock. The old body sprites live in a hidden scene-owned container so existing
camera anchors, animation state, fading food and pop/death tweens survive without pixel double-drawing.
The container also owns their shutdown cleanup. Do not override renderWebGL to hide sprites: Phaser 4's
render-node path can bypass it. GPU captures are required for rotated sprite inspection (TROUBLESHOOTING).

Original Ooze2Orbit logo and evolution-to-orbit key art now form the responsive start screen. A real
Enter the garden button plus keyboard/controller entry leads to the existing stage/save/settings menu,
which shares the art and logo. Consent, continue/import/export, keyboard and controller routing remain.
The title image is decorative with a readable logo alt; all new copy is in the string table.

Next cell art passes: form-specific silhouettes and richer animation, then resolution-independent world
rendering with explicit mobile budgets.

## Overlay and lifecycle presentation follow-up

The cell pond fills the window behind all native HUD elements, with a four-section food meter at the
bottom. Its three thresholds are unchanged; the fourth section marks the fully grown form. The diet
colors are green herbivore, red carnivore and blue omnivore. Completed forms retain their colors.
Top-center prompts adapt to the selected input scheme; parts/perk icons and Jet cooldown live top-right.
There is no cell health bar or new HP pool: the user withdrew that request and food-loss damage remains.

Spikes were too subtle; their pickup now creates an eight-thorn ivory crown around the membrane, visible
at Form 1 with no attack purchases. Attack upgrade mandibles remain distinct. The menu now presents
five code-native stage icons, followed by text actions for saves, settings, credits and quitting.

Birth after diet selection, descent before aquatic temperament and arrival afterward are scene-clock
presentations. They freeze gameplay and discard queued action input; pause/rotation retain exact elapsed
time. Reduced Motion shows a short static treatment. Aquatic Continue does not replay the introduction.
Temperament panels share accessible colored meters: red aggressive, green cautious, blue adaptable.
Diet is shown separately; existing temperament evidence and normalized percentages are unchanged.

Use the same palette, ink weights and upper-left lighting across these sets. Check at actual gameplay
size on PC and iPhone 13 mini before extending the treatment to aquatic and subsequent stages.

Input stays separate from framing: Auto/keyboard/touch/controller determines controls, while size,
orientation and safe margins determine layout. Cell has the first thumb-stick/action adapter; other
stages get dedicated adapters next. Physical Safari, Android and PS-controller checks remain required.
