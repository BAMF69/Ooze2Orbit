// ---------------------------------------------------------------------------
// room.mjs (docs/concepts/creature-hd/src)
// Purpose : C-0106 Water room mock-up drawn over REAL collision. GRID is the solid-tile dump of
//           generateWater(0) room 1 (Easy, sluice gate, one charger), entry state (basin not raised, sluice
//           lever untouched), produced by a temporary vitest dump of challengeSolid + objectiveBarrier.
// Usage   : roomSvg({ vector: true }) -> 640x360 SVG string. Landmark positions are copied from roomSpec.
// Notes   : CONCEPT ONLY. Every solid tile is painted exactly where it collides; decoration never adds
//           a solid-looking shape inside an open tile (only the far background, which is dimmed and flat).
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
import { INK } from "./creatures.mjs";

// '#' = solid. Rows 0..22, columns 0..39, 16 px tiles. Column 18 = log sluice (gateX 288); column 35 = exit
// barrier until the lever opens it. Rows 0..5 = ceiling with the top-route opening at columns 7..8.
export const GRID = [
  "#######..###############################",
  "#######..###############################",
  "#######..###############################",
  "#######..###############################",
  "#######..###############################",
  "#######..###############################",
  "..................#................#....",
  "..................#................#....",
  "..................#................#....",
  "..................#................#....",
  "..................#................#....",
  ".......##.........#................#....",
  "..................#................#....",
  "..................#................#....",
  ".............###..#................#....",
  ".....##...........#................#....",
  "..................#................#....",
  "..................#................#....",
  "..................#................#....",
  "########################################",
  "########################################",
  "########################################",
  "########################################",
];
// From roomSpec(room 1): lever (valve) 232,236; net rig 104,304; net frame 368,288; reeds centred 272 and
// cover strip 224..320; nursery branch arch at 110,252; charger spawn 424,288; waterline 288 (basin low),
// water spans x 144..544 down to the floor at 304.
export const LANDMARKS = { lever: [232, 236], rig: [104, 304], net: [368, 288], reeds: [272], cover: 224, arch: [110, 252],
  charger: [424, 304], player: [60, 304], waterline: 288, water: [144, 544], floor: 304, food: [[480, 296, "plant"], [176, 296, "meat"]] };

const solid = (x, y) => y >= 0 && y < GRID.length && x >= 0 && x < 40 && GRID[y][x] === "#";
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

function rockTile(x, y) {
  const X = x * 16, Y = y * 16, h = hash(x, y);
  const special = x === 18 && y >= 6 && y <= 18 ? "sluice" : x === 35 && y >= 6 && y <= 18 ? "barrier" : null;
  if (special) return ""; // drawn as wooden structures below
  const floorish = y >= 19, ceiling = y <= 5;
  const base = floorish ? "#3e5a4c" : ceiling ? "#33464a" : "#5a6866";
  const shade = floorish ? "#2c4237" : ceiling ? "#243336" : "#3f4b4a";
  let s = `<rect x="${X}" y="${Y}" width="16" height="16" fill="${base}"/>`;
  if (!solid(x, y + 1) || (h % 7 === 0 && !ceiling)) s += `<rect x="${X}" y="${Y + 10}" width="16" height="6" fill="${shade}" opacity="${solid(x, y + 1) ? 0.35 : 0.8}"/>`; // lower-right cel band only on exposed undersides
  if (h % 3 === 0) s += `<path d="M${X + 3 + h % 6} ${Y + 4} l4 3 l-1 4" stroke="${shade}" stroke-width="1.2" fill="none"/>`;
  if (!solid(x, y - 1) && y > 0) { // exposed top: moss lip + ink edge (upper-left light)
    s += `<rect x="${X}" y="${Y}" width="16" height="4" fill="${floorish ? "#79a15e" : "#7d9a78"}"/>`;
    s += `<path d="M${X} ${Y + 4} q4 ${2 + h % 3} 8 0 q4 ${2 + (h >> 3) % 3} 8 0" fill="${floorish ? "#79a15e" : "#7d9a78"}"/>`;
    s += `<line x1="${X}" y1="${Y + 0.5}" x2="${X + 16}" y2="${Y + 0.5}" stroke="${INK}" stroke-width="1"/>`;
    s += `<line x1="${X + 1}" y1="${Y + 1.6}" x2="${X + 9}" y2="${Y + 1.6}" stroke="#c8e3a2" stroke-width="0.8" opacity="0.9"/>`;
  }
  if (!solid(x, y + 1) && y < 22) s += `<line x1="${X}" y1="${Y + 15.5}" x2="${X + 16}" y2="${Y + 15.5}" stroke="${INK}" stroke-width="1"/>`;
  if (!solid(x - 1, y) && x > 0) s += `<line x1="${X + 0.5}" y1="${Y}" x2="${X + 0.5}" y2="${Y + 16}" stroke="${INK}" stroke-width="1"/>`;
  if (!solid(x + 1, y) && x < 39) s += `<line x1="${X + 15.5}" y1="${Y}" x2="${X + 15.5}" y2="${Y + 16}" stroke="${INK}" stroke-width="1"/>`;
  if (ceiling && !solid(x, y + 1) && h % 2 === 0) s += `<path d="M${X + 4} ${Y + 16} l3 ${5 + h % 5} l3 ${-5 - h % 5}" fill="${shade}" stroke="${INK}" stroke-width="0.8"/>`;
  return s;
}

function background() {
  let s = `<defs><linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b3b44"/><stop offset="1" stop-color="#10262c"/></linearGradient>
  <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8f0c8" stop-opacity="0.35"/><stop offset="1" stop-color="#d8f0c8" stop-opacity="0"/></linearGradient>
  <linearGradient id="waterG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb6c9" stop-opacity="0.55"/><stop offset="1" stop-color="#1f6a80" stop-opacity="0.7"/></linearGradient></defs>
  <rect width="640" height="360" fill="url(#bgG)"/>`;
  // Far layer: flat, dimmed silhouettes only (no ink) so they never read as walkable.
  for (let i = 0; i < 9; i++) { const x = i * 76 + (i % 2) * 18; s += `<path d="M${x} 304 C${x + 6} 230 ${x + 2} 170 ${x + 18} 96 L${x + 34} 96 C${x + 30} 170 ${x + 40} 230 ${x + 46} 304 Z" fill="#132e35" opacity="0.9"/>`; }
  for (let i = 0; i < 12; i++) { const x = 20 + i * 54; s += `<ellipse cx="${x}" cy="${150 + (i % 3) * 22}" rx="40" ry="28" fill="#1d4a44" opacity="0.55"/>`; }
  for (let i = 0; i < 14; i++) { const x = 10 + i * 47; s += `<path d="M${x} 96 C${x + 4} 120 ${x - 3} 140 ${x + 2} ${160 + (i % 4) * 14}" stroke="#244c43" stroke-width="3" fill="none" opacity="0.8"/>`; }
  s += `<path d="M112 96 L144 96 L210 304 L60 304 Z" fill="url(#shaft)"/>`; // light from the top-route opening
  return s;
}

function sluice() { // column 18, rows 6..18: bound logs that span the playable height
  let s = "";
  for (let i = 0; i < 3; i++) { const x = 288 + i * 5.3; s += `<rect x="${x}" y="96" width="5.3" height="208" fill="${i === 1 ? "#a98a58" : "#8e7046"}" stroke="${INK}" stroke-width="1"/>`; }
  for (const y of [120, 200, 280]) s += `<rect x="286" y="${y}" width="20" height="6" rx="2" fill="#d9c48c" stroke="${INK}" stroke-width="1"/>`;
  s += `<line x1="290" y1="98" x2="290" y2="300" stroke="#d6bb82" stroke-width="0.9" opacity="0.8"/>`;
  return s;
}
function barrier() { // column 35: the exit stays shut until the lever is used
  let s = "";
  for (let i = 0; i < 2; i++) { const x = 560 + i * 8; s += `<path d="M${x} 304 L${x} 102 L${x + 4} 96 L${x + 8} 102 L${x + 8} 304 Z" fill="${i ? "#8a5b44" : "#9a6950"}" stroke="${INK}" stroke-width="1"/>`; }
  for (const y of [150, 250]) s += `<rect x="558" y="${y}" width="20" height="5" fill="#c99a6a" stroke="${INK}" stroke-width="1"/>`;
  return s;
}
function lever() { // on the ledge at tiles 13..15 (top y=224); interaction point 232,236
  return `<rect x="225" y="218" width="14" height="6" rx="2" fill="#6c5a3c" stroke="${INK}" stroke-width="1"/>
  <line x1="232" y1="220" x2="243" y2="202" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><line x1="232" y1="220" x2="243" y2="202" stroke="#a98a58" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="243.5" cy="201" r="4.2" fill="#e9bd72" stroke="${INK}" stroke-width="1.2"/><circle cx="242.3" cy="199.8" r="1.3" fill="#fff3cf"/>`;
}
function net() { // frame 48x80 around 368,288 (x 344..392, y 224..304); rolled net while unarmed
  return `<path d="M346 304 L346 226 M390 304 L390 226" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  <path d="M346 304 L346 226 M390 304 L390 226" stroke="#8e7046" stroke-width="3" stroke-linecap="round"/>
  <path d="M342 228 L394 228" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M342 228 L394 228" stroke="#a98a58" stroke-width="3" stroke-linecap="round"/>
  <rect x="348" y="229" width="40" height="7" rx="3.5" fill="#b9c08a" stroke="${INK}" stroke-width="1"/>
  ${[352, 360, 368, 376, 384].map(x => `<line x1="${x}" y1="230" x2="${x}" y2="235" stroke="#6f7a4a" stroke-width="0.8"/>`).join("")}`;
}
function rig() { // coiled vine rigging on a stake, x 104 on the floor
  return `<line x1="104" y1="304" x2="104" y2="284" stroke="${INK}" stroke-width="4"/><line x1="104" y1="304" x2="104" y2="284" stroke="#8e7046" stroke-width="2.2"/>
  <ellipse cx="104" cy="294" rx="8" ry="5" fill="none" stroke="${INK}" stroke-width="3.2"/><ellipse cx="104" cy="294" rx="8" ry="5" fill="none" stroke="#a6c27a" stroke-width="1.8"/>
  <ellipse cx="104" cy="289" rx="6" ry="3.5" fill="none" stroke="${INK}" stroke-width="3"/><ellipse cx="104" cy="289" rx="6" ry="3.5" fill="none" stroke="#c4dc96" stroke-width="1.6"/>`;
}
function arch() { // nursery branch entrance (32x52 at 110,252); a vine-framed cave mouth, no collision
  return `<path d="M112 304 L112 268 Q126 248 140 268 L140 304 Z" fill="#0a1a1e"/>
  <path d="M112 304 L112 268 Q126 248 140 268 L140 304" fill="none" stroke="${INK}" stroke-width="4"/><path d="M112 304 L112 268 Q126 248 140 268 L140 304" fill="none" stroke="#97be88" stroke-width="2"/>
  ${[[113, 272], [118, 258], [133, 257], [139, 270]].map(([x, y]) => `<path d="M${x} ${y} q-4 -4 -2 -7 q4 1 2 7Z" fill="#a9d68a" stroke="${INK}" stroke-width="0.8"/>`).join("")}`;
}
function reeds(front) { // cover strip 224..320 plus reed patch centred at 272: tall, readable hiding cover
  let s = "";
  for (let x = 222; x < 322; x += 5) {
    const h = 30 + ((x * 7) % 13), lean = ((x * 3) % 7) - 3;
    if (front !== (x % 10 === 2)) continue;
    s += `<path d="M${x} 305 Q${x + lean} ${304 - h / 2} ${x + lean * 1.6} ${304 - h}" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${x} 305 Q${x + lean} ${304 - h / 2} ${x + lean * 1.6} ${304 - h}" stroke="${front ? "#5f9a4e" : "#4b8350"}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    if (x % 15 === 2) s += `<ellipse cx="${x + lean * 1.6}" cy="${304 - h + 3}" rx="2" ry="4.5" fill="#8a5a3a" stroke="${INK}" stroke-width="0.9"/>`;
  }
  return s;
}
function water() {
  const [x0, x1] = LANDMARKS.water, y = LANDMARKS.waterline;
  let s = `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${LANDMARKS.floor - y}" fill="url(#waterG)"/>`;
  s += `<path d="M${x0} ${y} ${Array.from({ length: 25 }, (_, i) => `Q${x0 + i * 16 + 8} ${y + (i % 2 ? 1.6 : -1.6)} ${x0 + i * 16 + 16} ${y}`).join(" ")}" stroke="#bfeaf0" stroke-width="1.4" fill="none"/>`;
  for (let i = 0; i < 10; i++) s += `<line x1="${x0 + 18 + i * 38}" y1="${y + 6}" x2="${x0 + 30 + i * 38}" y2="${y + 6}" stroke="#d9f6fa" stroke-width="0.9" opacity="0.6"/>`;
  return s;
}
function food() {
  return LANDMARKS.food.map(([x, y, k]) => k === "plant"
    ? `<path d="M${x} ${y + 4} q-1 -8 -6 -10 M${x} ${y + 4} q2 -8 7 -9" stroke="#3f7a3a" stroke-width="1.6" fill="none"/>${[[-3, 1], [3, 0], [0, -2]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="2.8" fill="#9cd36d" stroke="${INK}" stroke-width="1"/>`).join("")}`
    : `<path d="M${x - 6} ${y + 3} Q${x - 6} ${y - 5} ${x + 2} ${y - 4} Q${x + 7} ${y - 3} ${x + 6} ${y + 3} Z" fill="#d7968c" stroke="${INK}" stroke-width="1"/><path d="M${x + 4} ${y - 2} l5 -3" stroke="#efe5c4" stroke-width="2" stroke-linecap="round"/>`).join("");
}

/** The room behind the sprites (front=false) or the reed tips drawn over them (front=true). */
export function roomSvg(layer = "back") {
  if (layer === "front") return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">${reeds(true)}</svg>`;
  let tiles = "";
  for (let y = 0; y < GRID.length; y++) for (let x = 0; x < 40; x++) if (solid(x, y)) tiles += rockTile(x, y);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">${background()}${arch()}${reeds(false)}${water()}${tiles}${sluice()}${barrier()}${lever()}${net()}${rig()}${food()}</svg>`;
}

/** Debug overlay: the raw collision grid outlined, to prove art and collision coincide. */
export function collisionOverlay() {
  let s = "";
  for (let y = 0; y < GRID.length; y++) for (let x = 0; x < 40; x++) if (solid(x, y)) s += `<rect x="${x * 16 + 0.5}" y="${y * 16 + 0.5}" width="15" height="15" fill="none" stroke="#ff3df2" stroke-width="1" opacity="0.9"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">${s}</svg>`;
}
