# Handoff

> Rewritten at the end of every session by `/end-session`. Read first by `/start-session`.
> Keep under ~60 lines. It is a baton, not a diary.

**Last updated:** 2026-11-08
**Branch / commit:** main, a150fbf (PR #2 merged) + uncommitted design-doc pass (this session)
**Engine version:** see `docs/ENGINE.md`

## Where we are
Ooze2Orbit, live at https://bamf69.github.io/Ooze2Orbit/ (every push to main redeploys).
- **Cell stage:** Toy done 2026-11-08 (BAMF69: "the cell stage is fun"); next tier Vertical slice, paused.
  Momentum, pond cells fighting each other, loot from every death, coloured upgrade panel (PR #2).
- **Aquatic stage:** now the **active stage, Toy**, not built. Full doc: `docs/stages/02-aquatic.md`.

## What changed last session
- Momentum, pond fights, harder tuning, upgrade panel colours (all in `docs/PLAYTEST_LOG.md`, PR #2, merged).
- Design decisions (BAMF69), written into GDD, LORE, HANDOFF_CONTRACT and the stage docs:
  - No "getting popped": pillar 1 is now "stakes and difficulty rise with every stage; every danger readable".
  - Temperament is hidden in the cell stage and revealed at the transition into the aquatic stage.
  - The outer gardens are seeded only when the player chooses to interact with them: the space stage, for now.
  - Aquatic avatar mode is a **pseudo-3D view from behind the creature** (chosen over a rotating chase cam after a
    side-by-side demo); predators behind you get a red edge cue plus a warning sound.

## Current task
- ROADMAP Now: Aquatic Toy 1, the behind-view swim.

## Next step (specific, first action)
- Before building, give BAMF69 the "crude placeholders on purpose" warning (CLAUDE.md), then `/new-feature` for
  Aquatic Toy 1: pseudocode for the projection (logic stays top-down x, y, heading; draw floor specks and sprites
  projected from a camera behind the avatar), `src/game/aquatic/` with its own `tuning.ts`, and a new scene.

## Open questions / decisions pending
- Aquatic stakes (Claude's pick, unconfirmed): the avatar can be killed and you carry on as a relative.
- Aquatic god-mode lever and trait (Claude's pick: water temperature drives body thickness).
- How the cell stage hands over: the flood ending (ROADMAP Next) and the temperament reveal screen.

## Known broken or flaky
- Headless smoke captures split tilted sprites (SwiftShader); use `smoke --gpu` (`docs/TROUBLESHOOTING.md`).
- 26 kit LFS pointer stubs are untracked: `smoke --shaders` cannot compare (TROUBLESHOOTING).
- Autoplay ignores E, so the upgrade panel cannot be captured in an autoplay run.
- `Ooze2Orbit Game Direction.pdf` (untracked, BAMF69's) predates these decisions: it still lists "getting popped".

## Commands that matter right now
```
python tools/dev.py check
python tools/dev.py test
python tools/dev.py smoke --gpu --timeout 90 --drive play:60 --query "autoplay&diet=carnivore" --screenshot captures/progress/x.png
```

## Context a fresh Claude needs
- Cell feel numbers: `src/game/cell/tuning.ts`; rules (pure, tested): `src/game/cell/rules.ts`; scene: `src/game/MainScene.ts`.
- The lineage (temperament with causes) is saved to save slot `lineage` at the cell stage's end (`src/game/cell/record.ts`).
- Work goes on `feat/` branches with a PR (SOP-05); BAMF69 merges. No `gh` CLI here: PRs are made in the browser pane.
- Inspired by Spore's stages: same kind of mechanics only, never its names, creatures, art, music or look.
