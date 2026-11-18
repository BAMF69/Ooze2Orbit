
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { HD_AVATAR, WORN_STRIPS, PAINTED_SWIM_TRAITS, wornFrameCount, wornPath } from "../../../src/game/creature/avatarLook.ts";
import { WATER_TILES, REED_SHALLOWS_BG, PAINTED_ROCK_ROWS, ROOM_COLS } from "../../../src/game/creature/roomTiles.ts";

const sources = process.argv[2];
if (!sources) throw new Error("Pass the directory containing the approved PNG sources.");
const [family = "aggressive", diet = "carnivore"] = process.argv.slice(3);
const original = family === "aggressive" && diet === "carnivore";
const files = original
  ? ["poses-generated.png", "ridgejaw-jump-crouch.png", "reedwater-generated.png", "reedwater-clean-backdrop.png"]
  : [family + "-" + diet + "-painted-poses.png"];
const inputs = await Promise.all(files.map(async name =>
  "data:image/png;base64," + (await readFile(join(sources, name))).toString("base64")));
inputs.push("data:image/webp;base64," + (await readFile(join("public", wornPath(family)))).toString("base64"));
const browser = await chromium.launch({ channel: process.env.O2O_ART_BROWSER || undefined });
try {
  const page = await browser.newPage();
  const outputs = await page.evaluate(async ({ inputs, cell, columns, tile, bg, terrainRows, roomCols, traits, wornCols, frameCount, paintedWornCount, fittedTraits, original, family }) => {
    const images = await Promise.all(inputs.map(async src => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image;
    }));
    const [poses, extra, room, cave] = images;
    const legacyWorn = images.at(-1);
    function canvas(width, height) {
      const element = document.createElement("canvas");
      element.width = width;
      element.height = height;
      const context = element.getContext("2d", { willReadFrequently: true });
      context.imageSmoothingQuality = "high";
      return [element, context];
    }
    function trim(image, x, y, width, height) {
      const [, g] = canvas(width, height);
      g.drawImage(image, x, y, width, height, 0, 0, width, height);
      const pixels = g.getImageData(0, 0, width, height).data;
      let l = width, t = height, r = -1, b = -1;
      for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
        if (pixels[(j * width + i) * 4 + 3] < 96) continue;
        l = Math.min(i, l); t = Math.min(j, t); r = Math.max(i, r); b = Math.max(j, b);
      }
      if (r < l || b < t) throw new Error("Empty Ridgejaw pose");
      return [x + l, y + t, r - l + 1, b - t + 1];
    }
    const region = (image, x, y, width, height) => [image, trim(image, x, y, width, height)];
    const originalPoses = () => {
      const half = extra.width / 2;
      return [
        region(poses, 0, 0, 710, 510), region(poses, 730, 0, 806, 510),
        region(extra, 0, 0, half, extra.height), region(poses, 0, 510, 710, 514),
        region(extra, half, 0, half, extra.height), region(poses, 730, 510, 806, 514),
      ];
    };
    // Export only the pose's connected silhouette and one pixel of antialiasing.
    function isolatedPose(image, x, y, width, height) {
      const [layer, g] = canvas(width, height);
      g.drawImage(image, -x, -y);
      const pixels = g.getImageData(0, 0, width, height);
      const visited = new Uint8Array(width * height);
      let largest = [];
      for (let n = 0; n < visited.length; n++) {
        if (visited[n] || pixels.data[n * 4 + 3] < 96) continue;
        const group = [n];
        visited[n] = 1;
        for (let i = 0; i < group.length; i++) {
          const px = group[i] % width, py = Math.floor(group[i] / width);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = px + dx, yy = py + dy, next = yy * width + xx;
            if (xx < 0 || xx >= width || yy < 0 || yy >= height || visited[next] || pixels.data[next * 4 + 3] < 96) continue;
            visited[next] = 1;
            group.push(next);
          }
        }
        if (group.length > largest.length) largest = group;
      }
      if (largest.length < width * height / 50) throw new Error("Missing or clipped painted pose at " + x + ", " + y);
      const keep = new Uint8Array(visited.length);
      for (const n of largest) {
        const px = n % width, py = Math.floor(n / width);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = px + dx, yy = py + dy;
          if (xx >= 0 && xx < width && yy >= 0 && yy < height) keep[yy * width + xx] = 1;
        }
      }
      for (let n = 0; n < keep.length; n++) if (!keep[n]) pixels.data[n * 4 + 3] = 0;
      g.putImageData(pixels, 0, 0);
      return region(layer, 0, 0, width, height);
    }
    const gridPoses = () => Array.from({ length: 6 }, (_, index) => {
      const col = index % 3, row = Math.floor(index / 3);
      const x = Math.round(poses.width * col / 3), y = Math.round(poses.height * row / 2);
      return isolatedPose(poses, x, y, Math.round(poses.width * (col + 1) / 3) - x, Math.round(poses.height * (row + 1) / 2) - y);
    });
    const [neutral, stride, jump, bite, crouch, swim] = original ? originalPoses() : gridPoses();
    const rows = [
      [neutral, neutral, neutral, neutral],
      [neutral, stride, neutral, stride],
      [jump, jump, jump, jump],
      [bite, bite, bite, neutral],
      [crouch, crouch, crouch, crouch],
      [swim, swim, swim, swim],
    ];
    const [body, bodyDraw] = canvas(columns * cell, rows.length * cell);
    const [worn, wornDraw] = canvas(legacyWorn.width, Math.ceil(paintedWornCount / wornCols) * cell);
    wornDraw.drawImage(legacyWorn, 0, 0);
    for (const [row, frames] of rows.entries()) for (const [col, [image, bounds]] of frames.entries()) {
      const widthLimit = row === 3 && col !== 3 ? 91 : 86;
      const width = original ? (row === 3 && col !== 3 ? 93 : 88) : Math.min(widthLimit, 69 * bounds[2] / bounds[3]);
      const height = width * bounds[3] / bounds[2];
      const baseline = row === 2 ? 78 : row === 5 ? 86 : 91;
      const bob = row <= 2 || row === 5 ? [0, -1, -2, -1][col] : 0;
      bodyDraw.drawImage(image, ...bounds, col * cell + (cell - width) / 2, row * cell + baseline - height + bob, width, height);
      const [fitted, fittedDraw] = canvas(cell, cell);
      const jawDepth = family === "cautious" ? 0.57 : row === 4 ? 0.55 : 0.43;
      const jawY = baseline - height + height * jawDepth + bob;
      for (const [fittedIndex, trait] of fittedTraits.entries()) {
        const index = row * columns < frameCount ? traits.indexOf(trait) * frameCount + row * columns + col
          : traits.length * frameCount + fittedIndex * columns + col;
        const x = (index % wornCols) * cell;
        const y = Math.floor(index / wornCols) * cell;
        wornDraw.clearRect(x, y, cell, cell);
        fittedDraw.clearRect(0, 0, cell, cell);
        fittedDraw.save();
        fittedDraw.lineWidth = 0.9;
        fittedDraw.strokeStyle = "#421d23";
        if (trait === "roar") {
          fittedDraw.fillStyle = "#e49b82";
          fittedDraw.beginPath();
          fittedDraw.ellipse(74, jawY + 8, 4, 2, -0.32, 0, Math.PI * 2);
          fittedDraw.fill();
          fittedDraw.stroke();
        } else if (trait === "burrow") {
          fittedDraw.fillStyle = "#ead3a2";
          fittedDraw.beginPath();
          fittedDraw.moveTo(78, jawY + 3);
          fittedDraw.lineTo(87, jawY + 6);
          fittedDraw.lineTo(78, jawY + 8);
          fittedDraw.closePath();
          fittedDraw.fill();
          fittedDraw.stroke();
        } else {
          for (let j = 0; j < 3; j++) {
            fittedDraw.fillStyle = j % 2 ? "#cf5971" : "#ed8a91";
            fittedDraw.beginPath();
            fittedDraw.ellipse(69 - j * 3, jawY + 5 - j, 1.35, 3.6, 0.38, 0, Math.PI * 2);
            fittedDraw.fill();
            fittedDraw.stroke();
          }
        }
        fittedDraw.globalCompositeOperation = "destination-in";
        fittedDraw.drawImage(body, col * cell, row * cell, cell, cell, 0, 0, cell, cell);
        fittedDraw.restore();
        wornDraw.drawImage(fitted, x, y);
      }
    }
    const exportImage = c => [c.toDataURL("image/png"), c.toDataURL("image/webp", 0.94)];
    if (!original) return [body, worn].map(exportImage);
    const [stone, stoneDraw] = canvas(16 * tile, (6 + Math.ceil(terrainRows.length * roomCols / 16)) * tile);
    for (let row = 0; row < 6; row++) for (let edges = 0; edges < 16; edges++) {
      const x = edges * tile, y = row * tile, variant = row % 2;
      // Sample the original painted room at its moss edges or inside its rock faces.
      const srcX = 410 + variant * 158;
      const rockY = row >= 4 ? 64 : 852;
      stoneDraw.drawImage(room, srcX, rockY, 93, 72, x, y, tile, tile);
      if (edges & 1) stoneDraw.drawImage(room, 143 + variant * 59, 798, 57, 23, x, y, tile, 15);
      if (edges & 4) stoneDraw.drawImage(room, 449 + variant * 51, 195, 53, 25, x, y + tile - 15, tile, 15);
      stoneDraw.fillStyle = "#091e22aa";
      if (edges & 2) stoneDraw.fillRect(x + tile - 3, y, 3, tile);
      if (edges & 8) stoneDraw.fillRect(x, y, 3, tile);
    }
    // Reassemble each swath from the approved painting at world scale, without a short repeated patch.
    for (const [row, worldY] of terrainRows.entries()) for (let x = 0; x < roomCols; x++) {
      const index = 96 + row * roomCols + x;
      const dx = index % 16 * tile;
      const dy = Math.floor(index / 16) * tile;
      const ceiling = worldY < 6;
      const sourceLeft = ceiling ? (x < 7 ? x * 37 : 380 + (x - 9) * 40) : x * 41;
      const sourceY = ceiling ? worldY * 36 : 798 + (worldY - 19) * 34;
      stoneDraw.drawImage(room, Math.max(0, sourceLeft), sourceY, ceiling ? (x < 7 ? 37 : 40) : 41, ceiling ? 36 : 34, dx, dy, tile, tile);
    }
    const [backdrop, backdropDraw] = canvas(bg.width, bg.height);
    backdropDraw.drawImage(cave, 0, 0, bg.width, bg.height);
    return [body, stone, backdrop, worn].map(exportImage);
  }, { inputs, cell: HD_AVATAR.cell, columns: HD_AVATAR.bodyColumns, tile: WATER_TILES.cell, bg: REED_SHALLOWS_BG, terrainRows: PAINTED_ROCK_ROWS, roomCols: ROOM_COLS, traits: WORN_STRIPS.map(s => s.trait), wornCols: HD_AVATAR.wornColumns, frameCount: HD_AVATAR.frames, paintedWornCount: wornFrameCount(true), fittedTraits: PAINTED_SWIM_TRAITS, original, family });
  const names = original
    ? ["creature_hd_aggressive_carnivore_v2", "creature_hd_reed_shallows_tiles_v1", "creature_hd_reed_shallows_bg_v1", "creature_hd_aggressive_painted_worn_v1"]
    : ["creature_hd_" + family + "_" + diet + "_v2", "creature_hd_" + family + "_" + diet + "_painted_worn_v1"];
  for (const [i, [png, webp]] of outputs.entries()) {
    await writeFile(join("assets_src", "art_masters", names[i] + ".png"), Buffer.from(png.split(",")[1], "base64"));
    await writeFile(join("public", "assets", "art", names[i] + ".webp"), Buffer.from(webp.split(",")[1], "base64"));
  }
} finally {
  await browser.close();
}
