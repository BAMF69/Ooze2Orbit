# ADR 0008: Port ManiaMap's multi-cell room layout into the creature level generator

- Status: accepted
- Date: 2026-11-18

## Context
The creature level generator (docs/CREATURE_LEVELGEN.md) placed every room as one screen with exits only on its
right, and derived the minimap afterwards. The review of 2026-11-18 found that the Medium/Hard "loop" was two
parallel edges between the same two rooms, not a cycle offering a second route. A real cycle needs rooms that span
several map cells with doors on any side and offset, placed so that doors meet and rooms never overlap. BAMF69 chose
"Port with attribution" over writing our own. Constraints: MIT/BSD sources only, no npm dependency, notices kept.

## Options considered
1. **Port ManiaMap (BSD-3-Clause, C#)**: proven room-template/door/configuration-space model and a backtracking
   chain layout. Cons: C# and 3D (z layers, Top/Bottom doors); needs translation, not a copy.
2. **Write our own placement**: no licence work. Cons: re-derives a solved problem; the review asked for reuse.
3. **Edgar (MIT, C#)**: graph-based layout with configuration spaces. Cons: larger, more general than we need.
4. **Do nothing**: keeps the fake loop the review rejected.

## Decision
Option 1. `src/game/creature/levelgen/maniamap.ts` is a 2D TypeScript translation of ManiaMap commit 35f5244
(Cell, Door, DoorType, door/code alignment, RoomTemplate.Intersects and PlaneAlignedDoors, ConfigurationSpace,
Layout, LayoutGenerator AddRoom/InsertRoom with backtracking). Its file header carries the full BSD-3 notice and
lists the changes; THIRD_PARTY_LICENSES.md repeats it for the build. No package is installed.

## Consequences
- Good: rooms can cover several cells, doors can sit on any side of any cell, cycles are closed by inserting a room
  between two placed rooms, and the minimap reads the same placed layout the generator built.
- Bad / costs: we own the translation; upstream fixes do not flow in automatically.
- Revisit if: we need multi-floor shafts (ManiaMap's Top/Bottom doors) or ManiaMap gains something we want.

## Notes
- Source: https://github.com/mpewsey/ManiaMap, LICENSE: BSD 3-Clause, Copyright (c) 2022, Matt Pewsey (**verified**
  from the cloned repository's LICENSE file at 35f5244).
- Tests: tests/creatureManiaMap.test.ts (alignment rules, configuration space, chain placement, cycle insertion).
