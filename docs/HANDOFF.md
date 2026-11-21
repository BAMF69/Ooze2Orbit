# Handoff

**Last updated:** 2026-11-21
**Branch:** `feat/cell-division`. Previous baseline committed and pushed as fd0f29d. This snapshot includes the subsequent aquatic remaster, map rewards and organic HUD/input polish. Push only when asked.
**Active:** Cell/aquatic upgrade and growth HUD polish, expanded effects in Details, and aquatic illustrated remaster. Creature/civilization may be developed in independent chats/worktrees; preserve their scope.

## Playtest fixes: perf, touch layout, d-pad, creature full screen (2026-11-21)
- Details and verification in PLAYTEST_LOG 2026-11-21. New: game/domPatch.ts (write-if-changed DOM helpers;
  use them in any per-frame HUD code), core/touchLayout.ts + shell/touchLayoutEditor.ts (Settings → Controls →
  Touch layout, file touch_layout.json), shell/touchControls.css (d-pad, editor), aquatic/surfaceBreach.ts.
- Aquatic touch: d-pad (up/down depth, up at surface = breach, left dash, right sprint, centre Shock). The scene
  reads a virtual "surface" action held only by d-pad up. Keyboard/controller bindings unchanged.
- Creature uses creatureViewport (full screen, cover framing) + frameCamera() sized to the current room/hub
  width; civ is full screen from its own remaster; only space keeps reserved bands.
- Performance budget 960x540; Auto drops for low-end touch devices; body[data-perf-lite] lite HUD CSS.
- Outstanding: real older-tablet and iPhone retest; casting is Screen Mirroring only (Info panel tip).
- QA script: ../work/touch-dpad-layout-qa.cjs (captures in ../outputs/dpad-*, touch-layout-*, creature-fullscreen-*).

## Approved illustrated HUD family (2026-11-17)
- Cell and aquatic use complete painted surfaces for all three diets, native weighted Vollkorn text,
  crisp symbols/meters, a tapered inset status panel and a centered 75% landscape progression strip.
- Portrait stays shallow; upgrades scroll above the anchored strip. Touch menus pause while keyboard
  and controller menus stay live. Aquatic depth, pace, breach, dash and acquired Shock retain bindings.
- Final review: no added corner ornaments; raised kelp, dorsal-fin and armored-scute tab dividers
  follow each aquatic diet's material. Gardener is a distinct painted pill, and notifications clear crests.
- Current renderer: illustratedHud.ts/css plus illustratedHudSurfaces.json. The earlier component-frame
  constructor is superseded. Use docs/art/HUD_ILLUSTRATED_FAMILY.md and its review captures as the contract.
- Asset provenance A-0037/A-0038, A-0039 and A-0040 (font); exact generation prompts and bundled OFL license included.
- User authorized commit/push on 2026-11-17. Physical phone/controller checks remain outstanding.

## Approved cell/aquatic open HUD (2026-11-16)
- New stable navigation/progression strip: centered75% usable width in landscape; compact88px portrait.
- Tapered upper-left live resources/vitals; inventory/system buttons upper right. Upgrades/Info float
  above the strip. Portrait depth/actions leave the center lane free; conditional abilities preserved.
- A-0040 locally bundles OFL Vollkorn. A-0041 supplies six quiet transparent component sheets: membrane
  cell materials, kelp/cartilage/scute aquatic materials. Historical ornate art is not used in this HUD.
- hudDock.css is the single active HUD cascade. Older dietOverlay/paintedHud/hudTabs CSS is not imported.
- Localized player-occlusion mask keeps overlapping content readable. Gameplay/input/save rules retained.
- Source bounds/prompts and validation: docs/art/HUD_OPEN_OVERLAY.md. Browser captures are in ../outputs/
  hud-final-{main,aquatic}-{herbivore,carnivore,omnivore}-{1440,375,812,800}.png and upgrade variants.
- No commit/push/publication authorized for this pass. Physical-device checks remain outstanding.

## Repository publication (2026-11-17)
The user authorized committing and pushing the aquatic avatar work to its own branch. Other stage branches remain separate.
All 506 tests, type/shader checks, production build, and the in-game Diet developer-control check pass.
Equipment attachment refinement is still deferred. Older uncommitted/shared-art notes below describe earlier snapshots.

## Complete aquatic body forms (2026-11-16; current avatar worktree)
- User deferred attachment tuning; continued body maturation instead. All three temperament families now have
  four distinct forms and three independent diet palettes: 36 sheets / 432 poses. Mature adaptable form 3 retained.
- New evolutionArt.ts/evolutionBodies.json/evolutionTextures.ts resolve family/form/diet and load relevant palettes
  on demand. Soft 64 MiB atlas cache protects live references and retains ownership across scene restarts.
- World player, sisters and daughter previews share body selection. Growth, thickness, stats, gameplay and saves remain intact.
- New body-specific rigs are PROVISIONAL for equipment. Do not interpret finite socket coverage as validated attachment quality.
  The old offline part lab remains a mature-adaptable review snapshot; body progression is in the new evolution gallery.
- 506 tests, typecheck, 11 shaders, build, 184 game combinations, phone portrait/landscape and production GPU smoke pass.
- Worktree feat/aquatic-avatar-development at base 9c9f2c0 remains uncommitted. Do not merge/push/publish.
  See docs/art/AQUATIC_MATURATION.md. Earlier shared-form status below is historical.

## Aquatic rig schema and inspection workbench (2026-11-16)
- avatarRig.ts now owns named sockets and body-specific measured paths/landmarks. attachmentSchema.ts defines
  all eight parts declaratively. attachmentCompiler.ts replaces coordinate-by-part logic; organPlacements.ts
  is a compatibility export. World sprites and native previews use the same compiled contract.
- Supported authored rig: mature adaptable, forms 3/4 (form 4 shared-art status explicit). Other families/forms
  need their own authored rigs and are rejected by this compiler; their existing renderer remains intact.
- Offline inspector: src/dev/avatarInspector.ts, tools/avatar_inspector.html, build_avatar_inspector.mjs.
  Each part has its own checkbox, Solo, mount/animation descriptions and tiers where applicable. Front/side/
  back views, pose stepping, actions, reduced motion, mount/label/bounds overlays, schema/setup downloads.
- Gills/endurance/torrent artwork proxies and the tendril hinge-only limitation are labeled. Current ordinary
  sockets are provisional bind positions; spine/tail are measured per pose. No new bitmap or save/HUD changes.
- 503 tests, typecheck, 11 shaders, build and 184 game combinations pass. Offline workbench controls/exports
  and mobile layout pass with zero errors/external requests. Details: docs/art/AQUATIC_RIG_SCHEMA.md.

## Aquatic spine attachment follow-up (2026-11-16)
- User requested tier III armor to bend/contort with side and back poses. spineArticulation.ts now samples
  measured dorsal curves (avatarFrames.json/spines), with arc-length spacing and tangent orientation.
- Side/back tiers I/II/III use 2/4/7 overlapping tapered scutes. Three atlas crops per scute bend internally;
  world rendering accounts for nonuniform body scale. Native previews use the same crop/placement data.
- No source bitmap changed. No per-frame texture generation. Pause/reduced motion and dash remain coherent.
- 499 tests, typecheck, 11 shader checks, build, and the 184-combination browser fixture pass. The standalone
  preview now has Next pose for inspecting curvature. tools/avatar_spine_review.mjs captures side/back detail.

## Aquatic avatar representative slice (2026-11-16; isolated worktree)
- Worktree: isolated Ooze2Orbit-avatar checkout.
  Branch feat/aquatic-avatar-development, base 9c9f2c0. Remote feat/cell-division verified at the same commit.
  Changes are local and uncommitted. Do not push, publish or merge without the user's request.
- User approved dominant temperament percentages as the family selector, independently of diet/stats/equipment.
  Aggressive is muscular/sharklike; cautious shelled/nautilus/turtle; adaptable now grows slender and feline,
  with aquatic skin, narrow waist, webbed limbs and a long ribbon-finned tail. Broad mantle concepts superseded.
- A-0035: family/form concept board plus mature adaptable three-diet, three-view swim/chomp sheets and organ atlas.
  Forms 3/4 temporarily share the mature body. Juvenile art, distinct form-4 maturation and the other families'
  production artwork remain future work. Do not describe this slice as the complete aquatic remaster.
- New landmarkEquipment.ts and organPlacements.ts share illustrated organ atlas frames, never generate textures
  per frame, remove swapped organs, and retain simulation-driven pause/reduced-motion behavior. Tiered fins/jaws/
  plates change structure. Frame/eye/tail landmarks are in avatarFrames.json; originals are not pixel-edited.
- Daughter cards/mitosis use the same body/organ placement contract. Sisters keep the shared illustrated renderer;
  no legacy aparts path is restored. Stat mechanics, collision, saves and inherited thickness remain unchanged.
- Shared-file integration note for HUD work: AquaticScene.ts changes only viewCamera(), adding a portrait-touch
  avatarY clamp (.48). This keeps the player clear of observed touch-control/banner overlap. No HUD file changed.
- Legacy equipment cache trims stale composites to 32 plus referenced textures. New source textures are renamed
  into runtime atlases rather than uploaded twice. Read docs/art/AQUATIC_AVATAR_SLICE.md for prompts and scope.
## Creature worktree update (2026-11-14)
Creature gameplay work is isolated on `feat/creature-remaster` at the `fd0f29d` baseline.
Approved procedural Water slice supersedes the six-room creature prototype. Post-playtest: physical
walkable overworld/shoreline replace menu navigation; direct image loading plus sheet validation
fix intermittent missing-avatar textures. See
`docs/CREATURE_WATER_SLICE.md` for implemented scope and `docs/CREATURE_HANDOFF.md` for
validation/local preview. User authorized committing/pushing this creature branch on 2026-11-15. Other stage entries below
remain the shared baseline history.

## Aquatic crash and recovery polish (2026-11-16)
- Fixed reported daughter-selection crashes: SisterView no longer draws legacy aparts overlays.
  AquaticIllustrations already owns complete equipment, including toxicTendrils and electricOrgan.
  GPU browser regression exercises form3/form4 daughter selections with each part on desktop/phone.
- Player food and health purchase healing is 2× old values in pond, 4× lake, 8× coast, HP capped.
- Plates articulate along the swimming body; all equipped gear shimmers and pickup parts bob/glow.
  Tendrils and organ use organic shaded details. Stun adds blue static around player, no flashes.
- Food halos are subtler, include bloom pods; blooms sway. Growth bars are roomier/taller, HUD uses
  serif small caps, and empty normal/unique part slots always render in the inventory.
- Validation: 493 tests, type/shader checks, form regression browser checks and production coast smoke.
- Empty inventory placeholders follow normal form capacity (1, 2, 3, 3); unique river parts appear only when acquired. The hosted Sites preview has not yet been updated.

## Aquatic player animation and modular looks (2026-11-16)
- A-0034 adds diet-specific three-view swim/chomp sheets. playerMotion.ts selects idle/swim/attack/dash/
  breach/stun. Actual speed controls cadence; eating/rams trigger chomp; dashes streamline with wake;
  breaches use side pose/pitch and a re-entry splash. River and map avatars share the renderer.
- Stat ranks add ridges, streamlines, scutes, fins and bulk. Equipment is curved/shaded, pose-aware and
  cached; body/parts share every transform. Diet, temperament, part tiers and game rules are preserved.
- Touch pause freezes animation; reduced motion keeps static cues without wake trails or breach pitch.
- Prompts, runtime paths and design details: docs/art/AQUATIC_PLAYER.md.
- Validation: 492 tests, type/shader checks and desktop/phone GPU browser checks of diet, swim, dash,
  eating, breach/re-entry, mid-breach pause, reduced motion and health bulk.

## Aquatic ambient animation and visibility (2026-11-16)
- A-0033 adds three-view swim/bite poses for darter, finray, spinefish and shellback. Measured frame
  rectangles preserve complete silhouettes. All bites, including school bites, trigger actual poses.
- Fleeing/retreat uses hunting cadence (2× normal cruising). Jellyfish remain quarter speed and passive.
- Jellyfish bump retaliation obscures the world in murky green for 2s; HUD remains readable.
- Seaweed/kelp sway from floor anchors; food breathes with a colored halo, without changing collisions.
- Touch menu pause freezes animation/effect timers; reduced motion uses still foliage/fog and steady food.
- Validation: 489 tests, type/shader checks, desktop/phone GPU browser scenarios and production coast smoke.
- Runtime asset paths and imagegen prompt set: docs/art/AQUATIC_MOTION.md.

## Aquatic wildlife animation and eel combat (2026-11-16)
- Predator frames now use measured silhouette rectangles in motionFrames.ts rather than equal cells,
  fixing cut shark noses and rear fins (deepmaw/hammerhead included). Source PNGs remain intact.
- Hunt animations retain their original speed; normal swimming is half speed, jellyfish quarter speed.
  Per-creature clocks preserve phase on state changes. Jellyfish never chase and retaliate only on bumps.
- A-0032 supersedes single-pose wildlife: faceless purple/green jellyfish matching the supplied concept,
  pulsing swim + tentacle-sweep frames; turquoise/gold eel tail-swim + bite frames. Both have three views.
- Eel bites arm a 220ms wind-up when shock is ready. Discharge stuns nearby submerged players for 1.2s,
  starts a five-second cooldown and 2.5s retreat. No extra shock damage. Eels cannot bite during retreat.
- Touch upgrade pause freezes all new animation and combat timers. Reduced-motion keeps static cues.
- Deepmaw/shark/hammerhead swim and bite sheets remain. Asset prompts and timing: docs/art/AQUATIC_MOTION.md.
- Validation: 487 tests, typecheck/shader checks and desktop/phone GPU browser checks (actual contact,
  swim frames, stun movement suppression, retreat, cooldown, touch pause, alpha and no runtime errors).

## Painted trim and persistent tab meters (2026-11-15)
- A-0030 replaces vector connecting trim with long independently painted botanical/bone/amber rails.
  Complete illustrations bridge corners/center; no short raster tile pattern. Component ornaments stay.
- Cell Jet Burst now works with live upgrades open. Space remains available on keyboard; Q/R1/RB also
  activates dash without competing with controller confirm. Touch upgrades retain their pause behavior.
- One live plant/dash/meat meter group moves from normal HUD row to a smaller strip above the crest for
  Upgrades/Info. Values, readiness and cooldowns keep updating; growth form bars remain full-width below.
- Type/shader checks and 477 tests pass. Desktop, portrait and short-landscape browser checks cover both
  tabs' visible mini meters, actual Space dash/cooldown while upgrading, held WASD and bottom form bars.
  Physical mobile retest and deployment remain pending.

## Held movement and restored growth hierarchy (2026-11-15)
- Menu clearHeld calls were discarding physical WASD while key-repeat events were ignored. New
  ShellInput.clearMenuInput clears virtual/queued inputs but preserves physical held keys. Organic tab
  clicks and both upgrade-toggle callbacks use it. Pause, focus loss and stage transitions still hard-reset.
  Regression test covers retained W, released touch/queues, key-up and hard reset.
- Growth layout now keeps the four form bars across the bottom, full inner HUD width, with resource/dash
  bars above. Short landscape uses the same hierarchy with compact top actions. 17.5dvh height and
  fullscreen 75vw remain. Independent corners/crest remain; intertwined continuous trim and sparse
  asymmetric leaf/claw outgrowths add organic variation without tiled bitmap connectors.
- Type/shader checks and 477 tests pass. Desktop/portrait/short-landscape browser checks exercise held W
  through E and Info/Growth clicks, release/new keypress and full-width bottom form placement in both stages.

## Compact HUD and genuine component art (2026-11-15)
- User rejected the legacy frame crops, feathered seams and short tiled connectors. A-0029 now provides
  three newly generated transparent sheets, each containing complete independent corner and centerpiece
  objects with connecting arms. A-0028's renderer is replaced; no legacy HUD frame images, feather masks
  or raster pattern tiles appear in the outer frame. Existing individual form meter artwork is unchanged.
- The new renderer uses authored attachment ports, mirrored whole corners and long continuous vector trim.
  Source sheet dimensions, component regions, generation notes and final asset paths are in
  docs/art/HUD_COMPONENTS.md. Verdant uses botanical materials after an imagegen refinement.
- HUD height is now 17.5dvh (30% shorter than 25dvh). Fullscreen width is 75vw, centered. Windowed width
  still respects safe areas. Every tab retains identical frame bounds. Compact desktop/short-landscape
  layouts place resources and form bars side by side; portrait stacks them and keeps Info scrollable.
  Very short landscape uses smaller purchase targets to fit the explicitly reduced HUD height.
- Aquatic framing now follows the measured dock for every tab, removing the old 25%-upgrade clamp.
- Validation: type/shader checks and 476 tests pass. Both stages at desktop/phone/short safe-inset landscape/
  tablet pass reduced-height geometry, tab consistency, input/purchases and touch pause. Fullscreen tests
  verify exact centered 75% width, 17.5% height and windowed restoration. Browser alpha samples confirm
  transparent exterior/gap pixels; frame DOM contains no masks or patterns. Production results follow in
  PLAYTEST_LOG. Physical-device retest and deployment remain pending; work is local/uncommitted.

## Fixed HUD tabs and modular organic silhouette (2026-11-15)
- Supersedes the separate Controls/Details disclosure implementation below. Growth, Upgrades and Info are
  real buttons; Info combines controls, system actions, parts/perks and effect descriptions in one scrollable
  panel. The entire dock is 25dvh in every state. Tab changes only replace content, never resize the frame.
  Touch upgrade pause, native Enter, gameplay Space and left/right purchase navigation are preserved.
- HudDock now owns one content area. Original details wrappers are removed after retaining their live text
  nodes; cell/aquatic visibility guards use infoOpen. Other StageUi adapters keep their native disclosures.
- A-0028: ModularHudFrame draws the organic silhouette and quieter textured connectors as responsive SVG,
  reusing A-0026 fixed corner/crest crops. One central diet landmark, four corners and sparse leaf/claw
  accents avoid repeated skull/leaf centerpieces. SVG masks blend source-crop joints; no solid CSS rectangle
  or stretched whole-frame bitmap sits behind the art. Resize/theme observers disconnect on shutdown.
- Exit fullscreen is a 32x30 opaque icon with title/accessible label. Normal Fullscreen remains labeled.
  Overlap fading now applies once to the shared parent rather than multiplying child-panel opacity.
- Validation: type/shader checks and 476 tests pass. Desktop, portrait, short safe-inset landscape and tablet
  checks cover both stages, all diet frame themes, exact unchanged tab bounds, combined content, Space,
  arrow selection and touch pause/close. Desktop fullscreen checks verify actual 32x30 bounds and solid
  background/opacity, plus enter/exit and Info behavior. Production results are in PLAYTEST_LOG.
  Physical Safari/Android testing and deployment remain pending. Changes remain local and uncommitted.

## Shared HUD tabs and aquatic map rewards (2026-11-15)
- Latest HUD supersedes the ornate outer rim and separate upgrade tray described below. A simpler stable
  bottom border contains Growth, Upgrades, Controls and Details. Upgrade/control/detail content replaces
  growth inside the frame; upgrades retain quarter-viewport height. Very short landscape uses a compact
  tab grid and scrollable content. Individual diet form capsules and overlap transparency remain.
- Mouse/touch activation releases disclosure focus. Space stays a gameplay action; Enter still activates
  focused native controls. Both organic upgrade panels accept Left/Right as well as Up/Down and Enter.
- Plant/meat tracks target the cheapest eligible cost (exclude capped stats); mixed health purchases count
  toward availability. Resource tracks and Upgrades glow when a purchase is affordable. Central dash meter
  uses real cooldown; Evolve glows when the stage allows advancing. Top-left fullscreen appears for fine
  pointers or while already fullscreen. Aquatic Gardener sits in the center next to dash recharge.
- Aquatic base fins/jaws/plates drop at tier I in pond, II in lake, III on coast. Higher-tier duplicates
  upgrade the existing slot without downgrading. Jaws add 6 damage/tier; plates multiply damage by .75/tier;
  fins add 3 handling/tier and 12% turning per tier above I. Optional partTiers survives save/load/inheritance.
- Lake/coast jellyfish deal 22 base contact damage (map multipliers apply) and a 3s movement slow. They drop
  toxicTendrils: contacting attackers get 3s of 5 damage/s and .45 movement speed, refreshing without stacking.
  Coast electricEel drops electricOrgan: F / right-stick click / touch Shock stuns enemies in a 260-unit
  3D radius for 2.5s, with 8s cooldown. Fauna also take 8 pulse damage. Stunned enemies can still be rammed.
  Status effects use simulation time, including sharks/sisters, and stop during touch upgrades/pause.
- F was descent: defaults and old uncustomized settings migrate descent to C; custom bindings are retained.
  Bindings and their generated Python golden reference were updated together. New code-native wildlife,
  loot icons and worn organs are A-0027. Later-map reward prompts explain why to explore.
- Validation: type/shader checks, 476 Vitest tests and 25 Python reference tests pass. Desktop, portrait and
  273px safe-inset landscape browser checks exercise tabs, focus/Space, arrow selection, meters/glows,
  touch pause and actual new-map fauna/parts/F cooldown/toxic contact. Desktop fullscreen enter/exit passes.
  Production smoke results are recorded in PLAYTEST_LOG. Physical-device retest and deployment remain pending.

## Form identity and adaptive transparency (2026-11-15)
- Each growth section owns its diet frame/fill. Completed forms retain their identity; unreached forms are
  grayscale. Aquatic stores optional formDiets through food growth, daughter selection and defensive save
  loading. Older saves fall back to available selection evidence/current diet when history is unknown.
- Upgrade cards take their palette from payment currency: plant=green, meat=red, either=gold. Unaffordable
  and capped cards are grayscale, while their descriptions remain inspectable.
- Outer HUD edges now repeat painted trim with fixed-size corners instead of stretching the whole strip.
  A thicker double rim and central jewels make the overall dock more ornate than individual form capsules.
- Scene-owned postupdate projection checks fade overlapping dock/upgrade/control panels to 20% opacity;
  menus retain input and restore opacity as the creature moves clear. Shutdown removes the checks/classes.
- Validation: type/shader checks and 471 tests pass, including diet-history save round trips. Desktop,
  portrait phone and safe-inset short-landscape browser checks pass for both stages: form themes/future
  grayscale, currency themes, affordability grayscale, purchases and close/cleanup. Cell overlap fade/
  restore is exercised. Both GPU production smokes pass. Physical mobile retest remains pending.

## Painted HUD and quarter-screen upgrades (2026-11-15)
- Cell and aquatic upgrades now occupy exactly the bottom 25dvh, full width, covering the growth dock.
  All stat purchases sit side by side; short landscape and portrait layouts retain 44px targets.
  Touch opening still pauses simulation/timers/tweens. Resource balances and inherited bonus levels remain visible;
  full effects/cost descriptions remain in Details and accessible button labels.
- A-0026 adds three transparent illustrated frames: vivid green vines/wood, scarlet bone/fangs and gold mixed
  chitin/leaves. Four live growth capsules, dock/inventory rims and upgrade cards use these assets.
  Local serif font stacks style headings without a network font dependency. Images preload before gameplay.
- Tray remains below shell Pause/rotation overlays; closing or leaving a stage restores the dock and controls.
  Aquatic redraws the frozen avatar when opening the tray so the creature remains framed above it.
- Browser verification covers desktop, tablet, portrait phone and 273px landscape, all diets in both stages,
  quarter bounds, touch pause, purchases, inherited levels, close/resume and scene cleanup. Physical Safari/
  Android retest remains pending. Type/shader checks, all 470 unit tests and both GPU production smokes pass.
  A separate browser check verifies shell Pause covers an open tray. These changes remain local and
  uncommitted; the published site is older.

## Compact organic HUD and Safari chrome (2026-11-15)
- User's phone captures showed the older GitHub Pages teal HUD, with Safari landscape tabs consuming height.
  Current local changes are not deployed; do not commit/push unless requested. Safari chrome is outside
  page control. Controls now includes a Home Screen/Open as Web App guide when fullscreen is unavailable;
  index.html enables Apple's standalone-web-app metadata. No offline caching/install prompt is promised.
- `hudDock.ts/css` consolidates status, plant/meat points, upgrades, Controls and evolution into the bottom
  four-form meter. Pause/fullscreen/help and scheme-specific instructions are in Controls; aquatic Gardener
  stays in that drawer. Touch movement/abilities remain above the dock. Cell's floating Upgrades/Evolve
  buttons are removed; Jet remains a thumb action. Native buttons retain existing scene callbacks.
- Parts/Details now shares the top-right parts strip. Mobile cell perks stay in Details to limit strip
  width. Aquatic health/stamina are small readouts inside the dock, freeing the top right for parts.
  Drawer heights and touch offsets follow measured dock/inventory bounds, including 273px landscape.
- A-0025 logs original scalable carved frames inspired by the user's vine-bar reference: wood/leaves,
  bone/claws and amber cellular shell. The four live tracks have inset shading, tick marks and glowing
  diet-colored fills. Existing thresholds, diet themes and temperament semantics are preserved.
- Cell camera follows the region above the dock. Aquatic camera distance increases only when a grown body
  cannot fit in the available play area. These are presentation changes, not physics or stat changes.
- Validation: check/type/shaders and 470 tests pass. Desktop, tablet, portrait and short-landscape browser
  checks exercise layout, Details/Controls, single-finger paused upgrades, Pause/Resume and Safari guide.
  Full-grown cell/aquatic checks cover spacing, evolution and cleanup. Cell/aquatic GPU production smokes pass; fullscreen enter/exit is verified through the new Controls
  proxy. Actual Safari/Android device retest and published-site deployment remain pending.

## Diet overlay identity (2026-11-14)
- User requested diet-colored backgrounds and ornaments in both organic stages: green herbivore with
  leaves/vines, red carnivore with teeth/scratches, yellow omnivore. Omnivore treatment uses cellular
  honeycomb outlines with leaf/fang accents to suggest a mixed diet.
- `dietOverlay.ts/css` follows the actual creature diet, updates immediately after daughter choice and
  removes its body attribute on stage shutdown. Scoped styles cover HUD, upgrades, Details, touch
  controls and toolbar without restyling later stages. Ornaments are static backgrounds, not hit targets.
- Growth's omnivore color is now yellow. Temperament's adaptable meters remain blue; no rule or save
  format changes. HP/stamina/warnings keep their functional colors. Code-native ornament asset A-0024.
- Validation: 470 tests and type/shader check pass. Desktop/phone browser matrix verifies all three
  palettes in cell/aquatic HUD and upgrades, actual daughter diet changes and cleanup on entering space.
  Cell/aquatic GPU production smokes pass; final screenshots are in sibling outputs. Physical device retest still pending.

## Aquatic full-screen overlay and touch upgrades (2026-11-14)
- User playtested cell on an Android tablet and could not swim while upgrading. Touch upgrades now pause
  cell/aquatic simulation, scene timers and tweens. Menus remain interactive, and opening/closing clears
  held/queued actions. Keyboard/controller upgrade behavior stays live. `TouchMenuPause` preserves prior
  clock states; presentation clocks also stop during touch upgrades. No hardware multi-touch claim is made.
- Aquatic fills the viewport, like cell. Native safe-area overlays put build/commands/Details left,
  health/stamina and illustrated part buttons right, scheme-specific controls top-center, growth bottom.
  Remaining creature/civilization/space viewport policies are unchanged.
- Aquatic touch adapter: left stick swims/reverses/turns; right Dash, Jump and Cruise/Fast; separate held
  Ascend/Descend buttons. Buttons support independent captured pointers. Touch releases/hides during
  introductions, choices, upgrades, Details, pause, rotation, admin, blackout and scene shutdown.
- Upgrade pausing also works in rivers. Existing Gardener buttons remain available outside river runs.
- Internal verification: type/shader checks, 470 tests, browser emulation at 800x1280, 375x812 and 812x375.
  Browser checks cover single-finger purchases while world/timers freeze, resumed input cleanup, simultaneous
  swim/dash, river freeze, edge-to-edge canvas, controls/growth separation and stage cleanup. Cell and aquatic GPU production smokes pass. Depth, pace, jump, and live keyboard upgrades also passed.
  Physical tablet/iPhone/controller playtests remain needed.

## Aquatic illustrated remaster and upgrade polish (2026-11-13)
- Cell and aquatic upgrades use stable native effect cards: costs, level tracks, inherited over-cap labels,
  affordable/short states and keyboard/controller selection. Gameplay stays live while spending, as before.
- Details explains owned parts, purchased/inherited levels and daughter/river perks. New effect totals derive
  from the actual rules and use localized templates. Cell has no health pool; aquatic retains real HP/stamina.
- Four-chamber growth presentation is polished in cell and added to aquatic using existing 70/120/180 gates.
  Completed forms preserve diet colors during the run; Form 4 is complete without inventing another gate.
- A-0023 adds original illustrated diet bodies (three views), fauna, predators, props and pond/lake/coast art.
  `aquatic/illustrated.ts` mirrors projected simulation sprites through a hidden scene-owned container;
  gameplay, sister populations, fog, threat cues, lens, rivers and jump cutscenes retain their existing owners.
- Organic equipment and temperament silhouette accents are shared by world bodies, daughters and mitosis.
  Aquatic arrival uses the new body art. Swimming respects pause/Reduced Motion; backdrop covers portrait bounds.
- Aquatic-only CSS polishes health/stamina, menus and Details, keeps messages above growth, and enables smooth
  canvas scaling without changing later-stage styling. Legacy world logical resolution remains a future pass.
- Validation: 470 tests, type check and 11 shader compiles pass. Cell and aquatic GPU production smokes
  pass. Browser emulation at 1440x900 and 375x812 covers upgrade/Details content, inherited labels, all
  three maps, equipped daughters, river entry and stage cleanup with no page errors. Final captures in
  sibling outputs; nine recorded production frames inspected. GIF conversion skipped (Pillow unavailable).
- Physical iPhone/Android/controller checks and full world-render resolution remain pending. No new
  dependency and no commit/push for this change. New assets are tracked through the existing PNG LFS rule.

## Civilization HD worktree — 2026-11-14 (uncommitted)
- Civilization HD remaster is implemented in sibling Ooze2Orbit-civilization on feat/civilization-remaster.
  Fullscreen habitat, original illustrated atlas/terrain, persistent localized HUD/cards, safe tap
  placement and hero controls. The user reaffirmed live submenus; Details and explicit pause still freeze.
- Gameplay/progression and lineage/space contracts remain. Only shared runtime change: civ-specific
  fullscreen viewport case. Main checkout's uncommitted cell/aquatic work was inspected, not modified.
- 487 tests, type/shader checks and recorded GPU production smoke pass; desktop and emulated mobile/
  controller interaction tests pass. Real devices remain pending. No HD commit/push authorized.
- Details: docs/HANDOFF_CIVILIZATION.md; exact artwork prompts: assets_src/civ/HD_ART_PROMPTS.md.

## Civilization controls branch — 2026-11-14
- `feat/civilization-remaster` is based on fd0f29d in sibling `Ooze2Orbit-civilization`.
- User approved playtest and authorized commit/push of this civilization work on 2026-11-14.
- 1 Hero / 2 Builder / 3 Summons, matching native touch buttons, independent build cursor,
  obstacle-aware hero move orders and optional automatic combat patrol.
- User revised the pause-menu preference: compact submenus run live above the controls and leave
  both mazes visible. Details and explicit shell/rotation pause still freeze the battle.
- Farmer workers cost 35 ore and add 6 food per payday; gatherer output stays unchanged.
- 476 tests, type/11-shader checks and civilization GPU production smoke pass. Browser checks
  cover desktop, emulated touch/controller, live menus/paydays, placement, rematch and space.
- No shared shell/core changes, assets/dependencies or creature/space/save contract changes.
  Physical-device validation remains. Detailed record: `docs/HANDOFF_CIVILIZATION.md`.

## Full-pond HUD, birth and aquatic entry (2026-11-13)
- User requested clearer spikes, birth after diet choice, five stage icons, aquatic animations around the
  temperament reveal, red/green/blue temperament graphics, full-pond HUD overlay and four growth sections.
- User explicitly withdrew health-bar request after learning cell damage loses food. No health mechanics added.
- Picked-up spikes now render an eight-thorn ivory crown independent of purchased attack mandibles. The same
  equipment painter supplies world bodies, daughters and mitosis; HUD SVG symbols show parts/perks and Jet cooldown.
- Cell canvas fills the viewport. Its camera zoom prevents exposing space outside the pond on tall screens;
  native HUD respects cutouts. Growth sections track existing 40/90/140 food gates; Form 4 is complete without
  another food requirement. Colors follow the diet in each form. Controls sit top-center; inventory top-right.
- Stage menu uses five original SVG icon cards with text options below, preserving menu action IDs and input routing.
- `LifeSequence` plays a scene-clock birth after diet selection, descent before aquatic temperament and arrival
  after confirmation. Simulation/input wait; pause/rotation hold progress. Reduced Motion uses a brief static
  presentation. Continue/autoplay/debug aquatic starts skip these entry presentations as appropriate.
- Shared native temperament chart is red aggressive, green cautious, blue adaptable, with separate diet badge.
  Percentages still derive from the normalized cause log and sum to 100. Hide removes aquatic chart before other panels.
- Validation: 470 unit tests; type/shader checks; cell/aquatic GPU production smokes; pseudo-locale passes.
  Browser GPU checks cover desktop/phone stage cards, birth pause/input freeze, edge-to-edge canvas, actual spike
  pickup, parts/perk icons, growth, pre/chart/post aquatic flow, exact simulation freeze, rotation and fully
  equipped short-landscape touch-controls/bar separation. Screenshots are in sibling outputs.


## Cell motion, asset rollout and game start (2026-11-13)
- User approved style, asked for wriggling/velocity-facing cells, matching remaining cell assets, logo and landing.
- `cell/swimMotion.ts` smoothly follows velocity by shortest angle, keeps heading at rest, adds speed-sensitive
  squash/wriggle. Reduced Motion removes oscillation; pause/choices freeze it; game speed scales its clock.
- Illustrated renderer covers player, sisters, four pond organisms, food and pickups. Inked organic equipment
  follows body rotation and appears in cards/mitosis. Hidden container retains legacy simulation anchors,
  fading and pop tweens without rendering old sprites; scene shutdown owns cleanup. Art log A-0021.
- Game start now has an original logo, illustrated evolution-to-orbit key art, translated copy and entry button;
  keyboard/controller entry and consent stay intact. Main menu shares branding and retains all actions.
- 468 unit tests; type/shader checks; GPU production gameplay and pseudo-locale smoke. GPU browser tests at
  1440x900 and 375x812 exercised title/menu entry, art loading, facing/wriggle, reduced motion, pause freeze,
  equipment/daughter cards, division and transition cleanup. Screenshots in sibling outputs.
- Future: distinct form illustrations, richer swimming poses and higher-resolution world rendering. Other
  stage assets remain prototypes; actual phone/controller hardware checks remain pending.

## Input schemes and cell remaster (2026-11-13)
- Auto defaults by pointer capability, follows deliberate keyboard/mouse, controller or touch input; ignores
  passive mouse movement/isolated stray taps. Settings → Controls → Control scheme persists an override.
- Scheme and viewport remain separate. Modes update without scene restart or losing selections.
- Default pad left stick supplements D-pad. Native dialogs navigate/focus/confirm via real buttons;
  injected scene actions are guarded against recursive activation. Existing key/pad rebindings retained.
- Cell has a captured multi-touch left stick and right action buttons (Upgrades, conditional Jet/Evolve).
  Inputs release on pause, modal, cancellation, rotation, scheme change and shutdown. Other stages retain
  their native responsive controls; dedicated touch movement/action adapters remain to implement.
- User selected smooth biological illustration with inked cel shading (Borderlands reference). First
  original three-diet body strip is integrated in cell play, sisters, cards and mitosis. Native previews
  use higher-density canvases. Cell UI has its first polished panel/status treatment. A-0020 logs art.
- `docs/HD_REMASTER.md` explicitly tracks remaining world-render resolution, form animation, enemies,
  food/parts and later-stage art; this is not the complete remaster. No new dependency.
- Validation: 466 unit tests, type/shader check, production cell smoke; Chromium emulation for actual
  touch movement/release, rotation, menus and cleanup; simulated PS pad for menu navigation/left stick.
  Physical phone/tablet/controller checks remain pending. ADR 0006 records input policy.

## All-stage display rollout (2026-11-13)
### Space outfitting diagram restored
- Responsive hangar now includes a live ship/slot diagram, reusing original atlas frames, slot positions
  and colors. Desktop places it beside the purchase/removal controls; phones stack it above them.
- Preview redraws only on hull/part changes; it hides outside the hangar and is removed with StageUi.
- Verified: add/remove changes pixels, hull switch redraws, phone bounds, launch hiding, scene cleanup;
  461 unit tests, type/shader checks and space production smoke. Screenshots in sibling outputs.

### Creature entry / stage handoff repair
- Creature Toy 2 now opens the shared temperament reveal; gameplay and queued inputs wait for confirmation.
- Stage writes synchronize the surviving diet. Reveals also recover the aquatic daughter's diet from older
  stage blocks whose species-level diet was stale. Creature checkpoints carry their upstream lineage source;
  matching generations resume, different sources/diets start fresh. Legacy matching-diet saves remain usable.
- Verified crash: CreatureScene.draw read a destroyed camera after startGame stopped its scene synchronously.
  Creature and civilization result handlers now return immediately after advancing to the next stage.
- Regression: 461 unit tests; type/shader checks; production creature smoke; isolated Playwright scenario
  reproduced old crash, then passed reveal freeze, legacy herbivore handoff, G2 reload and creature→civ→space.

- User explicitly requested aquatic, creature, civilization and space receive cell's display changes.
- Shared safe-area bounds, Pause/Fullscreen buttons, adaptive framing and explicit rotation resume
  now cover all five stages. `stageViewport` policies preserve world/simulation coordinates.
- `game/stageUi.ts` provides readable native status/details, scrollable dialogs and command buttons.
- Aquatic: native reveal, health/stamina bars, purchases and layered daughter cards; Gardener sheet
  leaves the habitat visible. Camera projection, warning edges, backgrounds and cutscene text adapt.
- Creature: bounded following camera in portrait, native status and generation choices, offscreen
  approaching-predator message. Room geometry and inherited generation state unchanged.
- Civilization: pure `civ/layout.ts` stacks mazes in portrait; pointer cells share the draw transform.
  Native commands/details pause battle clocks; tower selection closes immediately before placement.
- Space: native icon outfitter/fitted-part removal, map routes and commands; flight camera centers,
  edge warnings and wormholes adapt. Commands/details pause combat. Raw held keys clear on pause.
- Shell stops the old stage before starting another: no stale simulation or orphan native panels.
- Validation: 459 tests, type/shader checks, production GPU smoke for four stages; browser pointer
  checks for purchases, placement, heir/daughter selection, command pause, rotation freezes, held
  input clearing, fullscreen and cleanup. Phone/tablet checks are emulated, not physical-device proof.
- No new dependencies/assets/save schema. Thumb stick, expanded controller bindings, offline
  preparation and HD asset replacement remain separate work. ADR 0005 records the adapter choice.

## Cell display foundation slice (2026-11-13)
### Temperament follow-up (BAMF69 2026-11-13)
Computer layout approved. User reported 100% cautious plus 100% aggressive; replaced independent
meters with competing normalized shares totaling 100%. Later stages normalize prior + evidence
and interpolate to keep the existing 50pp cap. Empty histories are balanced; largest-remainder
display rounding totals exactly 100. Old lineage caches refresh on SaveStore reads/writes from
unchanged cause logs, preserving progression and unknown fields. Tied leaders are named as tied.
Regression coverage includes 800 varied signed transitions and a browser-rendered legacy 100/100
save becoming 50/50/0. Touch/controller work remains next; other prototype playtests still pending.

- Pure `core/viewport.ts` computes cell camera/physical bounds; `shell/viewport.ts` reads safe-area
  CSS and viewport changes. Cell opts into variable camera dimensions; remaining stages keep 640x360.
- Status, diet/daughter cards and upgrade rows use native responsive DOM/CSS with readable text and
  scrolling. Original atlases supply animated layered daughter previews. Pause freezes preview clock.
- Pause/Fullscreen buttons, minimum 44px button targets and details/parts panel. Existing keyboard
  and gamepad choice actions retained; no new input defaults. Native focused buttons accept Enter/Space.
- Rotation pauses and clears held/queued input. Explicit resume required; rotation in Settings keeps
  its stack and paused world. Mood and mitosis reflow without regenerating the pond or offers.
- Same food, world dimensions, physics, purchases, daughter/perk rules. Upgrade panel still leaves
  the pond running, as previously approved. No new art/dependencies/save changes.
- Validation: 445 unit tests, type/shader checks, production/browser scenarios, existing mitosis
  regressions. Phone/tablet sizes are Chromium emulation, not physical Safari/Android certification.
- Next: touch stick/right action controls and controller improvements; then user's real-device tests.
- Foundation plan: `docs/PLATFORM_FOUNDATIONS.md`; implementation decision: ADR 0004.

## Foundation planning interview (2026-11-13)
User requested simple guided questions; interview complete. Confirmed choices and implementation
order are recorded in `docs/PLATFORM_FOUNDATIONS.md`, linked from GDD/ROADMAP. The first display slice
is now implemented. Initial slice: shared viewport/safe areas, rotation pause/resume and cell
layout; then input/touch, offline/checkpoints, and individual stage adapters. Art style stays open.

## Civilization Toy 2 (2026-11-13)
- `CivWarsScene` now registers as civ. Pure `civ/wars.ts` owns deterministic simulation and BFS routes;
  `warsTuning.ts` owns balance values. Old Toy 1 is unregistered pending replacement playtest.
- Two 11x7 mazes, ore/food economy, gatherers and builders, thorn/mortar/mist defenses,
  reedrunner/shellback/briar-brood sends, previewed rival waves and permanent kill/send income.
- Keep routes open: placement validates entrance and existing units; builders divide work among queues.
- Hero inherits creature strength/vitality/claws. Claws cross defenses. J/F bite, Space pulse, WASD move;
  Q/U cycle command, E execute at hero cell. Click command buttons and own grid for construction.
- Rich ore helps sends (+60% payday ore); rocky ground helps defense (35% cheaper construction).
- Cautious/balanced lineage faces a raider with larger waves; aggressive lineage faces a warden with
  an extra tower. Deterministic rivals are a prototype pick.
- Destroy rival base or reach 5x nominal rival income. Fallen settlement offers immediate rematch;
  hero wounds cost 5 ore and 10s recovery. Neither ends the garden.
- Victory writes base_destroyed/economic_supremacy, spending/maze/hero causes and technology heritage.
  Space accepts both new names and older conquest/trade/faith saves; most-used tech grants a part.
- No mid-match save, selling/upgrades, research/probe or campaign in this first toy. Original sprites reused;
  no new assets/dependencies. Creature hero art stays the shared terrestrial placeholder.
- Validation: unit suite, type/shader checks, production GPU smoke; real browser pointer construction,
  sends, keyboard hero, pulse, pause freeze, win recording/rematch; ordinary-resource strategy simulations.

## Creature Toy 2 (2026-11-13)
- Normal menu Creature starts `CreatureGenerationScene`, a connected six-room side-view world.
- Two routes: strength 4 breaks the stone wall; inherited claws climb the upper wall (hold W against it).
- J/F bite, S hide, Space jump, E interact/trap/nest/seed; shared action bindings also support gamepad.
- Die or return to the nest after exploring: pick drought/flood, then one of three daughters.
- Deterministic contrasting heirs are a prototype pick: bites improve Stonejaw, cliff/jumping unlocks
  Vinefoot claws, plants/stealth improve Mossheart, traps add its strength. No mid-life upgrades.
- Drought supplies more meat and +1 bite damage; flood supplies plants, slows predators and conceals crouching.
- Opened routes, discovered rooms, traits and history persist; unfinished lives restart at the nest.
- Checkpoint slot `creature_generations` is validated and included in normal export/import. Choose Creature
  from the menu to resume it (the existing Continue button still targets aquatic).
- Crown seed writes a creature hero/abilities into lineage and offers civilization (still its old Toy).
- Existing original sprites reused; no new dependencies/assets. Old creature scene unregistered pending playtest.
- Limits: handmade screen-sized rooms, guaranteed contrasting heirs rather than weighted random rolls,
  simple trap/guardian, terrestrial sprite baseline (aquatic diet/temperament carry, body-plan art pending).
- Validation: type check, unit tests, production GPU smoke and real browser scenarios; see stage doc.

## Confirmed direction
- BAMF69 likes the hybrid cell stage (2026-11-13) and requested its split + daughter choices in aquatic.
- Keep active pickups and E-menu purchases in both stages. Daughter bonuses supplement that loop.
- Normal cell starts at Form 1, no immediate choice or siblings. Form 1 food restored to 28 algae,
  2.5s regrowth, meat 2; later forms keep 42 algae, x1.5 regrowth, meat 3.
- Cell Form 4 keeps playing; Enter with E closed refreshes lineage and moves into aquatic.
- Cell daughter bonuses grant full +2 above purchase cap 5; aquatic purchases stop at 10 and daughters
  likewise add full +2 above it. Purchase panels display extra levels as 5+N / 10+N.

## Aquatic implementation (2026-11-13)
- Each food-driven advancement to Forms 2, 3, 4 freezes the world, plays the split using aquatic
  swimmer/part sprites, then opens three choices. Reduced motion is a brief fade.
- One herbivore/carnivore/omnivore; inherit stats, parts, river uniques, currency and thickness.
  Distinct food-weighted stats add +2; a free normal slot can grow a corresponding aquatic part.
- Unchosen sisters now found persistent map-local lineages: shared food, growth, autonomous splitting,
  telegraphed bites/bumps, player ram kills and loot. Rivers leave them in the departure map.
- No new aquatic exclusive-perk set. Sister timing/population/NPC stat cap are your picks; playtest pending.
- Water, threats, population, timers and river current wait; early input clears. Keyboard/gamepad or click.
- Selection resumes the existing swim/river loop and exit/mouth rules; Form 4 keeps swimming.
- Deterministic pending seed + feeding evidence survive Continue; exact offers return. Confirmed
  choices never repeat. Existing no-mid-river-save policy remains: reload returns to prior map save.
- History and final levels go to aquatic lineage; bonus levels count once in the cause log.
- Save parser validates optional metadata and preserves valid over-cap levels (health to 16, others 17).
- Modules: aquatic/division.ts, aquatic/divisionPicker.ts; cell/mitosis.ts now accepts stage body factories.
- Numbers: AQ.division, AQ.mitosis. No new dependencies, art or audio.

## Validation
- Wrapper check passes, 11 shaders compile; all 424 tests pass.
- Recorded aquatic picker smoke passes; split frames and choice screen visually inspected.
- Interactive Chromium passes all three growth choices, inherited progress, keyboard/click selection,
  frozen world/river current, exact pending Continue, confirmed Continue, and final lineage records.
- Cell animation regression passes: input lock, pause clock, restored player, reduced motion, cleanup.
- Preview: parent outputs/aquatic-daughters.png. Test scripts in sibling work/ are not repo changes.

## Sister ecology and future requirements (2026-11-13)
- `aquatic/sisters.ts`: engine-free AI/food/combat/reproduction; `sisterView.ts`: actual body/part sprites,
  growth, family labels and attack tells. AQ.sisters owns all tuning. Old saves remain compatible.
- All map populations persist in optional run `sisters`; inactive maps freeze. Continue preserves IDs,
  ancestry, health, food and bodies. Render sprites clear on leaving; inhabitants never migrate.
- Live ecology checks pass: rejected variants, shared-food removal, growth/three-descendant birth,
  visible windup/damage, ram death/loot, map leave-return, river origin, coast separation and Continue.
- Future confirmed plan: HD/fullscreen, complete controllers and mobile after prototypes prove fun.
  Shared render/UI/input foundations first; per-stage polish afterward. GDD records open production specs.

## Windows runtime
- Git 2.56.1, LFS 3.8.1, Node 26.13.1, Python 3.15.2. Server via wrapper at localhost:5173.
- PATH needs C:\Program Files\Git\cmd; C:\Program Files\nodejs; C:\Python315.
- PLAYWRIGHT_BROWSERS_PATH = absolute sibling work/playwright; npm_config_cache = sibling work/npm-cache.
- Pillow not installed; smoke PNG bursts supported. No dependency installed for video/GIF export.

## Next
BAMF69 plays aquatic normally: are form choices worth anticipating and do they fit the swim/river pacing?
Do not make further design changes until notes. Cell vertical slice waits; space Toy playtest still pending.

2026-11-17: High-density WebGL rendering is now independent of logical gameplay dimensions. See
HD_REMASTER.md for Graphics quality caps and architecture. Main entry no longer forces pixelArt or
pixelated CSS scaling. New files: src/core/renderQuality.ts, src/shell/renderResolution.ts;
DisplayViewport reapplies quality on viewport/DPR changes, Settings Display persists the choice.
High targets native4K; Ultra allows3x phone density. Existing raster master sizes remain unchanged.

Civilization playtest follow-up (2026-11-15): fixed four-tab command HUD implemented in the civilization worktree. Builder/Summons stay open after actions; Back returns to Hero; maze geometry stays fixed between pages. Temperament-tinted organic HUD, shortcut 4 for Workers / terrain. Preview is **5186** (5176 served old scene). See docs/HANDOFF_CIVILIZATION.md. No commit/push.
