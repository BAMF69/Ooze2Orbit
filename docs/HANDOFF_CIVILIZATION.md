# Civilization remaster handoff

Date: 2026-11-14 (America/Phoenix)
Worktree: sibling Ooze2Orbit-civilization
Branch: feat/civilization-remaster
Baseline: fd0f29d

## Latest: live command panels and Farmer workers (2026-11-14)
- User explicitly changed command-submenu behavior: menus must keep combat running and sit above
  1/2/3 without covering gameplay. This supersedes earlier platform/controls pause-menu notes.
- Scene-scoped .civ-live-menu uses the existing native buttons/navigation without a dimming veil,
  full-screen hit interception or inert role controls. Details and shell/rotation pause still freeze.
- Draw/pointer coordinates share the same fitted layout above the dock. Short landscape uses one
  control row; portrait keeps two. Narrow menus scroll horizontally; no shared shell/core changes.
- Workers/terrain is its own compact submenu. Farmer costs 35 ore and adds 6 food per payday, no
  ore-income bonus. Starts at zero, per-type cap 20, missing counts treated as zero. Gatherers retain
  their mixed ore/food behavior. No save schema or space/creature contracts changed.
- 476 unit tests passed, including new farmer cost/payday/cap/legacy-count tests. Wrapper type,
  11 shader recipes and civilization GPU production smoke passed. Live pointer and emulated touch
  scenarios passed patrol/combat clocks during submenus, farmer purchase/payday, all three layout
  bounds, role switching, sends, timed construction, Details freeze, rematch reset and space cleanup.
- Screenshots: this chat outputs/civ-live-workers-{desktop,phone,landscape}.png and
  civ-live-summons-{desktop,phone,landscape}.png; inspected phone/short-landscape captures.
- Server runs only in this worktree, port 5176. User approved playtest and authorized commit/push
  on 2026-11-14. No merge requested. Physical tests pending.

## Prior implementation: three roles and optional patrol
User approved civilization controls work and requested 1 Hero / 2 Builder / 3 Summons plus
optional automatic hero patrol. Implemented in CivWarsScene, scoped civ/controls.css and
pure civ/heroOrders.ts. Stage doc has full current control mapping and behavior.
No shared shell/core, creature, space, dependency, asset or save-contract changes. No commit/push.

- Three always-visible native role buttons, selected state, contextual Bite/Pulse or command actions.
- Builder mode retains a separate cursor; tower menu, summons and workers/terrain choices pause.
- Scene-local 1/2/3 shortcuts; shared remappable Q/R1 and U/select cycle three roles. Controller
  directions move builder cursor; confirm places; north in Hero opens patrol orders.
- Patrol routes around construction, attacks threats nearest the base and pulses groups. Selecting
  building/summons keeps patrol; manual Hero orders/actions take over. Rematch resets it.
- Hero tap movement now navigates around towers. Climbing still crosses them. All battle pause
  gates hold patrol too. Existing hits/kills tally includes autonomous hero activity.
- Two-row dock scoped to civilization; layout reserves additional space and sprite scale tracks tiles.
- Added four meaningful pure navigation/patrol regression tests. 474 unit tests passed; type and
  11 shader recipes passed; production GPU civilization smoke passed. Desktop harness passes
  number shortcuts, actual timed pointer construction/sends, paused commands, patrol continuity,
  movement takeover, controller menu-confirm guard/cursor placement, fallen rematch, victory to
  space and native panel cleanup. Touch harness passes actual taps, hero move takeover, Bite/Pulse,
  Details freeze, button bounds and both orientations. Focused desktop-to-portrait rotation with
  active patrol reached shell pause, froze the full battle, and required Resume. A six-frame
  browser burst captures autonomous attacks (captures/frames-civ-patrol). Final short-landscape sprite/text adjustment
  visually rechecked in outputs. Physical devices remain pending.
- Work scripts are untracked under this worktree's work/. Server remains isolated on port 5176.
- Next user playtest: are the three roles natural, and is patrol useful without overshadowing manual
  hero play? Patrol balance and a dedicated analog touch stick can follow those notes.

## Initial inspection (historical)
Inspection only; no gameplay, dependency, shared-shell or contract changes. No commit/push/merge.
Active registration confirmed: src/main.ts imports CivWarsScene, not CivScene.
Read CLAUDE, HANDOFF, ENGINE, GDD, ROADMAP Now, civilization stage, handoff contract,
platform foundations and HD remaster docs. Read scene, wars simulation, tuning, layout and tests.
The stage doc contains obsolete future-tense notes about space compatibility; current code/tests
already support new and legacy civilization records.

## Runtime
Existing installed dependencies copied into this worktree without changing package/lock files or
other checkout dependencies. Browser binaries reused read-only from sibling work/playwright.
Git/Node/Python require explicit Windows PATH entries documented in HANDOFF.
Isolated dev server: http://localhost:5176 (session started through tools.dev.tool with Vite port
and strictPort arguments because dev.py run exposes no port flag). Other servers untouched.

## Validation
- Project wrapper check: TypeScript and 11 shader recipes pass.
- Project wrapper test: 470 pass, including 11 tower-wars tests.
- Project wrapper GPU production smoke: stage=civ with drive play:2 passes.
- Adapted browser harness under work/civ-inspect.cjs: real keyboard movement, pointer tower
  placement, timed construction, native command pause, send, hero pulse, victory write, rematch,
  shared pulse/accept result guard and actual space startup/needle heritage assertions passed.
- Deterministic ordinary-resource strategies: defense economy win at 160s (income 59.6 vs 11.9),
  assault base win at 143s (16 shell sends); these show reachability, not player balance.
- Main harness subsequently timed out expecting a rotation pause after returning to civilization.
  Earlier assertions had passed; do not report the whole harness as green. Investigate rotation
  separately before changing behavior. Fresh browser mobile harness captures portrait/landscape
  without page errors, but does not establish real-device rotation/input compatibility.
- Visually inspected 1280x720, 375x812 and 812x375 captures in this chat's outputs directory.

## Recommendation awaiting user choice
First slice: civilization command/placement and hero-control readability across mouse, touch and pad.
Scoped civilization UI, explicit selected tool, valid/invalid placement preview and clear cancellation,
hero movement/bite/pulse controls and cooldown/health feedback, visible wave and income comparison,
and concise inherited-trait explanations. Preserve simulation and saves; discuss any required shared
input dependency before editing it. Match cell palette/ink treatment in scoped UI first; full original
biological settlement/tower/unit asset pass follows interaction approval. No redesign begun.

Important gaps: tinted reused sprites, keyboard-specific instructions, ten-command cycling,
no dedicated touch movement/bite adapter, weak visible lineage identity, no mid-match checkpoint.
Research, probe, extra Gardener levers and campaign are plans rather than current features.
