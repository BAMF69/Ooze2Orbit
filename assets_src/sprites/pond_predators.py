#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# pond_predators.py
# Brief   : WHO: the "gulper", the pond's apex predator: a huge dark cell that hunts the player. Silhouette: a
#           heavy oval twice the player's size with a gaping maw at the front that opens and shuts, and trailing
#           tendrils behind. It must read as DANGER at a glance, never as food or a friend.
#           KEY FEATURES: a maw lined with bone teeth over a deep red gullet, two small glowing red eye spots,
#           mottled bruise-purple hide lit from the top-left (cellart.py), a dark nucleus mass.
#           PALETTE: GDD "lit and moody, under a microscope": bruise purples and umber, red gullet, bone teeth,
#           ember-red eyes (the only warm glow on it, so you see it coming).
# Purpose : Predator atlas: one row per kind, 4 frames (the maw opening and shutting, tendrils swaying), 64 px cells
#           so it can be shown big without its pixels getting chunkier than the other organisms'.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/pond_predators.py --out public/assets/art/pond_predators --overwrite
# Notes   : Row = ("swim", kind). Kinds must match the predator entries in CELL_KINDS (src/game/cell/tuning.ts).
#           Drawn facing right; the game flips it.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cellart import eye, inside, lit_blob, organelle, speckle  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 64
FRAMES = 4
SHADOW = False
ROWS = [("swim", "gulper")]

PALETTE = {
    "pD": (32, 18, 32), "p1": (58, 32, 56), "p2": (86, 50, 78), "p3": (120, 76, 102), "pR": (168, 118, 138),
    "mottle": (46, 26, 44), "nuc": (24, 12, 22), "nucL": (70, 44, 66),
    "gullet": (16, 6, 12), "gum": (112, 38, 54), "gumL": (150, 62, 72),
    "tooth": (228, 216, 190), "toothD": (150, 136, 112),
    "eye": (232, 70, 50), "eyeL": (255, 190, 140),
    "tendril": (74, 44, 66), "tendrilD": (44, 26, 40),
}

CX, CY = 34, 32
RX, RY = 22, 18
JAW = [3, 6, 9, 6]          # maw half-opening (px at the lip) per frame
PULSE = [0, 1, 0, -1]


def tendrils(s, f):
    """Three thick wavy tendrils trailing behind (left), swaying with the frame."""
    for i, dy in enumerate((-9, 0, 9)):
        for k in range(1, 12):
            y = CY + dy + round(2.2 * math.sin(k * 0.55 + (f + i) * math.pi / 2))
            x = CX - RX - k + 2
            s.dot(x, y, "tendril")
            if k < 8:
                s.dot(x, y + 1, "tendrilD")


def maw(s, rx, f):
    """Cut the maw out of the front of the body: a wedge opening to the right, gums, then teeth on both jaws."""
    open_ = JAW[f]
    tip_x = CX + rx + 1
    for x in range(CX + 2, tip_x + 1):
        t = (x - (CX + 2)) / max(1, tip_x - (CX + 2))  # 0 at the back of the throat, 1 at the lips
        half = int(round(1 + open_ * t))
        for dy in range(-half, half + 1):
            edge = abs(dy) >= half - 1
            s.dot(x, CY + dy, "gum" if edge and t > 0.25 else "gullet")
        if t > 0.35 and x % 3 == 0:  # teeth hang from the upper jaw and stand on the lower, pointing in
            for k in range(3):
                s.dot(x, CY - half + 1 + k, "tooth" if k < 2 else "toothD")
                s.dot(x, CY + half - 1 - k, "toothD" if k < 2 else "tooth")
    s.dot(tip_x - 1, CY - open_ - 1, "gumL")


def draw(pose, direction, frame):
    f = frame % 4
    rx = RX + PULSE[f]
    s = Sprite(PALETTE, CELL)
    tendrils(s, f)
    lit_blob(s, CX, CY, rx, RY, ["pD", "p1", "p2", "p3"], rim="pR")
    speckle(s, CX, CY, rx, RY, "mottle", seed=29, n=26, min_light=0.15)
    organelle(s, CX - 12, CY - 2, 8, 7, "nuc", "nucL")
    maw(s, rx, f)
    # two small ember eyes above the maw, the only warm light on it
    for ex, ey in ((CX + rx - 9, CY - 11), (CX + rx - 4, CY - 9)):
        eye(s, ex, ey, "eye", "eyeL")
    return s
