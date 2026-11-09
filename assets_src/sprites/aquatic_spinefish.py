#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_spinefish.py
# Brief   : WHO: the "spinefish", a mid-water hunter that chases you when you come close and bites; beating one
#           drops JAWS. The prickle's descendant: it must read as "small but mean" at a glance. Silhouette: a
#           compact torpedo bristling with spines along its back and belly, an underbite of teeth.
#           KEY FEATURES: a row of pale spines, a jutting toothy jaw, a red-orange eye, a stubby forked tail.
#           PALETTE: the cell stage's prickle wine-reds and rust (same family, so the player who learned to fear the
#           prickle recognises it), bone spines and teeth.
# Purpose : Atlas with three views (back, side facing right, front), 4 frames (jaw snapping, tail beating).
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_spinefish.py --out public/assets/art/aquatic_spinefish --overwrite --preview-scale 0
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import WAG, fin, poly  # noqa: E402
from cellart import eye, lit_blob, speckle  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("swim", "back"), ("swim", "side"), ("swim", "front")]

PALETTE = {
    "r0": (52, 18, 24), "r1": (92, 34, 38), "r2": (138, 56, 50), "r3": (182, 92, 70), "rR": (220, 140, 110),
    "mottle": (70, 26, 30), "spine": (210, 196, 160), "spineD": (140, 124, 98),
    "fin": (100, 40, 40), "finL": (150, 70, 58), "gum": (60, 10, 16), "tooth": (232, 222, 196),
    "eye": (240, 110, 40), "glint": (255, 220, 160),
}
RAMP = ["r0", "r1", "r2", "r3"]
SNAP = [1, 2, 3, 2]


def spine_row(s, xs, y, up):
    for x in xs:
        poly(s, [(x - 1, y), (x, y - 4 if up else y + 4), (x + 2, y)], "spine")
        s.dot(x, y - 1 if up else y + 1, "spineD")


def side(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 17, 16
    w = WAG[f]
    fin(s, [(cx - 8, cy - 1), (cx - 14, cy - 6 + w), (cx - 12, cy + w), (cx - 14, cy + 6 + w), (cx - 8, cy + 2)], "fin", "finL", (cx - 8, cy))
    spine_row(s, range(cx - 6, cx + 6, 3), cy - 5, True)
    spine_row(s, range(cx - 4, cx + 4, 3), cy + 5, False)
    lit_blob(s, cx, cy, 10, 6, RAMP, rim="rR")
    speckle(s, cx, cy, 10, 6, "mottle", seed=13, n=6)
    j = SNAP[f]
    for x in range(cx + 6, cx + 12):  # the jutting jaw, opening and shutting
        for dy in range(0, j + 1):
            s.dot(x, cy + 1 + dy, "gum")
    for x in range(cx + 6, cx + 12, 2):
        s.dot(x, cy + 1, "tooth")
        s.dot(x + 1, cy + 1 + j, "tooth")
    eye(s, cx + 5, cy - 3, "eye", "glint")
    return s


def back(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 13
    w = WAG[f]
    fin(s, [(cx - 1, cy + 5), (cx + 2, cy + 5), (cx + 3 + w, cy + 15), (cx + w, cy + 11), (cx - 3 + w, cy + 15)], "fin", "finL", (cx, cy + 5))
    lit_blob(s, cx, cy, 7, 7, RAMP, rim="rR")
    for y in range(cy - 8, cy + 3, 3):  # spines down the back, sticking up and out
        poly(s, [(cx - 2, y + 2), (cx, y - 2), (cx + 2, y + 2)], "spine")
    for side_ in (-1, 1):
        for k in range(3):
            x = cx + side_ * (6 + k)
            poly(s, [(x, cy - 3 + k * 3), (x + side_ * 4, cy - 4 + k * 3), (x, cy - 1 + k * 3)], "spine")
    eye(s, cx - 6, cy - 4, "eye", "glint")
    eye(s, cx + 5, cy - 4, "eye", "glint")
    return s


def front(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 15
    for k in range(5):  # a crown of spines
        x = cx - 6 + k * 3
        poly(s, [(x - 1, cy - 6), (x, cy - 11), (x + 2, cy - 6)], "spine")
    lit_blob(s, cx, cy, 7, 7, RAMP, rim="rR")
    j = SNAP[f]
    for y in range(cy + 2, cy + 3 + j):  # the gaping underbite
        for x in range(cx - 4, cx + 5):
            s.dot(x, y, "gum")
    for x in range(cx - 4, cx + 5, 2):
        s.dot(x, cy + 2, "tooth")
        s.dot(x, cy + 2 + j, "tooth")
    for side_ in (-1, 1):
        poly(s, [(cx + side_ * 6, cy + 1), (cx + side_ * 12, cy + 5), (cx + side_ * 6, cy + 4)], "fin")
    eye(s, cx - 5, cy - 3, "eye", "glint")
    eye(s, cx + 4, cy - 3, "eye", "glint")
    for y in range(cy + 7, cy + 12):
        s.dot(cx, y, "fin")
    return s


def draw(pose, direction, frame):
    return {"back": back, "side": side, "front": front}[direction](frame % 4)
