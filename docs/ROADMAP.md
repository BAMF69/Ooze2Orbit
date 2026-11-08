# Roadmap

> Now is capped at 3 items (SOP-08); one at a time is best. Finishing beats starting. Anything new goes to the Parking lot.
> Claude reads the **Now** section at session start.

## Now (max 3 items)
- [ ] **Cell-stage toy: play it and tune it**  | Done when: BAMF69 plays it, wants to keep going for 2 minutes, and the top playtest notes are fixed  | Timebox: 2 sessions
- [ ] **Diets and upgrade points: playtest** (built 2026-11-07)  | Done when: BAMF69 plays two different diets and they feel like different creatures  | Timebox: 1 session

## Next
- [ ] **Stakes tuning pass** (playtest 2026-11-07, #1 and #3): slower evolution, pokier cells, lost food fades faster | Done when: BAMF69 feels a bump matters and evolving takes several minutes
- [ ] **Getting popped** (#1; pillar 1 rewritten to "Tense but fair" 2026-11-07): a pond cell can pop you, costing a part or a form's progress | Done when: being popped hurts but never ends the run
- [ ] 

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
- smoke `--drive play:N` without autoplay: the diet picker gets closed by a stray press, so the capture shows the pond instead of the picker

## Milestones
Scope, not dates. `/next-tier` moves the game from one tier to the next; after the slice, `docs/PRODUCTION.md` holds the
detail.
| Milestone | Definition of done | Status |
|---|---|---|
| M0 Toy (v0.1.0) | Core mechanic playable; someone wants to keep playing | |
| M1 Vertical slice (v0.2.0) | One polished loop with art, audio, UI; the greenlight (`/next-tier`) | |
| M2 Alpha | Every MVP system in and playable | |
| M3 Beta (content complete) | All MVP content in, no known crash | |
| M4 Release candidate (v1.0.0-rc.N, then v1.0.0) | `/release-check` green | |

## Done (recent, newest first)
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
