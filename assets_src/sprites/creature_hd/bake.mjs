// ---------------------------------------------------------------------------
// bake.mjs (assets_src/sprites/creature_hd)
// Purpose : Rasterize creatureArt.mjs into the creature HD sheets: 9 body sheets (family x diet) and 3 worn-trait
//           overlay atlases (one per family), 96 px cells drawn at 32 px in game; the Bristle charger sheet
//           (120 px cells drawn at 40 px); plus a review contact sheet.
// Usage   : node assets_src/sprites/creature_hd/bake.mjs [--preview captures/progress/hd-avatar-sheets.png]
//           (from the repo root; uses the project's Playwright Chromium, no new dependency)
// Notes   : Layout comes from src/game/creature/avatarLook.ts (HD_AVATAR, WORN_STRIPS) so the game and the bake
//           can never disagree. Generated PNGs are committed through LFS; never hand-edit them, re-run this.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { creatureSvg } from "./creatureArt.mjs";
import { chargerSvg } from "./chargerArt.mjs";
import { tileSvg, backgroundSvg, overworldBgSvg } from "./terrainArt.mjs";
import { WATER_TILES, WATER_BG, OVERWORLD_BG, TERRAIN_MATERIALS } from "../../../src/game/creature/roomTiles.ts";
import { FOE_HD, FOE_ART_PHASES } from "../../../src/game/creature/foeArt.ts";
import { ambusherSvg, swimmerSvg, dropperSvg } from "./foesArt.mjs";
import { HD_AVATAR, WORN_STRIPS, AVATAR_FAMILIES, AVATAR_DIETS, bodyPath, wornPath } from "../../../src/game/creature/avatarLook.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const POSES = ["idle", "walk", "jump", "bite", "crouch"];
const frameArgs = () => POSES.flatMap(pose => [0, 1, 2, 3].map(frame => ({ pose, frame })));

/** Pack SVG frames into one PNG (data URL) in the page: cells in row-major order. */
async function pack(page, svgs, columns, cell) {
  return page.evaluate(async ({ svgs, columns, cell }) => {
    const rows = Math.ceil(svgs.length / columns), c = document.createElement("canvas");
    c.width = columns * cell; c.height = rows * cell;
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
    for (const [i, svg] of svgs.entries()) {
      const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
      x.drawImage(img, (i % columns) * cell, Math.floor(i / columns) * cell, cell, cell);
    }
    return c.toDataURL("image/png");
  }, { svgs, columns, cell });
}
const save = (rel, dataUrl) => { const out = join(ROOT, "public", rel); writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64")); return out; };

const browser = await chromium.launch();
const page = await browser.newPage();
const written = [];
for (const family of AVATAR_FAMILIES) {
  for (const diet of AVATAR_DIETS) {
    const svgs = frameArgs().map(({ pose, frame }) => creatureSvg(family, diet, pose, {}, { frame, layer: "body" }));
    written.push(save(bodyPath(family, diet), await pack(page, svgs, HD_AVATAR.bodyColumns, HD_AVATAR.cell)));
  }
  // Overlays are diet-independent; geometry is identical across diets, so any palette drives the leg mask.
  const svgs = WORN_STRIPS.flatMap(strip => frameArgs().map(({ pose, frame }) => creatureSvg(family, "omnivore", pose, {}, { frame, layer: strip })));
  written.push(save(wornPath(family), await pack(page, svgs, HD_AVATAR.wornColumns, HD_AVATAR.cell)));
}

// Water threats: 5 phases x 4 frames each (charger C-0105; ambusher, swimmer, dropper in its treatment).
for (const [kind, draw] of [["charger", chargerSvg], ["ambusher", ambusherSvg], ["swimmer", swimmerSvg], ["dropper", dropperSvg]]) {
  const a = FOE_HD[kind];
  written.push(save(a.path, await pack(page, FOE_ART_PHASES.flatMap(ph => [0, 1, 2, 3].map(f => draw(ph, f))), a.columns, a.cell)));
}

// Water room rock autotiles (C-0106): row = material x variant, column = exposed-side mask.
const tiles = TERRAIN_MATERIALS.flatMap(m => Array.from({ length: WATER_TILES.variants }, (_, v) => Array.from({ length: 16 }, (_, mask) => tileSvg(m, v, mask))).flat());
written.push(save(WATER_TILES.path, await pack(page, tiles, WATER_TILES.columns, WATER_TILES.cell)));
// Far backgrounds, one 2x image each (pack() draws square cells, so render these directly).
const backdrop = (svg, w, h) => page.evaluate(async ({ svg, w, h }) => {
  const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
  const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); return c.toDataURL("image/png");
}, { svg, w, h });
written.push(save(WATER_BG.path, await backdrop(backgroundSvg(), WATER_BG.width, WATER_BG.height)));
written.push(save(OVERWORLD_BG.path, await backdrop(overworldBgSvg(), OVERWORLD_BG.width, OVERWORLD_BG.height)));

// Review contact sheet (not shipped): each family x diet, every frame, with and without the full trait kit.
const at = process.argv.indexOf("--preview");
if (at > 0) {
  const kit = { gills: 1, fins: 1, claws: 1, roar: 1, fullArmor: 1 };
  const svgs = AVATAR_FAMILIES.flatMap(f => AVATAR_DIETS.flatMap(d => frameArgs().map(({ pose, frame }) => creatureSvg(f, d, pose, d === "carnivore" ? kit : {}, { frame }))));
  const out = join(ROOT, process.argv[at + 1]); mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from((await pack(page, svgs, 20, 64)).split(",")[1], "base64"));
  console.log("preview", out);
}
await browser.close();
for (const w of written) console.log("wrote", w);
