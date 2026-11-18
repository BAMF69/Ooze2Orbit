# Handoff prompt: creature stage illustrated HD remaster

> Paste everything below the line into the new agent's first message. Written 2026-11-17 by the levelgen chat.

---

You are starting the **illustrated HD remaster of the creature stage** of Ooze2Orbit. Your first deliverable is a
**small slice of concept renders for BAMF69's approval**. Do not integrate art into the game, replace sprite
sheets or change code until BAMF69 approves the concepts in this chat.

## The project in one paragraph

Ooze2Orbit is a web game (Phaser 4.2.1, TypeScript, Vite) that follows one lineage through five stages: cell,
aquatic, creature, civilization and space. The player controls the organism and also acts as the Gardener,
shaping the environment. Each stage ends by choosing a daughter, and traits carry forward through a lineage file
(`docs/HANDOFF_CONTRACT.md`). Two layers describe every lineage and must never be merged: **diet** (herbivore,
carnivore, omnivore) and **temperament**, three shares totaling 100 % (cautious, aggressive, adaptable). The
creature stage is a side-view roguelike metroidvania: explore an overworld from a nest, enter Water levels, find
adaptations, carry them home alive, and pick a daughter who inherits them.

## Repository, branches and who owns what

- Repository: https://github.com/BAMF69/Ooze2Orbit
- Base your work on **`origin/feat/creature-levelgen`**. It contains the active creature scene, the generated
  Water levels and the newest HUD (an equipment icon rack in the top right). Verify the remote first.
- Create your own branch, **`feat/creature-hd`**, in your own worktree or clone. Use a dev server port other than
  5184 (creature chat) and 5186 (levelgen chat), for example **5188**.
- **The levelgen chat keeps developing level generation in parallel.** It owns `src/game/creature/levelgen/`,
  room geometry, collision, objectives, encounters placement and `CreatureGenerationScene.ts` gameplay logic.
  Do not change collision, room layouts, spawn positions or generator data. Art must fit the existing geometry.
  If you need a shared-interface change (for example a new avatar data field, or a renderer hook in the scene),
  describe it in this chat first so it can be coordinated.
- Do not change other stages, `src/core/`, `src/shell/`, the lineage contract or dependencies without asking.
- **Do not commit, push or merge unless BAMF69 explicitly asks in this chat.** When asked, commit as BAMF69 with
  the repository's no-reply identity `BAMF69 <26580409+BAMF69@users.noreply.github.com>`.

## Read first

1. `CLAUDE.md` (working style, command wrapper, guardrails, definition of done).
2. `docs/HD_REMASTER.md`: the approved illustrated direction and everything learned remastering the cell stage.
3. `docs/GDD.md` (spine) and `docs/stages/03-creature.md` (creature stage design).
4. `docs/stages/02-aquatic.md`, section **"The body's look"** and **"The shark look"**: how aquatic bodies change.
5. `docs/CREATURE_WATER_SLICE.md` and `docs/CREATURE_LEVELGEN.md` §10: what the creature stage plays like now.
6. `docs/ASSET_LOG.md` (entries A-0020 to A-0022) and `docs/CONCEPTS.md` (concept board rules).
7. Code: `src/game/creature/avatarAssets.ts`, `src/game/creature/waterView.ts`, `src/game/creature/overworldView.ts`,
   `src/game/creature/creatureIcons.ts`, `src/game/aquatic/creature.ts` (`lookScores`, `bodyLook`),
   `assets_src/sprites/aquatic_swimmer.py`, `aquatic_partlayers.py`, `aquatic_shark.py`.

Use the project wrapper and inspect `-h` instead of guessing: `python tools/dev.py check | test | smoke`.
Git LFS stores the PNGs; run `git lfs pull` or images arrive as pointer files and the game shows a load error.

## The art style to match

BAMF69 approved this direction on 2026-11-13 and it already ships in the cell stage:

- **Smooth illustrated biological creatures** with **bold dark ink outlines**, **clear cel-shadow bands** and
  **restrained hand-painted texture**. The user's reference was the inked cel shading of Borderlands; use the
  treatment only. Every organism, environment and interface element is original to Ooze2Orbit.
- **Upper-left lighting**, one consistent ink weight, and the existing palette.
- Look at the shipped references before drawing anything: `public/assets/art/cell_illustrated_v1.png`,
  `cell_fauna_v1.png`, `cell_props_v1.png`, `pond_illustrated_v1.png`, `start_illustrated_v1.png` and the
  inked SVG icons in `src/game/uiIcons.ts`.
- **Diet colors:** green herbivore, red carnivore, blue omnivore. **Temperament colors** in the interface: red
  aggressive, green cautious, blue adaptable. Keep diet and temperament readable separately.
- **Readability first.** The world renders on a 640×360 logical canvas with 16 px tiles. The player's collision
  body is 14×18 px, and the current walker sprite is drawn at 32×32. Concepts must read at actual gameplay
  size on a PC and on an iPhone 13 mini in portrait and landscape. Silhouette and the worn traits must be clear
  without tiny details. Respect Reduced Motion in anything animated.

## The starting creature avatar: "Form 5" of the aquatic lineage

The aquatic stage has **four forms**, and each body takes the look of its strongest temperament:

- **Aggressive: shark family.** Ochre fish → taller dorsal fin → grey countershading and teeth → a slate-grey
  shark with a crescent tail and gill slits.
- **Cautious: armoured family.** Bronze body, plates, a spiny ridge, then flank spines.
- **Adaptable: streamlined family.** Teal-violet body, long flowing fins, an iridescent stripe, tail streamers.

Aquatic parts are also worn on the body: fins, jaws, plates, gills, a red endurance muscle band and a golden
torrent tail.

**The creature stage's starting avatar should read as Form 5 of that same lineage:** the first body to leave
the water and walk. A player who ended aquatic as a slate shark should recognise their shark lineage on land, now
with legs. A cautious lineage should arrive armoured and bronze, and an adaptable one streamlined and teal-violet
with its fins becoming limbs. Diet color must still be readable on top of the family look.

The avatar also has to show what the creature stage adds, because the player must always see what they have:

- **Story adaptations:** gills and swimming fins (from Water Easy), climbing claws (an older trait).
- **Class skill**, granted by the dominant temperament: **Roar** (aggressive), **Burrow** (cautious),
  **Tool use** (adaptable).
- **Fun parts** from grotto vaults, starting with **full armor plating** and **ice breath**. Their abilities are
  not built yet, but they will be worn.
- Strength and vitality currently scale the body slightly. Future stats are agility, intellect and armor; plan
  for them but do not draw them yet.

## First deliverable: a concept slice for approval

Produce a small set of concept renders, then stop and ask BAMF69 to approve, adjust or reject each one.
Recommended slice:

1. **Three starting avatars, one per temperament family**, each in one diet color: shark, armoured,
   streamlined. Show each beside its aquatic Form 4 so the "Form 5" relationship is obvious.
2. **One diet variation sheet** for a single family, in green, red and blue.
3. **One avatar with worn traits**: gills, fins, the class skill marker and one fun part. This shows how
   equipment layers read at gameplay size.
4. **One pose strip** of the core poses at gameplay scale: idle, walk, jump, bite and crouch/hide. The current
   sheet uses four frames per pose; concepts may show one key frame each.
5. **One enemy** in the same treatment, for example the bristle charger, at gameplay size beside the player.
6. **One Water room mock-up** at 640×360 using an existing room's real geometry. Terrain, water, a sluice lever,
   the net frame and reeds must stay readable, and must not change collision.
7. **The HUD icon rack** restyled to match (gills, fins, claws, Roar, Burrow, Tool use, full armor, ice breath).

For each concept:
- Log it in `docs/CONCEPTS.md` with an ID, the tool and prompt, and what changed between versions.
- Record a drift check against the cell art: palette, ink weight, lighting and proportions.
- Keep concept images out of the shipped asset tree, under `docs/concepts/`.
- Show one image at gameplay size and one enlarged.

Use the image tool you have. Log provenance in `docs/ASSET_LOG.md` before anything enters `public/`. Never
include franchise characters, art or reference images in an asset.

## After approval, not before

Only when BAMF69 approves the concepts, propose a build plan in this chat. It should cover:
- **Sheet formats.** Keep or extend the existing frame contract in `avatarAssets.ts`, including its
  full-sheet validation and direct image loading. These fixed real missing-texture bugs, so do not regress them.
- **Avatar data.** How the avatar's family, diet and worn traits are chosen from the lineage. This is likely a
  small pure function reading temperament, diet and aquatic parts; coordinate any new field with the levelgen chat.
- **Rendering.** How world rendering, enemies, rooms and overworld art are replaced in passes, with captures at
  each milestone.
- **Tests.** Wrapper `check`, `test` and `smoke`, plus visual inspection on desktop and phone sizes.

Distinguish "renders correctly", "tested in the browser" and "approved by BAMF69". Do not claim one proves
another.
