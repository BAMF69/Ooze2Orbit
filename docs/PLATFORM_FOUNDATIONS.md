# Shared display, input and mobile foundations

Decisions: BAMF69, 2026-11-13. Display adapters now implemented across all five stages; remaining
input/offline phases are incremental. User reports liking all stages. Art direction chosen 2026-11-13:
smooth biological illustration with inked cel shading; first cell pass in `docs/HD_REMASTER.md`.

## Confirmed choices

Input slice implemented: Auto/manual scheme choice, deliberate-intent detection, controller left-stick
and native dialog navigation, cell touch stick/actions. Layout still follows viewport and orientation.
Other stage touch adapters and offline support remain. Scheme is saved in Settings → Controls.

| Area | Decision |
|---|---|
| Mobile platforms | iPhone/iPad and Android |
| Orientation | Both portrait and landscape; choose the best layout per stage |
| Desktop | Open windowed; provide a fullscreen button |
| Controllers | Xbox and PlayStation; shared actions and matching prompts |
| Touch | Left-thumb movement stick, right-thumb action buttons |
| Command menus | Pause civilization/space simulation while choosing on touch or controller |
| Small screens | Large text/buttons; secondary details go into panels |
| Performance | Smooth play on the user's current devices; simplify effects as needed |
| Offline | Required after game content has been prepared on the device |
| Saves | Local autosaves and manual export/import; no account |
| Rotation | Pause, rearrange layout, then wait for explicit resume |
| HD art | Leave style open; prepare rendering for sharper assets |

Recommended distribution: browser link first, with optional home-screen installation. This was
recommended during the interview; app-store packaging is not part of the first foundation pass.

Hands-on test equipment: iPhone 13 mini, 8-inch Android tablet, PlayStation controller.
Tablet model/OS and controller model can be checked when real-device testing begins. Xbox needs
its own validation; passing on a PlayStation controller alone does not establish Xbox compatibility.

## Build order and acceptance checks

### 1. Shared display and layout

Separate world coordinates, camera framing, render resolution and interface layout. Keep simulation
behavior stable while resizing. Provide shared safe-area bounds, readable UI sizing and a fullscreen
button. Stage layouts decide where the world, controls and panels fit; portrait is not a squeezed
landscape screenshot. Higher resolution alone does not create HD artwork.

Check: window resizing, desktop fullscreen exit/return, phone portrait/landscape, tablet layouts,
screen cutouts and readable menus. Rotation preserves state, pauses simulation and requires resume.

### 2. One input and pause system

Route keyboard/mouse, controller and touch through shared gameplay actions. Support simultaneous
movement and actions, controller menu navigation, device-appropriate prompts and button remapping.
Clear held input on focus loss, device disconnect and modal transitions. A shared pause coordinator
keeps menu, rotation and application-background pauses from accidentally resuming each other.

Check: play and navigate menus without a mouse; controller disconnect/reconnect; switching devices;
no stuck movement; opening a command menu freezes combat and timers; selecting an action never also
fires an unrelated gameplay input. Resuming is deliberate when rotation/backgrounding caused a pause.

### 3. Touch controls and one reference stage

Implement a movement stick, action buttons and responsive panels with simultaneous touch support.
Keep primary actions reachable on the iPhone mini. Use the cell stage as the first integration and
test bed: it is already approved as fun and exercises movement, attacks, pickups and selection UI.

Check: real-device movement while pressing an action, holding and releasing controls, opening menus,
rotating and backgrounding. No essential hover-only or keyboard-only action. Inspect portrait and
landscape on both the phone and tablet before extending the system to every stage.

### 4. Local saves and offline readiness

Create a shared checkpoint/autosave interface with stage adapters; define the recoverable state for
each stage. Preserve the existing generation checkpoint policy until a tested replacement exists.
Extend the export bundle as stages gain saves, validate imports before writing, and test restoring
the complete lineage on a different device. No account or automatic cloud synchronization.

Prepare and version the playable content for offline use, show when it is ready, and apply updates
at a safe point without discarding saves. Treat the first online visit and offline readiness as
different states; do not promise offline play before the necessary content has finished preparing.

Check: close/reopen, background/resume, export/import between devices, interrupted preparation,
offline launch and stage transitions in airplane mode, and updating content while retaining saves.

### 5. Stage adapters and performance

Adapt aquatic, creature, civilization and space one at a time. Each gets a portrait/landscape layout,
controller/touch actions and save integration. Prioritize civilization's build-placement cursor and
space's command flow; their menus pause while choosing. Keep the action set small and use panels
for secondary commands. Do not assume one touch layout fits all five games.

Measure actual devices and set frame-rate/render-resolution budgets from those results. Reduce
effects before compromising control responsiveness. Check action-heavy scenes and longer sessions,
not just an idle title screen. Test all five stages together after individual adapters pass.

## Scope boundaries

This plan does not choose the final art style, replace art assets, approve a new engine/dependency,
add accounts/cloud sync or promise app-store releases. It establishes shared infrastructure first;
art, animation and stage-specific polish follow after gameplay approval. A browser build can serve
as the distribution baseline while optional installation and offline preparation are added.

## First implementation slice

Implemented 2026-11-13: shared safe-area/viewport measurements, cell-specific adaptive camera dimensions,
native responsive cell status, diet/daughter/upgrade panels, desktop fullscreen button and rotation
pause with explicit resume. Pond size, physics, food, purchase rules and inherited progress are retained.
The cell camera can show a different amount of the existing world in each orientation. Native
previews reuse original layered sprite frames. Remaining stage adapters are described below.

Verified in Chromium emulation at 375x812, 812x375 and 800x1280: diet choice, movement, upgrades,
rotation freeze, exact daughter offers, nested Settings, simulated cutout margins, fullscreen and
cleanup on transition to aquatic. This is not a substitute for Safari/iPhone or actual Android testing.
No touch movement stick, new controller bindings, offline cache or new saves are implemented here.
Next slice: touch movement/actions and controller improvements, followed by hands-on device checks.

Start with shared viewport/safe-area measurements, rotation pause/resume and a responsive cell-stage
HUD/control layout. Preserve current gameplay. Demonstrate resizing and both orientations before
adding the touch stick and controller improvements. No further design questionnaire is needed to
start that slice; remaining technical details come from repository inspection and device testing.

## All-stage display rollout (implemented 2026-11-13)

All stages now share fullscreen controls, safe margins, readable native panels and rotation pause
with explicit resume. Aquatic adapts projected view, warnings, purchases and daughter cards; its
Gardener controls are a scrollable sheet with the habitat visible above. Creature uses a following
portrait camera and native generation choices. Civilization stacks its two grids in portrait while
sharing one transform for drawing and pointer placement. Space adapts flight/edge cues and uses an
icon-based native outfitter, readable map routes and command panels. Civilization/space pause combat
while commands or details are open. Stage changes stop old scenes and clean their native panels.

459 unit tests and production smoke pass; Chromium emulation exercised 375x812 and 812x375,
fullscreen, paused clocks, retained choices, purchases, construction and cleanup. This does not
certify Safari or actual Android devices. No new assets, dependencies, account system, save schema,
offline cache, movement stick or controller bindings were added. Those remain next phases.
