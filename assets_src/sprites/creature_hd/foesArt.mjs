// ---------------------------------------------------------------------------
// foesArt.mjs (assets_src/sprites/creature_hd)
// Brief   : The other three Water threats, in the charger's treatment (C-0105 style, built on BAMF69's request
//           2026-11-17 to finish the remaster pass). None has the lineage's single purple eye.
//           REED AMBUSHER: a lanky reed-striped mantis-frog that crouches in cover; folded hook forelimbs, two
//           amber stalk eyes. NEEDLE SWIMMER: a slim gar-like fish with an ivory needle snout and sail fins.
//           CANOPY DROPPER: a violet furry sloth-leech that hangs from the ceiling by a hooked tail and falls.
// Purpose : ambusherSvg / swimmerSvg / dropperSvg(phase, f) for 20-frame sheets on the walker grid:
//           patrol 0-3, tell 4-7, strike 8-11, recover 12-15, down 16-19 (netted or subdued).
// Usage   : imported by bake.mjs. Design box 128; game draws ambusher at 27 px, swimmer and dropper at 32 px,
//           centred on the enemy position like the legacy frames.
// Notes   : Every tell reads without colour (rising, curling, shaking); recover shows dazed eyes and stars.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
import { INK, IVORY, inked, line, cel, limb } from "./creatureArt.mjs";

export const FOE_PHASES = ["patrol", "tell", "strike", "recover", "down"];
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${inner}</svg>`;
const stars = (f, cx, cy) => [0, 1].map(i => { const a = (f / 4 + i / 2) * Math.PI * 2, x = cx + Math.cos(a) * 12, y = cy + Math.sin(a) * 4;
  return inked(`M${x} ${y - 4} L${x + 1.3} ${y - 1.3} L${x + 4} ${y} L${x + 1.3} ${y + 1.3} L${x} ${y + 4} L${x - 1.3} ${y + 1.3} L${x - 4} ${y} L${x - 1.3} ${y - 1.3} Z`, "#ffe08a", `stroke-width="1.6"`); }).join("");
const eyeDot = (x, y, r, state) => state === "down" ? line(`M${x - r} ${y - r} L${x + r} ${y + r} M${x + r} ${y - r} L${x - r} ${y + r}`, INK, 2.4)
  : state === "recover" ? line(`M${x - r} ${y} q${r} -${r} ${r * 2} 0`, INK, 2.4)
  : `<circle cx="${x}" cy="${y}" r="${r}" fill="${state === "tell" || state === "strike" ? "#ff7a3a" : "#ffc24a"}" stroke="${INK}" stroke-width="2.4"/><circle cx="${x + r * 0.3}" cy="${y}" r="${r * 0.4}" fill="${INK}"/>`;
const check = (p) => { if (!FOE_PHASES.includes(p)) throw new Error(`foesArt: unknown phase ${p}`); };

// ---- Reed ambusher ---------------------------------------------------------------------------------------
const REED = { base: "#b0b85a", shade: "#6e7632", light: "#dde39a" }; // straw-olive: never the Shellback's leaf green
export function ambusherSvg(phase, f = 0) {
  check(phase);
  const rise = phase === "tell" ? -10 - [0, 2, 0, 2][f] : phase === "strike" ? -6 : phase === "down" ? 14 : phase === "recover" ? 4 : [0, 1, 0, 1][f];
  const lean = phase === "strike" ? 10 : phase === "recover" ? -6 : 0;
  const reach = phase === "strike" ? 26 + f * 2 : phase === "tell" ? 4 : 0;
  const sq = phase === "down" ? 0.6 : 1;
  // Slim stick-insect torso (a thin diagonal), so the silhouette can never be mistaken for a turtle shell.
  const body = cel(`M34 ${100 + rise} C44 ${86 + rise} 70 ${74 + rise} 90 ${76 + rise} C96 ${80 + rise} 94 ${88 + rise} 86 ${90 + rise} C68 ${94 + rise} 50 ${104 + rise} 34 ${106 + rise} Z`, REED,
    { hi: [62, 84 + rise, 14, 3], inner: [46, 58, 70].map(x => line(`M${x} ${86 + rise - (x - 46) * 0.3} l-2 10`, REED.shade, 2.4)).join("") });
  const head = cel(`M84 ${78 + rise} C92 ${66 + rise} 108 ${66 + rise} 114 ${76 + rise} C116 ${84 + rise} 108 ${90 + rise} 96 ${90 + rise} Z`, REED, { offset: [-2, -3] });
  const stalks = [[96, 1], [104, 0]].map(([x]) => line(`M${x} ${72 + rise} L${x - 2} ${60 + rise}`, REED.shade, 3) + eyeDot(x - 2, 58 + rise, 4, phase)).join("");
  // Hook forelimbs: folded under the chin while hiding, raised for the tell, flung forward in the strike.
  const arm = (dx) => limb([[90 + dx, 88 + rise], [100 + dx + reach * 0.4, (phase === "tell" ? 60 : 96) + rise], [106 + dx + reach, (phase === "tell" ? 52 : 92) + rise]], 6, dx ? REED.shade : REED.base, dx ? null : REED.light) +
    inked(`M${106 + dx + reach} ${(phase === "tell" ? 52 : 92) + rise - 3} q8 0 6 9 q-3 -4 -7 -3 Z`, IVORY.base, `stroke-width="2.2"`);
  // Grasshopper hind legs: knees high above the back, feet planted behind.
  const legs = [[42, 0], [48, 1]].map(([x, near]) => limb([[x, 100 + rise], [x - 8, (phase === "down" ? 96 : 70) + rise * 0.5], [x - 16, 120]], 6, near ? REED.base : REED.shade, near ? REED.light : null)).join("") +
    [[66, 0], [72, 1]].map(([x, near]) => limb([[x, 92 + rise], [x + 2, 106 + rise * 0.4], [x - 2, 120]], 4, near ? REED.base : REED.shade, null)).join("");
  const reeds = phase === "patrol" ? [14, 20, 112, 118].map((x, i) => line(`M${x} 122 Q${x + 2} 96 ${x + (i % 2 ? 4 : -3)} ${74 + i * 3}`, "#5f9a4e", 3)).join("") : "";
  return svg(`<ellipse cx="62" cy="121" rx="40" ry="4" fill="#000" opacity="0.28"/>
    <g transform="translate(0 120) scale(1 ${sq}) translate(0 -120) rotate(${lean} 62 100)">${arm(-6)}${legs}${body}${head}${stalks}${arm(0)}${phase === "recover" ? stars(f, 100, 52 + rise) : ""}</g>${reeds}`);
}

// ---- Needle swimmer --------------------------------------------------------------------------------------
const NEEDLE = { base: "#5fb0c4", shade: "#33768c", light: "#a9e0ea" };
export function swimmerSvg(phase, f = 0) {
  check(phase);
  const wave = phase === "patrol" ? [0, 4, 0, -4][f] : phase === "strike" ? 0 : phase === "tell" ? 10 : 2;
  const flip = phase === "down" ? 180 : phase === "recover" ? 20 : phase === "tell" ? -14 : 0; // tell: rears back before the dart
  const body = cel(`M22 ${64 - wave * 0.4} C40 ${54 - wave} 70 ${54 + wave * 0.3} 92 ${60} C100 ${62} 104 ${66} 100 ${70} C80 ${76 + wave * 0.3} 46 ${76 - wave} 22 ${70 + wave * 0.4} Z`, NEEDLE,
    { hi: [60, 60, 24, 4], inner: `<path d="M26 70 C50 74 78 72 100 68 L100 72 C78 78 50 78 26 74 Z" fill="#e8f4f2"/>` + line("M36 63 L82 61", NEEDLE.shade, 1.6) });
  const needle = inked(`M98 62 L${phase === "strike" ? 128 : 124} 65 L98 70 Z`, IVORY.base, `stroke-width="2.4"`);
  const tail = cel(`M24 66 L6 ${52 + wave} L12 66 L6 ${80 + wave} Z`, NEEDLE, { offset: [-2, -2] });
  const sail = cel(`M48 58 C54 ${42 - (phase === "tell" ? 8 : 0)} 66 ${40 - (phase === "tell" ? 8 : 0)} 72 57 Z`, NEEDLE, { offset: [-2, -2] }) +
    cel("M58 74 C62 84 70 86 74 74 Z", NEEDLE, { offset: [-1, -2] });
  const speed = phase === "strike" ? line("M0 56 L14 56 M2 76 L16 76", "#d6f0f2", 2.4) : "";
  const bubbles = phase === "patrol" ? `<circle cx="${110 + f}" cy="${52 - f * 3}" r="2.5" fill="none" stroke="#bfeaf0" stroke-width="1.5"/>` : "";
  return svg(`${speed}<g transform="rotate(${flip} 64 66)">${tail}${body}${sail}${needle}${eyeDot(90, 63, 3.6, phase)}${phase === "recover" ? stars(f, 80, 44) : ""}</g>${bubbles}`);
}

// ---- Canopy dropper --------------------------------------------------------------------------------------
const FUR = { base: "#9a7ab8", shade: "#5f4680", light: "#c9b2e0" };
export function dropperSvg(phase, f = 0) {
  check(phase);
  const hang = phase === "patrol" || phase === "tell";
  const sway = phase === "patrol" ? [0, 2, 0, -2][f] : phase === "tell" ? [3, -3, 3, -3][f] : 0;
  if (hang) { // upside down from a hooked tail
    const tail = line(`M64 0 Q${66 + sway} 18 ${64 + sway} 36`, INK, 9) + line(`M64 0 Q${66 + sway} 18 ${64 + sway} 36`, FUR.shade, 5);
    const body = cel(`M${40 + sway} 40 C${38 + sway} 64 ${50 + sway} 88 ${64 + sway} 90 C${78 + sway} 88 ${90 + sway} 64 ${88 + sway} 40 C${76 + sway} 32 ${52 + sway} 32 ${40 + sway} 40 Z`, FUR,
      { hi: [54 + sway, 50, 10, 14], inner: [0, 1, 2].map(i => line(`M${48 + sway + i * 10} ${50 + i * 4} l3 6`, FUR.shade, 1.6)).join("") });
    const claws = [[46, 90], [82, 90]].map(([x, y]) => limb([[x + sway, y - 12], [x + sway + (x < 64 ? -8 : 8), y], [x + sway + (x < 64 ? -6 : 6), y + 10]], 6, FUR.base, FUR.light) +
      inked(`M${x + sway + (x < 64 ? -9 : 3)} ${y + 8} l3 8 l3 -8 Z`, IVORY.base, `stroke-width="2"`)).join("");
    const face = eyeDot(56 + sway, 80, 3.6, phase) + eyeDot(72 + sway, 80, 3.6, phase) + line(`M${58 + sway} 70 q6 ${phase === "tell" ? -5 : -2} 12 0`, INK, 2.2);
    const drip = phase === "tell" ? `<circle cx="${64 + sway}" cy="${104 + f * 3}" r="2.5" fill="#c9b2e0" stroke="${INK}" stroke-width="1.5"/>` : "";
    return svg(`${tail}${claws}${body}${face}${drip}`);
  }
  if (phase === "strike") { // falling, limbs spread
    const body = cel("M42 40 C36 60 46 84 64 86 C82 84 92 60 86 40 C74 30 54 30 42 40 Z", FUR, { hi: [56, 50, 10, 12] });
    const limbs = [[44, 50, -1], [84, 50, 1], [48, 78, -1], [80, 78, 1]].map(([x, y, s]) => limb([[x, y], [x + s * 16, y - 6], [x + s * 22, y - 16 + f * 2]], 6, FUR.base, FUR.light)).join("");
    return svg(`${line("M50 4 L50 24 M64 0 L64 22 M78 4 L78 24", "#e6dcf2", 2.4)}${limbs}${body}${eyeDot(56, 64, 3.6, "strike")}${eyeDot(72, 64, 3.6, "strike")}`);
  }
  // recover / down: splatted on the ground, dazed or out
  const sq = phase === "down" ? 0.55 : 0.75;
  const body = cel("M30 118 C30 92 46 80 64 80 C82 80 98 92 98 118 Z", FUR, { hi: [54, 92, 14, 6] });
  const limbs = [[34, -1], [94, 1]].map(([x, s]) => limb([[x, 112], [x + s * 12, 116], [x + s * 18, 120]], 6, FUR.base, null)).join("");
  return svg(`<ellipse cx="64" cy="121" rx="40" ry="4" fill="#000" opacity="0.3"/><g transform="translate(0 120) scale(1 ${sq}) translate(0 -120)">${limbs}${body}${eyeDot(56, 98, 3.6, phase)}${eyeDot(72, 98, 3.6, phase)}</g>${phase === "recover" ? stars(f, 64, 84) : ""}`);
}
