# Creature level sketcher

A standalone page for hand-designing creature-stage levels before teaching the generator what works.

Open `index.html` directly in a browser, or run `npm run dev` and visit `/tools/level-sketcher/index.html`.

## Workflow

1. **Minimap**: drag cells to make rooms (one cell = one 640×360 screen), click edges with the Door tool to
   connect them, set each room's role and tier. Checks show loops, dead ends, the critical path, and whether the
   goal reward can be reached and carried home through the painted geometry.
2. **Paint room**: tiles (rock, water, current, ledge, hazard, breakable, sluice gate, door opening) and objects
   (spawn, controls, keyed controls, reward, food, nets, enemies). The reach overlay shades everywhere the
   creature can get to; the door table shows which doors reach which, exposing one-way routes.
3. **Room library**: the five v1 Water templates plus new shapes. Apply a layout to a room of the same size,
   modify it, and save rooms back as layouts.

Work autosaves in the browser's local storage. **Export JSON** is the durable copy: commit level files you want
to keep under `data/levels/` (suggested).

## Coordinates

A screen is 40×15 tiles. Tile `(col, row)` within a screen maps to engine `tx = col`, `ty = row + 5`
(row 0 is the ceiling at ty 5, row 14 the floor at ty 19), matching `waterWorld.ts`.

## Limits

- Reachability is an approximation of `creature/physics.ts`: full jumps at fixed horizontal speeds, no mid-air
  steering, swimming anywhere in water, breach jumps from the surface. It ignores oxygen and enemies.
  Use it for "can I get there at all"; feel still needs a playtest.
- One-way ledges (`=`) do not exist in the engine yet.
- The game does not load sketcher levels yet; that loader is the next step.
