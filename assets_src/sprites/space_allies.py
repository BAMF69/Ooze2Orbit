#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# space_allies.py
# Brief   : WHO: the Tidewrights' two ships (docs/stages/05-space.md), the allied species' escorts you recruit at
#           Tidereach, seen from above, nose up. Grown like yours, but of the sea: tide teal and pearl, not ochre.
#           SKIFF: a slim dart like a squid, a pointed mantle, two side fins, a pearl eye-port, one bright jet.
#           WARDEN: a broad ray-shaped shield-ship, wide rounded wings, a pearl turret dome on its back, two jets.
#           PALETTE: tide teals lit from the top-left, pearl highlights, a warm amber jet (unlike your teal glow).
# Purpose : Atlas (32 px): one row per ship, 4 frames (the jets flicker). The game rotates the sprite.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/space_allies.py --out public/assets/art/space_allies --overwrite --preview-scale 0
# Notes   : PLACEHOLDER toy art. No ground shadow: this is space.
# Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import poly  # noqa: E402
from cellart import lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("skiff", "up"), ("warden", "up")]

PALETTE = {
    "tideK": (14, 60, 76), "tideD": (26, 104, 118), "tide": (52, 160, 164), "tideL": (130, 226, 216), "pearl": (236, 250, 246),
    "eye": (10, 22, 30), "jetD": (200, 110, 30), "jet": (250, 190, 70), "jetL": (255, 244, 190),
}
RAMP = ["tideK", "tideD", "tide", "tideL"]


def jet(s, x, y, f, long):
    n = long + [0, 2, 1, 3][f]
    for i in range(n):
        s.dot(x, y + i, "jetL" if i == 0 else "jet" if i < n - 1 else "jetD")


def draw(pose, direction, frame):
    s = Sprite(PALETTE, CELL)
    f = frame % 4
    if pose == "skiff":
        jet(s, 15, 26, f, 2); jet(s, 16, 26, f, 3)
        poly(s, [(12, 16), (5, 24), (12, 23)], "tideD")     # side fins
        poly(s, [(20, 16), (27, 24), (20, 23)], "tideK")
        poly(s, [(16, 2), (20, 10), (20, 25), (12, 25), (12, 10)], "tide")  # the mantle
        lit_blob(s, 16, 15, 4, 10, RAMP, rim="pearl")
        for y in (12, 17, 22):
            s.dot(14, y, "tideK"); s.dot(18, y, "tideK")
        s.dot(15, 8, "eye"); s.dot(16, 8, "eye"); s.dot(15, 9, "eye"); s.dot(16, 9, "eye"); s.dot(15, 8, "pearl")
    else:  # warden
        jet(s, 12, 26, f, 2); jet(s, 20, 26, f, 2)
        poly(s, [(16, 4), (26, 12), (30, 20), (22, 26), (10, 26), (2, 20), (6, 12)], "tideD")  # the ray's wings
        lit_blob(s, 9, 18, 6, 6, RAMP, rim="pearl")
        lit_blob(s, 23, 18, 6, 6, RAMP)
        lit_blob(s, 16, 15, 7, 10, RAMP, rim="pearl")        # the body
        lit_blob(s, 16, 15, 3, 3, ["tideL", "tideL", "pearl", "pearl"])  # the turret dome
        s.dot(16, 15, "eye")
        for x in range(4, 29, 4):
            s.dot(x, 22, "tideK")
        s.dot(14, 7, "eye"); s.dot(18, 7, "eye")
    return s
