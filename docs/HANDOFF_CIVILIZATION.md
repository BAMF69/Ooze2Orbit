# Civilization remaster handoff


## Campaign step 2 — 2026-11-18
Worktree: sibling `Ooze2Orbit-campaign`; branch `feat/civilization-campaign-tower`; baseline origin/main
`91067f3`. Earlier `Ooze2Orbit-civilization` remains untouched except its separate approved-plan commit.
Preview: http://localhost:5192/?stage=civ&mode=tower&difficulty=easy&seed=11 (medium/hard also supported).
Normal `?stage=civ` resumes campaign. Approved sequence is tower/hero/tug per difficulty; next unavailable
mode shows a saved-progress explanation and practice buttons. Nine wins are still required; no premature
Space button after one battle. Hero/tug implementation must wait for this step's playtest.

New pure modules: battlefields.ts (registry/generation/BFS), battlefieldTuning.ts (balance), campaign.ts
(checkpoint validation/idempotence/aggregate records), progress.ts (save orchestration). wars.ts accepts
board config; heroOrders/hdLayout/illustrated/HUD use it. Terrain reuses ruin frame15; no new art/deps.
Generator v1 and campaign v1 reject unsupported versions without overwriting. Battle-boundary checkpoint;
no mid-battle save. Standalone matches cannot mutate campaign/lineage. Both player and rival construction
preserve moving-unit routes. Unknown checkpoint/lineage extension data stays; legacy civ records stay valid.
Minimal shared edits: aquatic/runSave.ts is the existing cross-stage bundle index, now includes and validates
civ_campaign; shell/saveFiles.ts offers it through existing timestamp-based Continue. No new shared schema.
Runtime finalization saves ninth result first, then writes the aggregate lineage; Retry save and reload
recover failure safely. One stage-wide temperament cap; diet separate; usage-ranked technology heritage.

Local dependencies copied into the new checkout; none changed elsewhere. Missing existing creature WebPs
were hydrated from their exact merged GitHub LFS media and SHA-256 verified, without editing those assets.
Initial full suite: 812 passed, two unrelated failures (missing creature LFS files and creature minimap 5s
parallel-contention timeout). Assets restored; rerun uses VITEST_MAX_WORKERS=2 without changing test config.
Final verification is below. Physical devices remain unverified.

### Step-2 verification complete
- Wrapper `check`: TypeScript and 11 shader recipes pass. `VITEST_MAX_WORKERS=2 python tools/dev.py test`:
  **820 tests / 82 files pass** (12 default creature search seeds retained). Final focused civilization
  suite: **53 tests pass**, including 6,000 generated seeds and real sends/defensive-kill economic victories
  on all difficulties. No test configuration or other-stage test was changed.
- Production GPU wrapper smoke passed for hard seed11, with an 8-frame recording and final screenshot.
  Browser regression passed actual pointer construction/completion, resource flow and Farmer paydays,
  live fixed tabs, Details timers/tweens freeze, both wins, same-seed rematch, standalone isolation,
  campaign checkpoint/next-region/reload. Tested 1440x900, 375x812, 812x375, 667x375, 800x1280.
- Touch/controller browser pass: actual hard-phone cell placement; all native visible button targets
  >=44px; patrol/manual takeover; rotation freezes and explicit Resume; directional native controller
  navigation to Thorn, single confirm, retained Builder page and subsequent cursor placement.
  Input-scheme changes now cancel the gesture without discarding the new key/stick action.
- Seeded a completed checkpoint through pure campaign functions solely for handoff integration:
  aggregate legacy-compatible lineage finalized, unknown own/upstream fields retained, actual Space
  scene entered, civilization DOM cleaned up. This is not a claim hero/tug gameplay exists.
- Fresh-slot handling was checked against the REAL SaveStore after the browser exposed missing files
  being confused with damage; missing is allowed, unreadable/newer saves remain protected. Failed final
  lineage writes retain all nine results and expose retry on touch as well as keyboard/controller.
- Browser review captures: chat outputs `civ-campaign-{easy,medium,hard}-desktop.png`, hard phone,
  landscape/small-landscape/tablet, and touch375/667/812. Small-grid physical-device precision and
  human difficulty/fun remain BAMF69's playtest. No physical hardware certification.
- Branch is to be pushed for BAMF69 to open/merge the PR; do not push main or begin step3.


Date: 2026-11-14 (America/Phoenix)
Worktree: sibling Ooze2Orbit-civilization
Branch: feat/civilization-remaster
Baseline: fd0f29d

## Latest: illustrated HD remaster (2026-11-14, uncommitted)
- User requested implementation, not planning, and reaffirmed LIVE submenus after clarification.
  No commit/push is authorized for this HD work. Keep all edits in this worktree.
- Active registration remains CivWarsScene. Read main checkout's newer cell/aquatic HUD, art and
  touch-pause foundations as references only; those uncommitted files remain untouched. The only
  shared runtime edit is a civ-only fullscreen case in core/viewport.ts plus its updated test.
- New modules: civ/hud.ts (persistent localized native overlay), illustrated.ts (original art/render),
  hdLayout.ts (one draw/hit transform), pointerOrders.ts (completed-tap guard), presentationPause.ts
  (preserved Details clock states). Scene is now their adapter; wars.ts adds read-only placementIssue,
  shared with actual place(). Economy, maze validation, units, workers, hero contract and heritage stay.
- Original atlas/terrain in public/assets/art/civ_*_hd_v1.png; A-CIV-0001/0002 and exact prompts logged.
  All active roles are illustrated; generated alpha preserved. New projectiles/feedback are code-native.
- Fullscreen world, safe overlays, base/income meters, wave preview, role actions and actual effect cards.
  Desktop/phone/tablet fit both mazes; short landscape uses a side command panel. No camera gesture needed.
- Taps issue orders only on release; drag/multi-finger/pointer cancel/capture loss/focus/rotation/scheme
  changes cannot place. Keyboard/controller role selection, independent cursor, patrol and one-finger
  hero movement/Bite/Pulse remain. Details and shell/rotation pause freeze; submenus stay live.
- Game speed now honored by civ; Reduced Motion disables bob/tilt/expanding pulse. Native UI is crisp;
  canvas width caps at 1600 logical pixels, texture filtering is linear, stage cleanup restores smoothing.
- Locale changes refresh persistent labels/cards; no per-frame DOM rebuilding. Save-failure result
  disables Continue until retry succeeds. Unknown lineage fields and legacy space records stay intact.
- Validation: 487 unit tests; wrapper type/11 shaders; GPU production smoke drive play:34 --timeout 60
  with 67 captured frames. Initial 34s recording used the default 30s marker timeout and timed out;
  the corrected 60s run passed. Desktop + real emulated touch browser harnesses pass construction,
  sends/Farmer food, live menus/patrol, drag/cancel/blur, focus stability, Details timers/tweens, all
  four layouts, rematch and space. Regression harness passes .5x/1x speed, Reduced Motion, rotation,
  pseudo locale, economic win, unknown lineage fields and failed-save retry. Browser captures and
  gameplay.webm are in this chat outputs; motion frames visually reviewed. Physical devices pending.
- Server remains isolated on localhost:5176; no other checkout/server/dependency changed.

## Previous: live command panels and Farmer workers (2026-11-14)
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

## Fixed civilization command tabs — 2026-11-15
- User playtest revision: a single fixed command habitat replaces expanding submenus. Hero, Builder, Summons and Workers / terrain are always visible tabs (keyboard 1–4; Q/U and controller shoulder/select cycle all four).
- Selecting towers, sending creatures, training workers and changing terrain retain their page. Back returns to Hero. Commands remain live; Details and explicit shell pauses still freeze combat.
- HUD bounds reserve the same footprint on every page: a bottom dock in portrait/desktop/tablet, a permanent right dock on short landscape. Maze transforms and pointer mapping no longer change with tab selection.
- Scoped code-native organic styling draws on the user's supplied HUD reference: bone rims, rooted leaf corners and luminous channels. Inherited normalized temperament shares tint presentation only: balanced/cautious lagoon teal, aggressive coral, adaptable violet. Diet stays independent; no lineage or simulation changes.
- Controller tower selection releases command navigation for build-cursor movement without hiding the Builder page; West or selecting Builder again re-enters command navigation. Native buttons retain stable DOM identity and 44px minimum targets.
- Verification: 490 unit tests; type/shader checks; GPU production smoke. Browser tests check identical full layout/dock geometry across all four tabs and Back on 1440×900, 375×812, 812×375 and 800×1280; actual build completion, sends, Farmer, live clock, patrol/manual hero, Details freeze and controller selection. Touch emulation also checked; physical hardware remains pending.
- Preview: http://localhost:5186/ from this civilization worktree. Port 5176 was found serving the older scene; do not use that link for the remaster. Nothing committed or pushed.
