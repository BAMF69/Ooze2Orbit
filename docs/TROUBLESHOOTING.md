# Troubleshooting Log

> Known issues and verified fixes. Future-you and testers should not need to ask how to fix these.
> Add an entry whenever a bug cost more than ~30 minutes or is likely to come back.

## Template (copy)
```
### <Short symptom>
- First seen: YYYY-MM-DD
- Environment: OS, engine version, build type
- Symptom: exact error text or behavior
- Root cause: 
- Fix: 
- How to verify: 
- Related: commit / ADR / issue
```

## Entries
### Keyboard players never got to choose a diet (Enter on "Play" picked omnivore)
- First seen: 2026-11-08 (found while capturing README screenshots)
- Environment: any browser, keyboard
- Symptom: after pressing Enter on "Play", the diet picker closed at once with the default diet. Clicking "Play" with
  the mouse worked, which hid it during playtests.
- Root cause: menu presses wait in the input queue until the shell shows the play screen and clears it, but the
  scene already runs under the loading screen; the picker read the leftover Enter.
- Fix: MainScene reads picker and upgrade-panel keys only while `shell.topId === "play"`.
- How to verify: `python tools/dev.py smoke --gpu --drive play:3 --screenshot x.png` shows the picker, and the log has
  no DIET line.
- Related: src/game/MainScene.ts update()

### CI says "[FAIL] tests failed" although every test passed
- First seen: 2026-11-07
- Environment: GitHub Actions (ubuntu-latest), Vitest 5.0.5, `python tools/dev.py test`
- Symptom: the log shows "Tests 170 passed (170)", then "[FAIL] tests failed (no 'Tests ... passed' summary in the
  output)"; the Pages deploy is skipped. Passes on Windows.
- Root cause: on GitHub Actions Vitest colors its output even through a pipe, and the color codes sit between
  "Tests" and the count, so dev.py's summary pattern did not match. GitHub's log viewer hides the codes.
- Fix: dev.py `tool()` strips terminal color codes from captured output before any parsing.
- How to verify: `FORCE_COLOR=1 python tools/dev.py test` passes (it reproduced the failure before the fix).
- Related: tools/dev.py `ANSI_RE`, .github/workflows/pages.yml

### Push rejected: "Git LFS upload failed (missing) ...png"
- First seen: 2026-11-07
- Environment: Windows 10, git-lfs 3.8.1, first push to github.com/BAMF69/Ooze2Orbit
- Symptom: `git push` stops with `Git LFS upload failed: (missing) tools/art/dotwork/tests/fixtures/dwarf_smash.png`.
- Root cause: 26 kit files (shader golden images and inputs under data/, Dotwork palettes and test fixtures) arrived in
  the scaffold as bare LFS pointer text (130 bytes) with no image content anywhere on this machine.
- Fix: untracked and listed in .gitignore (kept on disk). Nothing the game uses. `smoke --shaders` golden compare and
  Dotwork's image tests need the real files from the kit (re-scaffold or copy them) before they can run.
- How to verify: `git lfs fsck --pointers` clean; push succeeds.
- Related: .gitignore (bottom), SOP-05 (LFS)

### Smoke captures show a rotated sprite split in two along a diagonal
- First seen: 2026-11-07
- Environment: Windows 10, Phaser 4.2.1, `dev.py smoke --record/--screenshot` (headless Chromium, SwiftShader)
- Symptom: in recorded frames the player cell (tilted while swimming) is drawn as two halves with water showing
  between them along the sprite's diagonal; an upgrade fin looked "detached".
- Root cause: a software-renderer (SwiftShader) artifact on rotated, scaled sprites in headless runs. The same build in
  a real browser on the GPU draws the cell whole (checked in the browser pane at several moments).
- Fix: none needed in the game. Judge art and alignment in a real browser, not from headless captures of rotated
  sprites; `smoke --headed` or `--gpu` captures use real rendering.
- How to verify: `python tools/dev.py run`, play with `?autoplay&diet=carnivore`, zoom on the cell while it tilts.
- Related: ENGINE.md gotcha 7 (headless smoke uses software rendering)


## Phaser FIT after changing its parent rectangle (2026-11-13)
ScaleManager.refresh() uses cached parent dimensions. After assigning new host bounds, call getParentBounds() before setGameSize()/refresh(). Otherwise initial cell startup may draw behind its reserved HUD. Avoid flex-centering a canvas already centered by ScaleManager margins. Verify actual canvas bounds, not only host bounds.

## Crash while advancing from creature (2026-11-13)
Verified in Chromium/Phaser 4.2.1: `Cannot read properties of undefined (reading 'worldView')`
in CreatureScene.draw. Shell.startGame stops the old scene synchronously; result handlers must return
without drawing its destroyed camera/objects. Both creature→civ and civ→space now return immediately.
Regression scenario: confirm creature reveal, claim crown, confirm civilization; win civilization, confirm
space. Assert no page errors, expected active stage and removal of old native panels.
