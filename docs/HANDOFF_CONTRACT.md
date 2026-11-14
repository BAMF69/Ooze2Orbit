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
| `species[].temperament` | Three shares totaling 1 (100%); increases compete with the others (BAMF69 2026-11-13). The highest sets its ship specialty: **cautious = shields, aggressive = weapons, adaptable = engines**. A cached copy: the cause log is the truth (`temperamentOf`) | Every stage, only by adding `influence` entries |
| `species[].diet` | `herbivore`, `carnivore` or `omnivore`. Second layer of ship tech: plant eaters lean to industry and repair, meat eaters to salvage and raiding | Cell first; later stages may shift it |
| `species[].branches[]` | Sub-lineages inside a species (aquatic on). Same shape as a species minus `stages` | Aquatic on |
| `species[].stages.<stage>` | That stage's own block. Only that stage reads its details; later stages read only what this file promises below | Each stage, its own block only |
| `species[].influence[]` | The **cause log**: every change to temperament, with a cause in plain words the player can read | Every stage |

### Rules
1. **Temperament only changes through the cause log.** A stage never sets temperament directly: it appends an
   `influence` entry (cause + effect) and the scores are worked out from the log (`temperamentOf`). That is how the
   temperament readout can always say why ("The ice age made your lineage more cautious: +shields").
2. **Each stage can shift a temperament at most 50 % from where the stage before left it** (approved by BAMF69
   2026-11-08; retained as 50 percentage points in the 2026-11-13 share model). Cell evidence is summed and
   normalized without independently capping any category. Later stages normalize the prior shares plus signed
   stage evidence, then interpolate toward that target so no share moves more than 50 points. Example: a cell stage
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
Civilization Toy 2 (2026-11-13) reads `stages.creature.hero` strength/vitality/climb. Its victory names
are `base_destroyed` and `economic_supremacy`; space also continues accepting conquest/trade/faith.
The `civ` block stores `towers`, `sentKinds`, sends/defense spending, maze length, hero hits, kills,
lever and `tookT0Tech` (false until the probe exists). `machines` is an ordered technology heritage
list of tower/send identifiers; space turns its first entry into a matching ship part. The cause
log records spending, defensive kills, maze length and hero use under the existing ±50% stage cap.

| Stage | Reads | Writes | Default lineage when played on its own |
|---|---|---|---|
| **Cell** | Nothing: always starts fresh | Creates species `home`; its `cell` block; diet; first influence entries | Not needed |
| **Aquatic** | `home`: temperament, diet, `stages.cell` (final form, parts, upgrades: the starting body plan) | Its block; branches; `gardener.harshness` | A balanced omnivore cell, all temperaments low |
| **Creature** | All species: temperament, diet, branches, aquatic body plan | Its block (generations played, how each run passed rooms: fight, sneak or solve; abilities evolved and their causes; areas opened); the hero for the civilization stage; `gardener.harshness` (redesigned 2026-11-10: a roguelike) | A generated aquatic species |
| **Civilization** | All species: temperament (the opponent stands for one you are not), diet, abilities, the hero, `gardener.harshness` | Its block: the victory (enemy base destroyed = aggressive, out-earned about 5 to 1 = cautious), spending on sends vs. defenses, maze length and hero use (adaptable), the technology heritage (most-used towers and monsters), whether it took T0&#124;▼&#124; tech (redesigned 2026-11-10: tower wars) | Three generated creature-stage species and a hero |
| **Space** | All species: temperament (ship specialty), diet (second layer), the civ block (victory type sets the starting position, technology heritage gives the first ship parts, the T0&#124;▼&#124; tech flag starts T0&#124;▼&#124; partly adapted), `gardener.harshness` | Fleet and campaign state (ships, parts, what T0&#124;▼&#124; has learned); the two outer-garden species when the player seeds them; extinct species and their `generated` replacements | Three generated spacefaring species |

## The later stages' blocks (built 2026-11-09)
Each is written by `writeStage()` in `src/core/lineage.ts` when the stage ends; replaying a stage replaces its causes.
- `stages.aquatic`: form, parts, diet, kills, breaches, deaths, generations, upsGained. Causes: hunting (aggressive),
  breaching (adaptable), relatives lost (cautious), each upgrade's lean. Harshness rises with how far the water was
  pushed from mild (`src/game/aquatic/record.ts`).
- `stages.creature`: levels (ways per level), traits (parts used 3+ times), partsUsed. Causes: each level's cause line,
  leaning by the obstacles passed each way; the boss counts triple. Harshness adds the world map's (`creature/record.ts`).
- `stages.civ`: victory, tally, turns, rival, machines, acts. Causes: one per region taken; harshness is the game's
  (`src/game/civ/rules.ts` civRecord).
- `stages.space` (Toy): battles, wins, losses, refits, hull, parts, hybrid, fleet (escort ids), escortsLost, bossDown, motherships, salvage,
  t0Learned (per family), ally.
  Causes: one per way of winning (wins in a ship built around weapons lean aggressive, defences cautious, engines
  adaptable). Reads from `stages.civ`: `victory`, `machines[0]` (the technology heritage) and, when a later
  civilization stage writes it, `tookT0Tech`. Written when the Mothership falls (the stage's win) (`src/game/space/campaign.ts` startCampaign, spaceRecord).

## Cell division extension (updated 2026-11-12)
### Creature Toy 2 extension (2026-11-13)
`stages.creature.hero` stores the surviving creature's strength, vitality, climbing ability and diet.
`abilities` lists `climb` when present; `traits` retains a string list for existing readers.
`generation`, `climate`, `opened`, `visited` and `history` record the prototype's selected lineage.
The separate `creature_generations` save slot stores generation checkpoints, is defensively validated
and travels in normal save exports. Existing bundles without that slot remain valid. Mid-life state
is deliberately not a checkpoint: entering Creature resumes the last generation at the nest.
The stage reads aquatic diet and preserves upstream temperament; aquatic body-plan art is pending.
The civilization stage remains its older Toy and does not yet activate the new hero stats.

`stages.cell.selections` stores each selected form, diet, bonus stat/gain, perk, cause and generation evidence.
`stages.cell.perks` stores the inherited ranks of division-only abilities (Food Sense, Jet Burst, Soft Landing).
These effects currently apply only in the cell stage; later stages preserve this block without activating them.
`upgrades` carries final levels from purchases plus daughter bonuses, which can exceed 5 (BAMF69 2026-11-12).
Aquatic inheritance preserves legitimate cell levels up to 11 (5 purchased plus three +2 selections),
even above its purchase cap of 10. Aquatic purchases still stop at 10; invalid import values are bounded.
The final daughter choice writes a first lineage; continued Form 4 play is allowed, and leaving for aquatic
refreshes that save with the latest purchased levels, parts and perks before switching scenes.
`dietHistory` includes initial diet and every selected daughter. Purchased and bonus levels each receive
cause-log credit once (final levels minus recorded bonuses are the purchased levels). Parts and unspent points
persist through daughter selection; points remain cell-local and are not exported. No schema bump: the stage
block is extensible. Old recordings without selections/perks retain their original handling.

## The cell stage's block (original format, built 2026-11-08)
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
Points per cause are relative evidence weights (BAMF69 2026-11-13). Sum the three categories, then divide each
by the total: 10 cautious + 10 aggressive + 0 adaptable becomes 50% / 50% / 0%. The existing `full` scale factor
is retained for compatibility with later-stage pressure magnitudes, not as an independent 100% ceiling.
Behavior evidence caps stop additional grinding from overwhelming competing evidence indefinitely.
No positive evidence means a balanced third each. Display rounding assigns leftover percentage points so
the three integers always add to 100. Saves retain their schema and original influence logs; derived caches
are recomputed on lineage reads/writes, including older saves. Unknown fields and stage blocks are preserved.

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

## Aquatic form choices (2026-11-13)
`stages.aquatic.selections` records form, diet, chosen stat/gain, cause and optional bonus part for
Forms 2–4. `stages.aquatic.upgrades` carries the final stats, including daughter bonuses above 10.
Existing `upsGained` remains the total gains; cause logs separate purchases from selected bonuses.
Aquatic run saves additionally keep pending `me.divisionSeed` and `me.growthEvidence`, so Continue
reconstructs the exact unconfirmed offers. Confirming removes the seed and appends one history entry.
The parser accepts legacy saves with no fields; bounds valid stats to reachable values (16 health,
17 other stats), validates history, and refuses a pending seed for an already-confirmed form.
Stage blocks remain extensible; lineage/run schema versions are unchanged.

## Aquatic local ecology save extension (2026-11-13)
Run saves optionally include `sisters: { nextId, members }`. Each member stores a permanent home-map
index, unique ID, family/parent/generation, its own creature body, position/velocity, growth/food,
health, grace/attack timers and pending reproduction. Continue keeps all three map populations;
inactive maps do not advance. The parser shares `readAqCreature` with the player, bounds NPC levels
to 17, rejects invalid homes/duplicate IDs/dead bodies and limits each map to its population budget.
Sister sprites are reconstructed, never serialized. Legacy saves without the extension remain valid.
The existing no-mid-river save rule is unchanged. Lineage records count player sister kills with other
hunting causes; the complete ecology is run state, not a stage-handoff payload.
