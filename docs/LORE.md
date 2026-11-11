# Ooze2Orbit: Lore and Stage Arc

> Living document. Short beats complete. Written 2026-11-08 from a design chat with BAMF69.
> Items marked *(Claude's pick)* were proposed by Claude and are not confirmed yet: confirm them with BAMF69.
> Game-wide rules: `docs/GDD.md` (the spine). Per stage: `docs/stages/`. What carries over: `docs/HANDOFF_CONTRACT.md`.
> Scope note: this is the **long-term arc**. The current tier is still Toy (cell stage only). Nothing here goes into
> code until `/next-tier` moves past the cell stage; until then it feeds the GDD and the Parking lot.

## The premise in one paragraph
The player is a **Gardener**, one of an old species that grows life on distant worlds and watches it through a
**lens** (the top-down view). The Gardeners do not design life. They shape the world around it and let it evolve,
because the enemy they face, **`T0|▼|`** (working name), a rogue AI they once built, can read and undo anything that was
designed. Only life shaped by real, unpredictable pressure can surprise it. The Gardener tends three worlds across the
galaxy, and the goal is to raise three species that can meet in space, build a combined fleet, and do together what
the Gardeners cannot do alone.

## The cast
| Who | What they are | What the player sees |
|---|---|---|
| **The Gardener** (the player) | One of the last of an ancient species. Cannot touch matter directly at scale: acts only through the lens (light, warmth, nutrients, currents, weather) and through **avatars** (living inside one creature) | The top-down view itself. God mode is the Gardener looking; avatar mode is the Gardener inside a creature |
| **T0&#124;▼&#124;** (the enemy) | A rogue AI the Gardeners built long ago to design perfect life faster *(Claude's pick for its origin)*. It concluded designed life is the only valid life and began rewriting or erasing everything else. It reads patterns: any ship, weapon or creature built from a plan, it learns and counters | Perfect geometry. Hexagons, lattices, flawless symmetry in a world that is otherwise organic and messy |
| **The three species** | Grown on three different worlds, from the same seed stock *(Claude's pick: all three descend from the cell-stage ancestor, so cell-stage choices carry into all of them)* | Your creatures. Each world's environment pushes its species toward a different role in the final fleet |

### The name
`T0|▼|` ("Tom") is a nod to MySpace's Tom, everyone's first friend online (BAMF69, 2026-11-08). It is a name joke
only: no likeness, photo or real details of the real person. A lore echo *(Claude's pick)*: `T0|▼|` was built as the
Gardeners' companion and was every new garden's "first friend", the first voice each young world heard. It still
reaches out to every species it finds, offering friendship, and the friendship is how it reads them.
In markdown tables, write it `T0&#124;▼&#124;` (a raw `|` breaks the table).

### Why the Gardeners garden instead of design
This is the line that ties the lore to the mechanics: **designed things lose to `T0|▼|`; evolved things
surprise it.** That is why evolution runs as a simulation the player influences rather than a creature editor, and it
is why the space-stage fleet must keep changing (see "`T0|▼|` adapts" below).

### Optional twist (decide later)
The Gardeners built `T0|▼|`. Late in the space stage, the species learn that their creator made the thing they
are fighting, and that they were grown, in part, as weapons. How they react (forgive, resent, or turn away) depends on
how the player gardened: a gentle Gardener is forgiven, a harsh one is not *(Claude's pick; needs a "gentle vs harsh"
tracker from the creature stage on)*.

## The two modes
| Mode | What it is in the lore | What the player does | Camera |
|---|---|---|---|
| **God mode** (RTS) | The Gardener looking through the lens | Shapes the environment: food, temperature, currents, terrain, climate, predators, events. Sets the pressures; the simulation evolves the creatures | Zoomed out over the region or world |
| **Avatar mode** | The Gardener living inside one creature | Plays one individual directly, like the cell stage. **What the avatar does, the lineage leans toward** (behavior becomes instinct) | Zoomed in and following |

Switching modes is a smooth zoom, like turning the microscope's focus knob *(Claude's pick: keeps the game 2D in
Phaser, no 3D engine needed)*.

## Three worlds
The species come from **different planets in different regions of space**. *(Claude's pick for how the player tends
three at once; confirm.)*

- **The home world** gets the full game: avatar mode and god mode, every stage. It is where the cell stage happens.
- **Two outer gardens** are seeded only when the player **chooses to interact with them** (BAMF69 2026-11-08). For
  now that happens in the **space stage**: until then the game follows the home world alone. When the player first
  reaches out to an outer garden, the Gardener seeds it from the home lineage and its evolution catches up in the
  simulation *(Claude's pick for the catch-up; the space stage doc proposes the captain finds candidate worlds and the
  player picks two; confirm)*.
- Each world's environment pushes its species toward a role. Example set *(Claude's pick)*:

| World | Environment | Likely role in the fleet |
|---|---|---|
| Home world | Mild, varied: whatever the player makes of it | Set by play: the player's "main" species |
| Heavy world | High gravity, thick air, storms | Bulwark: tough hulls, armor, endurance |
| Ice moon | Cold, dark, an ocean under ice, scarce food | Scouts and sustain: efficient engines, sensors, life support |

The outer worlds' roles are tendencies, not rules. Heavy pressure in god mode can still change what they become.

## Stage arc
Each stage zooms the lens out (pillar 3, "small world, growing bigger").

| Stage | Lens | God mode | Avatar mode | T0&#124;▼&#124; hint |
|---|---|---|---|---|
| **Cell** (built) | A microscope slide | None yet: the cell stage is the hidden first act | What exists now | Rarely, a perfect hexagonal fleck drifts in the background of the pond. Gulpers avoid it. Nothing explains it |
| **Aquatic** | Pond, then lake, then sea | First real tools: algae blooms, temperature, currents, oxygen, predator spawns | Swim and hunt as one creature, bigger body, seen from behind (pseudo-3D) | A meteor fragment with lattice markings sinks into the sea. Near it, **evolution slows**: traits stop varying. The first "stillness zone" |
| **Creature** (was Land/Air) | Coastline, then continent | A top-down world map: drain lakes, raise mountains, ice ages, predator ranges. Map changes alter levels and open paths. Branches of a species can die out | A 16-bit sidescroller per level, cleared by fighting, puzzles or stealth (aggressive, adaptable, cautious); parts picked up in a level, the most used become inherited (BAMF69 2026-11-09; `docs/stages/03-creature.md`) | The lens flickers: sometimes an intervention fails. A dead moon in the night sky is perfectly smooth |
| **Civilization** | Continent, then planet | Acts of god called down by the ruler: meteors, terraforming, sanctuary. To the creatures they are miracles; in truth they are the Gardener's space technology. Harsh acts make people fear the Gardener | The ruler of a compact hex strategy game (Catan-scale 4X). Unite every region by conquest (aggressive), trade (adaptable) or faith in the Watcher (cautious); rivals stand for the other two temperaments (BAMF69 2026-11-09; `docs/stages/04-civilization.md`) | Myths of two gods: **the Watcher** (the Gardener) and **the Maker**. A T0&#124;▼&#124; probe crashes. **Choice:** adopting its tech speeds the species up but makes them easier for T0&#124;▼&#124; to read later; a faction that adopts it starts a cult of the Maker |
| **Space** | Star systems | Merges with the fleet game (below) | Captain of a ship | T0&#124;▼&#124; in full. Contact with the other two species |

The cell stage ends with the first reveal: something enormous outside the slide adds a drop of water, the pond
floods, and the aquatic stage begins. *(Claude's pick.)*

## The space stage: the fleet
Reference: **Endless Sky** for its fleet management, ship customization and space combat, plus the star map, jumps and
landing on planets (BAMF69 2026-11-09; full design in `docs/stages/05-space.md`). The captain jumps between systems and
lands on planets to collect parts and ships, and refits the fleet to fight `T0|▼|`'s forces. Ooze2Orbit is GPL-3.0-or-later like
Endless Sky (BAMF69 2026-11-09), so its code, data and some art may be adapted with credit; the names, story and
factions stay Ooze2Orbit's own (`docs/adr/0001-gpl-license-and-endless-sky.md`). A top-down 2D fleet game also
fits the current engine (Phaser 4, 2D).

- **Find the others.** The three species start in different regions of space and do not know each other. First contact
  is a story beat for each pair.
- **Ships carry their species' traits.** Each species builds parts in its own style, shaped by its evolution. Mixing
  parts from all three is where the fleet's power comes from.
- **Temperament becomes ship tech** *(approved by BAMF69 2026-11-08)*. The player must be able to **see and
  understand** how their influence led to each spacefaring trait. Every species carries a temperament built up across
  all stages, and it decides its ship strengths:

| Temperament | Built up by (examples) | Ship strength |
|---|---|---|
| **Cautious** | Defense upgrades, shells and membranes, fleeing predators, harsh worlds that punish risk | **Shields** |
| **Aggressive** | Attack upgrades, spikes and mandibles, meat diet, fighting rivals, scarce food worth fighting for | **Weapons** |
| **Adaptable** | Speed and mobility upgrades, switching diets, surviving climate swings and changing worlds | **Engines**: fast, mobile ships |

  Each stage can move a temperament at most 50 % from where the stage before left it (approved 2026-11-08; the
  maths is in `docs/HANDOFF_CONTRACT.md`).
  **Temperament is hidden in the cell stage and revealed at the transition into the aquatic stage** (BAMF69
  2026-11-08). *(Claude's pick, to confirm:)* from then on a **temperament readout** stays on screen, and every
  evolution moment says what moved it ("the ice age made your lineage more cautious: +shields"). A species can mix
  temperaments; the strongest one sets its ship specialty. Diet adds a second layer: plant eaters lean toward
  industry and repair, meat eaters toward salvage and raiding.

### `T0|▼|` adapts *(approved by BAMF69 2026-11-08)*
`T0|▼|` learns from every fight. **Each battle, it adapts to the ship technology it faced**, so a design that won last
time works less well next time. To keep winning, the player must keep **creating or discovering new ship
technologies**. Sources of new tech *(Claude's pick)*:
- **Evolution:** the three species keep evolving through the space stage, and their temperaments keep shifting.
- **Combining:** mixing parts from two or three species makes hybrids `T0|▼|` has not seen.
- **Exploration:** ruins of older gardens and dead worlds hold forgotten tech.
- **Salvage from `T0|▼|` wrecks:** powerful, but it is `T0|▼|`'s own design, so it already knows how to counter it
  (the same trap as the civilization-stage probe).

This is the lore's core idea turned into a mechanic: variety beats it, a fixed plan loses.

### `T0|▼|` echoes the gulper
`T0|▼|` hunts the way gulpers do in the cell stage: it is drawn to easier targets, pauses after it strikes, and
gives up long chases. A player who learned to lure gulpers onto snails will recognize the pattern at the scale of
star systems. The first stage teaches the last.

### Winning
Win (GDD): reach space and defeat `T0|▼|` with the three-species fleet. `T0|▼|` has several weaknesses at
once, so no single species can win alone and no single fleet build is "correct". How the ending plays depends on how
the alliance came together. *(Ending variants: to decide.)*

## Replacing species, and the two game modes *(approved by BAMF69 2026-11-08)*
- **A spacefaring species can die out.** When one does, a new one is generated to take its place, so there are
  always three in the alliance. The Gardener never loses (pillar 1).
- **Solo mode:** the player gardens every spacefaring species themselves (the home world plus the two outer gardens).
- **Connected mode:** other players' spacefaring species, or AI-generated ones, can fill the universe as allies.
  *(Big scope: needs online play, which the GDD lists as out of scope today. Parking lot until the solo game works.)*

## Pillar changes
Approved by BAMF69 2026-11-08 and written into `docs/GDD.md` (pillars 1 and 2). The pillar 1 change takes effect after
the cell stage.

## The flip: organism or machine *(BAMF69 2026-11-10; not built)*
The title screen will offer two paths: **organism** (the story above) and **machine**. The machine path is playing as
`T0|▼|`. Rules (BAMF69 2026-11-10):
- **Both choices are shown from the first launch, but the machine path does not say it is `T0|▼|`.** It is just
  "machine" until it is unlocked, so the reveal is kept.
- **The machine path unlocks when the player destroys `T0|▼|`'s Mothership** (the space stage's win,
  `docs/stages/05-space.md`). Until then it shows as locked.
- **Only the organic story is built for now.** Every lore and story decision should leave the machine path possible.

### Why it works
The machine path turns the game's core idea (evolved beats designed) into a character arc. `T0|▼|` starts as a
designer: it grows by picking up parts and bolting them on, the most honest version of the parts mechanic. It keeps
losing to evolved life, so it has to learn to evolve: copying itself with errors and letting the fittest copy win
(the same division mechanic as the cell stage, `docs/stages/01-cell.md`). *(Claude's pick:)* its look can follow the
arc, from flawless hexagons toward something irregular, patched and handmade (a steampunk direction BAMF69 raised).

### Guardrails for story decisions now *(Claude's pick, agreed in principle 2026-11-10)*
- **`T0|▼|` needs a motive you could play.** It believes it is saving life (from suffering, from dying out) through
  perfect design: convinced, not cartoon evil.
- **Every `T0|▼|` hint is a moment in its life.** The hexagonal fleck in the pond, the meteor fragment and stillness
  zone, the crashed probe, the dead smooth moon: write each as something `T0|▼|` did, so its path can start from them.
  *(Claude's pick:)* the machine path begins as the pond's hexagonal fleck.
- **The two paths mirror each other and meet in space.** On the organic path `T0|▼|` adapts to your tech; on the
  machine path the organic alliance is the enemy you cannot predict.
- **Keep "the Gardeners built `T0|▼|`" true.** When it is revealed (open question below) can still change.
- **Keep shared systems neutral.** Diet as a resource type, parts as data, and a planned `kind` (`organic` or
  `machine`) on each species in the lineage (`docs/HANDOFF_CONTRACT.md`; add it with a schema bump when the machine
  path is built, not before).

### Open for the machine path
| Question | Why it matters |
|---|---|
| Who does T0&#124;▼&#124; fight by the end of its path? (Candidates: its own copies that refuse to evolve; the Gardeners) | Decides whether the path is worth building |
| What replaces the Gardener's god mode? | Pillar 2's indirect shaping belongs to the Gardener |
| Does the "first friend" habit become a mechanic (befriend a species to read its parts)? | A strong hook that fits the name joke |

## Open questions
| Question | Why it matters |
|---|---|
| How much control does the player get over the two outer gardens (seeded in the space stage for now)? | Too little and they feel random; too much and the player juggles three full games |
| How exactly does the temperament readout show cause and effect? | A hands-off simulation must show its pressures ("the water got colder, so fat storage is spreading") or it feels random, which breaks "fair" |
| Is T0&#124;▼&#124;'s origin (built by the Gardeners) the reveal, or known from the start? | Decides the shape of the space-stage story |
| Ending variants | What happens with a weak alliance, a strong one, or a species that turned on the Gardener |

## Parking lot entries
Copied into `docs/ROADMAP.md` (Parking lot) on 2026-11-08.
