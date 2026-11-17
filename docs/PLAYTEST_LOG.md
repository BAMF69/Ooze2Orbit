# Playtest Log
## 2026-11-16 — Aquatic wildlife art and predator swim/bite pass
Replaced procedural jellyfish/eel avatars with detailed transparent single-pose illustrations. New
deepmaw/blue-shark/hammerhead sheets supply three swim key poses and open-jaw bite in front/side/back
views. Actual attack events drive bite/recovery; physics and damage are unchanged.
Type/shader checks, 480 tests and coast GPU production smoke pass. Browser checks at 1440x900 and
375x650 verify frame cycling, real deepmaw/shark bite paths, recovery, touch-upgrade animation freeze,
reduced-motion neutral swim/bite cue, and transparent wildlife exterior pixels. Captures inspected.
Wildlife remains single-pose with flips/deformation; full directional wildlife animation is a later pass.
Physical-device retest remains pending. No commit/push requested.

## 2026-11-15 — Painted connecting rails, live-menu dash and compact meters
Added A-0030 long painted rails to match the independent ornaments. Cell Jet works during live upgrades;
Q/R1 offers a controller-friendly alternative to shared confirm. Touch upgrade pause remains. Live resource/
dash meters become a small strip above the crest on Upgrades/Info, returning to the normal row on Growth.
477 tests and type/shader checks pass. Both stages at desktop, portrait and short landscape verify visible
mini meters, actual Space dash/cooldown, held WASD and full-width bottom forms. Q/controller dash action
and paused touch upgrades also pass. Cell/coast GPU production smokes pass. Physical retest pending.

## 2026-11-15 — Held WASD regression and bottom growth row
Menu transitions discarded held physical keys; browser repeat events do not recreate those presses.
Organic HUD and upgrade toggles now release virtual/queued menu input while preserving held WASD.
Hard reset still applies to pause/focus loss. Added a regression test; all 477 tests and type/shader checks pass.
Both stages at 1440x900, 375x650 and safe-inset 812x273 verify held W across E and tab clicks, release/new
movement keys and full-width bottom forms with resource meters above. Frame retains independent art,
with intertwined trim and sparse asymmetric biological outgrowths. Physical mobile retest remains pending.

## 2026-11-15 — 30% shorter HUD and clean independent decorations
User rejected clipped/feathered corner and crest chunks and obvious connector repetition. Replaced the
outer frame with A-0029 whole transparent component art (built-in imagegen, botanical refinement), authored
attachment ports and long continuous trim. No raster repeat pattern or mask remains in the frame renderer.
HUD is 17.5dvh instead of 25dvh. Fullscreen uses a centered 75vw frame; windowed safe-area width restores
on exit. Tab dimensions remain identical. Aquatic camera framing uses the measured compact dock.
Type/shader checks and 476 tests pass. Both stages at 1440x900, 375x650, safe-inset 812x273 and 800x1280
pass compact sizing, tab changes, purchases/arrows and touch pause. Fullscreen checks verify exact width,
centering, height and restoration; PNG exterior/gap samples have alpha=0 and frame DOM has no mask/pattern.
Cell/coast GPU production smokes pass; captures show the new components and compact layout.
Physical-device retest and publishing remain pending.

## 2026-11-15 — Fixed real tabs and nonrepeating frame landmarks
User clarified that Controls/Details should combine into a normal tab, preserve menu size, and restore the
painted border with modular corners/center and a dynamic outer edge. Rebuilt HudDock around Growth,
Upgrades and Info; Info contains controls and live effect descriptions. All views use the same 25dvh bounds.
A-0028 uses fixed painted landmarks, blended crop joints and quiet curved connector texture, with leaf/claw
accents outside the silhouette. Exit Fullscreen is a compact opaque icon; its full name remains accessible.
Type/shader checks and 476 tests pass. Both stages at 1440x900, 375x650, safe-inset 812x273 and 800x1280
pass unchanged-frame geometry, real-tab/no-disclosure checks, Info content, Space, arrows and touch pause.
Final art captures check desktop/phone themes; fullscreen checks verify enter/exit, 32x30 bounds, opacity=1
and a solid background. Cell/coast GPU production smokes pass with the new frame; notifications are offset
above its crest. Physical-device retesting and deployment remain pending.

## 2026-11-15 — Shared HUD tabs, recharge/readiness and later aquatic rewards
Growth, Upgrades, Controls and Details share one simpler bottom border. Upgrades replaces growth inside
the quarter-height dock; normal form capsules keep their diet identities. Resource tracks display the
cheapest eligible cost; split plant/meat health payments count toward readiness. Affordable resource tracks,
Upgrades and available Evolve glow. Dash recharge and central aquatic Gardener share the middle row.
Pointer disclosures release focus; Space is gameplay and Enter remains native activation. Left/Right select
upgrade cards. Fine-pointer desktop/fullscreen sessions have a top-left fullscreen toggle.

Lake/coast fins/jaws/plates are tier II/III upgrades. Lake/coast jellyfish hurt and slow on contact, dropping
retaliatory toxic tendrils. Coast eels drop the F/R3/touch electric organ: 2.5s stun, 8s recharge. Descent is C;
old default settings migrate. New code-native visuals are A-0027. Balance awaits user playtesting.

Type/shader checks, 476 Vitest tests and 25 Python reference tests pass. Browser checks at desktop 1440x900,
phone 375x650 and safe-inset 812x273 cover tab bounds/content widths, Space after Details/Controls, arrows,
resource/readiness/evolution cues, touch pause and cooldowns. Actual map fixtures exercise new fauna,
tier upgrades, F stun/recharge and toxic contact/damage. Desktop fullscreen enter/exit passes. Final short
landscape checks keep the compact tabs inside the border. Cell and coast-with-new-organs GPU production
smokes pass, with rendered screenshots inspected. Physical mobile testing/deployment remain pending.

## 2026-11-15 — Persistent form themes and menu visibility
Retained completed-form diet frames, grayed future forms, fixed plant/meat upgrade palettes and grayed
unaffordable cards. Repeating outer trim, fixed corners and extra jewel ornaments replace stretched edges.
Overlapping gameplay menus fade to 20% so the player remains visible, restoring when clear. Aquatic form
identity survives daughter choices and save/load; old saves use the evidence available.
Type/shader checks, 471 tests and both GPU production smokes pass. Browser checks at 1440x900,
375x650 and safe-inset 812x273 verify both stages' form/currency themes, future/unaffordable grayscale,
purchases and cleanup; cell overlap opacity fades/restores. Physical mobile retest remains pending.

## 2026-11-15 — Bottom-quarter upgrades and illustrated diet frames
User requested a full-width upgrade tray covering only the bottom quarter, and brighter ornate art matching
their green/red/gold reference. Added A-0026 illustrated transparent frames, luminous native tracks,
embossed panels and serif headings in cell/aquatic. All stat choices stay side by side; plant/meat balances
and over-cap inherited levels are visible. Full descriptions remain available through Details/accessibility.
Internal browser checks cover 1440x900, 375x650, 812x273 with safe insets, and 800x1280, both stages/all diets:
exact 25% tray bounds, 44px targets, frozen touch simulation, purchases, close/resume and scene cleanup.
Shell Pause layering also passes. Type/shader checks, 470 unit tests and cell/aquatic GPU production
smokes pass; rendered production screenshots show the painted frames. Physical mobile testing and
deployment remain pending.

## 2026-11-15 — Phone HUD clutter and Safari landscape chrome
User supplied phone captures from the published build and an ornate vine progress-bar reference.
Consolidated cell/aquatic status, plant/meat, upgrades, Controls and evolution into one bottom dock;
Parts/Details now shares the top-right icon strip. Added original carved diet frames, inset luminous
tracks and browser-owned-chrome guidance. Pause/fullscreen/help live in Controls, with Apple web-app
metadata and Home Screen instructions when fullscreen is unavailable. No deployment/offline cache.
Internal tests cover 375x650, 812x273, 800x1280 and 1440x900, Details/Controls, touch purchases with
paused simulation, Pause/Resume, fullscreen fallback, large bodies, advance and cleanup. Native fullscreen
enter/exit is separately checked. 470 tests, type/shader checks and both GPU production smokes pass.
Actual Safari/Android testing and published-site deployment remain pending.

## 2026-11-14 — Diet overlay themes (internal verification)
User requested green herbivore panels with leaves/vines, red carnivore panels with teeth/scratches,
and yellow omnivore panels. Omnivore ornament combines cellular/honeycomb outlines with leaf/fang
accents. All HUD/menu/touch backgrounds follow diet in both cell and aquatic. Desktop/phone browser
checks pass for all six stage/diet combinations, upgrade panels, actual daughter choices and theme
cleanup on entering space. 470 unit tests and type/shader checks pass; cell/aquatic GPU production
smokes pass. Temperament meters retain their independent colors, including blue adaptable.

## 2026-11-14 — Tablet feedback: touch upgrade pause and aquatic controls
User reported difficulty upgrading while swimming on their tablet. Cell and aquatic upgrade menus now
freeze gameplay and scene timer/tween progression when using touch. Purchases remain available, closing
resumes play, and held/queued inputs clear at boundaries. Aquatic now shares the cell full-screen overlay
layout and adds captured swim/turn, depth, dash, jump and pace controls. Internal tests at 800x1280,
375x812 and 812x375 pass for single-finger purchases, exact world freeze, resumed cleanup, simultaneous
swim/dash, held ascent, jump, pace, river pause, live keyboard upgrades and stage cleanup. 470 tests,
type/shader checks and cell/aquatic GPU production smoke pass. User tablet retest is pending.

## 2026-11-13 — Aquatic art and upgrade polish (internal verification)
User requested polished upgrades/food meter, descriptions in Details and the cell art direction in aquatic.
Implemented stable effect cards and four-chamber growth, build descriptions, three-view diet/wildlife/
predator imagery, illustrated props and three environments, shared worn equipment and temperament accents.
470 tests and type/shader checks pass; cell/aquatic GPU production smokes pass. Desktop and phone browser
emulation exercised cards, Details, maps, daughter choice, rivers and cleanup. User playtest and physical
phone/tablet/controller verification remain pending; this entry is not approval of the new art or layout.

## 2026-11-13 — All-stage display rollout
User says they like how all stages play and explicitly requested the cell display changes in aquatic,
creature, civilization and space. Implemented shared fullscreen/safe bounds/rotation handling plus
stage-specific responsive views and native panels. Internal checks: 459 tests and production smoke
for all four; browser matrix exercised portrait/landscape, real pointer construction/purchases,
daughter/heir choices, command pause, rotation freezes, held-input reset and cleanup. Phone checks
are emulated; physical Safari/Android and expanded controller testing remain pending.

## 2026-11-13 — Temperament share revision
User approved the cell desktop layout, then reported 100% cautious plus 100% aggressive in one run.
Root cause: independent score ceilings allowed totals over 100. User requested competing shares.
Implemented normalized evidence, bounded later-stage redistribution and integer totals of 100.
Existing caches recalculate without replaying. Validation: 452 tests, 800 signed-transition cases,
production smoke and a real browser legacy-save reveal of 50/50/0. Further balance feedback pending.


## 2026-11-13 — Civilization Toy 2 internal verification (not user approval)
- Ordinary-resource deterministic strategies: defense plus hero reached economic supremacy at 160s,
  income 59.6 vs 11.9; assault plus hero destroyed the rival base at 143s. Both retained 40 base HP.
- Browser exercised actual mouse construction/sends, keyboard movement, pulse, construction timing,
  pause freeze, inherited strength/vitality/claws, win recording, rematch and Enter into space.
- A shared gamepad pulse/accept press correctly stops at the result screen.
- 441 unit tests, type/shader checks, original sprite floor checks and production GPU smoke pass.
- Screens and moving-wave frame burst inspected. Human fun/balance assessment remains pending.

> One entry per session. Newest on top. Use `/playtest-report` to add entries and turn them into tasks.
> Playtest = anyone who is not you playing, or you playing with a specific question.

## Template (copy)
```
### YYYY-MM-DD  Build <version/commit>  Tester: <name or "self">  Duration: <min>
Question being tested: 
What happened (observations, not opinions):
- 
Quotes (exact words):
- 
Pain points (ranked):
1. 
Delight moments:
- 
Metrics (deaths per section, time to first success, quits):
- 
Decisions / tuning changes:
- 
Tasks created (ROADMAP):
- 
```

## Entries
### 2026-11-13  Aquatic ecology and future production direction  Tester: pending BAMF69
Requested: unchosen sisters compete for shared resources, bump/bite the player, reproduce/grow,
and remain on their pond/lake/coast map. Implemented persistent map-local families with inherited
bodies, food seeking, attack windups, player counterplay/loot and bounded reproduction.
Your picks: population budgets, NPC level ceiling, timings, inactive habitats freeze, river offspring
belong to departure habitat. 424 tests, shader and live ecology/Continue scenarios pass.
BAMF69 also confirmed future HD visuals, fullscreen, full controller support and mobile play after
prototypes are fun. Recorded in GDD/ROADMAP; keep next prototypes compatible, no art overhaul yet.


### 2026-11-13  Aquatic form choices  Tester: pending BAMF69
BAMF69: "I like the cell stage"; requested split + daughter choice when aquatic forms advance.
Implemented three diet/bonus offers after a shared split presentation using actual aquatic bodies.
Inherited stats/parts/river parts/currency, food-weighted +2 levels beyond purchase caps, optional part
bonuses, history and pending-choice Continue. Existing pickups, leveling and river/map rules retained.
Your picks: no new aquatic exclusive-perk set or sibling AI in this pass. All 412 tests, shader check,
recorded aquatic smoke and interactive form/river/Continue checks pass. Awaiting playtest.


### 2026-11-13  Division presentation  Tester: pending BAMF69
Requested: growth/multiplying mitosis animation showing three daughters splitting before the choice menu.
Implemented using existing bodies and stat layers, with membrane bridges and preview docking.
Your picks: 1.9s full sequence; 0.18s reduced-motion fade. Awaiting visual/feel feedback.


### 2026-11-12  Daughter rewards  Tester: BAMF69
Confirmed: form/daughter stat bonuses may exceed the normal 5/5 purchase cap.
Changed: full +2 rewards at any existing level; normal purchases still stop at 5. Menu marks bonus
levels as 5+N. Handling and defensive effects remain valid beyond 5; aquatic preserves cell inheritance.


### 2026-11-12  Hybrid progression follow-up  Tester: BAMF69
Quote: "this is much more fun". Requests: return Form 1 food to earlier values; cannot keep playing at Form 4.
Changed: Form 1 food back to 28 algae, 2.5s regrowth, meat food 2; later forms keep the 50% increase.
Removed the final-form simulation freeze. Movement, purchases, food, pickups and perks continue; Enter
only leaves when upgrades are closed. The latest body is saved again before aquatic startup.
Growth thresholds and maximum form remain unchanged. Awaiting confirmation of food feel.


### 2026-11-12  Cell division prototype  Tester: BAMF69
Quote: "the gameplay feels shallow and boring without the part pickups and active stat leveling. I like the daughters".
Approved: restore pickups and active purchases; daughters inherit progress and add bonus levels/parts plus exclusive perks.
Implementation picks awaiting playtest: Food Sense, Jet Burst, Soft Landing, inherited ranks up to 3; paired to herbivore/carnivore/omnivore offers. No new art, audio or dependencies.


### 2026-11-12  Cell division prototype  Tester: BAMF69
Quote: "food is too scarce". Confirmed: 50% more food and a different diet for each daughter.
Changed: algae 28 -> 42, replenishment rate x1.5, meat food per chunk 2 -> 3. Each division offers herbivore, carnivore and omnivore with visible diet labels, compatible parts and recorded diet choices. Awaiting another playtest.

### 2026-11-09  Build 0.1.0 (feat/civ-toy, uncommitted)  Tester: self (BAMF69)
Opinion: "that worked well" (civilization Toy 1). Ask: the aquatic stage's opening screen (the lineage's temperament and what shaped it) on the creature and civilization stages too. Built.

### 2026-11-09  Build 0.1.0 (feat/creature-toy, uncommitted)  Tester: self (BAMF69)
Asks: "dont let the player advance to a level on the world map if they haven't beaten the previous one"; "after
beating the boss the player can advance to the 4th stage - civilization". Decisions: places unlock one way along the
chain, locked ones show a padlock and the cursor stops before them; beating the Old Horn offers the evolve into the
civilization stage (not built: back to the title with a note); the aquatic stage's evolve now leads into the creature
stage, so the chain is cell -> aquatic -> creature -> civilization.

### 2026-11-09  Build 0.1.0 (feat/creature-toy, uncommitted)  Tester: self (BAMF69)  Duration: a run after the fixes
Opinion: "ya it works now". Ask: "generate 2 more levels like this and then a boss battle".
Decisions: Mirefen and the Ridge (five obstacles each, from the same three pieces, their own look) and the Old Horn's
Den (a boss beaten by fighting, puzzle or stealth: the way that did the most damage counts); the map is a chain of
five places; draining the lake dries every crossing.

### 2026-11-09  Build 0.1.0 (feat/creature-toy, uncommitted)  Tester: self (BAMF69)  Duration: a first look at creature Toy 1
Observations: "the boulder rolls into the ground instead of staying on top of it as it rolls, its collision is wrong
too"; "the 2nd boulder appears stuck in the ground but it is blocking the path through the broken brambles".
Asks: bite on F; Shift to sprint.
Decisions: F bites (it is the aquatic swim-down key, unused on land; J still works); the boulder turns around its
centre and its box matches the drawn stone; each plate sits in a two-tile dip a boulder settles into and stays, so
it no longer ends up jammed against the bramble plug, and you can step up onto it; the plate is now drawn; the root
tunnel's entrance moved next to the wall; Shift sprints (165 px/s; louder to the brute).

### 2026-11-09  Build 0.1.0 (feat/aquatic-v8, uncommitted)  Tester: self (BAMF69)  Duration: before playing v8
Asks: in the aquatic stage you evolve only from the coast, even at form 4 earlier; a save and export to pick up later;
the blood banner says "run and heal"; a diet line in the top right. Decisions: all built as v9 (ROADMAP Done).

### 2026-11-09  Build 0.1.0 (main 4b5eb6e, aquatic Toy v7)  Tester: self (BAMF69)  Duration: a play session
Approved: the Gardener proposal ("Yes, build it"): thickness becomes a real trait, the water acts on the lake now,
every effect said on screen.
Asks: the low-health shark banner says it smells blood; a chomp per fish; death goes black with the words, then fades
in on the relative; a top message when you can move on; a bigger pickup for the river's gold part; form 4 in both
stages unlocks the evolve to the next stage; calm background music, the shark music louder with more bass.
Decisions: all built as v8 (ROADMAP Done). The aquatic evolve goes back to the title for now (no third stage yet).

### 2026-11-08  Build 0.1.0 (uncommitted, aquatic Toy v6)  Tester: self (BAMF69)  Duration: a play session
Opinion (exact words): "dying seems too harsh when you're far along".
Asks: river hits x2; 50-stamina wording; death costs half the food; an obvious full-speed effect; a shark banner and
ominous music; a hammerhead for the large shark; a health bar; cutscenes for the river breaches.
Question raised: "what exactly does water temperature do and why should the player care?" Answer: today it only
drifts body thickness, which is cosmetic. Proposal for the Gardener given to BAMF69 (not built yet).
Decisions: the asks built as v7.

### 2026-11-08  Build 0.1.0 (uncommitted, aquatic Toy v5)  Tester: self (BAMF69)  Duration: a play session
Observations: darters chased "relentlessly ... until death"; "the brown circles on the ground grow into the camera";
"upgrade are slightly too cheap now"; "the river items appeared too early".
Asks: darters break off before killing you; clickable admin options; dash and breach a flat 50 stamina; a medium
shark in the lake, mediums and a large shark on the coast (rules per map); visual changes for parts and the other
temperaments. Decisions: all built as v6 (see ROADMAP Done).

### 2026-11-08  Build 0.1.0 (uncommitted, aquatic Toy v4)  Tester: self (BAMF69)  Duration: a play session
Opinions (exact words): "i like the stamina bar"; "upgrade are too expensive"; "progression is too slow".
Asks: slender, aggressive shark looks; admin invincible toggle; stamina tweaks (out of breath below 10, the minimum
for full speed and the red bar, half drain, double cruise refill, auto cruise at 0); Space to rise in rivers; an
unmissable river part; rocks bounce and seaweed slows (fewer in the pond); seabed textures per map; bigger rewards
(a breakable large plant, medium and large meat); generation notes at the bottom.
Decisions: all built as v5 (see ROADMAP Done).

### 2026-11-08  Build 0.1.0 (uncommitted, aquatic Toy v3)  Tester: self (BAMF69)  Duration: a few minutes
Question being tested: do the maps, rivers and parts work?
Observations: "when i stopped moving the darter schools struggled to hit me and just swam in circles over my head";
"the lateral line perk isn't very helpful"; "the ability to always swim full speed seems unrealistic".
Asks: the cell stage evolving into the aquatic stage; an admin panel (temperament, jump between maps); part icons
with explanations; unique parts in their own slots; stamina with two speeds (Shift), dash and breach costing half;
a double-stamina part instead of the lateral line; rivers twice as long.
Decisions: dash moved to Q (Shift is the pace toggle); schools now keep together and pursue in 3D; all built (v4).

### 2026-11-08  Build 0.1.0 (uncommitted, aquatic Toy v2)  Tester: self (BAMF69)  Duration: a few minutes
Question being tested: does v2 (vertical, abilities, stats, a fuller lake) work?
Quotes (exact words):
- "I'd like the aquatic section to feature 5 distinct "maps" correlating to each of the 3 forms with a minigame in
  between. you start in a shallow pond (the current depth is perfect)..."
- "the more aggressive your creature gets the more shark-like it becomes"
- "i'm not seeing any parts from fights between other fish"
- "lets also make each food pickup heal 1 hp and make health purchaseable with plant or meat or a combination"
Pain points (ranked):
1. No sense of progression or place: one lake for the whole stage.
2. Parts come only from your own fights.
Decisions / changes: three maps and two river runs (river-only parts), the shark look, fish fight fish, food heals,
health from either points, E upgrades and U lens (see ROADMAP Done).

### 2026-11-08  Build 0.1.0 (uncommitted, aquatic Toy v1)  Tester: self (BAMF69)  Duration: a few minutes
Question being tested: does swimming from behind work, and is the lake fun?
Quotes (exact words):
- "I like the movement. the game feels empty though. I want it to become more complex and dangerous from the
  previous stage. we need to carry over the meat and plant harvesting and the ability to grow and gain parts, I'd
  like the stats max to double each phase so now health, defense, speed and mobility max at 10 and start with
  whatever the cell had when it left the last stage. I'd like to add vertical movement - swimming from the seabed
  to the surface and 2 active abilities - dash and jump"
Delight moments:
- The behind-view movement.
Pain points (ranked):
1. The lake feels empty: too few creatures, too little to do, not more dangerous than the pond.
2. The cell stage's loop (plant and meat points, growing, parts) is missing.
Decisions (BAMF69's answers):
- Five stats max at 10 (the cell's 5, doubled each stage): attack, defense, speed, mobility, plus health; they
  start at the cell's final upgrade levels. Points are spent in a panel (pillar 2 amended).
- Controls: W/S swim, A/D turn, R/F rise and sink, Space jump, Shift dash, E the lens.
- Jump = breach: near the surface it launches you out of the water; underwater a short upward kick.
- Parts: all new aquatic parts (cell parts do not carry over as parts; they still count for temperament).
Tasks created (ROADMAP): aquatic Toy v2 (vertical, abilities, stats, a fuller and deadlier lake).

### 2026-11-08  Build 0.1.0 (main a150fbf)  Tester: self (BAMF69)  Duration: several sessions
Question being tested: is the cell-stage Toy done (someone wants to keep playing for 2 minutes)?
Quotes (exact words):
- "the cell stage is fun. it can be deemed out of toy stage"
- "we can remove the pillar references to getting popped, I like how it plays currently"
Decisions / tuning changes:
- Cell stage Toy done; next tier Vertical slice, paused while the aquatic Toy is built (`/next-tier`).
- No "getting popped": bumps and bites cost food only. Pillar 1 now says stakes and difficulty rise with every stage.

### 2026-11-08  Build 0.1.0 (uncommitted, momentum + cell bumps)  Tester: self (BAMF69)  Duration: a few minutes
Question being tested: momentum, cells bumping each other, loot from every death.
Quotes (exact words):
- "its too easy now, lets reduce meat drops from cell on cell to half and make the momentum even more sluggish to
  start and make the gulpers more likely to chase the player"
Pain points (ranked):
1. Too easy: cell-on-cell deaths fill the pond with free meat; the cell gets moving too fast; gulpers chase prey too often.
Decisions / tuning changes:
- `TUNING.cell.otherKillMeatMult` 0.5: a cell killed by the pond (bumped or swallowed) drops half its meat, at least 1
  (prickle 1, gulper 2). Your own kills still drop it all; parts still drop.
- Thrust build-up: holding a direction ramps thrust from `spoolMinThrust` 0.25 to full over `player.spoolS`
  [0.7, 0.9, 1.1] s per form; letting go resets it; mobility shortens it, level 5 = instant. Stopping and top speed
  unchanged (lowering accel instead would also have lowered top speed).
- Gulpers: `playerWeight` 1 -> 0.7, `preyWeight` 0.75 -> 1. You win at equal distance; prey must be under 70 % of
  your distance to distract it (the lure still works, it just needs a closer snail).

### 2026-11-08  Build 0.1.0 (main aabf581 + uncommitted)  Tester: self (BAMF69)  Duration: n/a (design notes)
Question being tested: does the cell feel weighty, and does the pond feel alive?
Quotes (exact words):
- "I'd like to add momentum to the player's creature. slow down acceleration, deceleration, and turning. as the
  creature scales it gains even more momentum. agility fully upgraded will get you the snappy controls that the
  creature currently has"
- "enemies can bump eachother and if a creature dies for any reason it drops its parts and meat"
- "enemies can do half damage to eachother"
Decisions / tuning changes:
- Momentum: `TUNING.player.heaviness` [2.0, 2.5, 3.0] per form divides accel and drag (top speed unchanged); each
  mobility level takes it a fifth of the way back to 1, so mobility 5 = the old form-1 handling at any form. Replaces
  the old mobility boost (accel x2.75, drag x2 at level 5).
- Cells bump each other: hit = bumpFoodLoss x bumpMult x `cellOnCellMult` 0.5 off the other's hp, pushed apart at
  `cellKnockback` 120. One death path (`killCell`): part + full meat, also for swallowed cells (was 1 meat scrap).
- Autoplay smoke (carnivore, 60 s, GPU): 5 cells died to bumps and 1 was swallowed in the first stretch; form 2 at 60 s.
To try by hand:
- Does form 3 feel heavy but still in control? Do small cells die off too fast, or flood the pond with free parts?
  Tunables: `heaviness`, `cellOnCellMult`, `cellKnockback`.

### 2026-11-07  Build 0.1.0 (uncommitted, Ooze to Orbit look + sound)  Tester: self (BAMF69)  Duration: a few minutes
Question being tested: do the new look, visible upgrades and sounds work?
What happened (observations, not opinions):
- A carnivore can pick up the filter mouth, whose only effect is on algae (which it cannot eat): a dead part.
- The pond's only threats are three small cells; none is bigger than the player after form 1.
Quotes (exact words):
- "its cool! good job. dont let carnivores get filter mouth, add bigger and more dangerous enemies, and can the sound effects be more organic and squishy sounding?"
Pain points (ranked):
1. Not enough danger: no big threat to fear or hunt.
2. Carnivore + filter mouth is a useless combination.
3. SFX read as retro synth blips, not organic.
Delight moments:
- "its cool! good job."
Decisions / tuning changes:
- Carnivores cannot take the filter mouth (and lose it on switching to carnivore). A big predator ("gulper") hunts the player; more of them each form. SFX re-made with a custom organic synth (water drops, resonant squelches) instead of retro waveforms.
- Follow-up (BAMF69): "make it so the gulpers can get distracted by other creatures instead of exclusively chasing the player" -> gulper FSM (src/game/cell/predator.ts, SOP-14). Readability: toast when it picks you; slow swim when sated/tired. Needs a human fairness check.
Tasks created (ROADMAP):
- see Done 2026-11-07

### 2026-11-07  Build 0.1.0 (uncommitted, diets + upgrades)  Tester: self (BAMF69)  Duration: a few minutes
Question being tested: do diets and upgrades make the cell feel like a creature you built?
What happened (observations, not opinions):
- The game has no sound at all yet (nothing in src/game plays audio; public/assets has no audio).
- Upgrades change numbers only: speed +10% and mobility +15% acceleration per level, nothing on the sprite.
Quotes (exact words):
- "I like it overall. I can't hear anything, are there sounds? Also it doesn't feel like the upgrades do anything, can we make speed and mobility upgrades more dramatic and add a visual way to show upgrades on the cell. Also do you have any name suggestions for this game? I would also like to tweak the art style to make it less childish, perhaps sobel shading?"
Pain points (ranked):
1. Upgrades feel like nothing: per-level effects too small to notice, and invisible on the cell.
2. Silence: no feedback sound for eating, bumping, popping, buying, evolving.
3. The art reads as childish (wants a more grown-up look; suggested Sobel edge shading).
Delight moments:
- "I like it overall."
Metrics (deaths per section, time to first success, quits):
- none recorded
Decisions / tuning changes:
- BAMF69 picked mockup D (lit and moody) + a sprite redraw, the name Ooze to Orbit, then sounds; and asked for dramatic, visible upgrades.
- Done: speedPerLevel 0.1 -> 0.2 plus less drag (drag had capped top speed near 236 px/s); mobility accel 0.15 -> 0.35 per level plus more drag (sharp stops), knockback 0.1 -> 0.15; upgrade looks at levels 1/3/5; 16 code-made SFX.
Tasks created (ROADMAP):
- Dramatic + visible upgrades; first SFX pass (Wavesmith, code-made); art-style experiment; game name.

### 2026-11-07  Build 0.1.0 (uncommitted, cell-stage toy)  Tester: self (BAMF69)  Duration: a few minutes
Question being tested: is the cell-stage loop fun yet (GDD: "someone wants to keep playing for 2 minutes")?
What happened (observations, not opinions):
- Played the toy in the dev build. (The autoplay pilot reaches form 3 with all three parts in under 90 s, so a human likely evolves fast too.)
- The player cannot lose a form or a part; a bump only drops food that floats nearby and can be eaten back.
Quotes (exact words):
- "its a little bit too cozy, I'd like some more depth. the ability to choose my upgrades to speed, mobility, attack, and defense. more dangerous enemies, getting popped sets you back farther, slower progression"
Pain points (ranked):
1. No stakes: pond cells are harmless and lost food comes straight back, so no choice carries risk.
2. Shallow build: 3 on/off parts picked by "which cell did I chase"; the player wants to choose upgrades on 4 axes (speed, mobility, attack, defense).
3. Progression too fast: two evolutions in about a minute and a half.
Delight moments:
- None stated.
Metrics (deaths per section, time to first success, quits):
- Autoplay: form 3 + 3 parts in < 90 s (tuning.ts evolveFood [12, 20]).
Decisions / tuning changes:
- GDD pillar 1 rewritten from "Calm, never punishing" to "Tense but fair" (BAMF69's call): real setbacks allowed, no game over, never lose a reached form.
- Stakes tuning pass applied (tuning.ts): evolveFood [12, 20] -> [40, 90]; bumpFoodLoss 3 -> 6; droppedFoodLifeS 12 -> 4; prickle speed 55 -> 85; curiousRadius 140 -> 240. Autoplay check: after 120 s the pilot (which picks fights at 4 food) was still form 1 at 4/40, down from form 3 in < 90 s. Needs BAMF69's play to judge.
- Follow-up note (BAMF69): "I like this pacing much better" -> asked for herbivore/carnivore/omnivore, meat drops, algae points for defense + mobility, meat points for attack + speed. Built: diet picker at start + each evolution, strict diets (omnivore at half), parts kept alongside upgrades, E panel that does not pause. Upgrade costs set to [5, 9, 14, 20, 27] after autoplay maxed two stats in 90 s on [3, 5, 8, 12, 16].
Tasks created (ROADMAP):
- Stakes tuning pass; Upgrade choice on 4 stats; Player can be popped (pending pillar decision).


2026-11-16 — A-0032 wildlife swim/attack pass: 484 tests, typecheck + 11 shader checks passed.
GPU browser checks at 1440×900 and 375×650 verified painted swim frame cycles, actual eel contact
arming shock, five-second cooldown, player movement blocked during stun, retreat velocity away from
player, pause freezing combat timers, transparent sprite alpha and no page errors. Production coast
GPU smoke reached DRIVE_DONE without errors. Reference-style jellyfish is faceless and mouthless.

2026-11-16 — Remaining aquatic animation: 489 tests, typecheck and 11 shaders pass. Desktop1440×900
and phone375×650 GPU browser fixtures verify all four new fauna swim cycles, actual spinefish bite,
food pulse and weed sway, fast eel retreat, actual jellyfish hit causing 2s murk, touch-menu pause
freezing murk, reduced-motion stillness, and no page errors. Production coast smoke reached DRIVE_DONE.

2026-11-16 — Aquatic modular player pass: 492 tests, typecheck and 11 shader checks passed. GPU browser
checks at1440×900 and375×650 verified all diet sheets, movement-speed swim frames, keyboard dash,
real eating/chomp, surface breach/re-entry, paused body/equipment frames, reduced-motion neutral pose
and health-stat bulk. Inspected equipped dash and breach screenshots; reduced plate coverage and added
curved shading to keep the diet body readable. Coast and river production GPU smokes passed.
Asset paths and built-in imagegen prompt set: docs/art/AQUATIC_PLAYER.md.
