# Stage 4: Civilization

> Stage design doc. Short beats complete. Game-wide rules (pillars, lore, win and lose, what carries between stages)
> live in the spine, `docs/GDD.md`; this file covers only what is special to the civilization stage.
> **Active stage, Toy** (2026-11-09). Toy 1 is built; playtest pending. Play it: main menu "Civilization stage
> (prototype)", or beat the Old Horn. Code: `src/game/CivScene.ts`, `src/game/civ/rules.ts`.
> Designed 2026-11-09 (BAMF69). Items marked *(Claude's pick)* were chosen by Claude: confirm them with BAMF69.
> Everything else was decided by BAMF69.

## Identity
- **Pitch:** Your creatures build a civilization and notice the god above them. Play a compact turn-based strategy
  game on a hex map as the ruler, call down the Gardener's technology as acts of god, and unite the planet by
  conquest, trade or faith.
- **Reference games for this stage (mechanics only):**
  - Settlers of Catan: a small hex map where tiles produce resources, trading, quick readable turns.
  - Sid Meier's Civilization and other 4X games: explore, expand, and win by one of several paths. Kept light: no
    long tech trees, no hundreds of turns, no huge maps.
  - Warlock 2: The Exiled: a ruler calling down powerful spells on the map, here acts of god.
  - Nothing beyond the mechanics: no names, factions, art, music or rules text from any of them.
- **Modes** *(agreed 2026-11-09)*:
  - **Avatar mode = the ruler.** The Gardener lives inside the ruler and plays the strategy game directly. The ruler
    may also be a hero piece on the map *(Claude's pick)*.
  - **God mode = acts of god, called down by the ruler.** Meteor strikes, terraforming and more, like spells. To the
    creatures they are miracles; in truth they are the Gardener's space technology, aimed through the lens
    *(BAMF69 2026-11-09)*.
- **Receives:** the creature stage's lineage (`docs/HANDOFF_CONTRACT.md`): temperament, diet, habitat, inherited
  traits, `gardener.harshness`.
- **Hands on:** the `civ` block (victory type, technology heritage, whether the species took `T0|▼|` tech), and the
  temperament after this stage (moved at most 50 % from where the creature stage left it).
- **Played on its own:** starts from a default or generated creature-stage lineage.

## How the pillars apply here
1. **Tense but fair (stakes rise):** whole cities can be lost to rivals, and branches of the species can die out.
   Every threat is readable on the map before it hits (armies on the move, trade dependencies, spreading faith).
   No game over for the Gardener (see open questions for what happens at the edge).
2. **You shape your creature, directly and indirectly:** directly as the ruler (what you build, research and how you
   take regions); indirectly through acts of god and the technology the species keeps (below).
3. **Small world, growing bigger:** the first time the whole planet is the map.

## Three victories, one planet *(agreed 2026-11-09)*
Victory means **every region on the planet is yours**. Each region can be taken by any of three methods, and the
player can mix them (hybrid play is allowed).

| Victory | Temperament | How you take a region | Leads to (space stage) |
|---|---|---|---|
| **Conquest** | Aggressive | Armies capture it | Weapons |
| **Economic supremacy** | Adaptable | Trade makes it depend on you, then you buy it out | Engines |
| **Faith** | Cautious | It converts to the Watcher (the Gardener) and shelters under your protection | Shields |

**The faith path is defensive by design:** spread belief, offer shelter, and hold your holy sites. Neighbors join
because life under your walls is safe. How readily people believe in the Watcher follows `gardener.harshness`: a
gentle Gardener is easy to love, a harsh one is feared.

### Telling which victory it was *(agreed 2026-11-09; the method is Claude's pick)*
Hybrid play must still name the player's primary temperament:
- **The victory is named by the method that took the most regions** (conquest, economic or faith victory). A tie goes
  to the method matching the species' highest temperament.
- **A live tally is always on screen** (regions taken by each method), so the player sees which victory they are
  heading for and can steer it (pillar 2).
- Every region taken writes one cause line ("Took the Salt Coast by trade"), and the 50 % per-stage cap applies.
- The victory type is saved in the lineage and shapes how the space stage begins (below).

## Resources: fixed yields you improve *(agreed 2026-11-09)*
- Each hex tile produces a **fixed, visible yield** every turn (food, materials, trade goods, faith *(examples,
  Claude's pick)*). No dice: the player always knows what is coming, which keeps pillar 1's "fair".
- Yields are **improved** by buildings, machinery and technology.
- Trading between civilizations works like Catan's: swap what you have for what you need. Trade is also how the
  economic victory makes regions depend on you.

## Technology and machinery replace parts *(agreed 2026-11-09)*
Earlier stages collected body parts; here the species **discovers and creates technology and machinery**:
- **Discovered:** found by exploring ruins, gained by trade, or captured.
- **Created:** researched and built.
- Each machine suits one path (siege engines for conquest, trade ships for economy, temples or great walls for faith)
  but can be used creatively.
- **The technology used most becomes the species' technology heritage** for the space stage, the same rule as the
  creature stage's parts becoming inherited traits *(Claude's pick for the carry-over)*.
- **The `T0|▼|` probe:** a probe crashes on the planet. Taking its technology speeds the species up but makes it
  easier for `T0|▼|` to read in the space stage. A faction that adopts it starts a **cult of the Maker**, `T0|▼|`'s
  first real foothold.

## Acts of god *(agreed 2026-11-09)*
Like spells in Warlock 2, the ruler calls down the Gardener's space technology. Examples *(Claude's pick beyond meteor
summoning and terraforming)*:

| Act | What it does | Leans toward |
|---|---|---|
| Meteor summoning | Strikes a region: damages armies and cities | Aggressive; raises `gardener.harshness` |
| Terraforming | Reshapes tiles to raise their yields | Adaptable |
| Sanctuary | Shields a region from attack for a few turns | Cautious |
| Sign in the sky | A miracle over a city that wins converts | Cautious (faith) |

- Acts cost a resource the ruler builds up (favor, from the people's belief *(Claude's pick)*) and recharge, so they
  stay powerful but rare.
- Destructive acts raise `gardener.harshness`; gentle ones lower it. That changes how the planet's people, and later
  the species, see the Gardener.
- Each act writes a cause line, like everything else that moves temperament.

## Rivals *(agreed 2026-11-09)*
- The rivals are **newly generated civilizations that stand for the temperaments the player is not primarily.** A
  mostly cautious species faces an aggressive rival (trying to conquer) and an adaptable rival (trying to buy the
  planet).
- The player's primary temperament is read from the lineage at the start of the stage (the highest of the three).
- Rivals play to win their own way, so each game puts the player's style against the other two.
- If the `T0|▼|` probe's technology is taken by anyone, the cult of the Maker can appear as an extra faction.

## Core loop (first draft, Claude's pick)
```
a turn: collect your tiles' fixed yields -> build, research, improve tiles -> move armies, traders, missionaries
-> trade with rivals -> maybe call down an act of god -> rivals take their turns -> the tally updates
```

| Scale | What the player does | Why they keep going |
|---|---|---|
| Every turn (under a minute) | Spends yields, moves pieces | A region closer to taken |
| Every ~10 minutes | Takes a region; discovers a technology | The tally shifts; new options |
| Whole stage (30 to 60 min) | Unites the planet | The victory type and technology the species carries into space |

## Size *(Claude's pick)*
About 15 to 25 hex regions, the player plus 2 rivals (one per other temperament), plus the Maker cult if it appears.
A 30 to 60 minute game. A full Civilization-sized game would be bigger than all other stages together.

## Look and camera
- A top-down hex map of the whole planet: the lens at its widest yet, still lit and moody.
- Acts of god are the most spectacular effects in the game so far: the Gardener's technology seen from the ground.
- Engine: Phaser 4 fits (a turn-based hex board). No new engine.

## What it hands to the space stage *(Claude's pick, to confirm)*
| From this stage | Shapes the space stage |
|---|---|
| Victory type | How the species enters space: a war fleet (conquest), a trade network and more ships (economic), or strong defenses and loyal allies (faith) |
| Technology heritage | The species' first ship technologies |
| Took `T0|▼|` tech? | Faster start, but `T0|▼|` reads the species more easily |
| `gardener.harshness` | Whether the species welcomes or resents the Gardener when it learns the truth |

## Toy proposal *(Claude's pick, for when this becomes the active stage)*
- A small map of about 7 hexes, the player and 1 rival.
- One way to take a region per temperament, kept simple.
- 2 acts of god (meteor, terraform) and 2 machines.
- **Done means:** BAMF69 wants to play a second game a different way, and can say which victory they were heading for
  from the tally.

## Toy 1 as built (2026-11-09, Claude's picks)
- **Planet:** 9 regions: your capital Hearthhold, the rival's seat (Ironmaw if it is aggressive, Brassport if it trades)
  and 7 free regions, each with a fixed yield (materials, goods or faith), a defense, a price and a belief threshold.
- **Three ways:** an army (3 materials, strength 2, +1 with a siege engine) takes a region if stronger than its
  defense, else wears it down; a trade route (2 goods) adds 1 dependence a turn (+1 with trade ships), then a buy-out
  (goods) takes it; missionaries (2 faith) add 1 belief a turn (+1 with a temple) until it converts. Belief needed
  grows with the Gardener's harshness. Regions someone holds cost 2 more to buy or convert. Reinforce adds 1 defense.
- **Acts of god (favor: +1 a turn, +1 per region taken by faith):** meteor (6) knocks 2 off a region's defense and
  scatters a rival army marching there, harshness +10 %; terraform (4) gives one of your regions +1 yield, -5 %.
- **The rival:** aggressive (announces an army a turn before it strikes, builds a siege engine) unless your lineage
  leans aggressive, then a trader (routes, buy-outs, trade ships). Your capital never falls.
- **On screen:** the tally and "Heading for: ... victory", every blocked action says why, news after each turn.
- **End:** all nine regions yours: the victory (most regions by one method; a tie goes to your strongest
  temperament), the tally, the temperament shift (+3 % per region), harshness, the cause lines. Enter: on to space
  (not built yet: back to the title). Not yet: saving, writing the lineage, the `T0|▼|` probe and the Maker cult, food.

## Open questions
| Question | Why it matters |
|---|---|
| What happens if rivals take all but one of your regions? *(Claude's pick: the capital cannot fall, so there is no elimination)* | Pillar 1: no game over for the Gardener |
| Which resources, exactly? | Sets the economy; fewer is easier to read |
| How do the creature stage's branches show up here? | Their habitat (land, air, sea) could become regions or bonuses |
| How many acts of god, and how are new ones unlocked? | Warlock 2 style spell research vs. a fixed set |
