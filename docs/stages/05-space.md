# Stage 5: Space

> Stage design doc. Short beats complete. Game-wide rules (pillars, lore, win and lose, what carries between stages)
> live in the spine, `docs/GDD.md`; this file covers only what is special to the space stage.
> **Not started.** Nothing here gets coded until the stages before it are fun (spine, "Out of scope"). When this
> becomes the active stage, fill the rest from `docs/stages/_TEMPLATE.md` and keep what still holds.
> Designed 2026-11-09 (BAMF69), on top of the 2026-11-08 decisions marked *(approved)*. Items marked *(Claude's pick)*
> were chosen by Claude: confirm them with BAMF69.

## Identity
- **Pitch:** Captain a ship, then a fleet. Jump between star systems, land on planets to collect parts and ships,
  refit your fleet, and fight `T0|▼|`'s forces, which learn from every battle.
- **Reference game:** Endless Sky, for its **fleet management, ship customization and space combat** (BAMF69
  2026-11-09), and its star map, jumps between systems and landing on planets.
  - **Mechanics only.** Endless Sky's source code is GPL v3 and its art is under various Creative Commons licenses.
    Copying its code would force Ooze2Orbit to be released under the GPL, and copying its art needs its licenses
    followed. So nothing is copied: no code, data files, ship or outfit stats, names, story, art or sounds. Everything
    is written and drawn fresh for this game.
- **Modes:**
  - **Avatar mode = the captain** *(BAMF69 2026-11-09)*. The character flies the flagship in real-time top-down
    combat, jumps between systems and lands on planets.
  - **God mode = the outer gardens** *(Claude's pick)*. When the captain reaches a world chosen for an outer garden,
    the Gardener seeds it through the lens and gives it a few big nudges. Its species evolves in the simulation and
    joins the alliance (see "Three species, one fleet").
- **Receives:** the home species from the civilization stage (`docs/HANDOFF_CONTRACT.md`): temperament, diet, victory
  type, technology heritage, whether it took `T0|▼|` tech, `gardener.harshness`.
- **Win (the game's win):** defeat `T0|▼|` with a fleet built from three spacefaring species *(approved)*.
- **Played on its own:** starts from three default or generated species.

## How the pillars apply here
1. **Tense but fair (stakes rise):** the highest stakes in the game. Ships are destroyed for good, and a whole species
   can die out. Every threat shows on the map and the radar before it arrives. Losing the flagship sends the captain
   back to the last planet in an escape pod, without the ships and cargo that were lost *(Claude's pick)*. A species
   that dies out is replaced by a generated one *(approved)*. No game over for the Gardener.
2. **You shape your creature, directly and indirectly:** directly through how you build and fly your fleet;
   indirectly through the outer gardens you seed and nudge, and through everything the species became in earlier
   stages.
3. **Small world, growing bigger:** the biggest world in the game, a galaxy of star systems.

## The three systems from Endless Sky *(BAMF69 2026-11-09)*

### Fleet management
- Start with one ship, the flagship. Buy, capture or find more ships, and they fly as your fleet.
- Give the fleet simple orders in combat (attack my target, hold position, gather on me, fall back *(Claude's pick)*).
- Ships cost upkeep, crew and fuel to run, so a bigger fleet is a real commitment *(Claude's pick)*.

### Ship customization
- Every hull has limited space for parts. Parts are weapons, shields, engines, power, cooling, cargo and more.
- Fitting a ship is a puzzle: power, heat and space all have to balance.
- **Parts come from the three species**, and each species' parts reflect its temperament and diet:

| Temperament | Its species builds strong | Diet's second layer |
|---|---|---|
| Cautious | Shields | Plant eaters: industry and repair parts |
| Aggressive | Weapons | Meat eaters: salvage and raiding parts |
| Adaptable | Engines: fast, mobile ships | Omnivores: a mix *(Claude's pick)* |

- Mixing parts from different species on one ship makes **hybrid technology** `T0|▼|` has not seen *(approved)*.
- Ship hulls look like the species that built them: shell plating, fin-like engines, grown rather than machined
  *(Claude's pick)*. That keeps the game-wide rule: everything alive is organic; `T0|▼|` is perfect geometry.

### Space combat
- Real-time, top-down. You fly the flagship directly; the fleet follows its orders.
- Weapons, shields and engines matter in different ways: weapons kill, shields last, engines decide who controls the
  distance.
- `T0|▼|` hunts the way gulpers did in the cell stage: drawn to easier targets, pausing after it strikes, giving up long
  chases *(approved idea)*. A player who learned to lure gulpers can lure `T0|▼|`'s ships the same way.

## Jumping and landing *(BAMF69 2026-11-09)*
- **The star map:** jump between connected star systems. Jumps cost fuel *(Claude's pick)*.
- **Landing on planets** is where the captain collects parts and ships:
  - **Allied worlds** (the three species): shipyards and outfitters selling that species' ships and parts.
  - **Ruins of older gardens:** forgotten technology, found by exploring *(approved idea)*.
  - **`T0|▼|` wrecks and outposts:** salvage. Powerful, but it is `T0|▼|`'s own design, so it already knows how to
    counter it *(approved idea)*.
  - **Trade and missions** to earn money between fights *(Claude's pick, from Endless Sky's structure)*.

## `T0|▼|` adapts *(approved 2026-11-08)*
- **After every battle, `T0|▼|` adapts to the ship technology it faced.** The design that won last time works less
  well next time, so the player must keep creating or discovering new technology.
- **It must be readable** (pillar 1) *(Claude's pick for how)*: a "what `T0|▼|` has learned" readout shows how
  resistant it is to each family of your technology (each weapon type, shield type, engine type). Resistance fades
  for technology you stop using, so retired parts become useful again.
- Starting with `T0|▼|` tech (the civilization-stage choice) means it begins already partly adapted to you.

## Three species, one fleet
- **The home species** arrives from the civilization stage.
- **The two outer gardens** are seeded only when the player chooses to interact with them *(approved 2026-11-08)*.
  *(Claude's pick for how:)* the captain finds worlds that could hold life, and the player chooses which two to garden.
  Each world's environment pushes its species toward a role (a heavy, stormy world toward shields; a cold ice moon
  toward engines and sustain). Through the lens, the Gardener seeds it from the home lineage and makes a few big
  nudges; its evolution catches up in the simulation, and the species joins with its own shipyards and parts.
- **First contact** with each new species is a story beat.
- `T0|▼|` has several weaknesses at once, so no single species' technology can win alone *(approved idea)*.

## What the civilization stage hands in *(from `docs/stages/04-civilization.md`)*
| From civilization | Effect in space |
|---|---|
| Victory type | The starting position: a war fleet (conquest), a trade network and more ships (economic), or strong defenses and loyal allies (faith) |
| Technology heritage | The species' first ship parts |
| Took `T0|▼|` tech? | A faster start, but `T0|▼|` begins partly adapted |
| `gardener.harshness` | Whether the species welcomes or resents the Gardener when it learns the truth |

## Core loop (first draft, Claude's pick)
```
on a planet: buy, sell, refit ships, take a mission -> jump across the star map -> fight T0's forces (or flee)
-> T0 adapts to what you used -> salvage, explore, find new parts and ships -> land, refit with something new -> repeat
```

| Scale | What the player does | Why they keep going |
|---|---|---|
| Every ~30 seconds | Maneuvers and fires in combat | Winning the fight |
| Every ~10 minutes | Refits the fleet after `T0|▼|` adapts | A new build to try |
| Whole stage | Gathers three species into one fleet and assaults `T0|▼|` | The end of the game |

## Look and camera
- Top-down 2D ships, still lit and moody: dark space, ships lit by their own engines and the nearest star.
- Organic, evolved ship hulls against `T0|▼|`'s perfectly geometric ships.
- Engine: Phaser 4 fits (top-down 2D combat and menus). No new engine.

## Toy proposal *(Claude's pick, for when this becomes the active stage)*
- 3 connected star systems, 1 planet with a shipyard and an outfitter.
- 2 hulls and a handful of parts from 2 species.
- A `T0|▼|` patrol that adapts after each fight, with the readout.
- **Done means:** BAMF69 refits the ship because `T0|▼|` adapted, and wants another fight.

## Open questions
| Question | Why it matters |
|---|---|
| How does the final assault on `T0|▼|` work: one big battle, or a campaign of systems? | The game's ending |
| How much control does the player get over the outer gardens? | Too little feels random; too much is three full games |
| Does temperament still move in this stage, and what does it change if it does? | The 50 % cap applies; the space stage is the last |
| Ending variants: how does the species react to learning the Gardener built `T0|▼|`? | The optional twist in `docs/LORE.md` |
| Connected mode (other players' species) | Needs online play: out of scope until solo works |
