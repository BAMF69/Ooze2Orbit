#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_shellback.py
# Brief   : WHO: the "shellback", a slow armoured grazer of the seabed; it ignores you until you ram it, then bites
#           back; beating one drops PLATES. The cell stage's snail grown up. Silhouette: a low domed shell of
#           overlapping plates with a blunt head and stubby paddle legs underneath.
#           KEY FEATURES: banded shell plates with lit edges, a small blunt head with beady eyes, paddling legs.
#           PALETTE: the snail's slate blue-greys (same family), olive moss on the shell, umber head and legs.
# Purpose : Atlas with three views (back, side facing right, front), 4 frames (legs paddling, head bobbing).
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_shellback.py --out public/assets/art/aquatic_shellback --overwrite --preview-scale 0
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cellart import eye, lit_blob, speckle  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("swim", "back"), ("swim", "side"), ("swim", "front")]

PALETTE = {
    "s0": (30, 38, 48), "s1": (54, 66, 80), "s2": (84, 100, 114), "s3": (122, 140, 150), "sR": (168, 184, 186),
    "seam": (22, 28, 36), "moss": (78, 96, 52), "head": (98, 70, 46), "headL": (140, 104, 68),
    "leg": (76, 56, 40), "eye": (16, 14, 16), "glint": (226, 222, 210),
}
RAMP = ["s0", "s1", "s2", "s3"]
PADDLE = [-1, 0, 1, 0]


def legs(s, xs, y, f):
    for i, x in enumerate(xs):
        p = PADDLE[(f + i) % 4]
        for k in range(3):
            s.dot(x + p, y + k, "leg")


def shell(s, cx, cy, rx, ry, seams_vertical):
    lit_blob(s, cx, cy, rx, ry, RAMP, rim="sR")
    speckle(s, cx, cy, rx, ry, "moss", seed=7, n=8, min_light=0.2)
    if seams_vertical:
        for x in range(int(cx - rx) + 3, int(cx + rx) - 1, 4):
            for y in range(int(cy - ry) + 2, int(cy + ry) - 1):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 0.8:
                    s.dot(x, y, "seam")
    else:
        for y in range(int(cy - ry) + 3, int(cy + ry) - 1, 3):
            for x in range(int(cx - rx) + 2, int(cx + rx) - 1):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 0.8:
                    s.dot(x, y, "seam")


def side(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 15, 15
    legs(s, (cx - 7, cx - 2, cx + 3, cx + 8), cy + 7, f)
    bob = PADDLE[f] // 2
    lit_blob(s, cx + 13, cy + 3 + bob, 4, 3.5, ["leg", "head", "headL", "headL"], dither=False)  # blunt head
    eye(s, cx + 14, cy + 1 + bob, "eye", "glint")
    shell(s, cx, cy, 12, 9, True)
    return s


def back(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 15
    legs(s, (cx - 9, cx - 4, cx + 4, cx + 9), cy + 7, f)
    shell(s, cx, cy, 12, 9, True)
    return s


def front(f):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 14
    legs(s, (cx - 9, cx - 4, cx + 4, cx + 9), cy + 8, f)
    shell(s, cx, cy, 12, 9, False)
    bob = PADDLE[f] // 2
    lit_blob(s, cx, cy + 6 + bob, 5, 4, ["leg", "head", "headL", "headL"], dither=False)
    eye(s, cx - 3, cy + 5 + bob, "eye", "glint")
    eye(s, cx + 2, cy + 5 + bob, "eye", "glint")
    return s


def draw(pose, direction, frame):
    return {"back": back, "side": side, "front": front}[direction](frame % 4)
