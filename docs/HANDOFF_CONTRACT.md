# Ooze2Orbit: Handoff Contract

> What one stage passes to the next. Short beats complete. Written 2026-11-08 (BAMF69 agreed to the idea; details are
> *(Claude's pick)* unless marked approved). **Built so far:** the temperament maths and the lineage shape
> (`src/core/lineage.ts`) and the cell stage's recording and export (`src/game/cell/record.ts`, saved to save slot
> `lineage` at the stage's end). Tests: `tests/lineage.test.ts`, `tests/cellRecord.test.ts`.
> Read with the spine (`docs/GDD.md`) and `docs/LORE.md`.

## Why this file exists
Each stage is its own small game, possibly with its own systems and, in theory, its own engine. What makes them one
game is what carries over. This file is the single place that says what that is, so:
- a stage can be built and played on its own (it starts from a **default lineage** when there is no save),
- a stage can be rebuilt without breaking the others, as long as it keeps its side of the contract,
- the player can always see **why** a trait is what it is (pillar 2): every change carries its cause.

## The lineage file
One engine-neutral JSON document, the **lineage**. Every stage reads it at the start and writes it back at the end.
It is saved inside the normal save envelope (`src/core/saveStore.ts`: versioned, with migrations, SOP-19); the
lineage has its own `schemaVersion` so it can also be exported as a plain file if a stage ever runs in another engine.

```json
{
  "schemaVersion": 1,
  "lastStage": "cell",
  "gardener": {
    "harshness": 0.0
  },
  "species": [
    {
      "id": "home",
      "name": "",
      "world": "home",
      "origin": "played",
      "status": "alive",
      "temperament": { "cautious": 0.0, "aggressive": 0.0, "adaptable": 0.0 },
      "diet": "omnivore",
      "branches": [],
      "stages": {
        "cell": { "...": "the cell stage's own block, below" }
      },
      "influence": [
        { "stage": "cell", "cause": "Bought defense level 2", "effect": { "cautious": 0.05 } }
      ]
    }
  ]
}
```

### Fields every stage understands
| Field | Meaning | Written by |
|---|---|---|
| `schemaVersion` | Version of this contract. Bump it and add a migration when the shape changes | Any stage that changes the shape |
| `lastStage` | The last stage that finished: `cell`, `aquatic`, `creature`, `civ`, `space` | Every stage, at its end |
| `gardener.harshness` | 0 = gentle, 1 = harsh: how violent the Gardener's interventions were. Decides how species treat the Gardener (`docs/LORE.md`) | God-mode stages (aquatic on) |
| `species[]` | Every species in the game: only `home` until the player chooses to interact with an outer garden (the space stage, for now; BAMF69 2026-11-08), then up to three | Cell creates the first; space adds the outer gardens and any replacements |
| `species[].world` | `home`, or the outer garden it lives on | The stage that creates it |
| `species[].origin` | `played` (came from real play), `default` (a stage started on its own), `generated` (a replacement or connected-mode species) | The stage that creates it |
| `species[].status` | `alive` or `extinct`. Extinct species stay in the file (history), and a `generated` one replaces them in the space stage | Any stage |
| `species[].temperament` | Three scores, 0 to 1 each, independent (a species can be high in two). The highest sets its ship specialty: **cautious = shields, aggressive = weapons, adaptable = engines** (approved by BAMF69 2026-11-08). A cached copy: the cause log is the truth (`temperamentOf`) | Every stage, only by adding `influence` entries |
| `species[].diet` | `herbivore`, `carnivore` or `omnivore`. Second layer of ship tech: plant eaters lean to industry and repair, meat eaters to salvage and raiding | Cell first; later stages may shift it |
| `species[].branches[]` | Sub-lineages inside a species (aquatic on). Same shape as a species minus `stages` | Aquatic on |
| `species[].stages.<stage>` | That stage's own block. Only that stage reads its details; later stages read only what this file promises below | Each stage, its own block only |
| `species[].influence[]` | The **cause log**: every change to temperament, with a cause in plain words the player can read | Every stage |

### Rules
1. **Temperament only changes through the cause log.** A stage never sets temperament directly: it appends an
   `influence` entry (cause + effect) and the scores are worked out from the log (`temperamentOf`). That is how the
   temperament readout can always say why ("The ice age made your lineage more cautious: +shields").
2. **Each stage can shift a temperament at most 50 % from where the stage before left it** (approved by BAMF69
   2026-11-08). The cell stage sets each temperament freely, 0 to 100 %. Every later stage adds its causes to where
   the stage before ended, then clamps each temperament to that value ± 50 % (and to 0..100 %). Example: a cell stage
   that ends 100 % aggressive (a carnivore) can end the aquatic stage no lower than 50 % aggressive, and the creature
   stage as low as 0 %. A stage with no causes for a species leaves it where it was. The cap is `STAGE_SHIFT_CAP` in
   `src/core/lineage.ts`; `stageRange()` tells a stage (and its readout) the lowest and highest each temperament can
   still reach.
3. **Append, never rewrite.** A stage adds its own `stages.<stage>` block and new `influence` entries. It never edits
   another stage's block or old entries. History stays explainable.
4. **Keep what you do not understand.** A stage that reads unknown fields writes them back untouched (newer stages,
   connected-mode data).
5. **Every stage ships a default lineage** for playing it on its own, marked `origin: "default"`, built so the stage
   is fun from it.
6. **Numbers live in one place.** The cap lives in `src/core/lineage.ts`; how much each cause moves temperament is a
   tunable table per stage (cell: `TUNING.temperament` in `src/game/cell/tuning.ts`), never scattered literals.

## Per stage: what goes in, what comes out
| Stage | Reads | Writes | Default lineage when played on its own |
|---|---|---|---|
| **Cell** | Nothing: always starts fresh | Creates species `home`; its `cell` block; diet; first influence entries | Not needed |
| **Aquatic** | `home`: temperament, diet, `stages.cell` (final form, parts, upgrades: the starting body plan) | Its block; branches; `gardener.harshness` | A balanced omnivore cell, all temperaments low |
| **Creature** | All species: temperament, diet, branches, aquatic body plan | Its block (levels cleared and how: fight, puzzle or stealth per obstacle; parts used); inherited traits from the most-used parts; branch extinctions; habitat (land, air, sea) per branch | One generated aquatic species (`home`) |
| **Civilization** | All species: temperament, diet, habitat, `gardener.harshness` | Its block; culture; how the species sees the Gardener; whether it adopted T0&#124;▼&#124; tech | One generated land species (`home`) |
| **Space** | All species: temperament (ship specialty), diet (second layer), culture, T0&#124;▼&#124; tech flag | Fleet and campaign state; the two outer-garden species when the player first reaches out to them, seeded from `home`'s lineage; extinct species and their `generated` replacements | One generated spacefaring species (`home`) |

## The cell stage's block (built 2026-11-08)
Written by `cellBlock()` in `src/game/cell/record.ts` when the stage ends (the last form reached and its diet picked).

```json
"cell": {
  "finalForm": 3,
  "diet": "carnivore",
  "dietHistory": ["omnivore", "carnivore", "carnivore"],
  "parts": ["spikes", "shell"],
  "upgrades": { "attack": 3, "speed": 1, "defense": 2, "mobility": 0 },
  "behavior": { "cellsRammed": 14, "cellsPopped": 6, "timesBitten": 3, "gulperEscapes": 2, "gulpersLured": 1 }
}
```

| Field | Recorded when |
|---|---|
| `finalForm`, `diet`, `parts`, `upgrades` | Read from the creature at the stage's end |
| `dietHistory` | Each diet pick: at the start and at every evolution (autoplay: the `?diet=` pick) |
| `cellsRammed` | You swim into a cell at ramming speed |
| `cellsPopped` | A pond cell pops from your bumps (gulpers swallowing prey do not count) |
| `timesBitten` | A gulper touches you when you are not ramming it (recorded; feeds no temperament yet) |
| `gulperEscapes` | A gulper hunting you gives up: it tires of the chase or loses sight of you |
| `gulpersLured` | A gulper hunting you turns to other prey |

The player cannot be popped in the cell stage (BAMF69 2026-11-08: bumps and bites cost food only), so there is no `timesPopped`.

### How the cell stage feeds temperament (all in `TUNING.temperament`)
Points per cause; 10 points = 100 %. First draft *(Claude's pick)*: a creature that maxes attack, keeps its spikes and
picks carnivore at all three choices is 100 % aggressive without any fighting; behavior adds on top, each capped so
grinding one action cannot max a temperament alone.

| Cause in the cell stage | Pushes toward | Points |
|---|---|---|
| Attack upgrade levels | Aggressive | 1 per level |
| Spikes kept at the end | Aggressive | 2 |
| Carnivore picks | Aggressive | 1 per pick |
| Cells rammed / popped | Aggressive | 0.1 each (max 3) / 0.2 each (max 2) |
| Defense upgrade levels | Cautious | 1 per level |
| Shell kept at the end | Cautious | 2 |
| Gulper escapes | Cautious | 0.5 each (max 3) |
| Speed and mobility upgrade levels | Adaptable | 0.5 per level |
| Omnivore picks | Adaptable | 0.5 per pick |
| Diet changes between picks | Adaptable | 1.5 per change |
| Gulpers lured onto other prey | Adaptable | 0.5 each (max 2) |
| Filter mouth | (diet layer, not temperament) | none |

Each cause writes one `influence` entry with a readable cause ("Your ancestor escaped the gulpers 6 times"), so the
first temperament readout can explain itself. **Decided 2026-11-08 (BAMF69):** the cell stage never shows
temperament; it is revealed at the transition into the aquatic stage.

## Open questions
| Question | Why it matters |
|---|---|
| Do outer-garden species inherit the cell temperament, or only the body plan? | Decides whether all three species start alike |
