#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# player_upgrades.py
# Brief   : WHAT: the player's upgrades made visible, as overlay layers the game stacks on player_cell.py.
#           speed = a translucent tail fin that grows longer; mobility = paired side paddles that flap; defense =
#           an extra outer membrane that thickens; attack = mandible hooks at the front that grow and serrate.
#           KEY FEATURES: three tiers per upgrade (levels 1-2, 3-4, 5) so buying levels changes the silhouette.
#           PALETTE: the player's ochre family (player_cell.py), lit from the top-left (cellart.py); membrane pale
#           and translucent-looking; mandibles bone like the thorns.
# Purpose : Overlay atlas: rows (stat, "formN_tT"), 4 frames that match player_cell.py's swim pulse frame by frame.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/player_upgrades.py --out public/assets/art/player_upgrades --overwrite
# Notes   : NOT a standalone character: each layer alone is a fin or a ring, so some rows fall below the
#           first-art floor on purpose (height/fill); the floor applies to the composite, the player, whose own atlas
#           passes. The game picks tier with rules.upgradeTier() and syncs the frame to the player's (MainScene).
#           Layers sit behind the body except attack (in front); the defense ring starts outside the body's outline.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cellart import light_at, lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402
from player_cell import CX as BODY_CX, CY as BODY_CY, PULSE, SIZE  # noqa: E402

CELL = 48  # bigger than the player's 32: a form-3 body plus a tier-3 fin or membrane overflows 32.
OFF = (CELL - 32) // 2  # the game centers both sprites on the same point, so draw around the shifted center
CX, CY = BODY_CX + OFF, BODY_CY + OFF
FRAMES = 4
SHADOW = False

PALETTE = {
    "finD": (120, 74, 36), "fin": (176, 122, 62), "finL": (222, 178, 112), "ray": (96, 60, 30),
    "memD": (150, 132, 104), "mem": (200, 184, 150), "memL": (240, 228, 196),
    "bone": (214, 202, 168), "boneD": (140, 126, 98),
}
STATS = ("attack", "speed", "defense", "mobility")
ROWS = [(stat, f"form{f}_t{t}") for stat in STATS for f in (1, 2, 3, 4) for t in (1, 2, 3)]


def tail_fin(s, rx, t, f):
    """A fan fin behind the body: longer and taller per tier, its rays fanning with the frame."""
    length = 3 + 2 * t
    x0 = CX - rx - 1
    for k in range(length):
        half = 1 + (k * (1 + t)) // length + (1 if k == length - 1 else 0)
        sway = round(0.8 * math.sin(k * 0.7 + f * math.pi / 2)) if k > 1 else 0
        for dy in range(-half, half + 1):
            c = "finL" if dy < 0 else "fin" if dy == 0 else "finD"
            if dy in (-half, half) and k > 1:
                c = "ray"
            s.dot(x0 - k, CY + dy + sway, c)


def paddles(s, rx, ry, t, f):
    """Paired oval side fins near the front, top and bottom, swept back; bigger per tier; they flap."""
    flap = (0, 1, 0, -1)[f]
    prx, pry = 2 + t, 1 + (t + 1) // 2
    for side in (-1, 1):
        cx = CX + 2 - t + flap
        cy = CY + side * (ry + pry)
        lit_blob(s, cx, cy, prx, pry, ["ray", "finD", "fin", "finL"], rim="finL")
        s.dot(cx - prx, cy, "ray")  # the fin's trailing ray


def membrane(s, rx, ry, t):
    """An extra outer membrane: a ring from just outside the body's outline, t pixels thick, lit top-left."""
    for y in range(CY - ry - t - 3, CY + ry + t + 4):
        for x in range(CX - rx - t - 3, CX + rx + t + 4):
            outer = ((x + 0.5 - CX) / (rx + 1.5 + t)) ** 2 + ((y + 0.5 - CY) / (ry + 1.5 + t)) ** 2 <= 1
            inner = ((x + 0.5 - CX) / (rx + 1.6)) ** 2 + ((y + 0.5 - CY) / (ry + 1.6)) ** 2 <= 1
            if outer and not inner:
                r = light_at(x, y, CX, CY, rx + 1.5 + t, ry + 1.5 + t)
                lam = r[0] if r else 0.3
                c = "memL" if lam > 0.55 else "mem" if lam > 0.25 else "memD"
                if t == 3 and (x + y) % 3 == 0:
                    c = "memD"  # the thickest membrane is visibly layered
                s.dot(x, y, c)


def mandibles(s, rx, t, f):
    """Two hooked mandibles at the front, top and bottom, curving in; longer per tier, serrated at tier 3."""
    snap = 1 if f == 2 else 0
    for side in (-1, 1):
        x, y = CX + rx - 1, CY + side * 3
        for k in range(2 + 2 * t):
            x += 1
            if k >= 1 + t:
                y -= side  # the hook curls toward the middle
            yy = y - side * snap
            s.dot(x, yy, "bone" if side < 0 else "boneD")
            s.dot(x, yy + side, "boneD")
            if t == 3 and k % 2 == 0:
                s.dot(x, yy - side, "bone")  # serrations


def draw(pose, direction, frame):
    form, tier = int(direction[4]), int(direction[7])
    rx0, ry = SIZE[form]
    rx = rx0 + PULSE[frame % 4]
    s = Sprite(PALETTE, CELL)
    if pose == "speed":
        tail_fin(s, rx, tier, frame)
    elif pose == "mobility":
        paddles(s, rx, ry, tier, frame)
    elif pose == "defense":
        membrane(s, rx, ry, tier)
    elif pose == "attack":
        mandibles(s, rx, tier, frame)
    else:
        raise ValueError(f"unknown upgrade {pose}")
    return s
