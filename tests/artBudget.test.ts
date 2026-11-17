// ---------------------------------------------------------------------------
// artBudget.test.ts
// Purpose : Keeps the web build light (BAMF69 2026-11-17: compress artwork for GitHub Pages). Painted art ships as
//           WebP made from PNG masters in assets_src/art_masters/; a large PNG dropped into public/assets/art would
//           quietly double the download again.
// Notes   : Fix a failure with `python tools/art/compress_art.py` (moves the PNG to the masters, writes the WebP,
//           rewrites literal paths), then fix any templated load path it lists. LIMIT matches that script.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ART = join(__dirname, "..", "public", "assets", "art");
const MASTERS = join(__dirname, "..", "assets_src", "art_masters");
const LIMIT = 200 * 1024;
const list = (dir: string, ext: string) => readdirSync(dir).filter((f) => f.endsWith(ext));

describe("art budget for the web build", () => {
  it("no PNG over 200 KB ships: painted art goes through tools/art/compress_art.py", () => {
    const big = list(ART, ".png").filter((f) => statSync(join(ART, f)).size > LIMIT);
    expect(big, `run python tools/art/compress_art.py for: ${big.join(", ")}`).toEqual([]);
  });
  it("every PNG master has its WebP in the build", () => {
    const missing = list(MASTERS, ".png").map((f) => f.replace(/\.png$/, ".webp")).filter((f) => !list(ART, ".webp").includes(f));
    expect(missing, "run python tools/art/compress_art.py").toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// End of artBudget.test.ts
// ---------------------------------------------------------------------------
