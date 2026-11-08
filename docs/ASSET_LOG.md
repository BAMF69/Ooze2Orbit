# Asset Log

> Every third-party or AI-assisted asset gets a row BEFORE it is used. Use `/asset-intake`.
> Source of truth for credits screens, store disclosures, and license audits.
> Where to find things: `docs/RESOURCES.md` (index into `docs/resources/`).

| ID | Type | File(s) in repo | Source / URL | Author | License | Attribution text (if required) | AI-assisted? | Modified? | Date added | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A-0002 | Sprite atlases v2 (lit microscope style) + upgrade overlays | public/assets/art/player_cell.*, player_upgrades.*, pond_cells.*, pond_props.* | Drawn in code: assets_src/sprites/*.py (+ cellart.py) via tools/art/pixel_sprite.py | Claude (Opus 5.5) for BAMF69 | Project's own | none | dev-only | no | 2026-11-07 | PLACEHOLDER toy art; replaces A-0001's look. player_upgrades are overlay layers: the floor check applies to the composite (checked) |
| A-0004 | Predator atlas (gulper) | public/assets/art/pond_predators.* | Drawn in code: assets_src/sprites/pond_predators.py via tools/art/pixel_sprite.py | Claude (Opus 5.5) for BAMF69 | Project's own | none | dev-only | no | 2026-11-07 | PLACEHOLDER toy art, 64 px cell |
| A-0003 | Sound effects (16 clips: eat, bump, pop, part, upgrade, deny, evolve, choose) | public/assets/audio/sfx/*.wav + .sfx.json recipes | Made in code: assets_src/audio/make_sfx.py (v2: own organic synth, stdlib; v1 used the Wavesmith retro synth) | Claude (Opus 5.5) for BAMF69 | Project's own (no samples, no models) | none | dev-only | no | 2026-11-07 | Ship-safe per Wavesmith; levels in data/audio_events.json |
| A-0001 | Sprite atlases (player cell, pond cells, props) | public/assets/art/player_cell.*, pond_cells.*, pond_props.* | Drawn in code: assets_src/sprites/*.py via tools/art/pixel_sprite.py | Claude (Opus 5.5) for BAMF69 | Project's own | none | dev-only | no | 2026-11-07 | PLACEHOLDER toy art; regenerate with pixel_sprite.py build |

## Rules
- "AI-assisted?" uses one of: `no`, `dev-only` (AI helped, nothing AI-made ships), `pre-generated` (AI output ships in the build), `live` (generated at runtime). Steam's disclosure is built from the `pre-generated` and `live` rows (see SOP-04).
- Unknown license means it does not go in. Prototype-only (NC) assets are tagged `PLACEHOLDER` in Notes and replaced before release.
- Store the license text or a screenshot of the license page next to the asset or in `docs/licenses/`.
- AI-assisted: record tool, date, prompt summary, how much was edited by hand. Needed for store disclosure forms.
- Keep `CREDITS.md` generated from this table (see `/release-check`).
