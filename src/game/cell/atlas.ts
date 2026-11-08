// ---------------------------------------------------------------------------
// atlas.ts
// Purpose : Turns the JSON layout that tools/art/pixel_sprite.py writes next to each atlas into frame numbers,
//           so the game looks sprites up by name ("form2" / "s1h0m1") instead of hard-coded row indexes.
// Usage   : const first = firstFrame(layout, "swim", "prickle")   // throws if the row does not exist
// Notes   : Pure (no Phaser), tested in tests/cellAtlas.test.ts. A missing row means the sprite file and the
//           game disagree: fail loudly rather than show the wrong creature.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------

export interface AtlasLayout {
  cell: number;
  columns: number;
  rows: { index: number; pose: string; direction: string; frames: number; first_frame: number }[];
}

/** The atlas's first frame number for (pose, direction). */
export function firstFrame(layout: AtlasLayout, pose: string, direction: string): number {
  const row = layout.rows.find((r) => r.pose === pose && r.direction === direction);
  if (!row) throw new Error(`atlas has no row ${pose}/${direction} (rebuild it with tools/art/pixel_sprite.py)`);
  return row.first_frame;
}

/** Every row as an animation spec: a key and its frame range. */
export function animSpecs(prefix: string, layout: AtlasLayout): { key: string; start: number; end: number }[] {
  return layout.rows.map((r) => ({
    key: animKey(prefix, r.pose, r.direction),
    start: r.first_frame,
    end: r.first_frame + r.frames - 1,
  }));
}

export function animKey(prefix: string, pose: string, direction: string): string {
  return `${prefix}:${pose}:${direction}`;
}
