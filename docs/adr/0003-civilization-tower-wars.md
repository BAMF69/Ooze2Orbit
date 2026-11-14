# Civilization tower-wars prototype

Date: 2026-11-13. Status: implemented prototype; playtest pending.

The redesigned stage requires real-time mazes, sends, workers and a directly controlled hero.
Keep the `civ` stage key and replace its registered scene, separating an engine-free simulation
from rendering and shell input. Use deterministic breadth-first routes on small grids and validate
construction before spending resources. No engine physics or additional dependency is needed.

Alternatives: extending the old hex scene would mix turn-based region rules with unrelated battle
rules; adopting a navigation library would add a dependency for a tiny grid; doing nothing leaves
the approved tower-wars concept unplayable. Pure rules give the shortest path to testable gameplay.

Consequences: simple simulation/replays and reusable input; worker movement is decorative and
there is no mid-match save. Revisit navigation/budgets if maps or unit counts grow significantly.
Keep the old unregistered scene until playtest approves the replacement. New victory names and
technology identifiers extend stage blocks; space preserves support for older civilization saves.

Verified locally: Phaser 4.2.1 project scenes and existing sprite APIs; no framework change.
