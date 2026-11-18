// ---------------------------------------------------------------------------
// render.mjs (docs/concepts/creature-hd/src)
// Purpose : Rasterize concept boards (HTML + inline SVG) to PNG in headless Chromium (Playwright, already a
//           project dev dependency). Gameplay-size panels are drawn in-page: the SVG is rasterized to its real
//           texture size (32 px), then that texture is scaled as the game canvas would scale it.
// Usage   : await renderBoard(html, outPath, width, height)
// Notes   : CONCEPT ONLY. <canvas class="game" data-svg data-tex data-scale data-smooth> is filled by PAGE_JS.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";

let browser = null;
export async function open() { browser ??= await chromium.launch(); return browser; }
export async function close() { if (browser) await browser.close(); browser = null; }

// Rasterize each data-svg to a tex x tex canvas, then draw it scaled (smooth like the game's CSS scaling).
const PAGE_JS = `
async function texture(svg, w, h) {
  const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
  const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); return c;
}
window.__ready = (async () => {
  for (const el of document.querySelectorAll("canvas.game")) {
    const tex = +el.dataset.tex, s = +el.dataset.scale, smooth = el.dataset.smooth !== "0";
    const t = await texture(decodeURIComponent(el.dataset.svg), tex, tex);
    el.width = Math.round(tex * s); el.height = Math.round(tex * s);
    const x = el.getContext("2d"); x.imageSmoothingEnabled = smooth; x.imageSmoothingQuality = "high"; x.drawImage(t, 0, 0, el.width, el.height);
  }
  for (const el of document.querySelectorAll("canvas.scene")) {
    // A whole 640x360 logical frame: background SVG at 1:1, sprites composited at real texture size, then scaled.
    const spec = JSON.parse(decodeURIComponent(el.dataset.spec));
    const frame = document.createElement("canvas"); frame.width = spec.w; frame.height = spec.h;
    const fx = frame.getContext("2d");
    fx.drawImage(await texture(spec.bg, spec.w, spec.h), 0, 0);
    for (const s of spec.sprites) {
      const t = await texture(s.svg, s.tex, s.tex);
      fx.save(); fx.translate(s.x, s.y); if (s.flip) fx.scale(-1, 1); fx.drawImage(t, -s.tex / 2, -s.tex, s.tex, s.tex); fx.restore();
    }
    if (spec.overlay) fx.drawImage(await texture(spec.overlay, spec.w, spec.h), 0, 0);
    const [cx, cy, cw, ch] = spec.crop ?? [0, 0, spec.w, spec.h];
    el.width = Math.round(cw * spec.scale); el.height = Math.round(ch * spec.scale);
    const x = el.getContext("2d"); x.imageSmoothingEnabled = spec.smooth !== false; x.imageSmoothingQuality = "high";
    x.drawImage(frame, cx, cy, cw, ch, 0, 0, el.width, el.height);
  }
})();`;

export const gameCanvas = (svg, tex, scale, smooth = true) =>
  `<canvas class="game" data-svg="${encodeURIComponent(svg)}" data-tex="${tex}" data-scale="${scale}" data-smooth="${smooth ? 1 : 0}"></canvas>`;
export const sceneCanvas = (spec) => `<canvas class="scene" data-spec="${encodeURIComponent(JSON.stringify(spec))}"></canvas>`;

export async function renderBoard(html, out, width, height) {
  const b = await open();
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}<script>${PAGE_JS}</script></body></html>`);
  await page.evaluate(() => window.__ready);
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
}

const CSS = `
body{margin:0;background:#14232a;color:#e8e2cf;font:15px/1.35 "Segoe UI",system-ui,sans-serif;padding:24px}
h1{font:600 26px Georgia,serif;margin:0 0 4px;color:#f3e7c4} h2{font:600 17px Georgia,serif;margin:18px 0 8px;color:#f0d9a0}
.sub{color:#9fb6b4;margin:0 0 14px;font-size:14px} .row{display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap}
.card{background:#1d3038;border:2px solid #0d1a20;border-radius:10px;padding:10px;text-align:center}
.card svg{display:block} .lab{font-size:13px;color:#cfd8cf;margin-top:6px} .tag{font-size:12px;color:#8fa6a4}
canvas{display:block;margin:0 auto} .px canvas{image-rendering:pixelated}
.grid{display:grid;gap:12px} .note{font-size:13px;color:#9fb6b4;max-width:1100px}
.ground{background:linear-gradient(#24414a 0 78%,#3b5449 78%)}
`;
