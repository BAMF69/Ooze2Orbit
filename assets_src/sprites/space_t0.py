#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# space_t0.py
# Brief   : WHO: the two ships of T0|▼| (docs/stages/05-space.md, docs/LORE.md), seen from above, nose up. Perfect
#           geometry, flawless symmetry, nothing grown: the opposite of everything alive (GDD art direction).
#           SHARD: a hard isosceles triangle, a bright seam down the middle, a single red point at its heart.
#           LATTICE: a regular hexagon of plates around a lattice of straight struts, a red core that pulses.
#           PALETTE: cold steel blues and white edges, one red light: read straight lines as danger.
# Purpose : Atlas (32 px): one row per ship, 4 frames (the core pulses). The game rotates the sprite.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/space_t0.py --out public/assets/art/space_t0 --overwrite --preview-scale 0
# Notes   : PLACEHOLDER toy art. No ground shadow: this is space.
# Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
# ---------------------------------------------------------------------------
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import poly  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("shard", "up"), ("lattice", "up")]

PALETTE = {
    "deep": (30, 38, 58), "dark": (58, 74, 104), "base": (96, 122, 160), "light": (160, 190, 220), "edge": (232, 244, 255),
    "coreD": (150, 20, 30), "core": (240, 50, 50), "coreL": (255, 180, 160),
}


def core(s, x, y, f, big):
    c = ["coreD", "core", "coreL", "core"][f]
    for dx in range(-big, big + 1):
        for dy in range(-big, big + 1):
            if abs(dx) + abs(dy) <= big:
                s.dot(x + dx, y + dy, c if abs(dx) + abs(dy) < big else "coreD")


def draw(pose, direction, frame):
    s = Sprite(PALETTE, CELL)
    f = frame % 4
    if pose == "shard":
        poly(s, [(16, 3), (26, 27), (6, 27)], "base")
        poly(s, [(16, 3), (16, 27), (6, 27)], "light")     # the lit left face
        poly(s, [(16, 12), (21, 25), (11, 25)], "dark")     # an inner, smaller triangle
        for y in range(4, 27):                              # the bright seam
            s.dot(16, y, "edge")
        for x in range(7, 26):
            s.dot(x, 27, "deep")
        core(s, 16, 20, f, 1)
    else:  # lattice
        pts = [(16 + 13 * math.cos(math.pi / 3 * i), 16 + 13 * math.sin(math.pi / 3 * i)) for i in range(6)]
        poly(s, pts, "base")
        inner = [(16 + 9 * math.cos(math.pi / 3 * i), 16 + 9 * math.sin(math.pi / 3 * i)) for i in range(6)]
        poly(s, inner, "deep")
        for i in range(6):                                  # struts from the core to each corner
            ex, ey = pts[i]
            for k in range(14):
                x, y = 16 + (ex - 16) * k / 14, 16 + (ey - 16) * k / 14
                s.dot(int(round(x)), int(round(y)), "edge" if i in (3, 4) else "light")
        for x in range(4, 16):                              # the lit upper-left plates
            for y in range(4, 16):
                if s.px.get((x, y)) == s.color("base"):
                    s.dot(x, y, "light")
        for x in range(16, 29):
            for y in range(17, 29):
                if s.px.get((x, y)) == s.color("base"):
                    s.dot(x, y, "dark")
        core(s, 16, 16, f, 2)
    return s
