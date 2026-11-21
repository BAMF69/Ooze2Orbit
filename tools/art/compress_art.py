# ---------------------------------------------------------------------------
# compress_art.py
# Purpose : Keep the web build small (BAMF69 2026-11-17: "compress artwork for github pages"). Painted art ships as
#           WebP; the full-quality PNG stays in the repo as the master, outside the build.
#           1. Any PNG in public/assets/art over the size limit moves to assets_src/art_masters/ (the master).
#           2. Every master gets public/assets/art/<name>.webp (lossy, alpha kept, same pixel size, so sprite frame
#              rectangles and atlas JSON stay valid). Re-encoded only when the master is newer.
#           3. References to "<name>.png" in src/ and index.html become "<name>.webp".
# Usage   : python tools/art/compress_art.py            convert, then review `git status` and run check/test/smoke
#           python tools/art/compress_art.py --check    report only, writes nothing (exit 1 if work is pending)
#           python tools/art/compress_art.py --quality 85
# Notes   : Needs Pillow with WebP (dev machine only; nothing here ships). Small pixel-art atlases stay PNG on
#           purpose: lossy compression smears hard pixel edges, and they are a few KB anyway. Paths built from
#           templates (`aquatic_${diet}_...png`) are not rewritten: the script lists them, fix those by hand.
#           tests/artBudget.test.ts fails when a PNG over the limit is left in public/assets/art.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, features

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "public" / "assets" / "art"
MASTERS = ROOT / "assets_src" / "art_masters"
LIMIT = 200 * 1024  # bytes; keep in sync with tests/artBudget.test.ts
QUALITY = 90
# Only what the game loads. Dev tools that measure pixels read the PNG masters on purpose.
REF_GLOBS = ["src/**/*.ts", "src/**/*.css", "src/**/*.json", "index.html"]


def encode(master: Path, out: Path, quality: int) -> None:
    with Image.open(master) as im:
        im.load()
        mode = "RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB"
        im.convert(mode).save(out, "WEBP", quality=quality, alpha_quality=100, method=6)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="report only, write nothing")
    ap.add_argument("--quality", type=int, default=QUALITY)
    args = ap.parse_args()
    if not features.check("webp"):
        print("[FAIL] this Pillow has no WebP support"); return 2

    pending = 0
    MASTERS.mkdir(parents=True, exist_ok=True)
    # 1. Oversized PNGs in the build become masters.
    for png in sorted(ART.glob("*.png")):
        if png.stat().st_size > LIMIT:
            pending += 1
            print(f"move   {png.name} ({png.stat().st_size / 1048576:.2f} MB) -> assets_src/art_masters/")
            if not args.check:
                shutil.move(str(png), MASTERS / png.name)

    # 2. Every master has an up-to-date WebP in the build.
    before = after = 0
    masters = sorted(MASTERS.glob("*.png"))
    for master in masters:
        out = ART / (master.stem + ".webp")
        before += master.stat().st_size
        if not out.exists() or out.stat().st_mtime < master.stat().st_mtime:
            pending += 1
            if args.check:
                print(f"encode {master.name}"); continue
            encode(master, out, args.quality)
        after += out.stat().st_size if out.exists() else 0

    # 3. Literal references follow the files.
    names = [m.stem for m in masters] if not args.check else [m.stem for m in masters] + [p.stem for p in ART.glob("*.png") if p.stat().st_size > LIMIT]
    literal = re.compile(r"\b(" + "|".join(map(re.escape, names)) + r")\.png\b") if names else None
    templated = re.compile(r"assets/art/[^\"'`]*\$\{[^\"'`]*\.png")
    for pattern in REF_GLOBS:
        for f in ROOT.glob(pattern):
            if f.resolve() == Path(__file__).resolve():
                continue
            text = f.read_text(encoding="utf-8")
            new = literal.sub(r"\1.webp", text) if literal else text
            if new != text:
                pending += 1
                print(f"refs   {f.relative_to(ROOT)}: {len(literal.findall(text))} path(s)")
                if not args.check:
                    f.write_text(new, encoding="utf-8", newline="")
            for m in templated.finditer(new):
                print(f"check  {f.relative_to(ROOT)}: templated path, convert by hand if it names a master: {m.group(0)[:90]}")

    if not args.check:
        print(f"[ OK ] {len(masters)} master(s): {before / 1048576:.1f} MB PNG -> {after / 1048576:.1f} MB WebP (quality {args.quality})")
    elif pending:
        print(f"[FAIL] {pending} item(s) to do: run python tools/art/compress_art.py")
        return 1
    else:
        print("[ OK ] nothing to compress")
    return 0


if __name__ == "__main__":
    sys.exit(main())

# ---------------------------------------------------------------------------
# End of compress_art.py
# ---------------------------------------------------------------------------
