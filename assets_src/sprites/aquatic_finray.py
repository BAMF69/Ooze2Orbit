#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_finray.py
# Brief   : WHO: the "finray", a shy glider that lives just under the surface; beating one drops FINS. Silhouette:
#           a flat diamond of wide wing-fins with a small body in the middle and a thin whip tail; from behind and
#           head-on it is a wide flat chevron, from the side a thin flapping blade.
#           KEY FEATURES: broad translucent-looking wing fins that beat slowly, a pale lit back, two small eyes on
#           top, a long thin tail.
#           PALETTE: cool sea-glass teal and pale aqua (it lives in the light near the surface), darker wing edges.
# Purpose : Atlas with three views (back, side facing right, front), 4 frames (wings beating).
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_finray.py --out public/assets/art/aquatic_finray --overwrite --preview-scale 0
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import poly  # noqa: E402
from cellart import eye, lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("swim", "back"), ("swim", "side"), ("swim", "front")]

PALETTE = {
    "t0": (22, 60, 66), "t1": (44, 104, 108), "t2": (82, 150, 148), "t3": (140, 200, 190), "tR": (196, 236, 220),
    "wing": (52, 120, 124), "wingL": (104, 176, 170), "wingD": (28, 72, 80),
    "eye": (14, 20, 24), "glint": (230, 240, 236), "tail": (40, 92, 98),
}
BEAT = [-5, -1, 4, -1]   # wingtip height per frame


def wings(s, cx, cy, span, f):
    """Two wide wing-fins out from the body, their tips rising and falling with the beat."""
    b = BEAT[f]
    for side in (-1, 1):
        tip = (cx + side * span, cy + b)
        poly(s, [(cx, cy - 4), tip, (cx + side * (span - 3), cy + 3 + b // 2), (cx, cy + 5)], "wing")
        poly(s, [(cx + side * 4, cy - 2), tip, (cx + side * (span - 4), cy + 1 + b // 2)], "wingL")
        s.dot(tip[0], tip[1], "wingD")


def back(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 14
    for y in range(cy + 4, cy + 16):  # whip tail toward the camera, below
        s.dot(cx + (1 if (y + f) % 6 < 3 else 0), y, "tail")
    wings(s, cx, cy, 15, f)
    lit_blob(s, cx, cy, 5, 5, ["t0", "t1", "t2", "t3"], rim="tR")
    return s


def side(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 18, 16
    b = BEAT[f]
    for x in range(cx - 17, cx - 5):  # long thin tail
        s.dot(x, cy + (1 if (x + f) % 6 < 3 else 0), "tail")
    # seen edge-on, both wings sweep up and down together around the body
    poly(s, [(cx - 6, cy), (cx + 1, cy - 10 + b), (cx + 6, cy - 9 + b), (cx + 4, cy)], "wing")
    poly(s, [(cx - 6, cy + 1), (cx + 1, cy + 10 + b), (cx + 6, cy + 9 + b), (cx + 4, cy + 1)], "wingD")
    lit_blob(s, cx, cy, 8, 3.5, ["t0", "t1", "t2", "t3"], rim="tR")
    eye(s, cx + 5, cy - 2, "eye", "glint")
    return s


def front(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 15
    wings(s, cx, cy, 15, f)
    for y in range(cy + 4, cy + 14):
        s.dot(cx, y, "tail")
    lit_blob(s, cx, cy, 5, 5, ["t0", "t1", "t2", "t3"], rim="tR")
    eye(s, cx - 3, cy - 2, "eye", "glint")
    eye(s, cx + 2, cy - 2, "eye", "glint")
    return s


def draw(pose, direction, frame):
    return {"back": back, "side": side, "front": front}[direction](frame % 4)
