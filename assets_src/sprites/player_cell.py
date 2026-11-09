#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# player_cell.py
# Brief   : WHO: the player, an ochre single-celled organism, the one that will make it to orbit. Silhouette: a lit
#           oval cell with a whipping flagellum behind it and a fringe of cilia, facing right (the game flips it).
#           KEY FEATURES: a dark nucleus at the back, grainy cytoplasm, two small beady eye spots up front. The
#           signature props are the parts it collects: chitin thorns (attack), slate armor plates on its back
#           (defense), an olive oral groove with a ciliary fringe (diet). Four forms grow bigger, with more flagella.
#           PALETTE: GDD "lit and moody, under a microscope": muted ochre body lit from the top-left with a pale
#           membrane rim; slate-teal plates, bone-grey thorns, olive groove.
# Purpose : The player's atlas for tools/art/pixel_sprite.py: one row per (form, parts) combination, so adding a
#           part visibly changes the cell. 4 forms x 8 part combinations = 32 rows of 4 swim frames.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/player_cell.py --out public/assets/art/player_cell --overwrite
# Notes   : Row naming: pose = "form1".."form4", direction = "s0h0m0" (spikes, shell, mouth: 0 or 1). The game looks
#           rows up by these names in player_cell.json (src/game/cell/atlas.ts). Drawn facing right; no MIRROR.
#           No ground shadow: it swims (top-down). Lighting helpers: cellart.py (light from the top-left).
#           v2 2026-11-07: redrawn from the "cute cartoon" v1 (big eyes, cheeks) to the lit microscope style.
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

PALETTE = {
    "deep": (88, 56, 30), "dark": (134, 88, 44), "base": (176, 122, 62), "light": (212, 164, 96), "rim": (238, 208, 152),
    "grain": (150, 100, 52), "nuc": (96, 54, 36), "nucL": (150, 92, 58), "vac": (200, 156, 98), "vacL": (230, 196, 140),
    "eye": (20, 16, 20), "glint": (232, 228, 214), "flag": (120, 82, 44), "cil": (160, 118, 72),
    "thorn": (196, 182, 146), "thornD": (124, 110, 86),
    "plateD": (34, 60, 62), "plate": (56, 94, 94), "plateL": (96, 138, 132), "seam": (24, 40, 42),
    "groove": (54, 70, 36), "lip": (98, 122, 58), "fringe": (140, 160, 86),
}
RAMP = ["deep", "dark", "base", "light"]

FORMS = (1, 2, 3, 4)  # form 4 added 2026-11-09: the last, it unlocks the evolve
COMBOS = [f"s{s}h{h}m{m}" for s in (0, 1) for h in (0, 1) for m in (0, 1)]
ROWS = [(f"form{f}", c) for f in FORMS for c in COMBOS]

SIZE = {1: (9, 8), 2: (11, 9), 3: (12, 10), 4: (13, 11)}   # body radius x, y per form
FLAGELLA = {1: 1, 2: 2, 3: 3, 4: 4}
PULSE = [0, 1, 0, -1]                           # x-radius squish while swimming
CX, CY = 16, 16


def flagella(s, form, rx, f):
    """Thin whipping flagella behind the cell, a sine wave that travels with the frame."""
    ys = {1: [0], 2: [-2, 2], 3: [-3, 0, 3], 4: [-5, -2, 2, 5]}[FLAGELLA[form]]
    for i, dy in enumerate(ys):
        for k in range(1, 8):
            y = CY + dy + round(1.4 * math.sin(k * 0.9 + (f + i) * math.pi / 2))
            s.dot(CX - rx - k, y, "flag")


def thorns(s, form, rx, ry):
    """Chitin thorns on top, bottom and the back: 2 px wide at the base, lit side lighter."""
    pts = [(CX - 3, -1), (CX + 3, -1), (CX - 3, 1), (CX + 3, 1)]
    if form >= 2:
        pts += [(CX - 7, -1), (CX - 7, 1)]
    for x, dy in pts:
        edge = CY + dy * int(round(ry * math.sqrt(max(0.0, 1 - ((x - CX) / (rx + 0.5)) ** 2))))
        for k in range(1, 5):
            y = edge + dy * k
            s.dot(x, y, "thorn" if dy < 0 else "thornD")
            if k < 3:
                s.dot(x + 1, y, "thornD")


def plates(s, rx, ry):
    """Slate armor plates over the back half, lit from the top-left, with seams between plates."""
    for y in range(CY - ry - 1, CY + ry + 2):
        for x in range(CX - rx - 1, CX + 1):
            if not inside(x + 0.5, y + 0.5, CX, CY, rx + 1.3, ry + 1.3) or inside(x + 0.5, y + 0.5, CX + 2, CY, rx - 2.5, ry - 2.5):
                continue
            r = light_at(x, y, CX, CY, rx + 1.3, ry + 1.3)
            lam = r[0] if r else 0
            c = "plateL" if lam > 0.7 else "plate" if lam > 0.3 else "plateD"
            if (x - CX) % 4 == 0 or y == CY:
                c = "seam"
            s.dot(x, y, c)


def groove(s, rx, f):
    """The oral groove at the front: a dark notch, olive lips, a fringe of cilia that beats."""
    fx = CX + rx
    for dy in range(-3, 4):
        s.dot(fx - 1, CY + dy, "groove")
        s.dot(fx, CY + dy, "lip" if abs(dy) < 3 else "groove")
    for i, dy in enumerate((-3, -1, 1, 3)):
        s.dot(fx + 1 + (i + f) % 2, CY + dy, "fringe")


def insides(s, form, rx, ry):
    """Nucleus at the back, two vacuoles, grain, and the beady eye spots up front."""
    speckle(s, CX, CY, rx, ry, "grain", seed=form, n=6 + form * 2)
    organelle(s, CX - rx // 2 - 2, CY - 1, 5, 4, "nuc", "nucL")
    organelle(s, CX + 1, CY + ry // 2 - 1, 2, 2, "vac", "vacL")
    if form >= 2:
        organelle(s, CX - 1, CY - ry // 2, 3, 2, "vac", "vacL")
    ex = CX + rx - 5
    eye(s, ex, CY - 3, "eye", "glint")
    eye(s, ex + 3, CY - 2, "eye", "glint")


def draw(pose, direction, frame):
    form = int(pose[4])
    has_spikes, has_shell, has_mouth = direction[1] == "1", direction[3] == "1", direction[5] == "1"
    rx0, ry = SIZE[form]
    rx = rx0 + PULSE[frame % 4]
    s = Sprite(PALETTE, CELL)
    flagella(s, form, rx, frame)
    # no cilia where the flagella leave (back) or the groove sits (front, when it has one)
    cilia(s, CX, CY, rx, ry, frame, "cil", count=16,
          skip=lambda a: abs(math.cos(a)) > 0.9 and (math.cos(a) < 0 or has_mouth))
    if has_spikes:
        thorns(s, form, rx, ry)
    lit_blob(s, CX, CY, rx, ry, RAMP, rim="rim")
    if has_shell:
        plates(s, rx, ry)
    insides(s, form, rx, ry)
    if has_mouth:
        groove(s, rx, frame)
    return s
