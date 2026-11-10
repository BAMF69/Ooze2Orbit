#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# space_ships.py
# Brief   : WHO: the home species' two ship hulls (docs/stages/05-space.md, Toy 1), seen from above, nose up. They
#           are grown, not machined: the lineage's ochre shell, like the walker's back.
#           SEEDPOD: a small teardrop pod, a ridged shell, one dark eye-port, two swept fin-engines at the tail.
#           CARAPACE: a broad beetle shell in three overlapping plates, shoulder spines, three stubby tail vents.
#           PALETTE: the lineage's ochre lit from the top-left, bone ridges, a teal engine glow (the brightest thing).
# Purpose : Atlas (32 px): one row per hull, 4 frames (the engine glow flickers). The game rotates the sprite.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/space_ships.py --out public/assets/art/space_ships --overwrite --preview-scale 0
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
ROWS = [("seedpod", "up"), ("carapace", "up")]

PALETTE = {
    "deep": (78, 50, 26), "dark": (128, 84, 42), "base": (176, 122, 62), "light": (214, 166, 98), "rim": (240, 210, 154),
    "bone": (226, 216, 190), "boneD": (160, 148, 122), "eye": (16, 12, 10), "glint": (250, 236, 200),
    "glowD": (40, 150, 150), "glow": (110, 230, 220), "glowL": (220, 255, 250),
}
RAMP = ["deep", "dark", "base", "light"]


def flame(s, x, y, f, long):
    """An engine glow under a vent at (x, y): flickers with the frame."""
    n = long + [0, 1, 0, 2][f]
    for i in range(n):
        s.dot(x, y + i, "glowL" if i == 0 else "glow" if i < n - 1 else "glowD")


def draw(pose, direction, frame):
    s = Sprite(PALETTE, CELL)
    f = frame % 4
    if pose == "seedpod":
        poly(s, [(11, 20), (4, 28), (10, 26)], "dark")   # swept fin-engines
        poly(s, [(21, 20), (28, 28), (22, 26)], "dark")
        s.dot(6, 26, "light"); s.dot(26, 26, "base")
        flame(s, 9, 27, f, 2); flame(s, 23, 27, f, 2)
        poly(s, [(16, 2), (20, 8), (22, 16), (20, 25), (12, 25), (10, 16), (12, 8)], "base")  # the teardrop shell
        lit_blob(s, 16, 15, 5, 9, RAMP, rim="rim")
        for y in (11, 15, 19):                            # ridges across the shell
            for x in range(12, 21):
                if (x + y) % 3:
                    s.dot(x, y, "boneD")
        s.dot(16, 3, "bone"); s.dot(16, 4, "bone")        # nose spine
        s.dot(15, 7, "eye"); s.dot(16, 7, "eye"); s.dot(15, 8, "eye"); s.dot(16, 8, "eye"); s.dot(15, 7, "glint")
    else:  # carapace
        for x0 in (11, 16, 21):                           # three tail vents
            s.dot(x0, 26, "deep"); s.dot(x0, 27, "deep")
            flame(s, x0, 28, f, 2)
        poly(s, [(16, 3), (24, 8), (27, 17), (24, 26), (8, 26), (5, 17), (8, 8)], "dark")
        lit_blob(s, 16, 20, 10, 6, RAMP, rim="rim")       # rear plate
        lit_blob(s, 16, 14, 9, 6, RAMP, rim="rim")        # middle plate, overlapping
        lit_blob(s, 16, 8, 6, 5, RAMP, rim="rim")         # head plate
        for x in range(8, 25):                            # the seams between plates
            s.dot(x, 12, "deep"); s.dot(x, 19, "deep")
        for x0, d in ((6, -1), (26, 1)):                  # shoulder spines
            s.dot(x0, 10, "bone"); s.dot(x0 + d, 9, "bone"); s.dot(x0 + d, 8, "boneD")
        s.dot(14, 6, "eye"); s.dot(15, 6, "eye"); s.dot(17, 6, "eye"); s.dot(18, 6, "eye"); s.dot(14, 6, "glint")
    return s
