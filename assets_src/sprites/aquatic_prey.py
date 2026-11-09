#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_prey.py
# Brief   : WHO: the "darter", small quick prey of the lake, what you hunt. Silhouette: long and slender, a
#           pointed snout, a deeply forked tail; it should read as "small and quick, catchable" next to your rounder
#           swimmer and the predator's bulk.
#           KEY FEATURES: a dark stripe from snout to tail, a silvery lit back, one beady eye, a twitching tail.
#           PALETTE: cool slate and olive-silver (the cell stage's slate-blue snails' family), a darker stripe, so it
#           never reads as your own ochre kin.
# Purpose : Atlas with three views (back, side facing right, front), 4 swim frames each.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_prey.py --out public/assets/art/aquatic_prey --overwrite --preview-scale 0
# Notes   : Drawn to fill the cell (first-art floor); the game shows it smaller than your swimmer.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import FLAP, WAG, fin  # noqa: E402
from cellart import eye, lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("swim", "back"), ("swim", "side"), ("swim", "front")]

PALETTE = {
    "d0": (40, 52, 60), "d1": (70, 90, 98), "d2": (112, 134, 136), "d3": (160, 178, 170), "rim": (206, 218, 204),
    "stripe": (34, 42, 48), "fin": (78, 92, 74), "finL": (122, 138, 110),
    "eye": (16, 16, 20), "glint": (230, 232, 222),
}
RAMP = ["d0", "d1", "d2", "d3"]


def back(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 12
    w = WAG[f]
    fin(s, [(cx - 1, cy + 4), (cx + 1, cy + 4), (cx + 4 + w, cy + 16), (cx + w, cy + 11), (cx - 3 + w, cy + 16)],
        "fin", "finL", (cx, cy + 4))
    fl = FLAP[f]
    fin(s, [(cx - 5, cy + 1), (cx - 10, cy + 4 + fl), (cx - 5, cy + 4)], "fin", "finL", (cx - 5, cy + 2))
    fin(s, [(cx + 5, cy + 1), (cx + 10, cy + 4 + fl), (cx + 5, cy + 4)], "fin", "finL", (cx + 5, cy + 2))
    lit_blob(s, cx, cy, 5, 6, RAMP, rim="rim")
    for y in range(cy - 5, cy + 5):
        s.dot(cx, y, "stripe")
    return s


def side(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 17, 15
    w = WAG[f]
    fin(s, [(cx - 10, cy), (cx - 16, cy - 8 + w), (cx - 14, cy + w), (cx - 16, cy + 8 + w), (cx - 10, cy + 1)],
        "fin", "finL", (cx - 10, cy))
    fin(s, [(cx - 3, cy - 3), (cx + 1, cy - 10), (cx + 3, cy - 3)], "fin", "finL", (cx, cy - 3))
    fin(s, [(cx - 4, cy + 3), (cx - 6, cy + 9), (cx - 1, cy + 3)], "fin", "finL", (cx - 3, cy + 3))  # anal fin
    lit_blob(s, cx, cy, 12, 4, RAMP, rim="rim")
    for x in range(cx - 10, cx + 10):
        s.dot(x, cy, "stripe")
    for x in range(cx + 10, cx + 14):  # pointed snout
        s.dot(x, cy, "d1")
    eye(s, cx + 7, cy - 2, "eye", "glint")
    fl = FLAP[f]
    fin(s, [(cx + 2, cy + 2), (cx - 2, cy + 7 + fl), (cx + 4, cy + 4)], "fin", "finL", (cx + 2, cy + 2))
    return s


def front(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 15
    fl = FLAP[f]
    fin(s, [(cx - 5, cy + 1), (cx - 11, cy + 4 + fl), (cx - 5, cy + 4)], "fin", "finL", (cx - 5, cy + 2))
    fin(s, [(cx + 5, cy + 1), (cx + 11, cy + 4 + fl), (cx + 5, cy + 4)], "fin", "finL", (cx + 5, cy + 2))
    fin(s, [(cx - 1, cy - 5), (cx, cy - 11), (cx + 2, cy - 5)], "fin", "finL", (cx, cy - 5))
    w = WAG[f] // 2
    fin(s, [(cx - 1, cy + 5), (cx + w, cy + 12), (cx + 2, cy + 5)], "fin", "finL", (cx, cy + 5))
    lit_blob(s, cx, cy, 5, 6, RAMP, rim="rim")
    eye(s, cx - 4, cy - 1, "eye", "glint")
    eye(s, cx + 3, cy - 1, "eye", "glint")
    s.dot(cx, cy + 2, "stripe")
    return s


def draw(pose, direction, frame):
    return {"back": back, "side": side, "front": front}[direction](frame % 4)
