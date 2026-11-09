// ---------------------------------------------------------------------------
// worldMap.ts (creature)
// Purpose : The world map, the creature stage's god mode (docs/stages/03-creature.md): a few places joined by
//           paths, and the Gardener's one change in Toy 1, draining (or refilling) the lake, which changes the
//           Fernwood level's lake crossing. Paths open as levels are cleared.
// Usage   : const m = newMap(); canEnter(m, "fernwood"); m = clearLevel(m, "fernwood"); m = toggleLake(m)
// Notes   : Pure, tested in tests/creatureWays.test.ts. Positions are map pixels (640 x 360 screen).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

export interface MapNode { id: string; name: string; x: number; y: number; level: boolean; built: boolean }

export interface WorldMap {
  nodes: MapNode[];
  paths: [string, string][];
  cleared: string[];
  drained: boolean;
  harshness: number; // how violent the Gardener's changes were (gardener.harshness; docs/HANDOFF_CONTRACT.md)
}

export function newMap(): WorldMap {
  return {
    nodes: [
      { id: "tidepools", name: "Tidepools", x: 90, y: 285, level: false, built: true },
      { id: "fernwood", name: "Fernwood", x: 215, y: 205, level: true, built: true },
      { id: "mirefen", name: "Mirefen", x: 440, y: 285, level: true, built: true },
      { id: "ridge", name: "The Ridge", x: 500, y: 140, level: true, built: true },
      { id: "den", name: "The Old Horn's Den", x: 555, y: 72, level: true, built: true },
    ],
    paths: [["tidepools", "fernwood"], ["fernwood", "mirefen"], ["mirefen", "ridge"], ["ridge", "den"]],
    cleared: ["tidepools"],
    drained: false,
    harshness: 0,
  };
}

/**
 * A place is open when the place before it (paths run from -> to) is cleared, or it is cleared itself. One way only:
 * you never reach a level without beating the one before it (BAMF69 2026-11-09).
 */
export function isOpen(m: WorldMap, id: string): boolean {
  if (m.cleared.includes(id)) return true;
  return m.paths.some(([a, b]) => b === id && m.cleared.includes(a));
}

/** The index of the farthest place you can reach along the chain (the map's cursor stops there). */
export function farthestOpen(m: WorldMap): number {
  let last = 0;
  m.nodes.forEach((n, i) => { if (isOpen(m, n.id)) last = i; });
  return last;
}

export function canEnter(m: WorldMap, id: string): boolean {
  const n = m.nodes.find((x) => x.id === id);
  return !!n && n.level && n.built && isOpen(m, id);
}

export function clearLevel(m: WorldMap, id: string): WorldMap {
  return m.cleared.includes(id) ? m : { ...m, cleared: [...m.cleared, id] };
}

/** Drain or refill the lake. Draining is a violent change: it nudges harshness up; refilling nudges it back a little. */
export function toggleLake(m: WorldMap): WorldMap {
  const drained = !m.drained;
  return { ...m, drained, harshness: Math.max(0, Math.min(1, m.harshness + (drained ? 0.1 : -0.05))) };
}

/** What the change does, for the map's message (pillar 2: every change says why). */
export function lakeLine(m: WorldMap): string {
  return m.drained
    ? "You drained the lake. Every crossing is dry now: a mud basin where a brute sleeps, instead of the root ledge."
    : "The lake is full. You cross the water on a bridge, or creep the root ledge under the thorns.";
}
