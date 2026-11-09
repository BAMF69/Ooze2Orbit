# Roadmap

> Now is capped at 3 items (SOP-08); one at a time is best. Finishing beats starting. Anything new goes to the Parking lot.
> Claude reads the **Now** section at session start.

## Now (max 3 items)
Active stage: **Creature, Toy** (`docs/stages/03-creature.md`).
- [ ] **Creature Toy 1: three ways through Fernwood** (built 2026-11-09, playtest pending): a world map (god mode: drain or refill the lake) and one sidescroller level of five obstacles, each passable by fighting, a puzzle or stealth, with claws and camouflage parts and a summary of which temperament each run built | Done when: BAMF69 wants to replay the level a different way and can say which temperament each run built | Timebox: 2 sessions

## Next
- [ ] **Aquatic stage: vertical slice** (Toy done 2026-11-09) and **write the aquatic lineage** for the creature stage to read
- [ ] **Cell stage: vertical slice** (Toy done 2026-11-08): fill `docs/VERTICAL_SLICE.md`; music, saves, first-time teaching, polish | Done when: the slice brief's "Done when" holds
- [ ] **Cell stage ending: the pond floods** (from the parking lot): the bridge into the aquatic stage and its temperament reveal | Done when: finishing the cell stage leads into the aquatic stage

## Later
- [ ] 

## Parking lot (ideas, no commitment)
- Part orbs never despawn: duplicates you skip pile up in the pond (fine for the toy; decide after playtest)
- Left analog stick for movement (needs a kit golden-vector update, since the default bindings are pinned)
- Sound: bouncy eat, bump, pop and evolve SFX (after the toy proves fun)
- Show the diet on the cell's mouth
- Captions for sound effects (events carry caption text; the shell's captions_sfx setting is not wired to them yet)
- Music: an ambient, watery loop (GDD audio direction)
- Gamepad control of the upgrade panel (the d-pad already swims)
- Cell stage: a rare hexagonal fleck in the pond background that gulpers avoid (first `T0|▼|` hint, art only; `docs/LORE.md`)
- Space stage: temperament readout (cautious = shields, aggressive = weapons, adaptable = engines)
- Space stage: seed the two outer gardens when the player chooses to interact with them (BAMF69 2026-11-08)
- Connected mode: other players' or AI-generated species fill the universe (needs online play; after solo works)

## Milestones
Scope, not dates. `/next-tier` moves the game from one tier to the next; after the slice, `docs/PRODUCTION.md` holds the
detail.
| Milestone | Definition of done | Status |
|---|---|---|
| M0 Toy (v0.1.0) | Core mechanic playable; someone wants to keep playing | Cell stage done 2026-11-08; aquatic in progress |
| M1 Vertical slice (v0.2.0) | One polished loop with art, audio, UI; the greenlight (`/next-tier`) | |
| M2 Alpha | Every MVP system in and playable | |
| M3 Beta (content complete) | All MVP content in, no known crash | |
| M4 Release candidate (v1.0.0-rc.N, then v1.0.0) | `/release-check` green | |

## Done (recent, newest first)
- 2026-11-09: World map places unlock only forward (padlocks, the cursor stops at the farthest open place); beating the Old Horn offers "evolve into the civilization stage" (not built yet: back to the title); the aquatic evolve now starts the creature stage
- 2026-11-09: Creature Toy 1b: two more levels (Mirefen, the Ridge; same three pieces, their own palettes and silhouettes; several crossings each) and the boss, the Old Horn (`creature/boss.ts`): it roams, sees you, paws the ground and charges until a wall stuns it; beat it by biting it while stunned (fight, x2), dropping the hanging rocks on it from two levers (puzzle, 7 a rock), or ambushing it from behind before it sees you (stealth, x3); the way that did the most damage is the verdict; the den's gate opens when it falls. World map: five places in a chain; draining the lake dries every crossing. F bites, Shift sprints, boulders settle in plate dips
- 2026-11-09: Creature stage active at Toy (aquatic Toy done on BAMF69's "this is great"). Creature Toy 1 built: world map (Tidepools, Fernwood, the Ridge; drain or refill the lake, with harshness), Fernwood (five obstacles: the Bramble Wall, the Stalker's Run, the Lake Crossing or Mud Basin, the Rockfall, the Ridge Path; each with a fight, a puzzle and a stealth way), claws and camouflage, checkpoints that cost the part you carry, readable stealth (sight cones, tall grass, the brute's wake meter), an end summary with the cause line and the temperament shift (`src/game/CreatureScene.ts`, `src/game/creature/`)
- 2026-11-09: Aquatic Toy v9: the aquatic evolve waits for the coast (form 4 earlier says "Reach the coast"); "the shark smells blood: run and heal"; "Diet: ..." in the status block; pick up where you left off: the aquatic run autosaves (each new map, each generation, every 20 s, after a death, on quitting; never mid-river) and the main menu gains Continue, Export save file (one JSON with the lineage and the run) and Import save file (checked before it is written; `aquatic/runSave.ts`, `shell/saveFiles.ts`). The cell stage itself still restarts from its beginning.
- 2026-11-09: Aquatic Toy v8: the Gardener's lever matters (`aquatic/gardener.ts`): your kin's body is a trade-off (thick: up to 40 % more health, 20 % less bite damage, 20 % slower; slender: up to 20 % faster, turns 15 % faster, 15 % less health) and the water acts now (warm: up to 80 % more food, hunters 20 % faster and keener; cold: half the food, everyone slower, stamina refills 30 % slower), said in the HUD, the lens and each generation note; "the shark smells blood" banner; a chomp per biter and for your own ram; death goes black, shows the words, fades in; a green top banner when you can move on; the river part's pickup reach x3; form 4 in both stages (cell: unlocks the evolve to aquatic; aquatic: "Enter: evolve", back to the title until the next stage exists); a calm background loop, the hunt loop louder with a sub-bass and a growling pulse
- 2026-11-09: Design: stage 3 renamed Land/Air -> **Creature** and designed (`docs/stages/03-creature.md`): top-down world map as god mode, 16-bit sidescroller levels as avatar mode, each obstacle cleared by fighting, puzzle or stealth (aggressive, adaptable, cautious), Kirby/Mega Man style parts that become inherited traits when used most; stage id `land` -> `creature` in `src/core/lineage.ts`
- 2026-11-08: Aquatic Toy v7: river hits x2 (12, 18); stamina text says 50; death costs half the food progress; health bar; full-speed streaks and bubbles; a banner pinned while a shark hunts you, with an original code-made hunt loop (music/hunt.wav); the large shark is a hammerhead; 2.6 s cutscenes for the leap into a river and out into the next map (Enter skips)
- 2026-11-08: Aquatic Toy v6: sharks (lake: one medium, relentless below half health; coast: three merciful mediums and one large; breach or distance shakes them); bodies from all three temperaments (shark, armoured, streamlined) and parts worn on the body; darter schools break off below a quarter health; clickable admin panel; dash and breach a flat 50 stamina; upgrades nudged up; the river part appears at half the distance; seabed patches no longer grow into the camera
- 2026-11-08: Aquatic Toy v5: slender, meaner shark looks; admin invincible toggle; stamina retuned (min 10 for full speed and the red bar, drain halved, cruise refill doubled, auto cruise at 0); Space kicks you up in rivers; the river part glows gold, spins, sparkles and twinkles into view; rocks bounce you, seaweed slows you, fewer in the pond; a seabed texture per map; upgrades about 45 % cheaper; kelp blooms and medium/large meat; generation notes at the bottom of the screen
- 2026-11-08: Aquatic Toy v4: stamina (Shift cruise / full speed, Q dash; dash and breach cost half); river parts in their own slots; part icons with descriptions; the endurance muscle replaces the lateral line; rivers twice as long; darter schools keep together and can swarm you (3D pursuit, no circling); admin panel (` key: temperaments, go to any map or river, form, points); the cell stage evolves into the aquatic stage at its end (Enter; ` or ?finish to end it at once). New bindings: pace (Shift), dash moved to Q
- 2026-11-08: Aquatic Toy v3: three maps by form (pond, lake, coast) joined by two river-run minigames with river-only parts (lateral line, torrent tail); breach in the river mouth's light to leave; the shark look from aggression (4 looks); deepmaws hunt every fish and darter schools swarm, every death drops loot; food heals 1 hp; health bought with either points; E = upgrades, U = the lens (binding `upgrades` renamed `lens`)
- 2026-11-08: Aquatic Toy v2 (playtest "feels empty... more complex and dangerous"): vertical swimming (R/F, seabed to surface), dash (Shift) and jump (Space: breach), five stats to 10 starting at the cell's levels, plant/meat points and the U panel (pillar 2 amended), three forms, new parts (fins, jaws, plates, gills), five creature kinds with ramming fights and drops, dying costs food progress and a part; new bindings rise/sink/dash/upgrades (kit defaults + golden vectors)
- 2026-11-08: Aquatic Toy built (all three parts): behind-view pseudo-3D swim (cell momentum, turn to steer), darters, deepmaws (the gulper's mind), red edge cue + chevron + warning sound for hidden threats, three bites and a relative carries on, diet from the lineage, temperament reveal, the lens (E): water temperature, Enter = a generation, kin thickness drifts with a truthful cause line. Main menu "Aquatic stage (prototype)"
- 2026-11-08: Cell stage Toy done, now Vertical slice (BAMF69: "the cell stage is fun"); the aquatic stage is the active stage at Toy. Decisions: no "getting popped" (pillar 1: stakes rise each stage, every danger readable incl. a behind-you cue); temperament hidden until the transition into the aquatic stage; outer gardens seeded only when the player chooses to interact with them (space stage, for now); aquatic avatar mode uses a pseudo-3D behind view
- 2026-11-08: Momentum (heaviness per form, thrust build-up; mobility restores snappy handling); pond cells fight each other; every death drops its part and meat (half meat when the pond kills it); gulpers favour the player; upgrade panel rows coloured by affordability
- 2026-11-08: Cell-stage recording: diet picks, rams, pops, bites, gulper escapes and lures become a cause log; temperament with the 50 % per-stage shift cap (`src/core/lineage.ts`); the lineage is saved to slot `lineage` at the stage's end (`src/game/cell/record.ts`, tests)
- 2026-11-08: Design docs: GDD split into a spine (`docs/GDD.md`) plus one doc per stage (`docs/stages/`, cell full, stages 2 to 5 outlined); `docs/LORE.md` (the Gardener, `T0|▼|`, three worlds, Endless Sky style space stage); `docs/HANDOFF_CONTRACT.md` (the lineage file); pillars 1 and 2 rewritten; win is now defeating `T0|▼|`
- 2026-11-08: Codename removed (Ooze2Orbit everywhere); README with play link, screenshots, GIFs, controls; fixed: Enter on the menu picked the default diet for keyboard players
- 2026-11-07: Gulpers get distracted: an FSM picks you or the small cells (prefers prey), swallows prey (meat scrap left), rests when sated, tires of chasing you. Autoplay 2 min: 14-16 prey swallowed, 4-9 hunts on the player
- 2026-11-07: Renamed Ooze2Orbit; carnivores cannot take the filter mouth (shed on switching); gulper predator (hunts, 21-food bite, 1 per form, warning toast); only ramming fully damages a cell; SFX re-made as organic squishy sounds
- 2026-11-07: Named Ooze2Orbit (briefly "Ooze to Orbit"); GDD art direction now lit and moody; all sprites redrawn; style-D mood (dark pond, light, falloff); speed/mobility upgrades made dramatic and shown on the cell (fin, paddles, membrane, mandibles); first sound effects (Wavesmith, code-made)
- 2026-11-07: Diets (herbivore/carnivore/omnivore), meat drops, plant/meat points, 4 upgrades with an E panel; diet picker at start and each evolution
- 2026-11-07: Cell-stage toy playable: swim, eat algae, bump cells, 3 parts (spikes, shell, filter mouth) that change your look, 2 evolutions
- 2026-11-07: Project scaffolded

## Budget and cost log (SOP-12)
| Date | Job | Model and effort | Time | Cost or % of weekly limit | Result |
|---|---|---|---|---|---|
| | | | | | |
