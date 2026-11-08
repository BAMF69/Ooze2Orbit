# Playtest Log

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

