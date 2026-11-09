#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_hammer.py
# Brief   : WHO: the coast's large shark, a HAMMERHEAD (BAMF69 2026-11-08: "make the big shark even more
#           identifiable"). Silhouette: a wide flat hammer-shaped head with an eye at each tip, a towering sickle
#           dorsal, a long sweeping tail. From behind and head-on the hammer is a bar wider than the body; from the
#           side the head is a flat blade jutting forward. It must never be mistaken for the steel-blue medium sharks.
#           KEY FEATURES: the hammer with an eye on each end, a pale belly, old scars, a grim narrow mouth.
#           PALETTE: dark olive-bronze over a pale belly (warmer and darker than the mediums' steel blue).
# Purpose : Atlas with three views (back, side facing right, front), 4 frames (tail sweep, head sway). 64 px cells.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_hammer.py --out public/assets/art/aquatic_hammer --overwrite --preview-scale 0
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
    "h0": (34, 34, 22), "h1": (62, 60, 38), "h2": (96, 92, 60), "h3": (134, 128, 88), "hR": (176, 170, 130),
    "belly": (226, 222, 200), "bellyD": (186, 180, 156), "fin": (48, 46, 30), "finL": (92, 88, 58),
    "eye": (250, 220, 120), "eyeD": (10, 10, 6), "mouth": (24, 14, 10), "scar": (150, 146, 118),
}
RAMP = ["h0", "h1", "h2", "h3"]
SWEEP = [-4, 0, 4, 0]
SWAY = [-1, 0, 1, 0]


def hammer_bar(s, cx, y, half, sway):
    """The hammer seen from behind or the front: a flat bar wider than the body, an eye on each tip."""
    for x in range(cx - half, cx + half + 1):
        edge = abs(x - cx) > half - 3
        for dy in range(-2, 3):
            s.dot(x, y + dy + (sway if edge else 0), "h1" if dy > 0 else "h2" if dy == 0 else "h3")
    for side in (-1, 1):
        ex = cx + side * half
        s.dot(ex, y + sway, "eye"); s.dot(ex, y - 1 + sway, "eye"); s.dot(ex - side, y + sway, "eyeD")


def back(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 32, 30
    sw = SWEEP[f]
    fin(s, [(cx - 2, cy + 10), (cx + 2, cy + 10), (cx + 5 + sw, cy + 32), (cx + sw, cy + 24), (cx - 4 + sw, cy + 32)], "fin", "finL", (cx, cy + 10))
    fin(s, [(cx - 9, cy + 4), (cx - 24, cy + 12), (cx - 22, cy + 15), (cx - 8, cy + 9)], "fin", "finL", (cx - 9, cy + 6))
    fin(s, [(cx + 9, cy + 4), (cx + 24, cy + 12), (cx + 22, cy + 15), (cx + 8, cy + 9)], "fin", "finL", (cx + 9, cy + 6))
    lit_blob(s, cx, cy, 10, 12, RAMP, rim="hR")
    hammer_bar(s, cx, cy - 13, 26, SWAY[f])  # the hammer, out past the body on both sides
    poly(s, [(cx - 3, cy - 4), (cx + 1, cy - 30), (cx + 4, cy - 4)], "fin")  # a towering sickle dorsal
    s.dot(cx + 1, cy - 27, "finL"); s.dot(cx + 1, cy - 22, "finL")
    for y in range(cy - 2, cy + 8, 4):
        s.dot(cx + 5, y, "scar"); s.dot(cx + 6, y + 1, "scar")
    return s


def side(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 32, 32
    sw = SWEEP[f] // 2
    fin(s, [(cx - 20, cy - 2), (cx - 31, cy - 18 + sw), (cx - 27, cy + sw), (cx - 30, cy + 8 + sw), (cx - 20, cy + 3)], "fin", "finL", (cx - 20, cy))
    poly(s, [(cx - 8, cy - 7), (cx - 2, cy - 28), (cx + 6, cy - 7)], "fin")  # sickle dorsal
    s.dot(cx - 2, cy - 25, "finL")
    lit_blob(s, cx, cy, 22, 8, RAMP, rim="hR")
    for x in range(cx + 18, cx + 31):  # the hammer edge-on: a flat blade of a head jutting forward
        for dy in (-3, -2, -1):
            s.dot(x, cy + dy, "h2" if dy == -2 else "h1")
    s.dot(cx + 30, cy - 2, "eye"); s.dot(cx + 29, cy - 2, "eyeD")
    for x in range(cx - 16, cx + 18):
        s.dot(x, cy + 6, "belly"); s.dot(x, cy + 5, "belly" if x % 3 else "bellyD")
    fin(s, [(cx + 2, cy + 5), (cx - 10, cy + 16), (cx + 6, cy + 8)], "fin", "finL", (cx + 2, cy + 5))
    for x in range(cx + 18, cx + 24):  # a grim narrow mouth under the head
        s.dot(x, cy + 2, "mouth")
    for x in (cx - 6, cx - 1, cx + 4):
        s.dot(x, cy - 4, "scar"); s.dot(x + 1, cy - 3, "scar")
    return s


def front(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 32, 30
    fin(s, [(cx - 9, cy + 6), (cx - 24, cy + 14), (cx - 22, cy + 17), (cx - 8, cy + 10)], "fin", "finL", (cx - 9, cy + 8))
    fin(s, [(cx + 9, cy + 6), (cx + 24, cy + 14), (cx + 22, cy + 17), (cx + 8, cy + 10)], "fin", "finL", (cx + 9, cy + 8))
    poly(s, [(cx - 2, cy - 8), (cx + 1, cy - 28), (cx + 3, cy - 8)], "fin")
    lit_blob(s, cx, cy + 2, 10, 10, RAMP, rim="hR")
    hammer_bar(s, cx, cy - 3, 28, SWAY[f])  # head-on, the hammer is the whole width of the view
    for x in range(cx - 5, cx + 6):  # pale throat, a thin mouth
        s.dot(x, cy + 8, "belly")
        s.dot(x, cy + 3, "mouth")
    return s


def draw(pose, direction, frame):
    return {"back": back, "side": side, "front": front}[direction](frame % 4)
