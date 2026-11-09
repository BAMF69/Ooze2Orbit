#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# creature_boss.py
# Brief   : WHO: the Old Horn, the creature stage's first boss (docs/stages/03-creature.md), side view facing right.
#           A huge old grazer gone bad-tempered, the master of its den. Silhouette: a massive hunched body on short
#           pillar legs, a low heavy head with two great curved horns sweeping forward, a shaggy mane, a stub tail.
#           KEY FEATURES: the horns (it charges with them), small burning eyes, scarred hide, steam from the nostrils.
#           PALETTE: dark umber and bronze hide, bone horns, ember-orange eyes (the GDD's lit and moody).
# Purpose : Atlas (64 px): rows roam, windup, charge, stunned, down; 4 frames each.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/creature_boss.py --out public/assets/art/creature_boss --overwrite --preview-scale 0
# Notes   : PLACEHOLDER toy art. windup = head down, pawing; stunned = horns stuck low, stars; down = on its side.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import poly  # noqa: E402
from cellart import lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 64
FRAMES = 4
SHADOW = True
ROWS = [("boss", d) for d in ("roam", "windup", "charge", "stunned", "down")]

PALETTE = {
    "u0": (34, 22, 14), "u1": (66, 44, 26), "u2": (102, 70, 40), "u3": (140, 100, 60), "uR": (178, 138, 90),
    "mane": (48, 30, 18), "maneL": (86, 60, 36), "horn": (226, 214, 186), "hornD": (150, 136, 108),
    "eye": (255, 150, 50), "eyeR": (255, 70, 30), "scar": (160, 120, 90), "hoof": (28, 20, 14), "steam": (200, 200, 210),
    "star": (255, 220, 110),
}
UR = ["u0", "u1", "u2", "u3"]
G = 60


def legs(s, step, color, xs):
    for i, x in enumerate(xs):
        dx = step if i % 2 == 0 else -step
        for y in range(44, G):
            for k in range(5):
                s.dot(x + k + (dx * (y - 44)) // 16, y, color)
        for k in range(-1, 6):
            s.dot(x + k + dx, G, "hoof")


def horn(s, x, y, length, down):
    """A great curved horn from (x, y) sweeping forward and up (or forward and down when charging)."""
    for t in range(length):
        hx = x + t
        hy = y - (t * t) // (length + 2) if not down else y + t // 3
        w = max(2, 6 - t // 4)
        for k in range(w):
            s.dot(hx, hy - k, "horn" if k == 0 else "hornD")


def body(s, head_low=0, f=0, steam=False, eyes="eye"):
    poly(s, [(10, 30), (3, 36 + f % 2), (4, 38), (11, 34)], "u1")  # stub tail
    lit_blob(s, 26, 34, 19, 12, UR, rim="uR")  # massive body
    for x in range(12, 40, 3):  # shaggy mane along the back
        for k in range(4):
            s.dot(x + k // 2, 22 + (x % 2) + k, "mane" if k < 2 else "maneL")
    for x in (18, 24, 30):  # old scars
        s.dot(x, 30, "scar"); s.dot(x + 1, 31, "scar"); s.dot(x + 2, 32, "scar")
    hx, hy = 47, 34 + head_low
    lit_blob(s, hx, hy, 9, 7, UR, rim="uR")  # heavy head
    s.dot(hx + 3, hy - 3, eyes); s.dot(hx + 4, hy - 3, eyes)
    for x in range(hx + 4, hx + 9):
        s.dot(x, hy + 4, "u0")  # mouth line
    horn(s, hx - 4, hy - 3, 18, head_low > 4)  # the far horn
    horn(s, hx, hy - 2, 16, head_low > 4)
    if steam:
        for k in range(3):
            s.dot(hx + 10 + k * 2 + f, hy + 1 - k, "steam")


def draw(pose, direction, frame):
    s = Sprite(PALETTE, CELL)
    f = frame % 4
    if direction == "down":
        lit_blob(s, 30, 50, 22, 8, UR, rim="uR")
        lit_blob(s, 52, 50, 8, 6, UR)
        for x0 in (16, 24, 34, 42):  # legs in the air
            for k in range(15):
                s.dot(x0, 43 - k, "u1"); s.dot(x0 + 1, 43 - k, "u2"); s.dot(x0 + 2, 43 - k, "u1")
            for k in range(-1, 4):
                s.dot(x0 + k, 28, "hoof")
        horn(s, 52, 46, 12, False)
        for x in range(20, 44, 6):
            s.dot(x, 20 + (f + x) % 3, "star"); s.dot(x + 1, 20 + (f + x) % 3, "star")
        return s
    if direction == "roam":
        legs(s, [-2, 0, 2, 0][f], "u0", (14, 34))
        body(s, 0, f)
        legs(s, [2, 0, -2, 0][f], "u1", (19, 39))
    elif direction == "windup":  # head down, pawing the ground, steaming
        legs(s, 0, "u0", (14, 34))
        body(s, 6, f, steam=True, eyes="eyeR")
        legs(s, [0, -3, 0, -3][f], "u1", (19, 39))
    elif direction == "charge":
        legs(s, [-4, 0, 4, 0][f], "u0", (14, 34))
        body(s, 8, f, steam=True, eyes="eyeR")
        legs(s, [4, 0, -4, 0][f], "u1", (19, 39))
    else:  # stunned: swaying, horns low, stars circling
        legs(s, 0, "u0", (14, 34))
        body(s, 9 + [0, 1, 0, -1][f], f)
        for k in range(3):
            sx = 40 + [0, 4, 8, 4][(f + k) % 4]
            s.dot(sx, 16 + k * 2, "star"); s.dot(sx + 1, 16 + k * 2, "star")
    return s
