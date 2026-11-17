// ---------------------------------------------------------------------------
// chargerArt.mjs (assets_src/sprites/creature_hd)
// Brief   : WHO: the Bristle charger (docs/CONCEPTS.md C-0105, FINAL v1), a squat mud-boar amphibian that rushes
//           the player. Silhouette: wide hump on four short legs, quill crest, blunt snout disc, curling tusks.
//           Key feature: two small amber eyes (the player's lineage keeps one purple eye: friend vs foe at a glance).
//           PALETTE: ochre-brown hide, tan quills, ivory tusks, ink #0d1a20.
// Purpose : 20 frames on the walker grid: patrol 0-3, tell 4-7, strike 8-11, recover 12-15, down 16-19.
// Usage   : imported by bake.mjs. Design box 128 drawn at 40 px in game (the scene's x1.25 charger size).
// Notes   : Tell must read without colour: head drops, quills stand up, dust kicks. Recover ("OPEN") flattens the
//           quills and shows dazed eyes, so the bite window is visible. Down = lying flat, legs out, X eyes.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
import { INK, IVORY, inked, line, cel, limb } from "./creatureArt.mjs";

export const CHARGER_PHASES = ["patrol", "tell", "strike", "recover", "down"];
const HIDE = { base: "#b77a3e", shade: "#7a4a24", light: "#dcaa6c" };
const QUILL = "#f0d9a0";

/** Frame f (0..3) of a phase as an SVG string, facing right. */
export function chargerSvg(phase, f = 0) {
  if (!CHARGER_PHASES.includes(phase)) throw new Error(`chargerArt: unknown phase ${phase}`);
  const tell = phase === "tell", strike = phase === "strike", recover = phase === "recover", down = phase === "down";
  const bob = phase === "patrol" ? [0, -1, 0, -1][f] : tell ? [0, 0.6, 0, 0.6][f] : 0;
  const tilt = tell ? 8 : strike ? [12, 14, 12, 10][f] : recover ? -3 : 0;
  // Quills: height and lean tell the state at a glance.
  const qh = tell ? 20 + [0, 2, 0, 2][f] : strike ? 9 : recover || down ? 5 : 12;
  const qlean = strike ? -10 : recover ? -9 : tell ? 0 : -6;
  const q = [];
  for (let i = 0; i < 9; i++) {
    const x = 26 + i * 9, y = 66 - Math.sin((i + 1) / 10 * Math.PI) * 10;
    const h = qh + Math.sin(i * 1.7) * 3 + (tell && i % 2 === f % 2 ? 1.5 : 0);
    q.push(inked(`M${x - 4} ${y + 6} L${x - 2 + qlean} ${y - h} L${x + 4} ${y + 4} Z`, QUILL, `stroke-width="3"`));
  }
  const body = cel("M18 98 C16 72 38 58 62 58 C86 58 102 68 108 82 C116 84 122 90 120 98 C112 104 98 104 90 102 C70 106 40 106 18 98 Z", HIDE,
    { hi: [56, 66, 24, 7], inner: `<path d="M24 100 C50 104 80 104 104 98 L104 106 L24 106 Z" fill="#d8b98a"/>` + line("M40 78 L46 76 M54 82 L60 79 M70 80 L76 77", HIDE.shade, 2, `opacity="0.7"`) });
  const jaw = strike ? inked("M106 98 L121 100 L112 106 Z", "#4a1420", `stroke-width="2.5"`) : "";
  const snout = inked("M112 88 C120 86 124 92 121 98 C117 100 112 98 110 94 Z", "#c99a72", `stroke-width="3"`) + `<circle cx="117" cy="92" r="1.6" fill="${INK}"/>`;
  const tusks = inked("M110 98 C116 98 120 92 118 84 C122 90 122 100 112 103 Z", IVORY.base, `stroke-width="3"`) +
    inked("M100 100 C104 100 108 95 107 89 C110 94 110 101 103 104 Z", IVORY.shade, `stroke-width="3"`);
  const eyes = down
    ? [[98, 78], [104, 80]].map(([x, y]) => line(`M${x - 3} ${y - 3} L${x + 3} ${y + 3} M${x + 3} ${y - 3} L${x - 3} ${y + 3}`, INK, 2.4)).join("")
    : recover
      ? [[98, 78], [104, 80]].map(([x, y]) => line(`M${x - 3} ${y} q3 -3 6 0`, INK, 2.4)).join("") // dazed, half-shut
      : [[98, 78], [104, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${tell || strike ? "#ff7a3a" : "#ffc24a"}" stroke="${INK}" stroke-width="2.5"/>`).join("") +
        line(tell || strike ? "M94 72 L104 76" : "M95 74 L103 75", INK, 3);
  // Legs: [x, near]; patrol alternates diagonals, strike stretches front forward and back legs back.
  const swing = phase === "patrol" ? [3, -3, 3, -3][f] : 0;
  const legs = [[34, 0, 1], [86, 0, -1], [44, 1, -1], [96, 1, 1]].map(([x, near, side]) => {
    const dx = strike ? (x > 70 ? 10 : -10) * [1, 1.2, 1, 0.8][f] : tell ? -3 : swing * side;
    const lift = phase === "patrol" && swing * side > 0 ? 2 : 0;
    return limb([[x, 96], [x + 2 + dx * 0.4, 106], [x + dx, 118 - lift]], 12, near ? HIDE.base : HIDE.shade, near ? HIDE.light : null) +
      inked(`M${x - 6 + dx} ${116 - lift} L${x + 7 + dx} ${116 - lift} L${x + 7 + dx} ${121 - lift} L${x - 6 + dx} ${121 - lift} Z`, "#4b2e18", `stroke-width="3"`);
  });
  const dust = tell || strike ? `<g opacity="0.8">${[[20, 116, 5], [12, 112, 4], [8, 118, 3]].map(([x, y, r], i) => `<circle cx="${x - (strike ? f * 3 : 0)}" cy="${y}" r="${r + (tell ? (f + i) % 2 : 0)}" fill="#c9b08a" stroke="${INK}" stroke-width="2"/>`).join("")}</g>` : "";
  const speed = strike ? line("M2 72 L14 72 M0 84 L12 84 M4 96 L14 96", "#e9dcc0", 2.4, `opacity="0.9"`) : "";
  const stars = recover ? [0, 1].map(i => { const a = (f / 4 + i / 2) * Math.PI * 2, x = 100 + Math.cos(a) * 12, y = 62 + Math.sin(a) * 4;
    return inked(`M${x} ${y - 4} L${x + 1.3} ${y - 1.3} L${x + 4} ${y} L${x + 1.3} ${y + 1.3} L${x} ${y + 4} L${x - 1.3} ${y + 1.3} L${x - 4} ${y} L${x - 1.3} ${y - 1.3} Z`, "#ffe08a", `stroke-width="1.6"`); }).join("") : "";
  const shadow = `<ellipse cx="66" cy="121" rx="50" ry="4" fill="#000" opacity="0.3"/>`;
  if (down) { // flattened on its side: body squashed to the ground, legs sticking out toward the viewer's right
    const splay = [[40, 1], [56, 0], [80, 1], [96, 0]].map(([x, near]) => limb([[x, 108], [x + 9, 114], [x + 18, 117]], 10, near ? HIDE.base : HIDE.shade, null)).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${shadow}${splay}
      <g transform="translate(0 120) scale(1 0.62) translate(0 -120) translate(0 ${[0, 0.4, 0, 0.4][f]})">${q.join("")}${body}${snout}${tusks}${eyes}</g></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${shadow}${dust}${speed}
  ${legs.slice(0, 2).join("")}
  <g transform="translate(0 ${bob}) rotate(${tilt} 70 96)">${q.join("")}${body}${jaw}${snout}${tusks}${eyes}${stars}</g>
  ${legs.slice(2).join("")}</svg>`;
}
