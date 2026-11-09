# Handoff

> Rewritten at the end of every session by `/end-session`. Read first by `/start-session`.
> Keep under ~60 lines. It is a baton, not a diary.

**Last updated:** 2026-11-09
**Branch / commit:** feat/aquatic-v8 from main 4b5eb6e (PR #4 merged: aquatic Toy v1-v7), v8 uncommitted
**Engine version:** see `docs/ENGINE.md`

## Where we are
Ooze2Orbit, live at https://bamf69.github.io/Ooze2Orbit/ (every push to main redeploys).
- **Cell stage:** Toy done 2026-11-08 (BAMF69: "the cell stage is fun"); next tier Vertical slice, paused.
  Momentum, pond cells fighting each other, loot from every death, coloured upgrade panel (PR #2).
- **Aquatic stage:** the **active stage, Toy**. v1 played ("I like the movement... feels empty"); v2 built 2026-11-08
  (vertical swimming, dash, breach, stats to 10, points, forms, parts, five creature kinds); v3 2026-11-08: pond ->
  river 1 -> lake -> river 2 -> coast, the shark look, fish fight fish, E upgrades / U lens; v4: stamina (Shift, Q
  dash), unique slots, part icons, endurance muscle, rivers x2, real schools, admin panel (`), cell -> aquatic
  evolve; v5-v7 sharks, looks, cutscenes (PR #4); v8 2026-11-09: the Gardener's water matters (`aquatic/gardener.ts`),
  form 4 in both stages unlocks the evolve, chomp per fish, black-screen death, move-on banner, calm music; v9: evolve only on
  the coast, diet line, autosave + menu Continue / Export / Import (`?continue` resumes in smoke). Not yet played.
  Main menu "Aquatic stage (prototype)". Doc: `docs/stages/02-aquatic.md`; code: `src/game/AquaticScene.ts`, `src/game/aquatic/`.

## What changed last session
- 2026-11-09 (design only, branch `docs/civilization-stage`): the **civilization stage** is designed in
  `docs/stages/04-civilization.md`: hex strategy as the ruler, conquest / trade / faith per region, acts of god,
  technology replaces parts, rivals stand for the other temperaments.
- 2026-11-09 (design only, branch `docs/creature-stage`): stage 3 is now the **Creature stage** (was Land/Air),
  designed in `docs/stages/03-creature.md`: world map = god mode, sidescroller levels = avatar mode, fight / puzzle /
  stealth per obstacle builds temperament, parts become traits when used most. Lineage stage id `land` -> `creature`.
- Momentum, pond fights, harder tuning, upgrade panel colours (all in `docs/PLAYTEST_LOG.md`, PR #2, merged).
- Design decisions (BAMF69), written into GDD, LORE, HANDOFF_CONTRACT and the stage docs:
  - No "getting popped": pillar 1 is now "stakes and difficulty rise with every stage; every danger readable".
  - Temperament is hidden in the cell stage and revealed at the transition into the aquatic stage.
  - The outer gardens are seeded only when the player chooses to interact with them: the space stage, for now.
  - Aquatic avatar mode is a **pseudo-3D view from behind the creature** (chosen over a rotating chase cam after a
    side-by-side demo); predators behind you get a red edge cue plus a warning sound.

## Current task
- ROADMAP Now: BAMF69 playtests the aquatic Toy (behind-view swim, reveal, lens).

## Next step (specific, first action)
- Ask for BAMF69's notes on aquatic Toy v2; `/playtest-report`, then fix the top note first. Pilots for checking:
  `?pilot=fight|breach|still`; starts: `?map=lake|ocean`, `?river=1|2`; `?look=0|1..3|c1..c3|a1..a3`, `?parts=fins,jaws`,
  `?admin`, `?swarm`;
  cell stage: `?finish` (or `) ends it and evolves. Feel numbers:
  `src/game/aquatic/tuning.ts` (camera, turn rate, deepmaw speed and sight, warning range, selection strength).

## Open questions / decisions pending
- Aquatic stakes (Claude's pick, unconfirmed): the avatar can be killed and you carry on as a relative.
- Aquatic god-mode lever and trait (Claude's pick: water temperature drives body thickness).
- How the cell stage hands over: the flood ending (ROADMAP Next) and the temperament reveal screen.

## Known broken or flaky
- Headless smoke captures split tilted sprites (SwiftShader); use `smoke --gpu` (`docs/TROUBLESHOOTING.md`).
- 26 kit LFS pointer stubs are untracked: `smoke --shaders` cannot compare (TROUBLESHOOTING).
- Autoplay ignores E, so the upgrade panel cannot be captured in an autoplay run.
- Aquatic: no collisions with rocks (you swim through them; near things fade); the lens cause lines and reveal text
  are English-only (generated strings, not i18n yet); the aquatic stage does not write the lineage back yet.
- `Ooze2Orbit Game Direction.pdf` (untracked, BAMF69's) predates these decisions: it still lists "getting popped".

## Commands that matter right now
```
python tools/dev.py check
python tools/dev.py test
python tools/dev.py smoke --gpu --timeout 90 --drive play:60 --query "autoplay&diet=carnivore" --screenshot captures/progress/x.png
python tools/dev.py smoke --gpu --timeout 90 --drive play:20 --query "stage=aquatic&autoplay&threat" --screenshot captures/progress/x.png
```

## Context a fresh Claude needs
- Cell feel numbers: `src/game/cell/tuning.ts`; rules (pure, tested): `src/game/cell/rules.ts`; scene: `src/game/MainScene.ts`.
- The lineage (temperament with causes) is saved to save slot `lineage` at the cell stage's end (`src/game/cell/record.ts`).
- Work goes on `feat/` branches with a PR (SOP-05); BAMF69 merges. No `gh` CLI here: PRs are made in the browser pane.
- Inspired by Spore's stages: same kind of mechanics only, never its names, creatures, art, music or look.
