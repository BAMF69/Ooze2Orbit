// ---------------------------------------------------------------------------
// stitchedRooms.ts (creature/levelgen)
// Purpose : The two room roles built by the stitcher (CREATURE_LEVELGEN.md §7a step 2): a GALLERY (a lever room
//           2-5 screens wide, Medium and Hard) and, for generated worlds, the UNDERCHANNEL (the level's loop,
//           drain to finale). Picks segments with stitch.ts at the tier's ratings and wraps the result as a Built.
// Usage   : stitchedGallery(ctx) / stitchedChannel(ctx) -> Built | null (null: no sequence fits; the world
//           check then reports "stitch" and the generator retries another seed attempt)
// Notes   : No solution script: stitched rooms are proved by the search solver (tests/creatureStitch.test.ts).
// Authored: Written with Claude (Opus 5.5).
// ---------------------------------------------------------------------------
import type { Built, TemplateContext, Hosting } from "./templates";
import { pickSegments, assemble } from "./stitch";
import { ladderTier } from "./ladder";
import { TILE } from "./geometry";

const TIER_NAME = { easy: "Reed shallows", medium: "Drowned galleries", hard: "Torrent heart" } as const;
const GALLERY_HINT = "A long gallery. Somewhere along it is the sluice lever; pull it and the exit at the far end opens. Explore the upper walkways.";
const CHANNEL_HINT = "Underchannel: a passage beneath the galleries joining the drain chamber to the finale. Climb the ledges under either hatch.";

export function stitchedGallery(ctx: TemplateContext): Built | null {
  const t = ladderTier("water", ctx.tier), n = ctx.node;
  const cells = pickSegments({ kind: "gallery", cells: n.cells ?? 2, ratings: t.segments, control: true, guard: !!n.guard, cache: !!n.cache, current: n.current }, ctx.rng);
  if (!cells) return null;
  const { room, spec } = assemble(cells, { name: `${TIER_NAME[ctx.tier]} ${ctx.index + 1}`, current: n.current, puzzle: "lever", hint: GALLERY_HINT });
  return { room, spec, entries: {}, solution: [] };
}
export function stitchedChannel(ctx: TemplateContext): Built | null {
  const t = ladderTier("water", ctx.tier), span = Math.max(2, ctx.node.span ?? 2);
  const cells = pickSegments({ kind: "channel", cells: span + 1, ratings: [1, t.segments[1]], control: false, guard: false, cache: false }, ctx.rng);
  if (!cells) return null;
  const { room, spec } = assemble(cells, { name: "Underchannel", current: false, puzzle: "channel", hint: CHANNEL_HINT });
  const far = span * 40 + 36, bx = (far + 1) * TILE;
  const hatch = (tiles: [number, number], label: string): Hosting => ({ tiles, probe: [tiles[0] * TILE + 3, (tiles[1] + 1) * TILE - 3], rules: [], label, always: false });
  spec.start = { x: 328, y: 116 };
  return { room, spec, entries: {}, solution: [],
    channel: { near: hatch([19, 21], "↑ DRAIN CHAMBER"), far: hatch([far, far + 1], "↑ FINALE"), nearEntry: { x: 328, y: 116, facing: 1 }, farEntry: { x: bx, y: 116, facing: -1 } } };
}
