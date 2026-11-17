# ---------------------------------------------------------------------------
# package_itch.py
# Purpose : Turn dist/ into the zip itch.io plays in the browser (BAMF69 2026-11-17: host the demo on
#           https://bamf69.itch.io/ooze2orbitdemo). Checks itch's HTML5 rules first, so a bad upload is caught here
#           rather than on the itch dashboard.
# Usage   : python tools/dev.py build && python tools/package_itch.py
#           -> build/itch/ooze2orbit-web-<version>.zip  (upload as "This file will be played in the browser")
# Notes   : itch rules (https://itch.io/docs/creators/html5, checked 2026-11-17; the file-count figure varies between
#           sources, so the strictest one is used): index.html at the zip root, at most 1000 files, no file over
#           200 MB, at most 500 MB unpacked, relative paths only (an absolute "/assets/..." breaks inside itch's
#           iframe host). Version comes from package.json, the project's one version source (SOP-06).
#           butler (.github/workflows/itch.yml) uploads dist/ directly and does not need this zip.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUT = ROOT / "build" / "itch"
MAX_FILES, MAX_FILE, MAX_TOTAL = 1000, 200 * 1024 * 1024, 500 * 1024 * 1024
ABSOLUTE = re.compile(r"""["'(]/assets/""")


def problems(files: list[Path]) -> list[str]:
    out = []
    if not (DIST / "index.html").exists():
        out.append("dist/index.html missing: run python tools/dev.py build")
    if len(files) > MAX_FILES:
        out.append(f"{len(files)} files, itch allows {MAX_FILES}")
    total = sum(f.stat().st_size for f in files)
    if total > MAX_TOTAL:
        out.append(f"{total / 1048576:.0f} MB unpacked, itch allows 500 MB")
    out += [f"{f.relative_to(DIST)} is over 200 MB" for f in files if f.stat().st_size > MAX_FILE]
    for f in files:
        if f.suffix in (".html", ".css", ".js") and ABSOLUTE.search(f.read_text(encoding="utf-8", errors="ignore")):
            out.append(f"{f.relative_to(DIST)} uses an absolute /assets/ path (breaks on itch): make it relative")
    return out


def main() -> int:
    files = sorted(p for p in DIST.rglob("*") if p.is_file()) if DIST.exists() else []
    bad = problems(files)
    if bad:
        for b in bad:
            print(f"[FAIL] {b}")
        return 1
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    OUT.mkdir(parents=True, exist_ok=True)
    zpath = OUT / f"ooze2orbit-web-{version}.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in files:
            z.write(f, f.relative_to(DIST).as_posix())
    total = sum(f.stat().st_size for f in files)
    print(f"[ OK ] {zpath.relative_to(ROOT)}: {len(files)} files, {total / 1048576:.1f} MB unpacked, "
          f"{zpath.stat().st_size / 1048576:.1f} MB zipped (version {version})")
    return 0


if __name__ == "__main__":
    sys.exit(main())

# ---------------------------------------------------------------------------
# End of package_itch.py
# ---------------------------------------------------------------------------
