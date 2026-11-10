#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# space_parts.py
# Brief   : WHAT: the icons of the eleven ship parts (docs/stages/05-space.md), for the hangar's slots and its
#           outfitter (BAMF69 2026-11-10: icons, not text). Each reads at a glance and by maker: Hearth parts are
#           the lineage's ochre and bone (grown shell, spines, fins); Tidewright parts are tide teal and pearl.
#           SPINE: a bone spine in a launcher sleeve. NEEDLE: a round turret base with a bone barrel. LANCE: a teal
#           crystal lance. LANCETURRET: a round base with a crystal barrel. SPORE: a green spore pod bursting.
#           SEEKER: a finned spore dart with a green trail. PLATING: three overlapping shell plates. MEMBRANE: a
#           teal bubble around a pearl. FIN: a swept fin with a glow. BURN: a nozzle with a long flame.
#           GLAND: a glowing sun gland with rays.
# Purpose : Atlas (32 px): one row per part, 2 frames (a slow glint or pulse).
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/space_parts.py --out public/assets/art/space_parts --overwrite --preview-scale 0
# Notes   : PLACEHOLDER toy art. No ground shadow: these are icons.
# Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import poly  # noqa: E402
from cellart import lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 2
SHADOW = False
PARTS = ["spine", "needle", "lance", "lanceturret", "spore", "seeker", "plating", "membrane", "fin", "burn", "gland"]
ROWS = [(p, "up") for p in PARTS]

PALETTE = {
    "deep": (78, 50, 26), "dark": (128, 84, 42), "base": (176, 122, 62), "light": (214, 166, 98), "rim": (240, 210, 154),
    "bone": (232, 222, 196), "boneD": (168, 154, 126), "boneK": (110, 98, 78),
    "tideK": (14, 60, 76), "tideD": (26, 104, 118), "tide": (52, 160, 164), "tideL": (130, 226, 216), "pearl": (236, 250, 246),
    "sporeD": (56, 110, 36), "spore": (120, 196, 70), "sporeL": (206, 246, 140),
    "glowD": (200, 120, 30), "glow": (250, 200, 70), "glowL": (255, 246, 190), "flame": (250, 130, 50),
}
OCHRE = ["deep", "dark", "base", "light"]
TIDE = ["tideK", "tideD", "tide", "tideL"]


def base(s, ramp, rim):
    """A turret's round base, low in the cell."""
    lit_blob(s, 16, 21, 9, 7, ramp, rim=rim)
    lit_blob(s, 16, 20, 4, 3, [ramp[0], ramp[0], ramp[1], ramp[1]])


def draw(pose, direction, frame):
    s = Sprite(PALETTE, CELL)
    f = frame % 2
    if pose == "spine":
        poly(s, [(11, 16), (21, 16), (22, 29), (10, 29)], "dark")      # the launcher sleeve
        poly(s, [(11, 16), (15, 16), (14, 29), (10, 29)], "base")
        for y in range(19, 29, 3):
            for x in range(10, 22):
                s.dot(x, y, "deep")
        poly(s, [(16, 2), (19, 16), (13, 16)], "bone")                 # the spine
        poly(s, [(16, 2), (19, 16), (16, 16)], "boneD")
        s.dot(15, 6 + f, "glowL")
    elif pose == "needle":
        base(s, OCHRE, "rim")
        poly(s, [(15, 3), (18, 3), (19, 18), (14, 18)], "bone")        # the barrel
        poly(s, [(17, 3), (18, 3), (19, 18), (17, 18)], "boneD")
        s.dot(16, 2, "boneK"); s.dot(17, 2, "boneK"); s.dot(15, 8 + f, "glowL")
    elif pose == "lance":
        poly(s, [(12, 20), (20, 20), (21, 29), (11, 29)], "tideD")     # the emitter cradle
        poly(s, [(12, 20), (15, 20), (14, 29), (11, 29)], "tide")
        poly(s, [(16, 2), (20, 12), (18, 21), (14, 21), (12, 12)], "tideL")  # the crystal
        poly(s, [(16, 2), (20, 12), (18, 21), (16, 21)], "tide")
        for y in range(5, 19):
            s.dot(16, y, "pearl")
        s.dot(14, 9 + f * 2, "pearl")
    elif pose == "lanceturret":
        base(s, TIDE, "pearl")
        poly(s, [(16, 2), (19, 9), (18, 18), (14, 18), (13, 9)], "tideL")
        poly(s, [(16, 2), (19, 9), (18, 18), (16, 18)], "tide")
        for y in range(4, 17):
            s.dot(16, y, "pearl")
        s.dot(14, 8 + f * 2, "pearl")
    elif pose == "spore":
        lit_blob(s, 16, 18, 9, 9, ["sporeD", "sporeD", "spore", "sporeL"], rim="sporeL")
        for x, y in ((11, 15), (20, 14), (14, 22), (19, 21), (16, 17)):  # spore pits
            s.dot(x, y, "sporeD"); s.dot(x + 1, y, "tideK")
        for x, y in ((9, 6), (16, 4 - f), (23, 6), (6, 11 + f), (26, 12)):  # spores bursting out
            s.dot(x, y, "sporeL"); s.dot(x, y + 1, "spore")
    elif pose == "seeker":
        poly(s, [(16, 2), (20, 9), (20, 20), (12, 20), (12, 9)], "spore")   # the dart
        poly(s, [(16, 2), (20, 9), (20, 20), (16, 20)], "sporeD")
        poly(s, [(12, 15), (7, 23), (12, 21)], "tideD")                    # fins
        poly(s, [(20, 15), (25, 23), (20, 21)], "tideK")
        s.dot(15, 6, "sporeL"); s.dot(14, 8, "sporeL")
        for i in range(5 + f * 2):                                          # the trail
            s.dot(15, 21 + i, "sporeL" if i < 2 else "spore"); s.dot(16, 21 + i, "spore" if i < 3 else "sporeD")
    elif pose == "plating":
        for cy in (23, 16, 9):                                              # three overlapping plates
            lit_blob(s, 16, cy, 11, 6, OCHRE, rim="rim")
            for x in range(7, 26):
                s.dot(x, cy + 5, "deep")
        s.dot(11, 7 + f, "bone"); s.dot(12, 7 + f, "bone")
    elif pose == "membrane":
        lit_blob(s, 16, 16, 12, 12, TIDE, rim="pearl")
        lit_blob(s, 16, 16, 9, 9, ["tideK", "tideK", "tideD", "tideD"])     # the hollow inside
        lit_blob(s, 16, 16, 4 + f, 4 + f, ["tideL", "tideL", "pearl", "pearl"])  # the pearl
    elif pose == "fin":
        poly(s, [(9, 4), (24, 20), (20, 26), (9, 24)], "dark")              # the swept fin
        poly(s, [(9, 4), (16, 12), (12, 24), (9, 24)], "light")
        poly(s, [(9, 4), (11, 6), (10, 24), (9, 24)], "rim")
        for i in range(5):
            s.dot(13 + i * 2, 12 + i * 2, "deep")
        for i in range(3 + f):
            s.dot(13, 26 + i, "glowL" if i == 0 else "glow"); s.dot(17, 26 + i, "glow")
    elif pose == "burn":
        poly(s, [(11, 3), (21, 3), (23, 14), (9, 14)], "tideD")             # the nozzle
        poly(s, [(11, 3), (15, 3), (14, 14), (9, 14)], "tide")
        for x in range(9, 24):
            s.dot(x, 14, "tideK"); s.dot(x, 8, "tideK")
        n = 12 + f * 2
        poly(s, [(11, 15), (21, 15), (16, 15 + n)], "flame")                # the long flame
        poly(s, [(13, 15), (19, 15), (16, 15 + n - 4)], "glow")
        poly(s, [(15, 15), (17, 15), (16, 15 + n - 8)], "glowL")
    else:  # gland
        r = 7 + f
        lit_blob(s, 16, 16, r, r, ["glowD", "glow", "glow", "glowL"], rim="glowL")
        for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0), (-1, -1), (1, -1), (-1, 1), (1, 1)):  # rays
            for k in (11, 12, 13):
                x, y = 16 + dx * k * (0.72 if dx and dy else 1), 16 + dy * k * (0.72 if dx and dy else 1)
                s.dot(int(x), int(y), "glow" if k < 13 else "glowD")
        s.dot(13, 13, "glowL"); s.dot(14, 12, "glowL"); s.dot(16, 16, "deep"); s.dot(17, 17, "dark")
    return s
