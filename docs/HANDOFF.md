# Handoff

> Rewritten at the end of every session by `/end-session`. Read first by `/start-session`.
> Keep under ~60 lines. It is a baton, not a diary.

**Last updated:** 2026-11-07
**Branch / commit:** main, first commit (whole project: kit scaffold + cell-stage toy)
**Engine version:** see `docs/ENGINE.md`

## Where we are
Ooze2Orbit (codename Project_Amber_Gryphon), tier Toy. The cell stage is playable and BAMF69 likes it ("its cool!"):
pick a diet, swim a dark lit pond, eat algae/meat, bump cells, collect parts, buy 4 upgrades (E panel), evolve twice,
dodge or hunt gulper predators. Code-made sprites (lit microscope style) and code-made organic SFX.

## What changed last session
- Built the toy, then iterated through 5 playtests (all in `docs/PLAYTEST_LOG.md`): harder pacing, pillar 1 rewritten
  to "Tense but fair", diets + plant/meat points + upgrades, visible upgrade layers, art redrawn (style D), name, SFX,
  carnivores barred from the filter mouth, gulper predator, ramming rule, gulpers distracted by prey (FSM).

## Current task
- ROADMAP Now: play and tune the cell-stage toy; playtest diets (two different diets should feel different).

## Next step (specific, first action)
- Ask BAMF69 how the gulpers (now distractible) and the squishy SFX feel (untested by a human); fix the top note first.

## Open questions / decisions pending
- Getting popped (ROADMAP Next): what a pop costs (a part? form progress?); pillar 1 already allows it.
- Is the toy "done" (someone wants to keep playing for 2 min)? If yes, offer `/next-tier`.

## Known broken or flaky
- Headless smoke captures can show tilted sprites split along a diagonal (SwiftShader); real browser is fine
  (`docs/TROUBLESHOOTING.md`).
- `smoke --drive play:N` without `autoplay`: a stray press closes the diet picker (parking lot).
- 26 kit LFS pointer stubs (shader goldens, Dotwork fixtures) are untracked: `smoke --shaders` cannot compare (TROUBLESHOOTING).
- No music, no SFX captions, no gamepad control of the upgrade panel, no left-stick movement (parking lot).

## Commands that matter right now
```
python tools/dev.py check
python tools/dev.py test
python tools/dev.py smoke --drive play:60 --query "autoplay&diet=carnivore" --screenshot captures/progress/x.png
python tools/art/pixel_sprite.py build assets_src/sprites/<file>.py --out public/assets/art/<file> --overwrite --preview-scale 0
python assets_src/audio/make_sfx.py
```

## Context a fresh Claude needs
- All feel numbers: `src/game/cell/tuning.ts`. Rules (pure, tested): `src/game/cell/rules.ts`. Scene: `src/game/MainScene.ts`.
- Autoplay pilot is a reckless player: its pacing is a rough guide only, never a substitute for BAMF69 playing.
- `player_upgrades` overlays fail the art floor alone by design; check the composite (see the file header).
- Inspired by Spore's stage-by-stage evolution: same kind of mechanics only, never its names, creatures, art, music or look.
