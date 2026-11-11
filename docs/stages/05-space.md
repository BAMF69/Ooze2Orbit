# Stage 5: Space

> Stage design doc. Short beats complete. Game-wide rules (pillars, lore, win and lose, what carries between stages)
> live in the spine, `docs/GDD.md`; this file covers only what is special to the space stage.
> **Active stage, Toy** (2026-11-09). Toy 1 is built: see "Toy 1 as built" below. The rest of this file is the full
> design the later tiers grow into.
> Designed 2026-11-09 (BAMF69), on top of the 2026-11-08 decisions marked *(approved)*. Items marked *(Claude's pick)*
> were chosen by Claude: confirm them with BAMF69.

## Identity
- **Pitch:** Captain a ship, then a fleet. Jump between star systems, land on planets to collect parts and ships,
  refit your fleet, and fight `T0|▼|`'s forces, which learn from every battle.
- **Reference game:** Endless Sky, for its **fleet management, ship customization and space combat** (BAMF69
  2026-11-09), and its star map, jumps between systems and landing on planets.
  - **Copying is allowed** (BAMF69 2026-11-09). Ooze2Orbit is GPL-3.0-or-later, the same license as Endless Sky's code
    (`docs/adr/0001-gpl-license-and-endless-sky.md`), so its code, data and tuning can be adapted when this stage is
    built:
    - **Code:** translated from C++ to TypeScript. Each adapted file says so in its header (the Endless Sky source
      file, "Endless Sky contributors", GPL-3.0-or-later).
    - **Data** (ship and outfit stats, formulas): adapted as a starting point, then retuned for this game.
    - **Art and sounds:** file by file only. Check each one's license in Endless Sky's `copyright` file, log it with
      its credit in `docs/ASSET_LOG.md` (`/asset-intake`), and use it only if it fits the lit, moody, organic look.
    - **Names, story and factions:** stay Ooze2Orbit's own *(Claude's pick)*: the Gardener, `T0|▼|` and the three
      species, not Endless Sky's universe, so the game stays its own.
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
| Victory type | The starting position. Redesigned civ (2026-11-10): enemy base destroyed (aggressive) gives a stronger war fleet; out-earned (cautious) gives more ships and stronger defenses. The built Toy still reads the old conquest / trade / faith types: update it when civilization Toy 2 is built |
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

## Toy 1 as built *(2026-11-09, Claude's picks unless marked; code in `src/game/SpaceScene.ts`, `src/game/space/`)*
Review before building found these gaps in the design above; the Toy answers each the cheapest way:

| Gap | The Toy's answer (numbers in `space/tuning.ts`) |
|---|---|
| How `T0|▼|` adapts | After every battle (won, lost or broken off) it learns each **weapon family** (spines, lances, spores) by its share of the damage you dealt, and each **defence family** (plating, membranes) by its share of your defences. A family you did not use fades. Never past 75 % |
| What "learned" does | A learned weapon family does that much less damage to `T0|▼|`; a learned defence family adds that much less hull or shield |
| Hybrid technology | A ship with weapons and defences from both makers is learned 40 % slower |
| Economy | Destroyed ships drop salvage. Parts cost salvage and **refund in full**, so changing your build is never punished |
| Stakes with one ship | Losing the flagship: the escape pod reaches Hearth without the battle's salvage and a fifth of what was banked. No game over |
| The civilization hand-in | Victory type: conquest = an extra Spine Launcher, trade = more salvage, faith = a Tide Membrane. The first machine built is the technology heritage (one more part). `tookT0Tech` (when a later civ stage writes it) starts every family at 25 %. Harshness marks up the ally's prices |
| Pillar 2 (see your influence) | Your strongest temperament makes Hearth-grown parts 25 % better in its specialty (cautious = defences, aggressive = weapons, adaptable = engines); the ally, a species of a temperament you are not, gets the same in its own |

- **World:** Hearth (home, planet, hangar) - the Driftfield (Shards) - the Lattice (a Lattice and escorts). Patrols grow
  with your wins (since Toy 3b the Driftfield resets to its easiest on every arrival). Jumping away from a fight breaks it off.
- **Ship:** two hulls (Seedpod, Carapace), eight parts: Spine Launcher, Shell Plating, Fin Drive, Sun Gland (Hearth);
  Light Lance, Spore Bloom, Tide Membrane, Burn Drive (the Tidewrights). Space and power must balance.
- **`T0|▼|`'s ships** hunt like gulpers: close in, strike a burst, pause side-on (dimmed: your opening), give up a long
  chase and rest. Off-screen ships show as red arrows on the screen's edge.
- **End of the Toy:** five patrols destroyed. Writes `stages.space` and one cause per way of winning (a ship built
  around weapons leans aggressive, defences cautious, engines adaptable) into the lineage.
- **Cut for the Toy:** fleets and orders, fuel, upkeep, heat, missions and trade, ruins and `T0|▼|` salvage, the outer
  gardens and god mode, engine-family adaptation, the final assault.
- **Nothing from Endless Sky is in the Toy** (no code, data or art): same kind of mechanics only, so ADR 0001's credit
  rules have nothing to cover yet.
- **Watch in the playtest:** rotating three weapons in turn keeps every family low (learn 35 %, fade 15 % per battle).
  If that makes refitting a chore instead of a choice, slow the fade or let `T0|▼|` learn the rotation.

## Toy 2: fleet, turrets, slots *(2026-11-10, asked for by BAMF69 before playing Toy 1)*
- **Slots replace the space number** (BAMF69: "see what slots you have open"). Each hull has gun, turret, defence,
  engine and power slots; a part takes one slot of its type. Power still has to balance. Seedpod 2/1/2/2/2,
  Carapace 4/2/4/2/3.
- **The hangar is icons, not text** (BAMF69, after Endless Sky's ship panel; our own layout and art): the ship drawn
  large with every slot around it, joined by lines; a palette of part and ship icons for what this world sells.
  Click an icon to buy, click a slot to empty it; pointing at an icon says what it is and why it cannot be bought.
- **Weapons that fire on their own:** Needle Turret (Hearth) and Lance Turret (Tidewright) track and fire in any
  direction; Seeker Spore (Tidewright) launches on its own and homes. Guns still need the pilot.
- **A second friendly world, Tidereach** (the Tidewrights). Each world sells only its own species' parts and ships,
  so the other world is worth the jump; any world buys any part back at full price.
- **Allied ships:** recruit up to three escorts (Spineling at Hearth; Skiff and Warden at Tidereach). They fly and
  fight on their own, keep station behind you when it is quiet, and are **lost for good** when destroyed (pillar 1).
  `T0|▼|` goes for the nearest of you, sends one more Shard per escort, and learns the escorts' weapons too.
- **Still cut:** fleet orders, upkeep and fuel, capturing ships, a third species (so one new world, not several).
- **Watch in the playtest:** a Spineling's spines keep `T0|▼|` learning spines even after you drop them yourself.
  That may read as unfair or as an interesting cost of that escort.

## Toy 3: jumps, waves, thrusters, the Mothership *(2026-11-10, BAMF69's notes after playing)*
BAMF69: "jumping between stars feels clumsy and unsatisfying"; "the space stage isn't complete after just 5 wins".
- **Jumping without the map:** `[` and `]` jump to the previous / next system along the map. Every jump is a
  **wormhole** (rings, a spiral, streaking stars; a plain fade with reduce motion on). On the star map, click a
  system to pick it and Enter or a second click jumps there, through every system on the way; a patrol on the way
  stops the trip.
- **Waves:** a hostile system sends its next patrol 12 s after the last one fell (countdown on screen), so you can
  fight on without jumping. Each wave is a battle: `T0|▼|` adapts after each one.
- **E lands from anywhere in a friendly system:** too far from the planet, the autopilot flies you there and lands
  (any flight key cancels it).
- **Thrusters:** S is now reverse thrust (55 % of the main engine), Z and C strafe (50 %), X brakes.
- **The ending** (replaces "five wins"): win **three waves in a row at the Lattice without leaving** and `T0|▼|`'s
  **Mothership** arrives (heavy, slow, launches Shards). Destroying it wins the stage and writes the lineage; the
  player keeps playing afterwards (patrols and Motherships keep coming). Leaving the Lattice, breaking off or
  losing the ship resets the streak.
- **Watch in the playtest:** the Mothership's numbers are untested by hand (the autoplay pilot in a starter Seedpod
  dies to it in seconds, as it should); three waves in a row means two rounds of adaptation without a refit, which is
  the point but may be too much.

## Toy 3b: the Driftfield eases, a sci-fi sound set *(2026-11-10, BAMF69)*
- **The Driftfield starts at its easiest on every arrival:** two Shards, whatever your wins or fleet. Each wave you win
  there makes the next one a Shard bigger (`SPACE.patrol.driftStep`, up to `shardsMax`); jumping away and back, or
  losing your ship, resets it (`Campaign.visitWins`, reset in `travel()`). The star map says "easiest on every
  arrival", and "wave N: it grows while you stay" while you are there. The Lattice keeps its scaling with wins and fleet.
- **Its own sounds** (`assets_src/audio/space_sfx.py`, rendered by `make_sfx.py --only space`; events `sp_*` in
  `data/audio_events.json`): spines clack, lances zap, spores launch with a whoosh, turrets pip; T0 hits ring
  crystalline; your shield shimmers, your hull crunches; ships explode; the Mothership arrives with a swelling drone
  and dies in rolling blasts; the wormhole sweeps up and snaps; engines spool up to launch and down to land; the hangar
  chimes, falls or buzzes; an escort lost sounds a falling alarm; a klaxon warns 3 s before a wave
  (`SPACE.wave.warnS`). The cell stage's sounds are unchanged; levels follow the same sound settings.

## Open questions
| Question | Why it matters |
|---|---|
| How does the final assault on `T0|▼|` work: one big battle, or a campaign of systems? | The game's ending |
| How much control does the player get over the outer gardens? | Too little feels random; too much is three full games |
| Does temperament still move in this stage, and what does it change if it does? | The 50 % cap applies; the space stage is the last |
| Ending variants: how does the species react to learning the Gardener built `T0|▼|`? | The optional twist in `docs/LORE.md` |
| Connected mode (other players' species) | Needs online play: out of scope until solo works |
