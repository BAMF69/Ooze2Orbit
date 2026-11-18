# Approved open HUD implementation — A-0035 / A-0036

Implemented for cell and aquatic, 2026-11-16. The approved visual-family v2 and compact portrait-menu
study are material/layout references only. No interface, lettering or complete frame was extracted.

## Layout and ownership
hudDock.ts owns the common status, system/inventory, navigation and floating content assemblies.
The single active stylesheet is hudDock.css. dietOverlay.ts sets diet; it no longer imports the old
dietOverlay.css, paintedHud.css or hudTabs.css generations. Those files and old art remain available
as historical references but are not part of this runtime cascade. Other stages remain out of scope.

Landscape strip: 75% of usable viewport width after safe areas, including endcaps. Desktop strip height
94 CSS px; short landscape 80px. Portrait uses usable width minus 12px and an 88px strip. Text scaling
expands the strip and form chambers. Tabs are Growth, Upgrades, Info above four native chambers.
Progression remains visible in every tab. Upgrades/Info float above the stable strip, with scrollable
portrait content. Resource readouts are not duplicated in the purchase panel.

Upper-left status follows real row geometry. Cell rows are plant 100%, meat 80%, dash 55%. Aquatic
vitality is 100%/90%, food 70%/60%, with dash/Gardener at the foot. The renderer measures row ends
and draws a tapered silhouette instead of retaining a rectangular empty backing. Health/stamina
include live numeric values and accessible native progress semantics. Form/diet summary remains.

System buttons and equipment occupy upper right. Normal empty slots remain visible; river slots appear
only when acquired. Existing conditional touch abilities are retained. Portrait swim actions sit at the
right edge with depth controls beside them, leaving the center lane free. Visible navigation buttons
have expanded transparent pointer areas; actual main action/Gardener/system targets are at least44px.

## Font
public/assets/fonts/Vollkorn-Variable.ttf, with Vollkorn-OFL.txt. Source: google/fonts ofl/vollkorn,
SIL Open Font License1.1; locally served, no runtime font CDN. Semibold native lettering, readable
numerals, app text-scale support. Font loaded after initial layout may cause a one-time font swap.

## Production art
public/assets/art/hud_{cell,aquatic}_{herbivore,carnivore,omnivore}_components_v2.png
All six sheets are1774×887 with two isolated objects: left open C endcap, right thin connector.
Original outputs are preserved unchanged. hudComponents.json records measured source bounds; runtime
uses nested SVG viewports that contain the complete objects, with no feather masks or contour crops.
The scute sheet has irrelevant peripheral guide marks outside the authored component viewports; those
are never rendered. Two rose generations with background haze were rejected and are not runtime assets.

Endcaps scale proportionately to strip height and stay inside the complete75% width. No large crest.
Quiet native curved spans adapt to width; painted connector details retain their own aspect ratio and
bridge the center, without repeating short raster tiles or stretching a complete frame. Caption text,
meters, focus, historical colors and state glows remain native.

Materials:
- Cell herbivore: subdued moss/jade membrane, dusty-plum junction.
- Cell carnivore: quiet wine/rose cellular membrane, no skeletal anatomy.
- Cell omnivore: olive/amber soft membrane, no scute armor.
- Aquatic herbivore: kelp stipes, sparse ribbon fronds; no wood or terrestrial leaves.
- Aquatic carnivore: rose-gray fish cartilage/gill arch, fine fin rays; no tusks or muscle ropes.
- Aquatic omnivore: subdued bronze/olive fish scutes; no gilding, branches or crests.

## Imagegen prompt set
Built-in imagegen, one sheet per stage/diet. Approved family used as material/style reference, not an edit
target. Prompt: production game HUD component art; transparent2:1 sheet with TWO separate objects in
equal square tiles, LEFT compact left-end open C bracket with rightward attachment tails, RIGHT one long
very thin gently undulating matching connector cord, tapered ends. Material as listed above, quiet mature
muted color, dark ink contours, broad cel shading, subtle texture, subdued diffuse highlights. No text,
icons, complete panels/interfaces/frames, jewelry, luminous edges, candy gloss, cast shadows or haze.
Complete silhouettes and generous margins. Planned endcap around44×76CSSpx, connector around8px tall.

Rose correction prompts used the accepted transparent herbivore components as edit targets: preserve
layout, clean alpha and isolated objects; replace material with wine membrane or rose-gray fish cartilage
and sparse fine fin rays. Explicitly disallow white background, gray haze, cast shadows and sheet borders.

## Behavior
Preserves gameplay, costs, saves, historical form diet colors, future gray chambers, funding-specific
upgrade colors, inspectable gray unaffordable cards, affordable/readiness glows, inventory capacity,
rotation support, reduced motion and fullscreen. On browsers without fullscreen support, the system
button opens Info with installation help instead. Touch upgrades pause; keyboard/controller menus stay
live. Movement focus behavior and arrow navigation stay with their existing owners.

Occlusion is localized around the player's projected bounds using a native mask. It keeps the player
visible through overlapping content without fading every upgrade description. No world-darkening layer.

## Validation and limitations
493 unit tests passed; typecheck and11 shader recipes passed. GPU browser checks cover both stages,
three diets, all tabs, 1440×900 desktop,375×812 phone portrait,812×375 short landscape and800×1024 tablet.
Checks assert stable strip bounds across tabs,75% landscape width and touch pause. Additional live input
checks cover heldW through menu changes, purchases, arrow selection, native fullscreen, inspectable
unaffordable cards, liveQ dash/Jet while upgrades are open and125% text scaling. Production GPU smoke runs cover cell and aquatic builds.
These are browser checks, not physical iPhone13 mini/Android8-inch tablet/PlayStation controller tests.
Physical Safari chrome, touch comfort and controller use still require device playtesting.
No commit, push or deployment was performed.
