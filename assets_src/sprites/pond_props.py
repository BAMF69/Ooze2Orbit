#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# pond_props.py
# Brief   : WHAT: the things floating in the pond. "algae" a short chain of glowing green algal cells (food);
#           "meat" a torn chunk of raw cell tissue with a pale membrane shred (food from popped cells); "spikes",
#           "shell", "mouth" part vesicles: a glassy bubble with the part inside, so you can see what you will get.
#           KEY FEATURES: food is the brightest thing in the dark pond (GDD: food must never be lost in the dark):
#           algae glows pale green, meat is a saturated raw red. Vesicle contents match the player's parts.
#           PALETTE: GDD "lit and moody, under a microscope": glowing greens; raw reds + cream membrane; glassy
#           grey-teal vesicle with a white glint; part colors shared with player_cell.py.
# Purpose : Prop atlas: one row per prop, 4 frames (a gentle bob, a glow pulse, a glint).
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/pond_props.py --out public/assets/art/pond_props --overwrite
# Notes   : Row = ("prop", name). Part names must match PART_KINDS, food names FOOD_KINDS in src/game/cell/tuning.ts.
#           v2 2026-11-07: redrawn from the cute v1 (leafy bush, cartoon drumstick) to the lit microscope style.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cellart import inside, lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("prop", "algae"), ("prop", "spikes"), ("prop", "shell"), ("prop", "mouth"), ("prop", "meat")]

PALETTE = {
    "gD": (36, 92, 52), "g1": (64, 140, 72), "g2": (110, 196, 104), "g3": (170, 236, 150), "gR": (214, 255, 196),
    "chl": (40, 110, 50),
    "mD": (88, 18, 26), "m1": (138, 30, 38), "m2": (186, 52, 54), "m3": (222, 96, 86), "fiber": (240, 150, 132),
    "memb": (232, 214, 186), "membD": (170, 150, 124),
    "vesD": (70, 104, 112), "ves": (118, 156, 160), "vesL": (164, 200, 200), "glint": (250, 252, 248),
    "thorn": (196, 182, 146), "thornD": (124, 110, 86),
    "plateD": (34, 60, 62), "plate": (56, 94, 94), "plateL": (96, 138, 132), "seam": (24, 40, 42),
    "groove": (54, 70, 36), "lip": (98, 122, 58), "fringe": (140, 160, 86),
}

BOB = [0, -1, 0, 1]
CX, CY = 16, 16


def algae(f):
    """A curved chain of four algal cells, each lit, with a chloroplast spot; glows brighter on frames 1-2."""
    s = Sprite(PALETTE, CELL)
    b = BOB[f]
    glow = "gR" if f in (1, 2) else "g3"
    for x, y, r in ((10, 21, 4), (15, 16, 4), (20, 12, 4), (24, 8, 3)):
        lit_blob(s, x, y + b, r, r, ["gD", "g1", "g2", "g3"], rim=glow)
        s.dot(x, y + b + 1, "chl")
    return s


def meat(f):
    """A torn chunk of raw tissue: an irregular red lump, fiber streaks, a pale membrane shred on its edge."""
    s = Sprite(PALETTE, CELL)
    b = BOB[f]
    lit_blob(s, 15, 18 + b, 8, 7, ["mD", "m1", "m2", "m3"], rim="fiber")
    lit_blob(s, 20, 11 + b, 5, 5, ["mD", "m1", "m2", "m3"], rim="fiber")
    for k in range(5):  # fiber streaks
        s.dot(10 + k * 2, 16 + b + (k % 2), "fiber")
    for x in range(7, 13):  # the membrane shred, ragged
        s.dot(x, 23 + b + (x % 2), "memb")
        if x % 3 == 0:
            s.dot(x, 24 + b + (x % 2), "membD")
    return s


def vesicle(f):
    s = Sprite(PALETTE, CELL)
    b = BOB[f]
    for y in range(CY - 10, CY + 11):
        for x in range(CX - 10, CX + 11):
            if inside(x + 0.5, y + 0.5 + b, CX, CY, 10.4, 10.4):
                rim = not inside(x + 0.5, y + 0.5 + b, CX, CY, 8.8, 8.8)
                lit = (x - CX) + (y + b - CY) < -6
                s.dot(x, y, "vesD" if rim and not lit else "vesL" if rim else "ves")
    s.dot(CX - 5, CY - 6 - b, "glint"); s.dot(CX - 6, CY - 5 - b, "glint")
    return s, b


def part_spikes(f):
    s, b = vesicle(f)
    for x in (CX - 4, CX, CX + 4):
        for k in range(6):
            w = 1 if k < 3 else 0
            for dx in range(-w, w + 1):
                s.dot(x + dx, CY + 4 - k - b, "thorn" if dx <= 0 else "thornD")
    return s


def part_shell(f):
    s, b = vesicle(f)
    for y in range(CY - 5, CY + 4):
        for x in range(CX - 6, CX + 7):
            if inside(x + 0.5, y + 0.5, CX, CY + 3, 7, 7) and y <= CY + 3:
                c = "plateL" if y < CY - 2 else ("plateD" if y > CY + 1 else "plate")
                if x % 3 == 0:
                    c = "seam"
                s.dot(x, y - b, c)
    return s


def part_mouth(f):
    s, b = vesicle(f)
    for dy in range(-5, 6):
        s.dot(CX - 2, CY + dy - b, "groove")
        s.dot(CX - 1, CY + dy - b, "lip")
        if dy % 2 == 0:
            s.dot(CX + ((dy // 2 + f) % 2), CY + dy - b, "fringe")
            s.dot(CX + 2 + ((dy // 2 + f) % 2), CY + dy - b, "fringe")
    return s


DRAWERS = {"algae": algae, "meat": meat, "spikes": part_spikes, "shell": part_shell, "mouth": part_mouth}


def draw(pose, direction, frame):
    return DRAWERS[direction](frame % 4)
