#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# pond_cells.py
# Brief   : WHO: the other organisms in the pond, each wearing the part it drops when beaten. Silhouettes:
#           "prickle" a wine-red cell inside a starburst of long glassy thorns; "snail" a slate-blue amoeba under a
#           ridged dark test (shell) dome; "sipper" an olive cell with a wide beating oral fringe.
#           KEY FEATURES: lit from the top-left like the player (cellart.py), beady eye spots, visible nucleus; the
#           part each drops is its biggest, clearest feature. None use the player's ochre.
#           PALETTE: GDD "lit and moody, under a microscope": muted wine + bone thorns, slate blue + dark umber
#           test, olive + pale green fringe.
# Purpose : The pond's creature atlas: one row per kind, 4 swim frames each, drawn facing right.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/pond_cells.py --out public/assets/art/pond_cells --overwrite
# Notes   : Row = ("swim", kind). Kinds must match CELL_KINDS in src/game/cell/tuning.ts.
#           v2 2026-11-07: redrawn from the cute v1 (bright colors, grumpy cartoon eyes) to the lit style.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cellart import cilia, eye, inside, light_at, lit_blob, organelle, speckle  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("swim", "prickle"), ("swim", "snail"), ("swim", "sipper")]

PALETTE = {
    # prickle
    "wD": (62, 22, 34), "w1": (100, 34, 52), "w2": (140, 52, 72), "w3": (176, 82, 98), "wR": (214, 140, 146),
    "thorn": (206, 196, 172), "thornD": (128, 118, 102),
    # snail
    "bD": (32, 42, 62), "b1": (52, 68, 98), "b2": (74, 98, 136), "b3": (106, 134, 172), "bR": (160, 186, 214),
    "testD": (40, 32, 26), "test": (72, 60, 46), "testL": (112, 96, 72), "ridge": (28, 22, 18),
    # sipper
    "oD": (40, 50, 24), "o1": (68, 84, 38), "o2": (98, 118, 54), "o3": (132, 152, 76), "oR": (182, 196, 126),
    "fringe": (168, 190, 112), "groove": (30, 38, 20),
    # shared
    "nuc": (34, 24, 30), "nucL": (90, 70, 76), "grain": (40, 30, 30), "eye": (14, 12, 14), "glint": (230, 226, 212),
    "cil": (120, 120, 104),
}

PULSE = [0, 1, 0, -1]
CX, CY = 16, 16


def prickle(f):
    s = Sprite(PALETTE, CELL)
    r = 7 + (1 if f % 2 else 0)
    for i in range(10):  # a starburst of long thin thorns, slowly turning
        a = 2 * math.pi * i / 10 + f * 0.08
        ln = 6 if i % 2 else 4
        for k in range(r, r + ln):
            x, y = CX + round(math.cos(a) * k), CY + round(math.sin(a) * k)
            lit = math.cos(a) * -0.6 + math.sin(a) * -0.6 > 0
            s.dot(x, y, "thorn" if lit else "thornD")
    lit_blob(s, CX, CY, r, r, ["wD", "w1", "w2", "w3"], rim="wR")
    speckle(s, CX, CY, r, r, "wD", seed=3, n=5)
    organelle(s, CX - 5, CY + 1, 3, 3, "wD", "w2")  # nucleus at the back, in body tones (near-black read as a mouth)
    eye(s, CX + 2, CY - 3, "eye", "glint")
    eye(s, CX + 5, CY - 2, "eye", "glint")
    return s


def snail(f):
    s = Sprite(PALETTE, CELL)
    rx = 10 + PULSE[f]
    cilia(s, CX + 1, CY + 3, rx, 6, f, "cil", count=12, skip=lambda a: math.sin(a) < -0.2)
    lit_blob(s, CX + 1, CY + 3, rx, 6, ["bD", "b1", "b2", "b3"], rim="bR")
    # the test (shell) dome over the back and top, ridged, lit from the top-left
    for y in range(CY - 9, CY + 3):
        for x in range(CX - 11, CX + 5):
            if not inside(x + 0.5, y + 0.5, CX - 3, CY - 2, 9, 8):
                continue
            r = light_at(x, y, CX - 3, CY - 2, 9, 8)
            lam = r[0] if r else 0
            c = "testL" if lam > 0.72 else "test" if lam > 0.35 else "testD"
            if (x - CX) % 4 == 0:
                c = "ridge"
            s.dot(x, y, c)
    organelle(s, CX - 1, CY + 4, 3, 2, "bD", "b2")
    eye(s, CX + 7, CY + 1, "eye", "glint")
    return s


def sipper(f):
    s = Sprite(PALETTE, CELL)
    rx = 9 + PULSE[f]
    cx = CX - 2
    cilia(s, cx, CY, rx, 9, f, "cil", count=14, skip=lambda a: math.cos(a) > 0.7)
    lit_blob(s, cx, CY, rx, 9, ["oD", "o1", "o2", "o3"], rim="oR")
    speckle(s, cx, CY, rx, 9, "oD", seed=11, n=7)
    organelle(s, cx - 6, CY + 1, 4, 3, "oD", "o2")
    mx = cx + rx
    for dy in range(-6, 7):  # the wide oral fringe, beating
        s.dot(mx, CY + dy, "groove")
        if dy % 2 == 0:
            s.dot(mx + 1 + (1 if (dy // 2 + f) % 2 else 0), CY + dy, "fringe")
            s.dot(mx + 1, CY + dy, "fringe")
    eye(s, cx + 3, CY - 5, "eye", "glint")
    return s


DRAWERS = {"prickle": prickle, "snail": snail, "sipper": sipper}


def draw(pose, direction, frame):
    return DRAWERS[direction](frame % 4)
