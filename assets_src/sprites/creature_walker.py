#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# creature_walker.py
# Brief   : WHO: the player in the creature stage, the lineage's first land walker (docs/stages/03-creature.md):
#           the ochre cell, then the ochre fish, now a low four-legged amphibian on land. Silhouette: a long low
#           body on four bent legs, a raised head on a short neck, a tail sweeping down to the ground, a ridge of
#           small spines down the back. Side view, facing right (the game flips it).
#           KEY FEATURES: one bright beady eye, a wide jaw it bites with, pale belly, the dorsal ridge.
#           PALETTE: the lineage's ochre lit from the top-left (GDD "lit and moody"), a pale belly, a darker ridge.
# Purpose : Atlas for tools/art/pixel_sprite.py: rows idle, walk, jump, bite, crouch (direction "right"), 4 frames.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/creature_walker.py --out public/assets/art/creature_walker --overwrite --preview-scale 0
# Notes   : Crouch keeps the tail curled up like a stalking cat, so the low pose still reads (and passes the floor).
#           PLACEHOLDER toy art (CLAUDE.md "crude on purpose").
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
SHADOW = True
ROWS = [(p, "right") for p in ("idle", "walk", "jump", "bite", "crouch")]

PALETTE = {
    "deep": (78, 50, 26), "dark": (128, 84, 42), "base": (176, 122, 62), "light": (214, 166, 98), "rim": (240, 210, 154),
    "belly": (226, 198, 146), "ridge": (98, 62, 32), "ridgeL": (150, 100, 52), "leg": (120, 78, 40), "legF": (92, 60, 30),
    "eye": (16, 12, 10), "glint": (250, 236, 200), "mouth": (60, 20, 16), "tooth": (236, 228, 206), "claw": (220, 210, 186),
}
RAMP = ["deep", "dark", "base", "light"]
GROUND = 30


def leg(s, x, top, foot_dx, color, foot):
    """A bent two-segment leg from (x, top) down to the ground, the foot pushed foot_dx sideways (the walk)."""
    knee = (x + foot_dx // 2, top + (GROUND - top) // 2)
    for y in range(top, knee[1] + 1):
        s.dot(x, y, color); s.dot(x + 1, y, color)
    for y in range(knee[1], GROUND):
        xx = knee[0] + (foot_dx - foot_dx // 2) * (y - knee[1]) // max(1, GROUND - knee[1])
        s.dot(xx, y, color); s.dot(xx + 1, y, color)
    fx = x + foot_dx
    for dx in range(-1, 3):
        s.dot(fx + dx, GROUND, foot)
    s.dot(fx + 3, GROUND, "claw")


def body(s, o, head_dx=0, jaw=0, tail_up=False):
    """Tail, body, neck, head, ridge, belly, eye and jaw; o = body offset down, head_dx = head pushed forward."""
    if tail_up:  # curled up behind like a stalking cat
        poly(s, [(9, 17 + o), (4, 14 + o), (2, 9), (4, 8), (6, 12 + o), (10, 15 + o)], "dark")
        s.dot(3, 9, "light"); s.dot(4, 10, "light")
    else:
        poly(s, [(9, 16 + o), (0, 27), (2, 28), (10, 21 + o)], "dark")
        for x in range(2, 9):
            s.dot(x, 26 - (x - 2) + o // 2, "light")
    lit_blob(s, 15, 19 + o, 9, 5, RAMP, rim="rim")
    for x in range(9, 22):  # pale belly
        s.dot(x, 23 + o, "belly")
    lit_blob(s, 21 + head_dx // 2, 16 + o, 3, 3, RAMP, rim="rim")  # neck
    hx, hy = 25 + head_dx, 13 + o
    lit_blob(s, hx, hy, 5, 4, RAMP, rim="rim")
    for x in range(8, 21, 3):  # the dorsal ridge
        s.dot(x, 13 + o, "ridge"); s.dot(x + 1, 13 + o, "ridgeL"); s.dot(x, 12 + o, "ridge")
    eye(s, hx + 1, hy - 2, "eye", "glint")
    if jaw:  # bite: the jaw drops open, teeth showing
        for x in range(hx - 1, hx + 6):
            s.dot(x, hy + 2, "mouth"); s.dot(x, hy + 3, "mouth")
        for x in range(hx, hx + 6, 2):
            s.dot(x, hy + 1, "tooth"); s.dot(x + 1, hy + 4, "tooth")
        for x in range(hx - 2, hx + 6):
            s.dot(x, hy + 5, "dark")
    else:
        for x in range(hx, hx + 5):
            s.dot(x, hy + 2, "mouth")


STEP = [(-2, 2), (0, 0), (2, -2), (0, 0)]  # (near legs, far legs) foot offsets per walk frame


def draw(pose, direction, frame):
    s = Sprite(PALETTE, CELL)
    f = frame % 4
    if pose == "idle":
        o = [0, 0, 1, 1][f]
        leg(s, 11, 21 + o, 0, "legF", "legF"); leg(s, 22, 20 + o, 0, "legF", "legF")
        body(s, o)
        leg(s, 9, 21 + o, 0, "leg", "leg"); leg(s, 20, 20 + o, 0, "leg", "leg")
    elif pose == "walk":
        near, far = STEP[f]
        o = 1 if f % 2 else 0
        leg(s, 11, 21 + o, far, "legF", "legF"); leg(s, 22, 20 + o, -far, "legF", "legF")
        body(s, o)
        leg(s, 9, 21 + o, near, "leg", "leg"); leg(s, 20, 20 + o, -near, "leg", "leg")
    elif pose == "jump":
        o = -2
        for x0, c in ((11, "legF"), (22, "legF"), (9, "leg"), (20, "leg")):  # legs stretched back and forward
            dx = -3 if x0 < 15 else 3
            for k in range(6):
                s.dot(x0 + dx * k // 5, 21 + o + k, c); s.dot(x0 + 1 + dx * k // 5, 21 + o + k, c)
        body(s, o, head_dx=1)
        s.dot(GROUND - 3, GROUND - 3, "deep")  # keeps a little shape under the body
    elif pose == "bite":
        lunge = [1, 3, 4, 2][f]
        leg(s, 11, 21, -1, "legF", "legF"); leg(s, 22 + lunge // 2, 20, 2, "legF", "legF")
        body(s, 0, head_dx=lunge, jaw=1 if f in (1, 2) else 0)
        leg(s, 9, 21, -2, "leg", "leg"); leg(s, 20 + lunge // 2, 20, 2, "leg", "leg")
    else:  # crouch: belly low, legs folded, tail up
        o = 4
        step = [0, 1, 0, -1][f]
        leg(s, 11, 22 + o - 1, step, "legF", "legF"); leg(s, 22, 21 + o - 1, -step, "legF", "legF")
        body(s, o, tail_up=True)
        leg(s, 9, 22 + o - 1, -step, "leg", "leg"); leg(s, 20, 21 + o - 1, step, "leg", "leg")
    return s
