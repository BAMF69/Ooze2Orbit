#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_shark.py
# Brief   : WHO: the shark, the lake's and the coast's apex hunter (BAMF69 2026-11-08). The medium shark is this
#           sprite at size; the large shark is it bigger and darker. Silhouette: a long torpedo body, a tall
#           triangular dorsal, a crescent tail, long pectoral wings, a pointed snout over a toothy grin. It must read
#           as "run" from behind, from the side and head-on, and as different from your own shark-like fish.
#           KEY FEATURES: steel-blue back over a stark white belly (hard countershading), black eyes with no glint,
#           rows of teeth, gill slits, scars.
#           PALETTE: cold steel blues and a white belly: colder and harder than the player's slate shark look.
# Purpose : Atlas with three views (back, side facing right, front), 4 frames (tail sweep, jaw working). 64 px cells.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_shark.py --out public/assets/art/aquatic_shark --overwrite --preview-scale 0
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import fin, poly  # noqa: E402
from cellart import lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 64
FRAMES = 4
SHADOW = False
ROWS = [("swim", "back"), ("swim", "side"), ("swim", "front")]

PALETTE = {
    "k0": (20, 30, 44), "k1": (40, 60, 84), "k2": (66, 92, 120), "k3": (104, 132, 160), "kR": (156, 182, 204),
    "belly": (232, 236, 236), "bellyD": (190, 198, 204), "fin": (34, 50, 70), "finL": (74, 98, 126),
    "eye": (6, 6, 10), "gum": (120, 40, 50), "mouth": (30, 10, 14), "tooth": (240, 236, 224), "scar": (130, 150, 170),
}
RAMP = ["k0", "k1", "k2", "k3"]
SWEEP = [-4, 0, 4, 0]
JAW = [2, 3, 4, 3]


def back(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 32, 26
    sw = SWEEP[f]
    fin(s, [(cx - 2, cy + 10), (cx + 2, cy + 10), (cx + 4 + sw, cy + 34), (cx + sw, cy + 26), (cx - 4 + sw, cy + 34)], "fin", "finL", (cx, cy + 10))  # crescent tail, edge-on
    fin(s, [(cx - 9, cy + 4), (cx - 28, cy + 12), (cx - 26, cy + 15), (cx - 8, cy + 9)], "fin", "finL", (cx - 9, cy + 6))  # pectoral wings
    fin(s, [(cx + 9, cy + 4), (cx + 28, cy + 12), (cx + 26, cy + 15), (cx + 8, cy + 9)], "fin", "finL", (cx + 9, cy + 6))
    lit_blob(s, cx, cy, 10, 12, RAMP, rim="kR")
    poly(s, [(cx - 2, cy - 6), (cx, cy - 26), (cx + 3, cy - 6)], "fin")  # the tall dorsal blade
    s.dot(cx, cy - 24, "finL"); s.dot(cx + 1, cy - 20, "finL")
    for y in range(cy - 4, cy + 10, 5):
        s.dot(cx - 6, y, "scar"); s.dot(cx - 5, y + 1, "scar")
    return s


def side(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 34, 32
    sw = SWEEP[f] // 2
    fin(s, [(cx - 20, cy - 2), (cx - 31, cy - 16 + sw), (cx - 27, cy + sw), (cx - 30, cy + 9 + sw), (cx - 20, cy + 3)], "fin", "finL", (cx - 20, cy))  # crescent
    poly(s, [(cx - 6, cy - 7), (cx, cy - 22), (cx + 7, cy - 7)], "fin")  # dorsal
    s.dot(cx, cy - 20, "finL")
    lit_blob(s, cx, cy, 24, 8, RAMP, rim="kR")
    poly(s, [(cx + 20, cy - 5), (cx + 30, cy - 1), (cx + 20, cy + 4)], "k2")  # the snout
    for x in range(cx - 18, cx + 22):  # hard countershading: a white belly
        s.dot(x, cy + 6, "belly"); s.dot(x, cy + 5, "belly" if x % 3 else "bellyD")
        if -14 < x - cx < 16:
            s.dot(x, cy + 7, "bellyD")
    fin(s, [(cx + 2, cy + 5), (cx - 10, cy + 17), (cx + 6, cy + 8)], "fin", "finL", (cx + 2, cy + 5))  # pectoral
    for k in range(4):  # gill slits
        for dy in range(-2, 3):
            s.dot(cx + 10 + k * 2, cy + dy, "k0")
    s.dot(cx + 20, cy - 3, "eye"); s.dot(cx + 21, cy - 3, "eye"); s.dot(cx + 20, cy - 2, "eye")
    j = JAW[f]
    for x in range(cx + 16, cx + 28):  # the grin, working
        for dy in range(j):
            s.dot(x, cy + 2 + dy, "mouth")
        if x % 2 == 0:
            s.dot(x, cy + 2, "tooth"); s.dot(x + 1, cy + 1 + j, "tooth")
    for x in (cx - 8, cx - 3):
        s.dot(x, cy - 3, "scar"); s.dot(x + 1, cy - 2, "scar")
    return s


def front(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 32, 30
    fin(s, [(cx - 9, cy + 4), (cx - 28, cy + 14), (cx - 26, cy + 17), (cx - 8, cy + 9)], "fin", "finL", (cx - 9, cy + 6))
    fin(s, [(cx + 9, cy + 4), (cx + 28, cy + 14), (cx + 26, cy + 17), (cx + 8, cy + 9)], "fin", "finL", (cx + 9, cy + 6))
    poly(s, [(cx - 2, cy - 8), (cx, cy - 26), (cx + 3, cy - 8)], "fin")
    lit_blob(s, cx, cy, 11, 11, RAMP, rim="kR")
    for x in range(cx - 7, cx + 8):  # white throat
        for y in range(cy + 4, cy + 10):
            if abs(x - cx) < 9 - (y - cy - 4):
                s.dot(x, y, "belly")
    s.dot(cx - 9, cy - 3, "eye"); s.dot(cx - 9, cy - 2, "eye"); s.dot(cx + 9, cy - 3, "eye"); s.dot(cx + 9, cy - 2, "eye")
    j = JAW[f] + 2
    for x in range(cx - 7, cx + 8):  # the maw head-on
        for y in range(cy + 2, cy + 2 + j):
            s.dot(x, y, "mouth")
        if x % 2 == 0:
            s.dot(x, cy + 2, "tooth"); s.dot(x, cy + 1 + j, "tooth")
    s.dot(cx - 8, cy + 2, "gum"); s.dot(cx + 8, cy + 2, "gum")
    return s


def draw(pose, direction, frame):
    return {"back": back, "side": side, "front": front}[direction](frame % 4)
