// ---------------------------------------------------------------------------
// creatures.mjs (docs/concepts/creature-hd/src)
// Purpose : Hand-authored, parametric SVG for the creature-stage HD concept slice (C-0101..C-0107).
//           One function draws a "Form 5" walker for any family x diet x pose x worn traits, so the
//           diet sheet, pose strip and trait ladder share exactly one ink weight, palette and light.
// Usage   : import { creatureSvg, chargerSvg, PALETTES } ; build_concepts.mjs composes the boards.
// Notes   : CONCEPT ONLY. Not imported by the game. Design box is 128x128 = 4x the 32 px gameplay frame,
//           so a 4 px ink stroke lands as a 1 px outline at gameplay size. Light comes from the upper left:
//           every body is drawn in its shade colour, then re-filled offset up-left, leaving a lower-right
//           cel band. Ground line y=120. Facing right, like the current walker sheet.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------

export const INK = "#0d1a20";
const W = 4; // ink width in design units (= 1 px at 32 px)
let uid = 0;
const id = (p) => `${p}${++uid}`;

// Diet palettes. Bodies follow the shipped cell/aquatic body art (green / coral / gold-teal); "omniBlue"
// is the brief's blue omnivore, shown as an alternative because the shipped aquatic omnivore is gold-teal.
export const PALETTES = {
  herbivore: { base: "#86c84a", shade: "#4c8a2e", light: "#c8ee8a", accent: "#2f7a3a", fin: "#a9de6a", mark: "#3f8a34" },
  carnivore: { base: "#e4614c", shade: "#a63a33", light: "#f8a487", accent: "#7a2226", fin: "#f1907a", mark: "#9a2f2c" },
  omnivore: { base: "#e2b048", shade: "#a6752a", light: "#f7dc8f", accent: "#3fa79c", fin: "#6cc7bb", mark: "#3a9a8f" },
  omniBlue: { base: "#5b9fd8", shade: "#2e6aa3", light: "#a9d5f4", accent: "#e2b048", fin: "#f0cd7a", mark: "#2a5f96" },
};
const BELLY = { base: "#f2e3bf", shade: "#c9ae84" };
const IVORY = { base: "#efe5c4", shade: "#b9a67c" };
const EYE = { white: "#f6eedc", iris: "#a24fc2", irisDark: "#5e2475", pupil: "#22091f" };

// ---- drawing helpers -------------------------------------------------------------------------------
// `extra` may carry its own stroke-width (thinner ink on small parts); only then is the default omitted.
const inked = (d, fill, extra = "") =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" ${extra.includes("stroke-width") ? "" : `stroke-width="${W}"`} stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const line = (d, color = INK, w = 2.5, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

/** Cel-shaded shape: shade fill, base fill offset up-left (leaves a lower-right band), optional highlight. */
function cel(d, pal, opt = {}) {
  const c = id("c"), [dx, dy] = opt.offset ?? [-5, -7];
  const hi = opt.hi ? `<ellipse cx="${opt.hi[0]}" cy="${opt.hi[1]}" rx="${opt.hi[2]}" ry="${opt.hi[3]}" fill="${pal.light}" opacity="0.9"/>` : "";
  return `<clipPath id="${c}"><path d="${d}"/></clipPath>
  <path d="${d}" fill="${pal.shade}"/>
  <g clip-path="url(#${c})"><path d="${d}" transform="translate(${dx},${dy})" fill="${pal.base}"/>${hi}${opt.inner ?? ""}</g>
  <path d="${d}" fill="none" stroke="${INK}" stroke-width="${W}" stroke-linejoin="round"/>`;
}

/** A limb as a thick inked stroke: ink underlay, colour on top, a thin light rim on the upper-left side. */
function limb(pts, width, color, rim) {
  const [h, k, f] = pts, wt = width * 1.3, ws = width * 0.85;
  const up = `M${h[0]} ${h[1]} L${k[0]} ${k[1]}`, dn = `M${k[0]} ${k[1]} L${f[0]} ${f[1] - 2}`;
  return line(up, INK, wt + 2 * W) + line(dn, INK, ws + 2 * W) + line(up, color, wt) + line(dn, color, ws) +
    (rim ? line(up, rim, Math.max(1.5, wt * 0.25), `transform="translate(-1.5,-1.2)" opacity="0.8"`) : "");
}

/** Two-bone IK: knee from hip, foot, lengths; bend +1 pushes the knee forward (+x), -1 backward. */
function ik(h, f, l1, l2, bend) {
  let dx = f[0] - h[0], dy = f[1] - h[1], d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.5;
  if (d > max) { f = [h[0] + dx / d * max, h[1] + dy / d * max]; dx = f[0] - h[0]; dy = f[1] - h[1]; d = max; }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const t = Math.atan2(dy, dx), s = bend > 0 ? -1 : 1; // screen y down: -a swings the knee toward +x for a downward leg
  return { knee: [h[0] + l1 * Math.cos(t + s * a), h[1] + l1 * Math.sin(t + s * a)], foot: f };
}

/** Webbed three-toe foot at f, pointing right. claws: ivory hooks; spade: broad digging claws. */
function foot(f, color, size = 1, opt = {}) {
  const [x, y] = f, k = size;
  let s = inked(`M${x - 4 * k} ${y - 4 * k} Q${x + 3 * k} ${y - 7 * k} ${x + 10 * k} ${y - 1 * k} L${x + 10 * k} ${y + 1.5 * k} L${x - 5 * k} ${y + 1.5 * k} Z`, color);
  s += line(`M${x + 1 * k} ${y - 3 * k} L${x + 3 * k} ${y + 1 * k} M${x + 5 * k} ${y - 3 * k} L${x + 7 * k} ${y + 1 * k}`, INK, 1.6);
  if (opt.claws) for (const cx of [x + 5 * k, x + 10 * k])
    s += inked(`M${cx - 4} ${y - 5} Q${cx + 9} ${y - 8} ${cx + 10} ${y + 4} Q${cx + 2} ${y - 1} ${cx - 3} ${y + 1} Z`, IVORY.base, `stroke-width="2.6"`);
  if (opt.spade) s += inked(`M${x + 6 * k} ${y - 6} L${x + 16 * k} ${y - 4} L${x + 15 * k} ${y + 2} L${x + 6 * k} ${y + 2} Z`, IVORY.base, `stroke-width="3"`) +
    line(`M${x + 9 * k} ${y - 4} L${x + 9 * k} ${y + 1} M${x + 12 * k} ${y - 4} L${x + 12 * k} ${y + 1}`, IVORY.shade, 1.6);
  return s;
}

function eye(cx, cy, r, lid = 0) {
  let s = inked(`M${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} Z`, EYE.white, `stroke-width="3"`);
  s += `<circle cx="${cx + r * 0.18}" cy="${cy + r * 0.05}" r="${r * 0.66}" fill="${EYE.iris}"/>`;
  s += `<path d="M${cx + r * 0.18 - r * 0.66} ${cy + r * 0.05} A${r * 0.66} ${r * 0.66} 0 0 0 ${cx + r * 0.18 + r * 0.66} ${cy + r * 0.05} Z" fill="${EYE.irisDark}"/>`;
  s += `<circle cx="${cx + r * 0.25}" cy="${cy + r * 0.05}" r="${r * 0.3}" fill="${EYE.pupil}"/>`;
  s += `<circle cx="${cx - r * 0.12}" cy="${cy - r * 0.3}" r="${r * 0.2}" fill="#fff"/>`;
  if (lid > 0) s += inked(`M${cx - r - 1} ${cy - r * (1 - 2 * lid)} Q${cx} ${cy - r - 3} ${cx + r + 1} ${cy - r * (1 - 2 * lid)} L${cx + r + 1} ${cy - r - 2} L${cx - r - 1} ${cy - r - 2} Z`, "var(--lid)", `stroke-width="3"`);
  return s;
}

// ---- poses: foot targets relative to hips (dx, ground or air), body lift and tilt ------------------
// Each leg: [dx from hip, y target]. Order: backFar, frontFar, backNear, frontNear. Ground is y=120.
export const POSES = {
  idle: { lift: 0, tilt: 0, jaw: 0, lid: 0, feet: [[-3, 120], [3, 120], [2, 120], [-1, 120]] },
  walk: { lift: -1, tilt: 0, jaw: 0, lid: 0, feet: [[12, 120], [-12, 117], [-15, 117], [15, 120]] },
  jump: { lift: 14, tilt: -14, jaw: 0, lid: 0, air: true, feet: [[-16, 110], [12, 100], [-18, 112], [16, 98]] },
  bite: { lift: 2, tilt: 7, jaw: 1, lid: 0, lunge: 6, feet: [[-10, 120], [10, 120], [-14, 120], [14, 120]] },
  crouch: { lift: -14, tilt: 3, jaw: 0, lid: 0.5, squash: 0.86, feet: [[10, 120], [12, 120], [12, 120], [16, 120]] },
};

// ---- the three families ----------------------------------------------------------------------------
// Each family returns body parts in neutral coordinates plus anchors used by poses and worn traits.
const FAMILIES = {
  // Aggressive: the coral shark-limbed Form 4 stands up. Wedge head, tall dorsal, crescent tail, gill slits.
  aggressive: {
    name: "Ridgejaw (shark line)",
    hips: { back: [46, 90], front: [84, 88] }, leg: { l1: 17, l2: 16, wBack: 10, wFront: 10, foot: 1.3, bendBack: 1, bendFront: -1 },
    pivot: [64, 88], neck: [88, 72], mouth: [117, 75], head: [102, 56], back: [[44, 64], [60, 59], [76, 57]], chest: [90, 84],
    draw(p, pose) {
      const jaw = pose.jaw;
      const tail = cel("M36 74 C24 70 16 66 10 62 L12 70 C20 76 28 82 36 88 Z", p);
      const fin = cel("M15 67 C9 58 6 50 2 41 C12 47 19 57 21 66 C19 75 12 85 4 94 C9 84 11 75 15 67 Z", p, { offset: [-3, -4] });
      const dorsal = cel("M52 62 C57 50 61 40 58 28 C68 39 77 51 81 59 Z", p, { offset: [-3, -5] });
      // Form 4's serrated back crest continues fore and aft of the shark dorsal.
      const spines = [[36, 70], [42, 65], [48, 62], [80, 58], [86, 56], [92, 54]]
        .map(([x, y]) => inked(`M${x - 3} ${y + 3} L${x + 1} ${y - 8} L${x + 4} ${y + 2} Z`, p.base, `stroke-width="2.6"`)).join("") +
        line("M60 34 L62 56 M65 40 L68 57 M70 47 L73 58", p.shade, 1.6) + line("M8 52 L16 66 M6 84 L15 70", p.shade, 1.6);
      const torso = "M30 79 C36 64 52 58 70 58 C82 57 92 52 102 54 C110 56 117 62 119 71 C112 74 104 75 96 76 C92 84 84 90 74 92 C64 95 48 95 38 92 C32 90 29 86 30 79 Z";
      const body = cel(torso, p, { hi: [66, 64, 22, 6], inner: line("M44 86 L50 84 M56 88 L62 86 M68 87 L73 84", p.shade, 2, `opacity="0.7"`) +
        `<path d="M40 92 C54 97 72 95 88 88 C80 86 60 90 38 88 Z" fill="${BELLY.base}"/>` });
      const jawD = "M96 76 C104 76 112 75 117 74 C115 82 105 86 94 84 Z";
      const lower = `<g transform="rotate(${jaw * 40} 96 77)">${inked(jawD, BELLY.base)}${[100, 106, 111].map(x => inked(`M${x} 76 L${x + 2} 71 L${x + 4} 76 Z`, IVORY.base, `stroke-width="2"`)).join("")}</g>`;
      const mouthIn = jaw ? inked("M95 76 L119 72 L110 92 Z", "#4a1420", `stroke-width="2.5"`) : "";
      const teeth = [101, 107, 112].map(x => inked(`M${x} 74 L${x + 2} 79 L${x + 4} 74 Z`, IVORY.base, `stroke-width="2"`)).join("");
      const gills = line("M85 66 Q83 72 85 78 M90 65 Q88 71 90 77", INK, 2.6);
      return { back: tail + fin + dorsal + spines, body: body + gills, head: mouthIn + lower + teeth + eye(101, 62, 6.5, pose.lid) };
    },
  },
  // Cautious: the leaf-shell turtle Form 4 on stout legs. Domed banded shell, hooded head, short leaf tail.
  cautious: {
    name: "Shellback (armoured line)",
    hips: { back: [40, 94], front: [86, 94] }, leg: { l1: 14, l2: 14, wBack: 10, wFront: 10, foot: 1.25, bendBack: 1, bendFront: -1 },
    pivot: [64, 90], neck: [94, 78], mouth: [119, 81], head: [106, 70], back: [[38, 62], [64, 46], [88, 58]], chest: [94, 88],
    draw(p, pose) {
      const jaw = pose.jaw;
      const tail = cel("M32 86 C24 88 16 92 9 99 C18 98 26 95 34 93 Z", p, { offset: [-2, -3] });
      const under = inked("M27 86 C48 97 80 97 101 86 L101 93 C80 101 48 101 27 93 Z", BELLY.base);
      const headD = "M90 74 C100 67 112 68 118 76 C121 82 115 88 104 88 C97 88 91 86 89 81 Z";
      const head = cel(headD, p, { offset: [-3, -4], hi: [102, 72, 6, 3] });
      const lower = `<g transform="rotate(${jaw * 38} 104 84)">${inked("M104 84 C110 84 116 83 119 81 C117 88 110 91 102 89 Z", BELLY.base, `stroke-width="3"`)}</g>`;
      const mouthIn = jaw ? inked("M101 84 L121 79 L112 97 Z", "#4a1420", `stroke-width="2.5"`) : "";
      const shellD = "M25 88 C25 61 43 43 64 43 C87 43 101 61 101 87 C85 91 43 93 25 88 Z";
      // Overlapping leaf scutes, lower rows first so upper rows shingle over them (as on the Form 4 shell).
      const scute = (x, y, r) => inked(`M${x - r} ${y - r * 0.5} Q${x - r * 0.6} ${y + r * 0.9} ${x} ${y + r * 1.1} Q${x + r * 0.6} ${y + r * 0.9} ${x + r} ${y - r * 0.5} Q${x} ${y - r * 0.9} ${x - r} ${y - r * 0.5} Z`, p.base, `stroke-width="2.4"`) +
        line(`M${x} ${y - r * 0.5} L${x} ${y + r * 0.8}`, p.mark, 1.8) + line(`M${x - r * 0.7} ${y - r * 0.4} Q${x - r * 0.3} ${y - r * 0.75} ${x + r * 0.2} ${y - r * 0.7}`, p.light, 1.8);
      const rows = [[[30, 80], [43, 82], [56, 83], [69, 83], [82, 82], [94, 79]], [[38, 67], [52, 68], [66, 68], [80, 67], [91, 66]], [[48, 55], [62, 53], [76, 55]]];
      const plates = rows.map((r, i) => r.map(([x, y]) => scute(x, y, 9 - i)).join("")).join("");
      const shell = cel(shellD, p, { hi: [52, 54, 14, 6], inner: plates });
      const scallops = [32, 44, 56, 68, 80, 92].map(x => line(`M${x - 6} 88 Q${x} 94 ${x + 6} 88`, INK, 2.4)).join("");
      const hood = inked("M90 66 C99 62 108 66 111 71 L98 77 C95 73 92 70 90 66 Z", p.base, `stroke-width="3"`);
      return { back: tail, body: under + shell + scallops, head: mouthIn + head + lower + hood + eye(106, 76, 5.5, Math.max(pose.lid, 0.25)) };
    },
  },
  // Adaptable: the slender feline salamander Form 4. Long legs, narrow waist, crest fins, curling ribbon tail.
  adaptable: {
    name: "Ribbonstrider (streamlined line)",
    hips: { back: [44, 84], front: [82, 80] }, leg: { l1: 21, l2: 20, wBack: 5.5, wFront: 5, foot: 1, bendBack: 1, bendFront: -1 },
    pivot: [64, 84], neck: [92, 64], mouth: [118, 61], head: [108, 56], back: [[46, 78], [64, 78], [84, 66]], chest: [88, 78],
    draw(p, pose) {
      const jaw = pose.jaw;
      const tailD = "M40 80 C26 80 14 74 12 62 C10 52 16 44 24 42";
      const tail = line(tailD, INK, 7 + 2 * W) + line(tailD, p.base, 7) + line(tailD, p.light, 2, `transform="translate(-1.5,-1.5)"`);
      const ribbon = cel("M38 76 C26 72 18 62 18 52 C18 42 26 34 36 34 C30 40 26 46 27 54 C28 64 34 70 42 74 Z", { ...p, base: p.fin, shade: p.accent, light: "#ffffff" }, { offset: [-2, -3] });
      const torso = "M36 80 C44 74 56 76 64 78 C72 78 78 72 84 66 C88 60 92 54 98 52 C106 50 114 54 118 60 C114 64 108 66 102 66 C96 68 92 74 88 80 C82 88 72 88 64 86 C56 88 44 90 36 86 Z";
      const body = cel(torso, p, { offset: [-3, -5], hi: [100, 55, 7, 3], inner: `<path d="M40 79 C54 76 72 76 84 66 C88 61 92 57 98 54" stroke="${p.accent}" stroke-width="3" fill="none"/>` +
        `<path d="M44 88 C56 88 70 88 86 80 C80 82 60 84 42 84 Z" fill="${BELLY.base}"/>` +
        [[46, 80], [54, 79], [62, 81], [70, 79], [78, 74], [84, 69]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="${p.mark}"/>`).join("") });
      const crest = cel("M100 53 C94 43 88 38 79 35 C87 43 91 50 95 57 Z", { ...p, base: p.fin, shade: p.accent }, { offset: [-2, -2] }) +
        cel("M95 57 C89 51 84 49 77 48 C83 53 87 57 90 62 Z", { ...p, base: p.fin, shade: p.accent }, { offset: [-2, -2] });
      const lower = `<g transform="rotate(${jaw * 40} 102 65)">${inked("M102 64 C108 64 114 62 118 61 C116 66 108 69 100 68 Z", BELLY.base, `stroke-width="3"`)}</g>`;
      const mouthIn = jaw ? inked("M99 64 L120 59 L110 78 Z", "#4a1420", `stroke-width="2.5"`) : "";
      return { back: ribbon + tail, body, head: crest + mouthIn + lower + eye(107, 57, 5.5, pose.lid) };
    },
  },
};
export const FAMILY_NAMES = Object.fromEntries(Object.entries(FAMILIES).map(([k, v]) => [k, v.name]));

// ---- worn traits ------------------------------------------------------------------------------------
// Story adaptations, class skills and fun parts each own one silhouette change, so they read at 32 px
// without colour alone. Temperament colours stay in the interface; bodies keep material colours.
function wornBack(f, t, p) {
  let s = "";
  if (t.fullArmor) for (const [i, [x, y]] of f.back.entries())
    s += cel(`M${x - 12} ${y + 6} C${x - 10} ${y - 6} ${x + 10} ${y - 8} ${x + 13} ${y + 4} Z`, { base: "#cfc6ae", shade: "#8b8269", light: "#f3ecd6" }, { offset: [-2, -3] }) +
      line(`M${x - 6} ${y + 2} L${x + 6} ${y}`, "#8b8269", 1.6) + (i === 0 ? "" : "");
  return s;
}
function wornFront(f, t, p, frontFoot) {
  let s = "";
  const [nx, ny] = f.neck, [mx, my] = f.mouth, [hx, hy] = f.head;
  // Roar: a bristle mane fanning back from the head plus a pale throat sac.
  if (t.roar) for (const k of [0, 1, 2, 3, 4])
    s += inked(`M${nx + 2} ${ny - 4 + k * 5} l-22 ${-4 + k * 3.5} l19 ${8 - k * 0.8} Z`, "#2e2222", `stroke-width="2.6"`);
  if (t.roar) s += inked(`M${nx + 4} ${ny + 8} C${nx + 16} ${ny + 8} ${nx + 18} ${ny + 22} ${nx + 7} ${ny + 24} C${nx} ${ny + 22} ${nx - 1} ${ny + 13} ${nx + 4} ${ny + 8} Z`, "#f4b0a0", `stroke-width="3"`);
  if (t.burrow) s += inked(`M${mx - 9} ${my - 9} L${mx + 3} ${my - 4} L${mx - 6} ${my - 1} Z`, IVORY.base, `stroke-width="2.6"`);
  if (t.fullArmor) s += cel(`M${hx - 10} ${hy - 2} C${hx - 6} ${hy - 10} ${hx + 8} ${hy - 10} ${hx + 12} ${hy - 2} L${hx + 4} ${hy + 1} Z`, { base: "#cfc6ae", shade: "#8b8269", light: "#f3ecd6" }, { offset: [-2, -2] }) +
    cel(`M${f.chest[0] - 12} ${f.chest[1] - 14} C${f.chest[0] - 4} ${f.chest[1] - 20} ${f.chest[0] + 6} ${f.chest[1] - 14} ${f.chest[0] + 4} ${f.chest[1] - 4} L${f.chest[0] - 10} ${f.chest[1] - 4} Z`, { base: "#cfc6ae", shade: "#8b8269", light: "#f3ecd6" }, { offset: [-2, -2] });
  if (t.iceBreath) {
    s += [[-10, -2], [-6, 3], [-14, 4]].map(([dx, dy]) => inked(`M${mx + dx} ${my + dy} l3 -7 l3 7 l-3 3 Z`, "#c8f4ff", `stroke-width="2.2"`)).join("");
    s += `<g opacity="0.85">${[[9, -2, 5.5], [18, -6, 7.5], [28, -2, 6]].map(([dx, dy, r]) => `<circle cx="${mx + dx}" cy="${my + dy}" r="${r}" fill="#e6fbff" stroke="#7fc7e0" stroke-width="2"/>`).join("")}</g>`;
  }
  // Gills: three feathery fronds rising back from the neck, drawn last so armour never hides them.
  if (t.gills) for (const a of [-1, 0, 1]) {
    // A fat feathery leaf per frond: base on the back of the head, tip up and back.
    const ang = (-135 + a * 32) * Math.PI / 180, bx = hx - 9 + a * 2, by = hy + 1 + a * 3, tx = bx + Math.cos(ang) * 30, ty = by + Math.sin(ang) * 30;
    const mx = (bx + tx) / 2, my = (by + ty) / 2, len = Math.hypot(tx - bx, ty - by), nxp = -(ty - by) / len * 9, nyp = (tx - bx) / len * 9;
    s += inked(`M${bx} ${by} Q${mx + nxp} ${my + nyp} ${tx} ${ty} Q${mx - nxp} ${my - nyp} ${bx} ${by} Z`, "#ff7a96", `stroke-width="2.8"`) +
      line(`M${bx} ${by} L${mx * 0.4 + tx * 0.6} ${my * 0.4 + ty * 0.6}`, "#c4405e", 1.6) +
      line(`M${mx} ${my} l${nxp * 0.6} ${nyp * 0.6} M${mx} ${my} l${-nxp * 0.6} ${-nyp * 0.6}`, "#c4405e", 1.3);
  }
  if (t.toolUse) s += line(`M${mx - 18} ${my + 8} L${mx + 6} ${my - 2}`, INK, 4.5 + 2 * W) + line(`M${mx - 18} ${my + 8} L${mx + 6} ${my - 2}`, "#9a6236", 4.5) +
    inked(`M${mx + 2} ${my - 10} L${mx + 13} ${my - 6} L${mx + 11} ${my + 4} L${mx + 1} ${my + 3} Z`, "#a8b0b2", `stroke-width="3"`);
  return s;
}

/**
 * Full creature as an SVG string (viewBox 0 0 128 128).
 * family: aggressive | cautious | adaptable; diet: PALETTES key; pose: POSES key;
 * traits: { gills, fins, claws, roar, burrow, toolUse, fullArmor, iceBreath }; scale: body growth (strength/vitality).
 */
export function creatureSvg(family, diet, pose = "idle", traits = {}, opt = {}) {
  const f = FAMILIES[family], p = PALETTES[diet], ps = POSES[pose];
  const parts = f.draw(p, ps);
  const [px, py] = f.pivot, lunge = ps.lunge ?? 0;
  const rad = ps.tilt * Math.PI / 180;
  const sq = ps.squash ?? 1;
  const xf = ([x, y]) => { const dx = x - px, dy = y - py; const ty = py - ps.lift + dx * Math.sin(rad) + dy * Math.cos(rad);
    return [px + lunge + dx * Math.cos(rad) - dy * Math.sin(rad), 120 + (ty - 120) * sq]; };
  const L = f.leg;
  const legs = ps.feet.map((ft, i) => {
    const front = i % 2 === 1, near = i >= 2;
    const hip = xf(front ? f.hips.front : f.hips.back);
    const hipN = [hip[0] + (near ? 2 : -3), hip[1] + (near ? 1 : -1)];
    const target = [hipN[0] + ft[0], ft[1] - (ps.air ? ps.lift * 0.3 : 0)];
    const { knee, foot: fp } = ik(hipN, target, L.l1, L.l2, pose === "crouch" ? 1 : front ? L.bendFront : L.bendBack);
    const color = near ? p.base : p.shade;
    const w = front ? L.wFront : L.wBack;
    const finWeb = traits.fins ? 1.3 : 1;
    // Swimming fins: a membrane along the back edge of each near limb (silhouette change, not just colour).
    const web = traits.fins && near ? inked(`M${hipN[0] - 2} ${hipN[1] - 4} Q${knee[0] - 30} ${knee[1] - 6} ${fp[0] - 16} ${fp[1] - 3} L${knee[0]} ${knee[1]} Z`, "#7fe6e0", `stroke-width="3"`) +
      line(`M${hipN[0] - 3} ${hipN[1]} L${knee[0] - 9} ${knee[1]} M${knee[0] - 2} ${knee[1] + 2} L${fp[0] - 7} ${fp[1] - 4}`, "#3c9c98", 1.6) : "";
    return { near, front, svg: web + limb([hipN, knee, fp], w, color, near ? p.light : null) +
      foot(fp, near ? p.base : p.shade, finWeb * L.foot, { claws: traits.claws && near, spade: traits.burrow && front && near }) };
  });
  const transform = `translate(0 120) scale(1 ${sq}) translate(0 -120) translate(${lunge} 0) rotate(${ps.tilt} ${px} ${py}) translate(0 ${-ps.lift})`;
  const shadow = `<ellipse cx="64" cy="121" rx="${ps.air ? 30 : 40}" ry="4" fill="#000" opacity="${ps.air ? 0.18 : 0.28}"/>`;
  const sc = opt.scale ?? 1;
  const lidColor = p.shade;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" style="--lid:${lidColor}">
  <g transform="translate(64 120) scale(${sc}) translate(-64 -120)">
  ${opt.noShadow ? "" : shadow}
  ${legs.filter(l => !l.near).map(l => l.svg).join("")}
  <g transform="${transform}">${parts.back}${wornBack(f, traits, p)}${parts.body}${parts.head}${wornFront(f, traits, p)}</g>
  ${legs.filter(l => l.near).map(l => l.svg).join("")}
  </g></svg>`;
}

// ---- enemy: the Bristle charger -------------------------------------------------------------------
// A squat mud-boar amphibian: quill crest, curling tusks, two small amber eyes (the lineage keeps the
// single purple eye, so a glance tells friend from foe). Phases: patrol (calm) and tell (head down, quills up).
export function chargerSvg(phase = "patrol") {
  const tell = phase === "tell";
  const pal = { base: "#b77a3e", shade: "#7a4a24", light: "#dcaa6c" };
  const quillPal = "#f0d9a0";
  const q = [];
  for (let i = 0; i < 9; i++) {
    const x = 26 + i * 9, y = 66 - Math.sin((i + 1) / 10 * Math.PI) * 10;
    const h = (tell ? 20 : 12) + Math.sin(i * 1.7) * 3;
    q.push(inked(`M${x - 4} ${y + 6} L${x - 6 + (tell ? 0 : -6)} ${y - h} L${x + 4} ${y + 4} Z`, quillPal, `stroke-width="3"`));
  }
  const tilt = tell ? 8 : 0;
  const body = cel("M18 98 C16 72 38 58 62 58 C86 58 102 68 108 82 C116 84 122 90 120 98 C112 104 98 104 90 102 C70 106 40 106 18 98 Z", pal,
    { hi: [56, 66, 24, 7], inner: `<path d="M24 100 C50 104 80 104 104 98 L104 106 L24 106 Z" fill="#d8b98a"/>` + line("M40 78 L46 76 M54 82 L60 79 M70 80 L76 77", pal.shade, 2, `opacity="0.7"`) });
  const snout = inked("M112 88 C120 86 124 92 121 98 C117 100 112 98 110 94 Z", "#c99a72", `stroke-width="3"`) + `<circle cx="117" cy="92" r="1.6" fill="${INK}"/>`;
  const tusks = inked("M110 98 C116 98 120 92 118 84 C122 90 122 100 112 103 Z", IVORY.base, `stroke-width="3"`) +
    inked("M100 100 C104 100 108 95 107 89 C110 94 110 101 103 104 Z", IVORY.shade, `stroke-width="3"`);
  const eyes = [[98, 78], [104, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${tell ? "#ff7a3a" : "#ffc24a"}" stroke="${INK}" stroke-width="2.5"/>`).join("") +
    line(tell ? "M94 72 L104 76" : "M95 74 L103 75", INK, 3);
  const legs = [[34, 0], [86, 0], [44, 1], [96, 1]].map(([x, near]) =>
    limb([[x, 96], [x + 2, 106], [x + (tell ? -3 : 1), 118]], 12, near ? pal.base : pal.shade, near ? pal.light : null) +
    inked(`M${x - 6 + (tell ? -3 : 1)} 116 L${x + 7 + (tell ? -3 : 1)} 116 L${x + 7 + (tell ? -3 : 1)} 121 L${x - 6 + (tell ? -3 : 1)} 121 Z`, "#4b2e18", `stroke-width="3"`));
  const dust = tell ? `<g opacity="0.8">${[[20, 116, 5], [12, 112, 4], [8, 118, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#c9b08a" stroke="${INK}" stroke-width="2"/>`).join("")}</g>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <ellipse cx="66" cy="121" rx="50" ry="4" fill="#000" opacity="0.3"/>${dust}
  ${legs.filter((_, i) => i < 2).join("")}
  <g transform="rotate(${tilt} 70 96)">${q.join("")}${body}${snout}${tusks}${eyes}</g>
  ${legs.filter((_, i) => i >= 2).join("")}</svg>`;
}
