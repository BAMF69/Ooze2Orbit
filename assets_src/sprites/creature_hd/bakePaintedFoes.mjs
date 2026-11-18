
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { FOE_HD, HD_FOE_KINDS } from "../../../src/game/creature/foeArt.ts";

const [, , sourceDirectory, ...requested] = process.argv;
if (!sourceDirectory || requested.some(kind => !HD_FOE_KINDS.includes(kind))) {
  throw new Error("Usage: node bakePaintedFoes.mjs <source-directory> [charger ambusher swimmer dropper]");
}
const browser = await chromium.launch({ channel: process.env.O2O_ART_BROWSER || undefined });
try {
  const page = await browser.newPage();
  for (const kind of requested.length ? requested : HD_FOE_KINDS) {
    const pixels = await readFile(join(sourceDirectory, kind + "-painted-poses.png"));
    const { cell, columns } = FOE_HD[kind];
    const output = await page.evaluate(async ({ src, kind, cell, columns }) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      function canvas(w, h) {
        const element = document.createElement("canvas");
        element.width = w;
        element.height = h;
        const g = element.getContext("2d", { willReadFrequently: true });
        g.imageSmoothingQuality = "high";
        return [element, g];
      }

      function crop(phase) {
        const col = phase % 3, row = Math.floor(phase / 3);
        // The ambusher's lunge reaches back into the nominal middle column.
        const columns = kind === "ambusher" && row === 0 ? [0, 512 / 1536, 940 / 1536, 1] : [0, 1 / 3, 2 / 3, 1];
        const left = Math.round(image.width * columns[col]), top = Math.round(image.height * row / 2);
        const width = Math.round(image.width * columns[col + 1]) - left;
        const height = Math.round(image.height * (row + 1) / 2) - top;
        const [pose, g] = canvas(width, height);
        g.drawImage(image, -left, -top);
        const rgba = g.getImageData(0, 0, width, height);
        const visited = new Uint8Array(width * height);
        let main = [];
        for (let n = 0; n < visited.length; n++) {
          if (visited[n] || rgba.data[n * 4 + 3] < 100) continue;
          const group = [n];
          visited[n] = 1;
          for (let i = 0; i < group.length; i++) {
            const x = group[i] % width, y = Math.floor(group[i] / width);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx, yy = y + dy, next = yy * width + xx;
              if (xx < 0 || yy < 0 || xx >= width || yy >= height || visited[next] || rgba.data[next * 4 + 3] < 100) continue;
              visited[next] = 1;
              group.push(next);
            }
          }
          if (group.length > main.length) main = group;
        }
        if (main.length < width * height / 60) throw new Error(kind + " missing pose " + phase);
        let x0 = width, y0 = height, x1 = 0, y1 = 0;
        const keep = new Uint8Array(visited.length);
        for (const n of main) {
          const x = n % width, y = Math.floor(n / width);
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < width && yy < height) keep[yy * width + xx] = 1;
          }
        }
        for (let n = 0; n < keep.length; n++) if (!keep[n]) rgba.data[n * 4 + 3] = 0;
        g.putImageData(rgba, 0, 0);
        return { pose, bounds: [x0, y0, x1 - x0 + 1, y1 - y0 + 1] };
      }

      const [sheet, g] = canvas(columns * cell, 5 * cell);
      const patrolWidths = { charger: 0.84, ambusher: 0.80, swimmer: 0.91, dropper: 0.76 };
      for (let phase = 0; phase < 5; phase++) {
        const { pose, bounds } = crop(phase);
        const airborne = kind === "swimmer" || (kind === "dropper" && phase <= 2);
        const widthLimit = cell * (patrolWidths[kind] + (phase === 2 ? 0.035 : 0));
        const heightLimit = cell * (airborne ? 0.82 : 0.76);
        const scale = Math.min(widthLimit / bounds[2], heightLimit / bounds[3]);
        const w = bounds[2] * scale, h = bounds[3] * scale;
        const anchor = airborne ? (cell - h) / 2 : cell * 0.94 - h;
        for (let frame = 0; frame < columns; frame++) {
          const bob = phase === 4 ? 0 : airborne ? [0, -1, -2, -1][frame] : 0;
          const lean = phase === 0 ? [0, 1, 0, -1][frame] : 0;
          g.drawImage(pose, ...bounds, frame * cell + (cell - w) / 2 + lean, phase * cell + anchor + bob, w, h);
        }
      }
      return [sheet.toDataURL("image/png"), sheet.toDataURL("image/webp", 0.94)];
    }, { src: "data:image/png;base64," + pixels.toString("base64"), kind, cell, columns });
    const name = basename(FOE_HD[kind].path).replace(/_v\d+\.webp$/, "_v2");
    await writeFile(join("assets_src", "art_masters", name + ".png"), Buffer.from(output[0].split(",")[1], "base64"));
    await writeFile(join("public", "assets", "art", name + ".webp"), Buffer.from(output[1].split(",")[1], "base64"));
  }
} finally {
  await browser.close();
}
