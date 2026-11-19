# Stage 4: Civilization

> Stage design doc. Short beats complete. Game-wide rules (pillars, the Gardener rule, lore, win and lose, what
> carries between stages) live in the spine, `docs/GDD.md`; this file covers only what is special to the
> civilization stage.
> **Redesigned 2026-11-10 (BAMF69): an RTS tower defense battler.** The 2026-11-09 design (a hex strategy game with
> conquest, trade and faith) was built as Toy 1 (PR #10) and is replaced; Toy 1 stays in the game until Toy 2 exists,
> then is removed (BAMF69 2026-11-10). Its full design and build notes are in this file's git history.
> Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69. Everything else was decided by BAMF69.

## Identity
### Illustrated HD remaster — 2026-11-14
- `CivWarsScene` remains the registered tower-wars adapter. Fullscreen habitat fills the window;
  native resources, base-health/income meters, wave preview, Details and persistent role controls
  overlay it. Mazes fit the unobscured space, stacking when that yields larger tiles. Short phone
  landscape puts an open command panel beside the mazes. No camera gesture is needed to reach a cell.
- The latest user clarification explicitly retains **live submenus** from the prior playtest.
  Hero orders, Builder, Summons and Workers do not pause combat or patrol. Details, explicit Pause,
  focus loss and rotation retain freeze/resume behavior. Details also freezes scene timers/tweens.
- Pointer orders happen on release. Drags over 10 CSS px, extra fingers, cancellation, lost capture,
  focus/visibility loss, pause, layout/rotation changes and input-scheme changes invalidate a tap.
  One finger handles selection, tower placement, send/worker purchases, cancellation and hero movement.
  Keyboard 1/2/3, remappable Q/U and controller bindings remain; no creature-style stick was added.
- Read-only build previews share the same route/resource/occupancy checks as construction. Invalid
  cells show a cross, valid cells a translucent tower, with a range indicator. Draw and hit testing
  share one pure transform. Building still cannot seal the entrance or trap existing creatures.
- Original 4×4 illustrated atlas covers three towers, grown-shell settlements, three hero diets,
  three sends, workers, resources and ruin. Habitat backdrop fills all orientations. Root badges
  distinguish ownership by circle/diamond as well as color; construction, attack, damage, slowed units,
  range and pulse effects are scene-owned code-native presentation. Inherited climbing shows claws;
  diet, real strength/vitality damage/HP and technology behavior are explained in Details.
- All new UI uses `civ.hd.*` localization keys. Cards/buttons persist while prices and affordability
  update; focus survives. Locale changes refresh persistent labels. Effects/costs come from WAR,
  TOWERS and SENDS; no fictional upgrade levels, prices or new progression were added.
- Game-speed settings scale the simulation; Reduced Motion disables procedural bob/tilt and pulse
  expansion. Atlas textures use linear filtering; canvas smoothing is restored on stage shutdown.
  Native HUD remains independent of world resolution; civilization's world width is capped at 1600
  logical pixels to bound work, with no claim of physical-device frame-rate certification.
- Validation: 487 tests, wrapper type/11-shader checks and 34-second recorded GPU production smoke.
  Browser desktop and emulated touch/controller scenarios cover actual construction/sends/Farmer
  paydays, drag/cancel/blur guards, persistent focus, all four layouts, live menus/patrol, Details
  clocks, game speed, Reduced Motion, rotation freeze, both result paths, save-failure retry,
  unknown lineage field preservation, rematch and space cleanup. Physical devices remain pending.

### Live command dock and Farmers — 2026-11-14
User revised the earlier pause-menu preference: Builder, Summons, Workers/terrain and Hero orders
now open as compact nonmodal panels above the 1/2/3 controls. No veil or battle pause; construction,
waves, movement, payday clocks and automatic patrol continue. Details and explicit shell/rotation
pause retain their existing freeze behavior. The role buttons stay usable while a submenu is open.

Worker choices now include **Farmer: 35 ore, +6 food per 8-second payday**, capped at 20 farmers.
Farmers start at zero and do not add recurring ore income or directly advance economic victory.
Gatherers retain +1.5 recurring ore income and +3 food per payday. These are initial tunable values
in warsTuning. A missing farmer count is treated as zero; no lineage/save-schema change is needed.

The dock scrolls horizontally on small screens. Short landscape uses one control row; portrait
uses two. Draw and pointer conversion share a layout fitted above the dock, so menus never cover
either maze. Controller menu navigation remains available; choosing a tower clears the confirming
input before returning to placement. Manual gameplay intents wait during controller menu navigation,
while patrol and battle simulation continue.

Validation: 476 unit tests; wrapper type/shader and production civilization smoke; browser pointer
and emulated touch tests for live clocks/patrol, hire/payday output, nonoverlapping grid/menu/control
bounds at 1280x720, 375x812 and 812x375, sends, construction, Details freeze, rematch and space cleanup.
Visuals inspected in all three sizes. Physical-device checks remain pending.

## Civilization controls and patrol — 2026-11-13
- **1 Hero, 2 Builder, 3 Summons** select the three control roles. Matching native buttons stay
  visible on touch; the selected role is highlighted and exposed with aria-pressed.
- Hero: WASD / left stick / D-pad move, J/F bite, Space pulse. Tap/click an open cell for an
  obstacle-aware move order. Touch has native Bite and Pulse buttons with pulse cooldown.
- Builder: choose Thorn, Seed mortar or Mist spire in the live command dock, then tap/click your maze.
  WASD / stick / D-pad step an independent build cursor; E / north or south confirms placement.
  Attack / west reopens tower choices. Construction still uses the shared builder workforce;
  this is a control role, not a new individually simulated builder unit.
- Summons: live menu sends Reedrunner, Shellback and Briar brood. Repeated sends can be
  purchased while choosing; Close hides the panel; battle continues throughout. Worker training and terrain remain under
  Builder (also accessible through Workers / terrain). Costs and resource rules are unchanged.
- Existing Q / right shoulder cycles the three roles forward; U / select cycles backward.
  In Hero, E / north opens Hero orders, including the patrol toggle for controller-only play.
  Number shortcuts are stage-local; shared action rebinding and other stages are unchanged.
- **Patrol: OFF/ON** is always available in the battle dock. Opt-in patrol walks between maze
  ends, prioritizes reachable attackers nearest the base, bites in range and pulses groups of two
  or more. It respects towers unless inherited climbing allows crossing, and retains ordinary
  speed, damage, cooldowns, wound costs, recovery and hero-hit/kill heritage credit.
- Selecting Builder or Summons leaves patrol enabled. Manual Hero movement, a valid move order,
  bite or pulse turns patrol off. Selecting Hero alone does not interrupt patrol. New matches
  start in manual Hero mode. Details, shell pause and rotation hold all battle/patrol clocks; command menus run live.
- World drawing and pointer placement still share warsLayout. Two-row scoped controls reserve
  additional board space; sprites scale with the tiles for short landscape. No assets/dependencies,
  save schema, creature hero contract or space technology contract changed.
- Validation: 474 unit tests, wrapper type/shader check and civilization GPU production smoke;
  browser desktop keyboard, simulated controller actions and real emulated touch taps for roles,
  placement, sends, menu/Details freeze, patrol/manual takeover, rematch and space cleanup.
  Portrait/landscape visuals inspected; physical iPhone/Android/Xbox/PlayStation checks remain.

### Shared display rollout — 2026-11-13
User reports liking all stages. Maze grids now stack in portrait and share one draw/hit transform.
Native command panels now run live in the compact dock; Details pauses (revised 2026-11-14). Tower selection closes
the panel immediately, then placement resumes the existing build rules. Fullscreen, safe margins and
rotation pause/resume are shared. Grid mechanics, costs and win rules stay unchanged. Emulation
checks cover real pointer placement; physical-device/controller expansion remains separate.

### First playable Toy 2 — 2026-11-13 (Codex prototype picks; playtest pending)
- One battlefield with two 11x7 mazes. Ore builds/trains, ore plus food buys sends. Gatherers raise
  income and supply food every 8s; builders share construction work. New defenses block paths while
  being built; placement cannot seal a route or trap an existing creature.
- Three defenses: Thorn (single target), Seed mortar (splash), Mist spire (slow). Three sends:
  Reedrunner (fast), Shellback (armored), Briar brood (three fragile bodies). Sends raise income;
  defending kills pay ore and permanently increase income. Prices/stats live in `civ/warsTuning.ts`.
- Inherited hero strength increases attack; vitality increases HP; claws cross built defenses.
  WASD move, J/F bite, Space pulse. Hero wounds cause 10s recovery and 5 ore medical cost.
- Click a tower command then your grid to place it. Q/U cycle commands, E executes the selected
  command at the hero's cell. Other buttons immediately train/send/switch the Gardener lever.
  Uses shared shell actions (gamepad bindings); final prompts/touch controls remain future work.
- Rich ore gives +60% ore each payday (aggressive); rocky ground discounts defenses by 35% (cautious).
  The economic victory compares nominal recurring income, excluding the ore multiplier.
- Rival choice opposes the inherited leaning: cautious/balanced faces larger raider waves;
  aggressive faces a warden with another defense. Preview shows next wave type/count/time.
- Destroy the rival base or reach 5x its income. Falling base ends only the match; E rematches.
  Successful result offers Enter into space. No mid-match saving in this first test.
- Live tally: spending on sends/defenses, longest maze and hero hits. Victory cause log credits each.
  Technology heritage records most-used tower/send types. Space accepts both new and legacy wins.
- Original city/worker/creature atlases reused with type tints; no new assets or dependencies.
  Full worker command AI, research, probe/faith story, campaign and richer unit art are later work.
  Old Toy 1 stays unregistered until this replacement proves fun in playtest.

- **Pitch:** Your species builds a civilization. Train builders and gatherers, gather resources, then spend them on
  monsters that run the enemy's gauntlet or on defenses that hold against their waves, with your own creature on the
  field as the hero.
- **Reference games (mechanics only):** "tower wars" games, the genre from Warcraft 3 custom maps such as Line Tower
  Wars and Legion TD: each side builds a maze of defenses and sends monsters through the other side's maze, and
  sending raises your income *(Claude's pick for naming the genre; BAMF69's design)*. No names, art or units from
  any of them.
- **Modes:**
  - **Avatar mode = the hero** (BAMF69 2026-11-10): your creature from the creature stage stays playable, fighting on
    the battlefield. How well you use it counts toward adaptable.
  - **The RTS layer:** the player also commands the economy (train builders and gatherers, build, send) *(Claude's
    pick: the hero moves directly, the economy runs from buttons and clicks)*.
  - **God mode = the Gardener's levers** (the Gardener rule, below). The 2026-11-09 acts of god (meteor summoning,
    terraforming) can stay as powers the hero or ruler calls down *(Claude's pick)*.
- **Receives:** the creature stage's lineage (`docs/HANDOFF_CONTRACT.md`): temperament, diet, abilities, the hero,
  `gardener.harshness`.
- **Hands on:** the `civ` block (which victory, what was built and sent most, whether the species took `T0|▼|` tech)
  and the temperament after this stage (moved at most 50 % from where the creature stage left it).
- **Played on its own:** starts from a default or generated creature-stage lineage and hero.

## How the pillars apply here
1. **Tense but fair (stakes rise):** enemy waves come for your base, and every wave shows what is coming before it
   arrives *(Claude's pick: a wave preview)*. No game over for the Gardener (see open questions for a fallen base).
2. **You shape your creature, directly and indirectly:** directly through the hero and every spending choice;
   indirectly through the Gardener's levers.
3. **Small world, growing bigger:** a battlefield on the scale of a region of the planet.

## The battle *(BAMF69 2026-11-10)*
- **Builders and gatherers:** train them; gatherers bring in resources, builders put up defenses.
- **Spend resources one of two ways:**
  - **Summon monsters** that run the enemy's gauntlet and hit their base. This raises your income and builds
    **aggressive** temperament.
  - **Build defenses** against the enemy's waves. Kills pay out, so **defense turns into income** (BAMF69 2026-11-10),
    and it builds **cautious** temperament.
- **Adaptable** is measured by **maze length and hero use** (BAMF69 2026-11-10): a long, clever maze that makes enemy
  waves walk further, and a hero that is in the fight.

## Winning *(BAMF69 2026-11-10)*

| Win | How | Temperament |
|---|---|---|
| **Destroy the enemy base** | Your monsters break through their maze and bring the base down | Aggressive |
| **Out-earn them** | Your income reaches about **5 times** the opponent's (to tune) | Cautious |

- Adaptable players can take either win, using the Gardener's levers moment to moment (spine, the Gardener rule).
- The win reached names the victory. A tally of spending (sends vs. defenses) plus maze length and hero use stays on
  screen, so the player sees which temperament they are building *(Claude's pick for the tally)*.
- The "5 times" threshold is a starting point to tune in playtests.

## Battlefield modes *(BAMF69 2026-11-17)*
Tower wars is the first of several modes that share this stage's battlefield, art and RTS controls. The player
does not pick a mode: the **civilization stage is a campaign** where each region of the planet is fought in a set mode,
and in the space stage the mode comes from the planet you land on (`docs/stages/05-space.md`, "Landing").

### The shared frame *(Claude's pick, agreed 2026-11-17)*
Every mode uses the same map and art, the same gather-and-build economy, the same hero (your creature) and the same
scoring. Only the rules of engagement change.
- **Each mode offers an aggressive way and a cautious way to win** (the Gardener rule), and **hero and positioning
  play count as adaptable**.
- **Each mode lists its Gardener levers**, one per side, as tower wars does below.
- Shared systems to build once: units with stats, lane pathing, buildings, the hero, income, wave previews, the
  temperament tally and the cause log.

### The modes
References are Warcraft 3 and StarCraft custom maps, mechanics only (no names, art or units from them). The MOBA and
the autobattler were considered and **dropped** (BAMF69 2026-11-17) in favor of more hero-focused modes.

| Mode | Reference | Core idea | Aggressive way | Cautious way | Build order *(Claude's pick)* |
|---|---|---|---|---|---|
| **Tower wars** (built) | Line Tower Wars, Legion TD | Your maze against their sends, your sends against their maze | Destroy their base | Out-earn them about 5 to 1 | Done |
| **Hero lane wars** (required, 2026-11-18) | Hero Line Wars | Your hero holds a lane while you send units at the enemy hero | Kill their hero and base | Outlast their sends and out-earn them | 1st: tower wars plus the hero, nearly free |
| **Tug-of-war** (required, 2026-11-18) | Castle Fight | Build structures that spawn units on their own; the units march and fight without orders | Push the front to their base | Hold the line while your economy grows | 2nd: pure spawners, no unit control |
| **Frenzy** (optional, 2026-11-18) | Footmen Frenzy | Bases spawn units on a timer; you level the hero and choose upgrades, often in teams | Break the enemy bases | Hold yours longest | 4th, after the required three |
| **Survival** (BAMF69 2026-11-17) | Hero Siege | The hero and defenses hold out against waves that keep growing | Hunt down the wave spawners | Survive every wave | 4th |
| **Stealth mission** (BAMF69 2026-11-17) | Sheep Tag (the hide-and-hunt idea) | The hero slips through a guarded settlement to reach a goal | Strike the target and fight out | Reach it unseen | 5th: reuses the creature stage's readable stealth |

### Where the modes appear
- **Civilization stage:** a campaign (below).
- **Space stage:** guiding other species' civilizations as the Gardener (`docs/stages/05-space.md`, "Landing").

### The campaign *(BAMF69 2026-11-18)*
- **To finish the stage, beat three modes at three difficulties each:** tower wars, tug-of-war (Castle Fight) and hero
  lane wars, each on **easy, medium and hard**. Nine required battles.
- **Frenzy (Footmen Frenzy) is optional:** a side battle with its own reward, not needed to finish *(Claude's pick:
  it opens once the three easy battles are won, and its reward is an extra technology for the space stage)*.
- **Survival and stealth missions** stay in the design for later (space landings, a future campaign update); they are
  not part of this campaign.
- **Order** *(Claude's pick)*: all three easies first (tower wars, then hero lane wars, then tug-of-war; approved framework revision 2026-11-18), then the
  mediums, then the hards. Each mode is taught at easy before any mode gets harder. Within a difficulty, the player
  plays the battles in the set order (the player does not pick modes, 2026-11-17).
- **Tower wars difficulty grows the battlefield** (BAMF69 2026-11-18): each difficulty is a **bigger playfield with
  random obstacles** that can get in the way of the maze. *(Claude's picks: easy is today's 11x7 maze with no or few
  obstacles, medium about 15x9, hard about 19x11; obstacles are seeded per battle, placed before building starts, and
  never close the path from entry to exit.)* The rival's waves and defenses scale too.
- **Tug-of-war and hero lane wars difficulty** *(Claude's pick, to tune)*: a stronger, smarter rival with a bigger
  economy and faster escalation; hard adds a second lane where the mode supports it.
- **Campaign progress saves between battles**, so the player can stop after any battle and Continue *(Claude's pick;
  Toy 2 has no mid-match save, which can stay)*.
- **What goes to the space stage** *(Claude's pick)*: the victory type is the win method used most across the
  campaign (enemy base destroyed vs. out-earned); technology heritage is the most-used towers, spawners and sends
  across all battles.
- **Every mode and difficulty can also be launched on its own** *(Claude's pick)*, so space-stage contested worlds can
  reuse them (`docs/stages/05-space.md`, "Landing").

## The Gardener's levers *(the Gardener rule, BAMF69 2026-11-10; levers are Claude's picks)*

| Lever | Helps | Why |
|---|---|---|
| Rich ore veins | Aggressive | More materials for monster sends |
| Rocky ground | Cautious | Walls and towers cost less |
| Fertile valley | Cautious | Gatherers bring in more: income grows |
| Restless wilds | Aggressive | Wild beasts can be tamed into extra sends |

Without the matching lever, your style is underfunded and the battle is hard.

## Technology and machinery *(kept from 2026-11-09, applied to the new design; Claude's pick for how)*
- New tower and monster types are discovered or researched: technology and machinery replace body parts.
- **The kinds you use most become the species' technology heritage** for the space stage (defenses lean toward
  shields, monster sends toward weapons, a maze-and-hero style toward engines).
- **The `T0|▼|` probe** can still crash here: its technology is powerful but makes the species easier for `T0|▼|` to
  read later. On the machine path this is a moment in `T0|▼|`'s life (`docs/LORE.md`, "The flip").

## Rivals and faith
- **The opponent stands for a temperament you are not** *(kept from 2026-11-09)*: a mostly cautious player faces an
  aggressive civilization that sends hard, and so on.
- **Faith stays if it suits the story** (BAMF69 2026-11-10). *(Claude's pick:)* keep it as story and flavor, not a
  third way to win: the Watcher's believers on your side, and a cult of the Maker that appears if anyone takes the
  probe's technology, perhaps as a special enemy send.

## Core loop (first draft, Claude's pick)
```
gatherers bring in resources -> spend: train builders and gatherers, build defenses (lengthen the maze), or summon
monsters -> waves cross both mazes; the hero fights -> kills and hits pay income -> repeat until a base falls or
one income dwarfs the other
```

| Scale | What the player does | Why they keep going |
|---|---|---|
| Every ~30 seconds | Places a tower, sends a monster, moves the hero | A wave held or a hit landed |
| Every wave (~1 to 2 min) | Reads the next wave, adjusts the maze and sends | Income climbing |
| Whole stage | Wins the battle(s) one way or the other | The victory and technology the species carries into space |

## What it hands to the space stage *(Claude's pick, to confirm)*
| From this stage | Shapes the space stage |
|---|---|
| Victory type | Base destroyed: a stronger war fleet. Out-earned: more ships and stronger defenses |
| Technology heritage | The species' first ship parts |
| Took T0&#124;▼&#124; tech? | A faster start, but T0&#124;▼&#124; begins partly adapted |
| `gardener.harshness` | Whether the species welcomes or resents the Gardener when it learns the truth |

The space stage (built) reads the old victory types (conquest, trade, faith); it needs updating when Toy 2 is built.

## Look and camera
- Top-down battlefield, lit and moody; your hero is the creature from the creature stage.
- Engine: Phaser 4 fits (top-down units, towers and paths). No new engine.

## Toy 2 proposal *(Claude's pick)*
- One 1v1 battlefield: your maze on one side, the opponent's on the other.
- Two resources, one builder and one gatherer type, three tower types, three monster sends, the hero with one ability.
- Two Gardener levers, one per side. Both wins working, with the 5x income threshold.
- **Done means:** BAMF69 wants another match to try the other win, and can say which temperament the tally showed.
- When it works, Toy 1 (`src/game/CivScene.ts`, `src/game/civ/`) is removed (BAMF69 2026-11-10).

## Open questions
| Question | Why it matters |
|---|---|
| Tug-of-war and hero lane wars: what exactly makes medium and hard harder? (Claude's pick above, to tune) | The campaign's difficulty curve |
| What does each new mode need that tower wars lacks (teams, spawners, hero upgrades, guard AI)? | Build cost per mode |
| What happens if your base falls? *(Claude's pick: you lose that battle with a setback and fight again)* | Pillar 1: no game over for the Gardener |
| Which resources, exactly? | Fewer is easier to read |
| Can the hero die in battle, and what does it cost? | Hero use is part of adaptable |
| 1v1, or you against two rivals (one per other temperament)? | Scope and balance |

## Fixed civilization command tabs — 2026-11-15
- User playtest revision: a single fixed command habitat replaces expanding submenus. Hero, Builder, Summons and Workers / terrain are always visible tabs (keyboard 1–4; Q/U and controller shoulder/select cycle all four).
- Selecting towers, sending creatures, training workers and changing terrain retain their page. Back returns to Hero. Commands remain live; Details and explicit shell pauses still freeze combat.
- HUD bounds reserve the same footprint on every page: a bottom dock in portrait/desktop/tablet, a permanent right dock on short landscape. Maze transforms and pointer mapping no longer change with tab selection.
- Scoped code-native organic styling draws on the user's supplied HUD reference: bone rims, rooted leaf corners and luminous channels. Inherited normalized temperament shares tint presentation only: balanced/cautious lagoon teal, aggressive coral, adaptable violet. Diet stays independent; no lineage or simulation changes.
- Controller tower selection releases command navigation for build-cursor movement without hiding the Builder page; West or selecting Builder again re-enters command navigation. Native buttons retain stable DOM identity and 44px minimum targets.
- Verification: 490 unit tests; type/shader checks; GPU production smoke. Browser tests check identical full layout/dock geometry across all four tabs and Back on 1440×900, 375×812, 812×375 and 800×1280; actual build completion, sends, Farmer, live clock, patrol/manual hero, Details freeze and controller selection. Touch emulation also checked; physical hardware remains pending.
- Preview: http://localhost:5186/ from this civilization worktree. Port 5176 was found serving the older scene; do not use that link for the remaster. Nothing committed or pushed.

## Campaign step 2: as built (2026-11-18)

- Isolated `feat/civilization-campaign-tower`, based on merged main `91067f3`; approved framework:
  `CIVILIZATION_CAMPAIGN_PLAN.md`. Only tower wars runs in this step. Hero/tug are registered but
  explicitly unavailable until their own playtest gates; they never silently launch tower wars.
- Normal civilization entry creates/resumes `civ_campaign`, a versioned, creature-bound nine-slot
  checkpoint. Approved order (Claude's pick): tower/hero/tug at easy, then medium, then hard.
  The first accepted win per slot counts once. No mid-match checkpoint: reload/rematch restarts
  the same battle seed. A defeat never clears progress. Corrupt/newer/mismatched saves are preserved
  and reported; a practice launch remains available. Existing one-battle lineage records remain valid.
- Standalone `?stage=civ&mode=tower&difficulty=easy|medium|hard&seed=11` is isolated practice and
  does not write lineage or campaign. Unsupported modes/parameters show an explanation. Result
  panels offer all three tower difficulties for this playtest. Future space reuse can call the pure registry.
- Difficulty tuning (Claude's picks, awaiting playtest): easy 11x7/0 obstacles, medium 15x9/12,
  hard 19x11/30. One seeded immutable terrain layout serves both sides. Bounded candidate placement
  accepts obstacles only with entry and hero-home routes; endpoint columns/home stay clear.
  Existing ruin art represents natural outcrops. No new art or dependencies.
- Medium/hard add 1/2 incoming sends, 15%/30% incoming health, 9/10 rival base income and stronger
  rival growth/defenses. First waves allow 35/40 seconds of setup; hard waves recur every 22s.
  All values are in `civ/battlefieldTuning.ts`; preview and actual spawn counts use one function.
- `wars.ts`, hero routes/patrol, rival placement, rendering, previews, cursor bounds and pointer
  mapping read the same per-battle board. Both sides preserve routes for every moving unit's next
  waypoint. Terrain blocks nonclimbing heroes; inherited climbing retains its behavior.
  Larger natural detours give no free adaptable credit: maze evidence subtracts the generated baseline.
- The fixed illustrated dock and live tabs remain. Portrait stacks grids; short landscape keeps a
  fixed right command panel. Combat/Details/shell/rotation pause rules remain. New compact header
  shows campaign/practice, difficulty, seed and live temperament shares; Details explains the causes.
- Boundary saves gate Next; failures offer explicit retry without duplicated wins. The ninth accepted
  result persists before lineage finalization, so failed final writes can retry in-session or after reload.
  Final record averages per-battle evidence and applies the civilization shift cap once. Victory is the
  majority method; technology ranking sums actual type usage across accepted wins. Unknown lineage,
  own stage extension and checkpoint fields survive. Space and creature contracts are unchanged.
- Minimal shared integration: existing bundle module adds/validates `civ_campaign`; menu save selector
  includes its timestamp for Continue. No shell/core behavior, dependency or other-stage gameplay change.
- Validation includes an independent flood fill over 2,000 seeds per difficulty, both rival temperaments,
  construction under live units, all-sized transforms, save failure/reload/idempotence, aggregate heritage,
  legacy bundle/space compatibility. 820 full-suite tests pass with two workers; 53 focused civilization tests, type/11 shaders and GPU smoke pass. Browser touch/controller and actual Space transition verified; see HANDOFF_CIVILIZATION.
- STOP after this step for BAMF69's easy/medium/hard playtest. Do not implement hero lane wars yet.
