# Stage 4: Civilization

> Stage design doc. Short beats complete. Game-wide rules (pillars, the Gardener rule, lore, win and lose, what
> carries between stages) live in the spine, `docs/GDD.md`; this file covers only what is special to the
> civilization stage.
> **Redesigned 2026-11-10 (BAMF69): an RTS tower defense battler.** The 2026-11-09 design (a hex strategy game with
> conquest, trade and faith) was built as Toy 1 (PR #10) and is replaced; Toy 1 stays in the game until Toy 2 exists,
> then is removed (BAMF69 2026-11-10). Its full design and build notes are in this file's git history.
> Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69. Everything else was decided by BAMF69.

## Identity
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
| Took `T0|▼|` tech? | A faster start, but `T0|▼|` begins partly adapted |
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
| One battle, or a short campaign of battles across the planet? | The stage's length and goal |
| What happens if your base falls? *(Claude's pick: you lose that battle with a setback and fight again)* | Pillar 1: no game over for the Gardener |
| Which resources, exactly? | Fewer is easier to read |
| Can the hero die in battle, and what does it cost? | Hero use is part of adaptable |
| 1v1, or you against two rivals (one per other temperament)? | Scope and balance |
