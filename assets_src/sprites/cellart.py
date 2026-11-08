#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# cellart.py
# Purpose : Shared drawing helpers for Ooze2Orbit's organisms, so every cell is lit the same way: light from the
#           top-left (GDD art direction "lit and moody, under a microscope"). Not a sprite file itself.
# Usage   : in a sprite file:  import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from cellart import *
#           lit_blob(s, cx, cy, rx, ry, ["deep", "dark", "base", "light"], rim="rim")
# Notes   : lit_blob shades an ellipse as a sphere (Lambert against LIGHT) into a 4-step ramp with a checker dither
#           between steps, a bright membrane rim on the lit side and a dark one on the shadow side. Pixel positions
#           are absolute (Sprite.dot); pass oy yourself if the body bobs.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import math

LIGHT = (-0.55, -0.6, 0.58)  # top-left, a little in front
_L = math.sqrt(sum(v * v for v in LIGHT))
LIGHT = tuple(v / _L for v in LIGHT)


def inside(x, y, cx, cy, rx, ry):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0


def light_at(x, y, cx, cy, rx, ry):
    """Lambert light (0..1) on a sphere-shaped blob at pixel (x, y), or None outside it."""
    nx, ny = (x + 0.5 - cx) / (rx + 0.5), (y + 0.5 - cy) / (ry + 0.5)
    d2 = nx * nx + ny * ny
    if d2 > 1.0:
        return None
    nz = math.sqrt(max(0.0, 1.0 - d2))
    return max(0.0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]), d2


def lit_blob(s, cx, cy, rx, ry, ramp, rim=None, dither=True):
    """A lit ellipse. ramp = 4 palette names dark -> light. rim = lit-edge highlight (None: no rim)."""
    steps = (0.18, 0.45, 0.75)
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            r = light_at(x, y, cx, cy, rx, ry)
            if r is None:
                continue
            lam, d2 = r
            i = sum(lam > t for t in steps)
            if dither and i < 3 and lam > steps[i] - 0.06 and (x + y) % 2 == 0:
                i += 1  # checker dither just below each step: soft banding
            c = ramp[i]
            if d2 > 0.78:  # the membrane
                c = rim if (rim and lam > 0.62) else ramp[0] if lam < 0.3 else c
            s.dot(x, y, c)


def speckle(s, cx, cy, rx, ry, color, seed, n, min_light=0.3):
    """Sparse cytoplasm grain: n deterministic dots inside the blob's lit half."""
    k = seed * 7919
    for _ in range(n * 4):
        k = (k * 1103515245 + 12345) & 0x7FFFFFFF
        x = int(cx - rx + 1 + (k % 1000) / 1000 * (2 * rx - 2))
        k = (k * 1103515245 + 12345) & 0x7FFFFFFF
        y = int(cy - ry + 1 + (k % 1000) / 1000 * (2 * ry - 2))
        r = light_at(x, y, cx, cy, rx - 1.5, ry - 1.5)
        if r and r[0] > min_light:
            s.dot(x, y, color)
            n -= 1
            if n <= 0:
                return


def organelle(s, x, y, w, h, dark, light):
    """A small lit oval: a vacuole or nucleus. Dark body, one lit pixel top-left."""
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            if inside(xx + 0.5, yy + 0.5, x + w / 2, y + h / 2, w / 2 + 0.2, h / 2 + 0.2):
                s.dot(xx, yy, dark)
    s.dot(x + max(0, w // 2 - 1), y + max(0, h // 2 - 1), light)


def eye(s, x, y, dark, glint):
    """A small beady eye spot: 2x2 dark with one glint pixel. Organisms, not mascots."""
    s.dot(x, y, dark); s.dot(x + 1, y, dark); s.dot(x, y + 1, dark); s.dot(x + 1, y + 1, dark)
    s.dot(x, y, glint)


def cilia(s, cx, cy, rx, ry, frame, color, count=14, skip=None):
    """Short hairs around the membrane, swaying with the frame. skip(angle) -> True leaves a gap."""
    for i in range(count):
        a = 2 * math.pi * i / count + (0.12 if (i + frame) % 2 else -0.12)
        if skip and skip(a):
            continue
        ex, ey = math.cos(a), math.sin(a)
        x0, y0 = cx + ex * (rx + 1), cy + ey * (ry + 1)
        s.dot(int(round(x0)), int(round(y0)), color)
        if i % 2 == 0:
            s.dot(int(round(x0 + ex)), int(round(y0 + ey)), color)
