#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# creature_props.py
# Brief   : WHAT: the key objects of a creature-stage level (docs/stages/03-creature.md, Toy 1), side view.
#           BOULDER: a mossy round stone you push (the puzzle answer at the bramble wall and the root gate).
#           LEVER: a bone-and-vine lever on a stone base, off (leaning left) and on (right).
#           LOG: a bundle of logs lashed with vine, hanging from a rope (the stalker trap).
#           CLAWS: the claws part, a glowing pickup (curved bone-white claws on a warm-red glow: fighting).
#           CAMO: the camouflage part, a glowing pickup (a mottled green leaf-skin patch: stealth).
#           FLAG: the checkpoint, a stick with a lineage-ochre frond.
#           PALETTE: stone greys with moss, bone and vine, the parts glow red (fight) and green (stealth).
# Purpose : Atlas (32 px), one row per prop, 4 frames (parts bob and glow; others still or gently swaying).
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/creature_props.py --out public/assets/art/creature_props --overwrite --preview-scale 0
# Notes   : PLACEHOLDER toy art. Tiles (ground, brambles, gates, water, mud, grass) stay plain tiles in code.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import poly  # noqa: E402
from cellart import lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False  # the boulder rolls: a baked-in shadow would spin with it
ROWS = [(p, "side") for p in ("boulder", "lever_off", "lever_on", "log", "claws", "camo", "flag")]

PALETTE = {
    "s0": (50, 52, 58), "s1": (84, 88, 96), "s2": (122, 126, 134), "s3": (166, 170, 176), "moss": (86, 118, 56),
    "mossL": (130, 160, 76), "bone": (226, 216, 190), "boneD": (160, 148, 122), "vine": (70, 110, 50), "vineD": (44, 72, 32),
    "wood0": (64, 40, 22), "wood1": (104, 70, 38), "wood2": (146, 104, 60), "red0": (120, 24, 20), "red1": (200, 60, 40),
    "red2": (255, 140, 90), "grn0": (30, 80, 40), "grn1": (60, 140, 70), "grn2": (150, 220, 130), "och": (214, 166, 98),
    "ochD": (150, 100, 52),
}
SR = ["s0", "s1", "s2", "s3"]


def glow(s, cx, cy, r, colors):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x - cx, y - cy)
            if d <= r:
                s.dot(x, y, colors[0] if d > r * 0.75 else colors[1] if d > r * 0.45 else colors[2])


def draw(pose, direction, frame):
    s = Sprite(PALETTE, CELL)
    f = frame % 4
    if pose == "boulder":
        lit_blob(s, 16, 18, 12, 11, SR, rim="s3")
        for x in range(7, 24, 2):
            s.dot(x, 9 + (x % 3), "moss"); s.dot(x + 1, 10, "mossL")
        s.dot(12, 20, "s0"); s.dot(13, 21, "s0"); s.dot(20, 16, "s0")
    elif pose in ("lever_off", "lever_on"):
        lit_blob(s, 16, 26, 9, 4, SR)  # stone base
        lean = -1 if pose == "lever_off" else 1
        for k in range(16):  # the bone handle
            x = 16 + lean * k * 6 // 16
            s.dot(x, 24 - k, "bone"); s.dot(x + 1, 24 - k, "boneD")
        tx = 16 + lean * 6
        lit_blob(s, tx, 7, 3, 3, ["vineD", "vine", "vine", "mossL"])  # vine knob
        s.dot(16, 23, "vineD"); s.dot(17, 23, "vineD")
    elif pose == "log":
        sway = [0, 1, 0, -1][f]
        for y in range(0, 9):  # rope
            s.dot(16 + sway * y // 9, y, "vine")
        for i, y in enumerate((10, 15, 20)):  # three lashed logs
            for x in range(5, 28):
                c = "wood2" if (x + i) % 5 == 0 else "wood1"
                for dy in range(4):
                    s.dot(x + sway, y + dy, "wood0" if dy == 3 else c)
            s.dot(4 + sway, y + 1, "wood2"); s.dot(4 + sway, y + 2, "wood2")
        for x in (9, 22):
            for y in range(9, 25):
                s.dot(x + sway, y, "vineD")
    elif pose == "claws":
        bob = [0, -1, -2, -1][f]
        glow(s, 16, 16 + bob, 11, ["red0", "red1", "red2"])
        for k, x0 in enumerate((11, 16, 21)):  # three curved claws
            for t in range(8):
                x = x0 + (t * t) // 12
                s.dot(x, 10 + t + bob, "bone"); s.dot(x + 1, 10 + t + bob, "boneD")
    elif pose == "camo":
        bob = [0, -1, -2, -1][f]
        glow(s, 16, 16 + bob, 11, ["grn0", "grn1", "grn2"])
        poly(s, [(9, 16 + bob), (16, 8 + bob), (23, 16 + bob), (16, 24 + bob)], "grn0")  # the leaf-skin patch
        for (x, y) in ((13, 14), (17, 12), (19, 17), (14, 19), (16, 16)):
            s.dot(x, y + bob, "grn2"); s.dot(x + 1, y + bob, "mossL")
        for t in range(-6, 7):  # the leaf's vein
            s.dot(16, 16 + t + bob, "vine")
        s.dot(15, 13 + bob, "moss"); s.dot(17, 19 + bob, "moss")
    else:  # flag: checkpoint stick with an ochre frond
        wave = [0, 1, 2, 1][f]
        for y in range(4, 30):
            s.dot(10, y, "wood1"); s.dot(11, y, "wood0")
        poly(s, [(12, 5), (24 + wave, 8), (26 + wave, 12), (12, 16)], "och")
        for x in range(13, 24):
            s.dot(x, 11, "ochD")
        lit_blob(s, 11, 29, 5, 2, SR)
    return s
