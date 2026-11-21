# Aquatic avatar representative slice — A-0035

Built-in imagegen; 2026-11-16. Branch feat/aquatic-avatar-development, base 9c9f2c0.

## Direction and scope

Temperament shares alone select the dominant family. Diet changes palette and feeding anatomy independently.
Aggressive: muscular shark lineage. Cautious: protective nautilus/turtle lineage. Adaptable: increasingly slender,
feline proportions, narrow waist, flexible spine, long tapered webbed limbs and ribbon-finned tail. Smooth aquatic
skin; no fur or mammalian ears. The earlier broad cephalopod concepts are superseded, not runtime assets.

This slice authors the mature adaptable body in three diets and twelve poses per diet. Forms 3 and 4 share this
first mature sheet; distinct juvenile and form-4 maturation art and the other two families remain future work.
The concept board records the four-stage trajectory. Existing simulation, body thickness, stats, saves and
equipment capacities remain authoritative. Form selection does not change the actual stats.

## Registered runtime assets

- public/assets/art/aquatic_adaptable_herbivore_motion_v1.png
- public/assets/art/aquatic_adaptable_carnivore_motion_v1.png
- public/assets/art/aquatic_adaptable_omnivore_motion_v1.png
- public/assets/art/aquatic_player_organs_v1.png

Body layout: four columns (left bend, neutral, right bend, bite); front/right-side/back rows. Organs: three
view columns (front, right-side, back); five rows (fin, jaw, scute, tendril, electric organ).
Original generated PNGs are copied without pixel editing. Actual alpha silhouette rectangles and optical
alignment offsets live in src/game/aquatic/avatarFrames.json. Clean transparent gutters are validated separately
from nominal grid cells. Purple-eye landmarks align front/side poses; the back uses the head crown.

## Attachment contract

LandmarkEquipment uses shared atlas frames and independent attachment objects, with no per-frame texture
generation or equipment/stat Cartesian-product textures. Fin size/auxiliary pairs and scute count develop with
tiers; jaw size develops with tiers and articulates on bite. Fins tuck on dash. Scutes follow the body bend.
Tendrils sway on the simulation-driven clock; electric organs pulse gently. Reduced motion keeps steady cues.
Removing a part destroys its objects. New atlas textures reuse the loaded texture objects without duplicate GPU uploads. Player and sisters share the renderer; no aparts path is restored.
Natural anatomy and equipped organs are separate; the narrow-waisted diet body stays exposed.

The legacy renderer retains its existing looks for the remaining bodies. Stale legacy composite textures are
trimmed to 32 plus currently displayed textures; live textures are never evicted.

## Generated concept artwork

- docs/art/concepts/aquatic_families_v1.png: initial board; adaptable row superseded.
- docs/art/concepts/aquatic_families_v2.png: slender feline revision.

## Tool and prompt record

All artwork generated with the built-in imagegen tool, not the CLI. No external franchise art was used.

+## conceptPrompt

Use case: stylized-concept. Asset type: Ooze2Orbit original 2D aquatic player development concept sheet. Create a polished art-direction board with TWELVE complete creatures in a perfectly clear 3-row by 4-column arrangement, generous spacing, pale warm neutral backdrop. Four growth stages per row from small juvenile on left to mature amphibious precursor on right. All creatures belong to ONE original biological lineage with exactly ONE large purple cyclops eye, bold dark ink contours, rich saturated illustrated cel shading, sculpted organic highlights and fine biological texture. They are strange, credible fantasy organisms, neither cute mascot fish nor realistic animals. Row 1 AGGRESSIVE: shark-inspired muscular taper, powerful forked propulsive tail, swept dorsal ridges, paired muscular pectoral appendages developing into weight-bearing fins in form 4; coral red diet used consistently across this row. Row 2 ADAPTABLE: amber/gold body and teal fin membranes, cephalopod-inspired elongated pear-shaped mantle with a SINGLE cyclops eye on a distinct leading head, lateral undulating fin skirt, FOUR short muscular trailing lobed arms, broad webbing; no fish tail, no sucker-covered dangling octopus legs. Stages become increasingly defined, mature form 4 with two sturdy forward support appendages and two trailing arms; still aquatic. Row 3 CAUTIOUS: lime green skin, cream underside, nautilus-inspired compact segmented dorsal carapace, turtlelike paired paddle limbs, protected neck and cyclops eye; juvenile small ridged hood growing into mature layered shell with distinct articulated edges, form 4 paddles become broad support limbs. All twelve shown in coherent right-facing three-quarter side view, fully inside canvas with margins, no equipment, no weapons, no scenery, no ground shadows. Add restrained column headings 'FORM 1', 'FORM 2', 'FORM 3', 'FORM 4' and row labels 'AGGRESSIVE', 'ADAPTABLE', 'CAUTIOUS'. Main goal strong silhouette variation across families while maintaining shared purple eye, head language and inked biological identity. Diet and temperament are independent systems: these colors are illustrative examples only, not labels defining temperament. Avoid extra eyes, humanoids, machinery, metal, clothing, UI mockups, cropped appendages.

## conceptV2Prompt

Edit the concept board: preserve the entire AGGRESSIVE top row and CAUTIOUS bottom row and all labels/layout. Redesign ONLY the middle ADAPTABLE row across all four forms. Adaptable must grow progressively SLENDER and FELINE: long narrow-waisted flexible body, small elegant head with one purple cyclops eye, four long slim limbs with webbed feet, a long supple ribbon-finned tail, low smooth dorsal fin. Amber/gold smooth skin with teal webbing and cream belly, subtle dotted chromatophores. No broad cloak, no heavy mantle, no thick muscles or chunky shoulders. Form1 a tiny streamlined aquatic organism with small limb buds and long tail; form2 longer lithe torso and four small webbed limbs; form3 elegant aquatic panther/otter proportions with limbs swept backward for swimming; form4 slender quadruped amphibious precursor in graceful low feline stance, longer limbs and clear narrow waist, still biological aquatic skin and webbed feet. No fur, mammalian cat ears or extra eyes. Match the original rich inked cel-shaded rendering, original pale warm background, whole silhouettes with generous spacing. Do not enlarge creatures so their tails overlap neighboring cells.

## slenderPrompt

Use case: stylized-concept. Asset type: production transparent 2D game sprite sheet, original Ooze2Orbit ADAPTABLE FORM 3 omnivore aquatic player. Exactly twelve complete sprites in FOUR columns THREE rows on transparent alpha. Style rich illustrated cel shading, bold black ink contours, saturated amber/gold skin with teal webbing, cream belly, exactly ONE purple cyclops eye. Anatomy: a SLENDER FELINE aquatic organism, elongated flexible torso, visibly narrow waist, small elegant leading head, four long slim tapered limbs with webbed paddle feet, long supple tapering tail with a small teal ribbon fin. Think aquatic panther or otter elegance, smooth biological skin with dotted chromatophores and delicate gill slits, no fur or cat ears. Dorsal line smooth and low, subtle narrow mantle fin running along flexible spine. This is not a fish, not bulky, not muscular, no broad cloak or heavy shoulder mantle. Every sprite should read as long, agile and lithe. Front and back views should be notably narrower than tall. Row 1 FRONT: head facing camera, one eye, body and long tail trailing upward behind head, paired limbs visible. Row 2 RIGHT-FACING SIDE: head right, tail left, long slim torso and narrow waist, limbs swept backward in swimming posture. Row 3 BACK: head at top, body extends down into long tail, limbs splayed just enough to show webbing; no eye visible. Columns 1/2/3 gentle left-bend/neutral/right-bend full-body swim with tail and webbing changing pose, column 4 chomp with open small beaklike jaw on front and side. Same body center and scale in all four columns; poses stay entirely within their own equal cell. All twelve silhouettes complete, generous transparent space around every appendage and long tail, at least 35px gaps. Very high quality HD illustrated biological creature, dramatic but restrained highlights, no extra eyes, no armor or equipment, no machinery, no text, no grid, no checkerboard, no environment, no drop shadows or external haze. Landscape 4:3 canvas.

## omnivoreSlenderPrompt

Use case: identity-preserve. Production sprite-sheet correction and diet variant. Preserve this exact slender feline aquatic cyclops anatomy, twelve poses in exactly four columns and three rows. CRITICAL: redraw each whole creature 25 percent SMALLER in its current cell, centered with huge clean transparent margins, restoring full tail tips and feet wherever previously clipped. No creature may touch outer image edges OR the boundaries between cells. All 12 tail tips complete and separate. Maintain consistent body size and center across columns within each row. Keep flexible narrow-waisted torso, four slender webbed limbs, long supple ribbon-finned tail and exactly ONE purple cyclops eye; no eye on back view. Same rows front, right-facing side, back; columns swim left, neutral, swim right, open bite. Diet palette: amber/gold skin, teal webbed fins, cream belly. Keep rich inked cel shading and sculpted highlights. Real transparent alpha only, clean alpha edges without colored noise, no background, shadow, haze, ground, grid or text. Do not add bulk, mantle cloak, armor, equipment, fur or cat ears. Landscape 4:3 canvas.

## herbivoreSlenderPrompt

Use case: identity-preserve. Production sprite-sheet correction and diet variant. Preserve this exact slender feline aquatic cyclops anatomy, twelve poses in exactly four columns and three rows. CRITICAL: redraw each whole creature 25 percent SMALLER in its current cell, centered with huge clean transparent margins, restoring full tail tips and feet wherever previously clipped. No creature may touch outer image edges OR the boundaries between cells. All 12 tail tips complete and separate. Maintain consistent body size and center across columns within each row. Keep flexible narrow-waisted torso, four slender webbed limbs, long supple ribbon-finned tail and exactly ONE purple cyclops eye; no eye on back view. Same rows front, right-facing side, back; columns swim left, neutral, swim right, open bite. Diet palette: lime/leaf green skin, botanical green markings, yellow-green webbed fins, cream belly. Keep rich inked cel shading and sculpted highlights. Real transparent alpha only, clean alpha edges without colored noise, no background, shadow, haze, ground, grid or text. Do not add bulk, mantle cloak, armor, equipment, fur or cat ears. Landscape 4:3 canvas.

## carnivoreSlenderPrompt

Use case: identity-preserve. Production sprite-sheet correction and diet variant. Preserve this exact slender feline aquatic cyclops anatomy, twelve poses in exactly four columns and three rows. CRITICAL: redraw each whole creature 25 percent SMALLER in its current cell, centered with huge clean transparent margins, restoring full tail tips and feet wherever previously clipped. No creature may touch outer image edges OR the boundaries between cells. All 12 tail tips complete and separate. Maintain consistent body size and center across columns within each row. Keep flexible narrow-waisted torso, four slender webbed limbs, long supple ribbon-finned tail and exactly ONE purple cyclops eye; no eye on back view. Same rows front, right-facing side, back; columns swim left, neutral, swim right, open bite. Diet palette: coral red skin, crimson markings, peach/ivory webbed fins, cream belly, modest ivory mouth fangs. Keep rich inked cel shading and sculpted highlights. Real transparent alpha only, clean alpha edges without colored noise, no background, shadow, haze, ground, grid or text. Do not add bulk, mantle cloak, armor, equipment, fur or cat ears. Landscape 4:3 canvas.

## gearPrompt

Use case: stylized-concept. Asset type: 2D game modular biological equipment atlas, rich HD inked cel shaded illustration with strong black contours and sculpted highlights. Actual transparent background. Exactly THREE columns and FIVE rows, fifteen separate complete isolated objects, very generous transparent padding in every cell. Columns show FRONT, RIGHT-FACING SIDE, BACK views of the same organ. Row 1: ONE elegant tapered teal fin membrane on amber fleshy root, swept triangular webbed shape, root at upper-right, tip at lower-left, anatomical veining. Row 2: ONE cream ivory hooked lower jaw apparatus with coral fleshy hinge and three organic fangs, root at left, tips curving up, no face, no eye. Row 3: ONE curved amber/teal overlapping chitin scute, diamond/teardrop shaped, smaller root at top, lower pointed end, layered ridge and inked edges. Row 4: ONE flowing curved fleshy PURPLE tendril with small green luminescent nodules, thick root at top, thin curved taper below, NOT lightning, NOT a plant. Row 5: ONE elongated bioluminescent electric organ, teal fleshy capsule with pale gold segmented internal chambers and cyan luminous core, clean closed silhouette with no external glow haze. Each is an independent organ that can be attached to an aquatic creature's body; no complete creatures, no bodies, no detached labels. Consistent materials across all views, no metal, machinery, manufactured armor, icons, circles, frames, grid, typography, scenery or shadows. Canvas portrait 3:5 composition, objects no more than 65% of each cell, at least 40 transparent pixels at outer edges and between organs.


## Integration and validation

Only AquaticScene.viewCamera changes outside the aquatic renderer modules: portrait touch uses avatarY .48
so the organism stays above existing controls and banners. HUD files remain owned by the HUD workstream.
Tail-fin mounts follow measured per-pose tail landmarks; endurance mounts differ for front/side/back anatomy.
The gallery uses valid capacities: fins/jaws/plates or fins/toxic/electric, plus the two unique river organs.

Browser fixture: tools/avatar_review.mjs [output-directory] [--device=portrait|landscape]. Uses its own data
prefix. The default fixture covers 184 family/diet/form/view/part/tier/daughter combinations; motion priorities,
part removal, touch pause and reduced motion; all three maps and the river renderer. Mobile modes start in
separate 375x812 and 812x375 browser viewports rather than resizing a running paused scene.

497 tests, TypeScript checks, 11 shader checks and production aquatic autoplay smoke passed. Browser fixture
produces a self-contained animated HTML comparison with bare anatomy, tiers I/II/III and toxic/electric loadouts,
plus desktop, river and phone screenshots. Physical iPhone/tablet/controller validation remains unperformed.

## Spine articulation revision (2026-11-16)

Tier III side/rear armor now follows seven measured dorsal control points per diet and pose, extending from the
nape into the tail root. Side paths follow the dorsal silhouette; rear paths follow the central body rather
than branching limbs. The points are stored in avatarFrames.json/spines, in the same 128-unit logical space.
spineArticulation.ts precomputes finite Catmull-Rom paths and samples by arc length to avoid changing overlap
through tighter curves. Tiers I/II/III use 2/4/7 tapered scutes in these views.

Each scute uses three independently transformed, slightly overlapping atlas crops. Their centers and tangent
angles follow the dorsal path, so individual plates flex internally as well as forming an articulated chain.
The world and native previews share this contract. Nonuniform body scale is included in world tangent/strip
scaling. Dash streamlines the scutes; reduced motion holds the neutral dorsal path. Pause has no new clock.
No bitmap asset was changed, no new texture is generated per frame, and no simulation/save/HUD rule changed.

The updated interactive preview includes a Next pose control for inspecting side/back curvature while paused.
Two additional tests cover internal flex, overlapping crop coverage, opposite rear bends, taper and dash/reduced
motion. Existing full-renderer fixture still covers all 184 combinations and daughter/sister equipment paths.
