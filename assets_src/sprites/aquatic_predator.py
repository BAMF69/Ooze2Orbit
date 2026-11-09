#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_predator.py
# Brief   : WHO: the "deepmaw", the lake's apex predator, the gulper's descendant grown huge. Silhouette: a heavy,
#           blunt-headed body three times your swimmer's size, a wide jaw full of teeth, a ragged spined back and a
#           thick tail. It must read as DANGER at any distance, from behind, from the side and head-on.
#           KEY FEATURES: the gulper's bruise-purple mottled hide, bone teeth over a red gullet, two ember eyes (the
#           only warm light on it), dorsal spines.
#           PALETTE: pond_predators.py's bruise purples, umber, red gullet, bone teeth, ember-red eyes (same family:
#           the player who learned to fear the gulper recognises this).
# Purpose : Atlas with three views (back, side facing right, front), 4 frames each (jaw working, tail sweeping).
#           64 px cells so it can be shown big without chunky pixels.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_predator.py --out public/assets/art/aquatic_predator --overwrite --preview-scale 0
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import poly, fin  # noqa: E402
from cellart import eye, lit_blob, speckle  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 64
FRAMES = 4
SHADOW = False
ROWS = [("swim", "back"), ("swim", "side"), ("swim", "front")]

PALETTE = {
    "pD": (32, 18, 32), "p1": (58, 32, 56), "p2": (86, 50, 78), "p3": (120, 76, 102), "pR": (168, 118, 138),
    "mottle": (46, 26, 44), "gullet": (16, 6, 12), "gum": (112, 38, 54), "gumL": (150, 62, 72),
    "tooth": (228, 216, 190), "toothD": (150, 136, 112), "eye": (232, 70, 50), "eyeL": (255, 190, 140),
    "spine": (74, 44, 66), "spineL": (110, 70, 96),
}
RAMP = ["pD", "p1", "p2", "p3"]
SWEEP = [-4, 0, 4, 0]
JAW = [3, 6, 8, 5]


def spines(s, x0, x1, y, h, step=4):
    """A row of dorsal spines along the top edge, pointing up."""
    for x in range(x0, x1, step):
        poly(s, [(x, y), (x + 1, y - h), (x + 3, y)], "spine")
        s.dot(x + 1, y - h + 1, "spineL")


def teeth_row(s, x0, x1, y, down):
    for x in range(x0, x1, 3):
        for k in range(3):
            s.dot(x, y + (k if down else -k), "tooth" if k < 2 else "toothD")


def back(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 32, 27
    sw = SWEEP[f]
    fin(s, [(cx - 3, cy + 10), (cx + 3, cy + 10), (cx + 8 + sw, cy + 33), (cx + sw, cy + 26), (cx - 8 + sw, cy + 33)],
        "spine", "spineL", (cx, cy + 10))  # tail nearest the camera
    fin(s, [(cx - 15, cy + 3), (cx - 27, cy + 9), (cx - 15, cy + 9)], "spine", "spineL", (cx - 15, cy + 5))
    fin(s, [(cx + 15, cy + 3), (cx + 27, cy + 9), (cx + 15, cy + 9)], "spine", "spineL", (cx + 15, cy + 5))
    lit_blob(s, cx, cy, 17, 14, RAMP, rim="pR")
    speckle(s, cx, cy, 17, 14, "mottle", seed=3, n=22, min_light=0.1)
    for y in range(cy - 13, cy + 6, 3):  # spine ridge down the back
        poly(s, [(cx - 2, y + 2), (cx, y - 2), (cx + 2, y + 2)], "spine")
    eye(s, cx - 12, cy - 9, "eye", "eyeL")  # ember eyes glimpsed at the sides of the head
    eye(s, cx + 11, cy - 9, "eye", "eyeL")
    return s


def side(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 34, 32
    sw = SWEEP[f] // 2
    fin(s, [(cx - 18, cy - 3), (cx - 31, cy - 15 + sw), (cx - 26, cy + sw), (cx - 31, cy + 15 + sw), (cx - 18, cy + 4)],
        "spine", "spineL", (cx - 18, cy))
    spines(s, cx - 12, cx + 12, cy - 12, 7)
    fin(s, [(cx - 6, cy + 10), (cx - 12, cy + 20), (cx, cy + 12)], "spine", "spineL", (cx - 4, cy + 11))  # pectoral
    lit_blob(s, cx, cy, 22, 14, RAMP, rim="pR")
    speckle(s, cx, cy, 22, 14, "mottle", seed=9, n=30, min_light=0.12)
    # the jaw: a wedge cut from the front, opening and shutting
    j = JAW[f]
    tip = cx + 22
    for x in range(cx + 6, tip + 1):
        t = (x - (cx + 6)) / (tip - (cx + 6))
        half = int(round(1 + j * t))
        for dy in range(-half, half + 1):
            s.dot(x, cy + 3 + dy, "gum" if abs(dy) >= half - 1 and t > 0.3 else "gullet")
    teeth_row(s, cx + 11, tip, cy + 3 - j + 1, True)
    teeth_row(s, cx + 12, tip, cy + 3 + j - 1, False)
    s.dot(tip - 1, cy + 2 - j, "gumL")
    eye(s, cx + 12, cy - 8, "eye", "eyeL")
    return s


def front(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 32, 30
    j = JAW[f]
    fin(s, [(cx - 16, cy + 2), (cx - 29, cy + 8), (cx - 16, cy + 8)], "spine", "spineL", (cx - 16, cy + 4))
    fin(s, [(cx + 16, cy + 2), (cx + 29, cy + 8), (cx + 16, cy + 8)], "spine", "spineL", (cx + 16, cy + 4))
    spines(s, cx - 8, cx + 9, cy - 14, 6)
    lit_blob(s, cx, cy, 18, 16, RAMP, rim="pR")
    speckle(s, cx, cy, 18, 16, "mottle", seed=17, n=20, min_light=0.12)
    # the maw head-on: a dark oval ringed with gums and teeth, opening with the frame
    mw, mh = 11, 3 + j
    for y in range(cy + 3 - mh, cy + 4 + mh):
        for x in range(cx - mw, cx + mw + 1):
            d = ((x - cx) / mw) ** 2 + ((y - cy - 3) / mh) ** 2
            if d <= 1:
                s.dot(x, y, "gum" if d > 0.7 else "gullet")
    teeth_row(s, cx - 9, cx + 10, cy + 3 - mh + 1, True)
    teeth_row(s, cx - 8, cx + 9, cy + 3 + mh - 1, False)
    eye(s, cx - 11, cy - 8, "eye", "eyeL")
    eye(s, cx + 10, cy - 8, "eye", "eyeL")
    return s


def draw(pose, direction, frame):
    return {"back": back, "side": side, "front": front}[direction](frame % 4)
