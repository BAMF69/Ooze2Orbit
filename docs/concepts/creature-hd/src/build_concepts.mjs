// ---------------------------------------------------------------------------
// build_concepts.mjs (docs/concepts/creature-hd/src)
// Purpose : Build the creature HD concept slice C-0101..C-0107: for each concept one ENLARGED board and one
//           GAMEPLAY-SIZE board (real 32/40 px textures scaled like the game canvas on PC and iPhone 13 mini).
// Usage   : node docs/concepts/creature-hd/src/build_concepts.mjs   (from the repo root; needs git-lfs and the
//           installed Playwright Chromium). Form 4 references are read from origin/main via git lfs smudge.
// Notes   : CONCEPT ONLY, nothing here ships. Display scales come from src/core/viewport.ts for the creature
//           stage: 1920x1080 desktop ~x2.7, iPhone 13 mini landscape (812x375) ~x1.27, portrait (375x812) ~x1.8.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { creatureSvg, chargerSvg, FAMILY_NAMES } from "./creatures.mjs";
import { roomSvg, collisionOverlay, LANDMARKS } from "./room.mjs";
import { iconSvg, rackHtml, ICON_LABEL, RACK, CLASS_OF, TEMPERAMENT } from "./icons.mjs";
import { renderBoard, gameCanvas, sceneCanvas, close } from "./render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "final"); // approved v1 boards are FINAL (docs/CONCEPTS.md rules)
const ROOT = join(HERE, "..", "..", "..", "..");
const SCALES = [["PC 1080p", 2.7], ["iPhone 13 mini portrait", 1.8], ["iPhone 13 mini landscape", 1.27]];
const big = (svg, px) => svg.replace("<svg ", `<svg width="${px}" height="${px}" `);
const dataUri = (path) => `data:image/png;base64,${readFileSync(path).toString("base64")}`;

// ---- references -------------------------------------------------------------------------------------
function form4Refs() {
  const dir = join(tmpdir(), "o2o-creature-hd-ref"); mkdirSync(dir, { recursive: true });
  const want = { aggressive: "aquatic_aggressive_f4_carnivore_motion_v1", cautious: "aquatic_cautious_f4_herbivore_motion_v1", adaptable: "aquatic_adaptable_f4_omnivore_motion_v1" };
  const out = {};
  for (const [fam, name] of Object.entries(want)) {
    const file = join(dir, `${name}.png`);
    if (!existsSync(file)) execSync(`git show origin/main:public/assets/art/${name}.png | git lfs smudge > "${file}"`, { cwd: ROOT, shell: "bash" });
    out[fam] = dataUri(file);
  }
  return out;
}
// Form 4 sheets are 4x3 cells of 362 px; row 1 (side view), frame 0.
const form4 = (uri, px) => `<div style="width:${px}px;height:${Math.round(px * 0.72)}px;overflow:hidden;position:relative">
  <img src="${uri}" style="position:absolute;width:${px * 4}px;left:0;top:${-Math.round(px * 1.12)}px"></div>`;
// Current placeholder sprite frame from a 4-column 32 px sheet, shown pixelated.
const oldFrame = (uri, frame, px) => `<div style="width:${px}px;height:${px}px;overflow:hidden;position:relative;image-rendering:pixelated">
  <img src="${uri}" style="position:absolute;width:${px * 4}px;left:${-(frame % 4) * px}px;top:${-Math.floor(frame / 4) * px}px;image-rendering:pixelated"></div>`;

const card = (inner, label, tag = "") => `<div class="card">${inner}<div class="lab">${label}</div>${tag ? `<div class="tag">${tag}</div>` : ""}</div>`;
const header = (id, title, sub) => `<h1>${id} · ${title}</h1><p class="sub">${sub}</p>`;
const strip = (svgs, tex = 32) => `<div class="grid" style="grid-template-columns:repeat(${SCALES.length + 2},auto);align-items:end;justify-content:start;gap:10px 26px">
  <div class="tag">texture 1:1 (${tex} px)</div>${SCALES.map(([n, s]) => `<div class="tag">${n} ×${s}<br>(today: 640×360 canvas)</div>`).join("")}<div class="tag" style="color:#f0d9a0">PC ×2.7 if the world<br>rendered at screen resolution</div>
  ${svgs.map(svg => `<div class="ground px" style="padding:6px 8px">${gameCanvas(svg, tex, 1, false)}</div>` +
    SCALES.map(([, s]) => `<div class="ground" style="padding:6px 8px">${gameCanvas(svg, tex, s)}</div>`).join("") +
    `<div class="ground" style="padding:6px 8px;outline:1px solid #6d6042">${gameCanvas(svg, Math.round(tex * 2.7), 1)}</div>`).join("")}</div>`;

const LINEUP = [["aggressive", "carnivore"], ["cautious", "herbivore"], ["adaptable", "omnivore"]];

async function c0101(refs) {
  const enl = header("C-0101", "Form 5: the first walkers", "Each family's shipped aquatic Form 4 (left, from origin/main A-0036) and its first land body (right). Same palette, same purple cyclops eye, fins becoming limbs. Diet shown: the diet of the Form 4 reference.") +
    `<div class="row">${LINEUP.map(([f, d]) => card(`<div style="display:flex;align-items:center;gap:6px">${form4(refs[f], 210)}<div style="font-size:34px;color:#f0d9a0">→</div>${big(creatureSvg(f, d), 250)}</div>`,
      FAMILY_NAMES[f], `${f} temperament · ${d}`)).join("")}</div>`;
  const walker = dataUri(join(ROOT, "public/assets/art/creature_walker.png"));
  const gp = header("C-0101", "Form 5 at gameplay size", "Real 32×32 texture, scaled like the 640×360 world canvas. Left column: the current placeholder walker for comparison.") +
    `<div class="row" style="align-items:flex-start"><div class="card"><div class="tag">current placeholder</div>${oldFrame(walker, 0, 32)}${oldFrame(walker, 0, 86)}</div>
    <div>${strip(LINEUP.map(([f, d]) => creatureSvg(f, d)))}</div></div>`;
  return [["C-0101_form5_families_v1_enlarged.png", enl, 1420], ["C-0101_form5_families_v1_gameplay.png", gp, 1250]];
}

async function c0102() {
  const diets = [["herbivore", "green herbivore"], ["carnivore", "red carnivore"], ["omnivore", "omnivore, shipped gold-teal"], ["omniBlue", "omnivore, brief's blue (alternative)"]];
  const enl = header("C-0102", "Diet variation: Ridgejaw (shark line)", "Same body, four palettes. Diet changes colour and markings only; the family silhouette is temperament's. Question for BAMF69: omnivore body gold-teal (matches shipped cell/aquatic bodies) or blue (matches the HUD meters)?") +
    `<div class="row">${diets.map(([d, l]) => card(big(creatureSvg("aggressive", d), 250), l)).join("")}</div>`;
  const gp = header("C-0102", "Diet variation at gameplay size", "Can the diet be told apart at 32 px? Rows: herbivore, carnivore, omnivore gold-teal, omnivore blue.") + strip(diets.map(([d]) => creatureSvg("aggressive", d)));
  return [["C-0102_diet_sheet_v1_enlarged.png", enl, 1250], ["C-0102_diet_sheet_v1_gameplay.png", gp, 1050]];
}

async function c0103() {
  const ladder = [["base", {}], ["+ gills", { gills: 1 }], ["+ swimming fins", { gills: 1, fins: 1 }], ["+ climbing claws", { gills: 1, fins: 1, claws: 1 }],
    ["+ Roar (class)", { gills: 1, fins: 1, claws: 1, roar: 1 }], ["+ full armor (grotto)", { gills: 1, fins: 1, claws: 1, roar: 1, fullArmor: 1 }]];
  const others = [["Burrow: spade foreclaws + snout scute", "cautious", "herbivore", { burrow: 1, gills: 1 }], ["Tool use: a carried stone tool", "adaptable", "omnivore", { toolUse: 1, fins: 1 }],
    ["Ice breath (grotto): frost glands + vapour", "aggressive", "carnivore", { iceBreath: 1, roar: 1 }]];
  const enl = header("C-0103", "Worn traits", "Each trait owns one silhouette change, so it reads without colour: gills = pink frond crown, fins = teal limb membranes, claws = ivory hooks, Roar = dark mane + throat sac, armor = bone plates, ice breath = frost crystals. Temperament colour stays in the HUD only.") +
    `<div class="row">${ladder.map(([l, t]) => card(big(creatureSvg("aggressive", "carnivore", "idle", t), 196), l)).join("")}</div>
    <h2>The other class skills and the second grotto part</h2><div class="row">${others.map(([l, f, d, t]) => card(big(creatureSvg(f, d, "idle", t), 220), l)).join("")}</div>`;
  const gp = header("C-0103", "Worn traits at gameplay size", "Top row: the ladder (base → full kit). Bottom rows: Burrow, Tool use, ice breath.") +
    strip([...ladder.map(([, t]) => creatureSvg("aggressive", "carnivore", "idle", t)), ...others.map(([, f, d, t]) => creatureSvg(f, d, "idle", t))]);
  return [["C-0103_worn_traits_v1_enlarged.png", enl, 1360], ["C-0103_worn_traits_v1_gameplay.png", gp, 1050]];
}

async function c0104() {
  const poses = ["idle", "walk", "jump", "bite", "crouch"];
  const enl = header("C-0104", "Core poses (one key frame each)", "Idle, walk, jump, bite, crouch/hide. The current sheet uses four frames per pose; this fixes the key frame. Reduced Motion: idle breathing and walk bob would be dropped; poses still switch.") +
    LINEUP.map(([f, d], i) => `<div class="row" style="margin-bottom:10px">${poses.map(p => card(big(creatureSvg(f, d, p, i === 0 ? { gills: 1, claws: 1 } : {}), 196), p, i === 0 ? FAMILY_NAMES[f] + " (gills, claws)" : FAMILY_NAMES[f])).join("")}</div>`).join("");
  const gp = header("C-0104", "Poses at gameplay size", "Columns are display scales; rows are idle, walk, jump, bite, crouch for the Ridgejaw, then the same five for Shellback and Ribbonstrider at PC scale only.") +
    strip(poses.map(p => creatureSvg("aggressive", "carnivore", p, { gills: 1, claws: 1 }))) +
    `<h2>Shellback and Ribbonstrider, PC ×2.7</h2>` + LINEUP.slice(1).map(([f, d]) => `<div class="row">${poses.map(p => `<div class="ground" style="padding:6px">${gameCanvas(creatureSvg(f, d, p), 32, 2.7)}<div class="tag">${p}</div></div>`).join("")}</div>`).join("");
  return [["C-0104_pose_strip_v1_enlarged.png", enl, 1150], ["C-0104_pose_strip_v1_gameplay.png", gp, 1050]];
}

async function c0105() {
  const foes = dataUri(join(ROOT, "public/assets/art/creature_foes.png"));
  const enl = header("C-0105", "Enemy: Bristle charger", "A squat mud-boar amphibian with a quill crest and curling tusks. Two small amber eyes (the player's lineage keeps one purple eye: friend and foe differ at a glance). Tell: head drops, quills rise, eyes go red-orange, dust kicks up.") +
    `<div class="row">${card(big(chargerSvg("patrol"), 300), "patrol")}${card(big(chargerSvg("tell"), 300), "tell (0.9 s wind-up)")}${card(big(creatureSvg("aggressive", "carnivore"), 240), "player for scale (Form 5)")}</div>`;
  const pair = (phase) => ({ w: 200, h: 60, bg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><rect width="200" height="60" fill="#24414a"/><rect y="48" width="200" height="12" fill="#3e5a4c"/><rect y="48" width="200" height="3" fill="#79a15e"/></svg>`,
    sprites: [{ svg: creatureSvg("aggressive", "carnivore"), tex: 32, x: 58, y: 49 }, { svg: chargerSvg(phase), tex: 40, x: 128, y: 49, flip: true }] });
  const gp = header("C-0105", "Charger beside the player at gameplay size", "Charger texture 40 px (the scene draws it at ×1.25), player 32 px, on the same 16 px ground. Left: today's placeholders (brute frame 12, walker frame 0).") +
    `<div class="row" style="align-items:flex-start"><div class="card"><div class="tag">current placeholders</div><div style="display:flex">${oldFrame(dataUri(join(ROOT, "public/assets/art/creature_walker.png")), 0, 80)}${oldFrame(foes, 12, 100)}</div></div></div>
    ${["patrol", "tell"].map(ph => `<h2>${ph}</h2><div class="row">${SCALES.map(([n, s]) => `<div>${sceneCanvas({ ...pair(ph), scale: s })}<div class="tag">${n} ×${s}</div></div>`).join("")}</div>`).join("")}`;
  return [["C-0105_bristle_charger_v1_enlarged.png", enl, 1120], ["C-0105_bristle_charger_v1_gameplay.png", gp, 1250]];
}

async function c0106() {
  const player = creatureSvg("aggressive", "carnivore", "idle", { gills: 1 });
  const sprites = [{ svg: player, tex: 32, x: LANDMARKS.player[0], y: LANDMARKS.player[1] }, { svg: chargerSvg("patrol"), tex: 40, x: LANDMARKS.charger[0], y: LANDMARKS.charger[1], flip: true }];
  const base = { w: 640, h: 360, bg: roomSvg("back"), overlay: roomSvg("front"), sprites };
  const enl = header("C-0106", "Water room mock-up: Easy room 1 (seed 0), entry state", "Painted over the real collision of generateWater(0) room 1. Left: art at 2× (vector). Right: the same frame with the collision grid outlined in magenta to prove every solid tile sits where it collides and nothing else looks solid.") +
    `<div class="row">${sceneCanvas({ ...base, scale: 2, smooth: true })}</div><h2>Collision proof (1:1)</h2><div class="row">${sceneCanvas({ ...base, overlay: collisionOverlay(), scale: 1 })}
     <div class="note" style="max-width:420px">Labels for the scene: log sluice (column 18, needs Raise basin), exit barrier (column 35, opens with the lever), sluice lever on the upper ledge (232, 236), net frame (368), vine rigging (104), reed cover (224–320), nursery branch arch (110), top-route opening (columns 7–8). Water is at the low basin line (288).</div></div>`;
  const gp = header("C-0106", "Water room at gameplay size", "World rendered at 640×360 then scaled. Phone crops follow the creature camera policy in src/core/viewport.ts (landscape ≈ 640×217 visible, portrait ≈ 208×360 following the player).") +
    `<h2>1:1 world pixels</h2>${sceneCanvas({ ...base, scale: 1 })}
     <h2>iPhone 13 mini landscape, ×1.27 (visible band around the player)</h2>${sceneCanvas({ ...base, crop: [0, 110, 640, 217], scale: 1.27 })}
     <div class="row" style="align-items:flex-start"><div><h2>iPhone 13 mini portrait ×1.8</h2>${sceneCanvas({ ...base, crop: [0, 0, 208, 360], scale: 1.8 })}</div>
     <div><h2>PC 1080p ×2.7 (crop around the charger)</h2>${sceneCanvas({ ...base, crop: [250, 190, 300, 130], scale: 2.7 })}</div></div>`;
  return [["C-0106_water_room_v1_enlarged.png", enl, 1340], ["C-0106_water_room_v1_gameplay.png", gp, 1250]];
}

async function c0107() {
  const owned = ["gills", "fins", "claws", "roar", "fullArmor"];
  const enl = header("C-0107", "HUD icon rack, restyled", "Same ink and fill language as the shipped uiIcons.ts. Groups: story adaptations | class skill | grotto parts. Owned = colour, not yet = grey silhouette. Only class skills carry temperament colour (disc): red Roar, green Burrow, blue Tool use.") +
    `<div class="row">${RACK.flatMap(([, ns]) => ns).map(n => card(iconSvg(n, { size: 120 }) + iconSvg(n, { owned: false, size: 60 }), ICON_LABEL[n], CLASS_OF[n] ? `class · ${CLASS_OF[n]}` : "")).join("")}</div>
    <h2>The rack (example: aggressive lineage with gills, fins, claws, Roar, full armor)</h2>${rackHtml(owned, 72)}`;
  const gp = header("C-0107", "Rack at real HUD sizes", "CSS pixel sizes as the native HUD would draw them (top-right). The question this answers: can the eight icons be told apart at phone size?") +
    `<h2>PC (40 px slots)</h2>${rackHtml(owned, 40)}<h2>iPhone 13 mini landscape (28 px slots)</h2>${rackHtml(owned, 28)}<h2>iPhone 13 mini portrait (24 px slots)</h2>${rackHtml(owned, 24)}
     <h2>Against the room (PC, rack over the world)</h2><div style="position:relative;display:inline-block">${sceneCanvas({ w: 640, h: 360, bg: roomSvg("back"), overlay: roomSvg("front"), sprites: [{ svg: creatureSvg("aggressive", "carnivore", "idle", { gills: 1, fins: 1, claws: 1, roar: 1, fullArmor: 1 }), tex: 32, x: 60, y: 304 }], crop: [0, 0, 640, 360], scale: 1.6 })}
     <div style="position:absolute;right:12px;top:12px">${rackHtml(owned, 40)}</div></div>`;
  return [["C-0107_hud_icon_rack_v1_enlarged.png", enl, 1450], ["C-0107_hud_icon_rack_v1_gameplay.png", gp, 1100]];
}

const refs = form4Refs();
const only = process.argv[2];
for (const [name, fn] of Object.entries({ c0101, c0102, c0103, c0104, c0105, c0106, c0107 })) {
  if (only && only !== name) continue;
  for (const [file, html, w] of await fn(refs)) { await renderBoard(html, join(OUT, file), w, 600); console.log("wrote", file); }
}
await close();
