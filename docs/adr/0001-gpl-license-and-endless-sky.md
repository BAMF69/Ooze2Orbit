# ADR 0001: License the game GPL-3.0-or-later, so the space stage can adapt Endless Sky

- Status: accepted
- Date: 2026-11-09

## Context
The space stage is designed around Endless Sky's fleet management, ship customization and space combat
(`docs/stages/05-space.md`). Endless Sky's code is GPL-3.0-or-later and its art is under a mix of public domain and
Creative Commons licenses (CC-BY, CC-BY-SA 3.0 and 4.0), listed per file in its `copyright` file. BAMF69 wants to be
able to borrow and copy from it, and says the game is meant to be open source. Until now the repo had no license file,
which legally means "all rights reserved", so no GPL code could be added.

## Options considered
1. **GPL-3.0-or-later**: matches Endless Sky exactly, so its code and data can be adapted with no license conflict;
   the game stays open source. Anyone may reuse Ooze2Orbit's code, but must share their changes under the same terms.
2. **GPL-3.0 only**: also compatible with Endless Sky's code, but locks the game out of future GPL versions.
3. **Do nothing / mechanics only**: keeps every licensing option open, but rules out copying any Endless Sky code,
   data or art, and leaves the repo with no open-source license although BAMF69 wants one.

## Decision
GPL-3.0-or-later, chosen by BAMF69 on 2026-11-09: it is the license Endless Sky itself uses, so anything adapted from
it fits with no conflict, and it makes the game open source as intended.

## Consequences
- Good: the space stage can adapt Endless Sky's code (translated from C++ to TypeScript), data and, file by file, its
  art, saving design and tuning work. The game has a clear open-source license.
- Bad / costs:
  - The whole game is GPL: anyone may copy, change, redistribute or sell it, as long as they share their source under
    the GPL too. This cannot be taken back for versions already released.
  - Code adapted from Endless Sky must say so in its file header (source file, "Endless Sky contributors",
    GPL-3.0-or-later).
  - Endless Sky art and sounds are used only file by file: each one's license checked in its `copyright` file and
    logged in `docs/ASSET_LOG.md` with its credit (`/asset-intake`). CC-BY-SA files keep that license for any changed
    version we make. Each must still fit the game's lit, moody, organic look.
  - Third-party content the game already uses must stay GPL-compatible (Phaser 4 is MIT: compatible).
- What we would need to see to revisit this: a need for a license that keeps the code closed, which would mean
  removing every piece adapted from Endless Sky first.

## Notes
- License text: `LICENSE` is the official GPL v3 text (copied from the system's `/usr/share/common-licenses/GPL-3`,
  which matches GNU's published text; **verified** against Endless Sky's own license text, differing only in an
  updated fsf.org web address).
- Endless Sky licensing: code GPL v3, art public domain or Creative Commons per file (Endless Sky README and its
  `copyright` file; **verified** via its GitHub README and distribution package metadata, 2026-11-09).
- The Claude Code Game Kit files in this repo came with the scaffold; their own license terms were not checked here
  (**unverified**). Check them before the first public release under the GPL.
- Not legal advice.
