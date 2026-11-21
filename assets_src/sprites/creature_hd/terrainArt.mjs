// ---------------------------------------------------------------------------
// terrainArt.mjs (assets_src/sprites/creature_hd)
// Brief   : Water-biome rock for the creature stage (docs/CONCEPTS.md C-0106, FINAL v1): mossy cave stone with
//           one ink weight, upper-left light, a lower-right cel band. Materials: floor (rows 19+, green moss),
//           ledge/wall (grey-green stone), ceiling (rows 0-5, dark stone with drips). Far background: flat,
//           dimmed silhouettes only, so nothing in it ever reads as walkable.
// Purpose : tileSvg(material, variant, mask) for the autotile sheet; backgroundSvg() for the far layer.
// Usage   : imported by bake.mjs. Cells are 48 units = one 16 px tile at 3x. Layout in src/game/creature/roomTiles.ts.
// Notes   : mask bits mark EXPOSED sides (neighbour not rock): 1 top, 2 right, 4 bottom, 8 left. Interior tiles
//           must tile seamlessly, so texture marks stay off the borders. Ink 3 units = 1 display px.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
const INK = "#0d1a20";
const MATERIALS = {
  floor: { base: "#3e5a4c", shade: "#2c4237", light: "#557563", moss: "#79a15e", mossLight: "#b9da8e", mark: "#33503f" },
  ledge: { base: "#5a6866", shade: "#3f4b4a", light: "#73827f", moss: "#7d9a78", mossLight: "#c8e3a2", mark: "#4b5856" },
  ceiling: { base: "#33464a", shade: "#243336", light: "#425a5f", moss: "#55705f", mossLight: "#8fb08a", mark: "#2b3c40" },
};
export const TERRAIN_MATERIALS = ["floor", "ledge", "ceiling"];

// Deterministic per-variant scatter so the bake is reproducible.
const rnd = (seed) => () => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) / 16777216; };

export function tileSvg(material, variant, mask) {
  const m = MATERIALS[material];
  if (!m) throw new Error(`terrainArt: unknown material ${material}`);
  const top = mask & 1, right = mask & 2, bottom = mask & 4, left = mask & 8;
  const r = rnd(97 + variant * 31 + TERRAIN_MATERIALS.indexOf(material) * 7);
  let s = `<rect width="48" height="48" fill="${m.base}"/>`;
  // Interior texture: pebbles and cracks kept 6 units off every edge (seamless between interior tiles).
  const quiet = mask === 0 ? 0.35 : 0.7; // interior tiles stay subtle so the repeat does not read as wallpaper
  for (let i = 0; i < 2 + variant; i++) {
    const x = 8 + r() * 32, y = 10 + r() * 28, w = 4 + r() * 5;
    s += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * 0.55}" fill="${m.mark}" opacity="${quiet}"/>`;
    s += `<path d="M${x - w * 0.7} ${y - w * 0.3} q${w * 0.6} ${-w * 0.4} ${w * 1.2} 0" stroke="${m.light}" stroke-width="1.2" fill="none" opacity="${quiet}"/>`;
  }
  if (variant === 1 && mask !== 0) s += `<path d="M14 18 l6 5 l-2 7 l5 6" stroke="${m.shade}" stroke-width="1.6" fill="none"/>`;
  // Cel band on exposed undersides; light rim on exposed left (upper-left light), shade on exposed right.
  if (bottom) s += `<rect y="32" width="48" height="16" fill="${m.shade}"/><path d="M0 32 q12 3 24 0 q12 -3 24 0" fill="${m.base}"/>`;
  if (left) s += `<rect width="5" height="48" fill="${m.light}" opacity="0.8"/>`;
  if (right) s += `<rect x="41" width="7" height="48" fill="${m.shade}" opacity="0.85"/>`;
  if (top && material !== "ceiling") { // moss lip with a few grass blades
    s += `<rect width="48" height="9" fill="${m.moss}"/><path d="M0 9 q6 ${5 + variant} 12 0 q6 5 12 0 q6 ${4 + variant} 12 0 q6 5 12 0" fill="${m.moss}"/>`;
    s += `<path d="M2 4 L22 4" stroke="${m.mossLight}" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>`;
    for (const x of [8 + variant * 6, 30 - variant * 4]) s += `<path d="M${x} 1 l2 -0 M${x} 2 q1 -5 3 -7" stroke="${m.mossLight}" stroke-width="1.6" fill="none"/>`;
  } else if (top) s += `<rect width="48" height="6" fill="${m.light}" opacity="0.6"/>`;
  if (bottom && material === "ceiling") s += `<path d="M${10 + variant * 8} 47 l5 ${-0} l-2.5 ${8}Z" fill="${m.shade}"/>`;
  // Ink only on exposed sides: the outline traces exactly the collision boundary.
  const ink = (d) => `<path d="${d}" stroke="${INK}" stroke-width="3" stroke-linecap="square"/>`;
  if (top) s += ink("M0 1.5 L48 1.5");
  if (bottom) s += ink("M0 46.5 L48 46.5");
  if (left) s += ink("M1.5 0 L1.5 48");
  if (right) s += ink("M46.5 0 L46.5 48");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${s}</svg>`;
}

/** Far background, 640x360 logical (baked at 2x). Flat and dim: no ink, so it never reads as solid ground. */
export function backgroundSvg() {
  let s = `<defs><linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e4049"/><stop offset="1" stop-color="#10262c"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.6"><stop offset="0" stop-color="#2f6a5e" stop-opacity="0.45"/><stop offset="1" stop-color="#2f6a5e" stop-opacity="0"/></radialGradient></defs>
    <rect width="640" height="360" fill="url(#bgG)"/><rect width="640" height="360" fill="url(#glow)"/>`;
  for (let i = 0; i < 9; i++) { const x = i * 76 + (i % 2) * 18; s += `<path d="M${x} 330 C${x + 6} 240 ${x + 2} 170 ${x + 18} 80 L${x + 34} 80 C${x + 30} 170 ${x + 40} 240 ${x + 46} 330 Z" fill="#132e35" opacity="0.9"/>`; }
  for (let i = 0; i < 12; i++) { const x = 20 + i * 54; s += `<ellipse cx="${x}" cy="${150 + (i % 3) * 22}" rx="40" ry="28" fill="#1d4a44" opacity="0.5"/>`; }
  for (let i = 0; i < 14; i++) { const x = 10 + i * 47; s += `<path d="M${x} 80 C${x + 4} 120 ${x - 3} 140 ${x + 2} ${160 + (i % 4) * 14}" stroke="#244c43" stroke-width="3" fill="none" opacity="0.75"/>`; }
  for (let i = 0; i < 40; i++) { const x = (i * 97) % 640, y = 110 + (i * 53) % 170; s += `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.5}" fill="#9fd6c4" opacity="${0.15 + (i % 4) * 0.05}"/>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">${s}</svg>`;
}

/** Overworld backdrop, 640x360 logical at 2x: dusk sky, far hills, flat tree silhouettes (no ink, never solid). */
export function overworldBgSvg() {
  let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d5a63"/><stop offset="0.55" stop-color="#1f4440"/><stop offset="1" stop-color="#132a26"/></linearGradient></defs>
    <rect width="640" height="360" fill="url(#sky)"/><circle cx="470" cy="70" r="26" fill="#e9e3bf" opacity="0.18"/>`;
  s += `<path d="M0 230 C80 180 150 200 220 170 C300 140 360 190 440 160 C520 130 580 170 640 150 L640 360 L0 360 Z" fill="#1a3a37" opacity="0.9"/>`;
  s += `<path d="M0 260 C90 230 170 250 260 220 C350 196 420 240 520 215 C580 200 620 220 640 214 L640 360 L0 360 Z" fill="#163230"/>`;
  for (let i = 0; i < 10; i++) { const x = 8 + i * 66 + (i % 3) * 9; s += `<rect x="${x + 22}" y="${170 + (i % 2) * 8}" width="10" height="150" fill="#122a27"/><ellipse cx="${x + 27}" cy="${168 + (i % 3) * 10}" rx="44" ry="34" fill="#1c3f34"/>`; }
  for (let i = 0; i < 30; i++) { const x = (i * 83) % 640, y = 40 + (i * 37) % 120; s += `<circle cx="${x}" cy="${y}" r="${0.8 + (i % 3) * 0.4}" fill="#e6f2d8" opacity="${0.12 + (i % 4) * 0.05}"/>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">${s}</svg>`;
}
