# Creature generation prototype

Date: 2026-11-13. Status: implemented prototype; playtest pending.

The redesigned creature stage needs connected exploration and inherited lives rather than the old
world-map level selector. Register a new scene under the existing `creature` stage key, retaining
shared shell actions, original sprite atlases and pure tile-body physics. Keep inheritance, room
graph, climate and save validation engine-free in `creature/generations.ts`.

Generation checkpoints save traits, route progress and selection history independently of an
unfinished life. Export/import includes that checkpoint without changing existing bundle versions;
the new slot is optional and validated. The existing aquatic Continue flow remains unchanged.

Six handmade rooms and deterministic contrasting heirs let this first test expose gating and
inheritance clearly. Weighted random mutations, living ecosystem evolution and final artwork
remain later prototype work. Toy 1 is unregistered but retained until the replacement proves fun.
