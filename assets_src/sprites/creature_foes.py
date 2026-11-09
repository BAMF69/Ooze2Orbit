#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# creature_foes.py
# Brief   : WHO: the creature stage's first two foes (docs/stages/03-creature.md, Toy 1), side view facing right.
#           STALKER: a lanky land predator that patrols and hunts by sight. Silhouette: tall thin legs, a hunched
#           back, a long narrow head jutting forward with a big jaw, a whip tail. KEY FEATURE: one glowing amber eye
#           (what it sees is what you avoid), slate-violet hide.
#           BRUTE: a heavy mud beast that sleeps in the drained lake basin. Silhouette: a wide hump of a body on short
#           thick legs, a blunt head with tusks, a mossy back. KEY FEATURE: curled up asleep, tusks forward when awake.
#           PALETTE: the GDD's predator violet (as the aquatic deepmaw) for the stalker; mud brown and moss for the brute.
# Purpose : Atlas (32 px): stalker walk / alert / down, brute sleep / walk / down; 4 frames each.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/creature_foes.py --out public/assets/art/creature_foes --overwrite --preview-scale 0
# Notes   : PLACEHOLDER toy art. "down" is beaten or trapped (lying on its side).
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import poly  # noqa: E402
from cellart import lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = True
ROWS = [("stalker", d) for d in ("walk", "alert", "down")] + [("brute", d) for d in ("sleep", "walk", "down")]

PALETTE = {
    "v0": (40, 26, 48), "v1": (74, 48, 86), "v2": (110, 74, 124), "v3": (150, 110, 160), "vR": (190, 156, 196),
    "vleg": (58, 38, 70), "eye": (255, 190, 70), "eyeR": (255, 90, 40), "jaw": (36, 14, 20), "tooth": (236, 228, 206),
    "m0": (52, 36, 22), "m1": (92, 66, 40), "m2": (128, 96, 60), "m3": (164, 130, 86), "moss": (88, 112, 52),
    "mossL": (126, 150, 70), "tusk": (230, 220, 190), "zzz": (200, 210, 230),
}
VR = ["v0", "v1", "v2", "v3"]
MR = ["m0", "m1", "m2", "m3"]
G = 30


def thin_leg(s, x, top, dx, c):
    for y in range(top, G + 1):
        xx = x + dx * (y - top) // max(1, G - top)
        s.dot(xx, y, c)
    s.dot(x + dx, G, c); s.dot(x + dx + 1, G, c)


def stalker(d, f):
    s = Sprite(PALETTE, CELL)
    if d == "down":  # on its side, legs up, eye shut
        lit_blob(s, 15, 25, 10, 4, VR, rim="vR")
        lit_blob(s, 26, 24, 4, 3, VR)
        for x0 in (9, 13, 18, 21):
            for k in range(5):
                s.dot(x0 + k // 2, 21 - k, "vleg")
        poly(s, [(6, 24), (0, 20), (1, 19), (7, 22)], "v1")
        for x in range(25, 29):
            s.dot(x, 23, "v0")
        for x in range(10, 22, 4):  # stars of the knock-out
            s.dot(x, 12 + (f + x) % 3, "eye")
        return s
    step = [-2, 0, 2, 0][f] if d == "walk" else 0
    thin_leg(s, 10, 19, -step, "vleg"); thin_leg(s, 19, 19, step, "vleg")
    poly(s, [(8, 15), (0, 12 + (f % 2)), (1, 11), (9, 13)], "v1")  # whip tail
    lit_blob(s, 14, 15, 7, 5, VR, rim="vR")  # hunched body
    up = -3 if d == "alert" else 0
    lit_blob(s, 21, 13 + up // 2, 3, 3, VR)  # neck
    hx, hy = 26, 12 + up
    poly(s, [(hx - 4, hy - 3), (hx + 5, hy - 1), (hx + 5, hy + 2), (hx - 4, hy + 3)], "v2")  # long narrow head
    for x in range(hx - 3, hx + 5):
        s.dot(x, hy - 2, "v3")
    s.dot(hx + 1, hy - 1, "eye"); s.dot(hx + 2, hy - 1, "eyeR" if d == "alert" else "eye")
    if d == "alert":  # jaw open: it has seen you
        for x in range(hx - 2, hx + 6):
            s.dot(x, hy + 3, "jaw"); s.dot(x, hy + 4, "jaw")
        for x in range(hx - 1, hx + 6, 2):
            s.dot(x, hy + 3, "tooth")
        for x in range(hx - 3, hx + 5):
            s.dot(x, hy + 5, "v1")
    else:
        for x in range(hx - 2, hx + 5):
            s.dot(x, hy + 2, "jaw")
    thin_leg(s, 12, 19, step, "v1"); thin_leg(s, 21, 19, -step, "v1")
    for x in range(9, 19, 3):  # spine bumps
        s.dot(x, 10, "v0")
    return s


def brute(d, f):
    s = Sprite(PALETTE, CELL)
    if d == "sleep":  # curled hump, breathing, a "z" drifting up
        breathe = [0, 0, 1, 1][f]
        lit_blob(s, 15, 22 - breathe, 12, 8 + breathe, MR, rim="m3")
        for x in range(5, 26, 2):
            s.dot(x, 14 - breathe + (x % 4 == 1), "moss"); s.dot(x + 1, 15 - breathe, "mossL")
        lit_blob(s, 25, 25, 4, 3, MR)
        s.dot(28, 27, "tusk"); s.dot(29, 27, "tusk")
        for x in range(24, 28):
            s.dot(x, 24, "m0")  # shut eye
        zx, zy = 24 + f, 8 - f
        for dx in range(3):
            s.dot(zx + dx, zy, "zzz"); s.dot(zx + dx, zy + 2, "zzz")
        s.dot(zx + 1, zy + 1, "zzz")
        return s
    if d == "down":
        lit_blob(s, 15, 25, 12, 4, MR)
        for x0 in (8, 13, 18, 22):  # stubby legs in the air
            for k in range(9):
                s.dot(x0, 21 - k, "m1"); s.dot(x0 + 1, 21 - k, "m2")
        for k in range(4):
            s.dot(27 + k, 26 - k, "tusk")
        for x in range(9, 22, 4):  # stars of the knock-out
            s.dot(x, 9 + (f + x) % 3, "eye")
        for x in range(5, 26, 3):
            s.dot(x, 22, "moss")
        return s
    step = [-1, 0, 1, 0][f]
    for x0, c in ((8, "m0"), (19, "m0")):  # thick far legs
        for y in range(24, G + 1):
            s.dot(x0 - step, y, c); s.dot(x0 + 1 - step, y, c); s.dot(x0 + 2 - step, y, c)
    lit_blob(s, 15, 19, 12, 7, MR, rim="m3")
    for x in range(5, 26, 2):
        s.dot(x, 12 + (x % 4 == 1), "moss"); s.dot(x + 1, 13, "mossL")
    lit_blob(s, 26, 20, 4, 4, MR)
    for k in range(4):  # tusks forward
        s.dot(28 + k, 22 - k // 2, "tusk")
    s.dot(27, 18, "eye")
    for x0, c in ((10, "m1"), (21, "m1")):
        for y in range(24, G + 1):
            s.dot(x0 + step, y, c); s.dot(x0 + 1 + step, y, c); s.dot(x0 + 2 + step, y, c)
    return s


def draw(pose, direction, frame):
    return (stalker if pose == "stalker" else brute)(direction, frame % 4)
