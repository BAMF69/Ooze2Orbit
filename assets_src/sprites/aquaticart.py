#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquaticart.py
# Purpose : Shared drawing helpers for the aquatic stage's creatures (seen from behind, the side and the front):
#           filled polygons for fins and tails, a lit fin (darker toward its root), and a wag/flap offset per frame.
#           Body lighting reuses cellart.py (light from the top-left, GDD "lit and moody").
# Usage   : from aquaticart import poly, fin, WAG
# Notes   : Not a sprite file (no ROWS/draw): pixel_sprite.py only builds files that define them.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------

WAG = [-2, 0, 2, 0]        # tail sideways/vertical offset per frame (4-frame swim)
FLAP = [1, 0, -1, 0]       # pectoral fin up/down per frame


def poly(s, pts, color):
    """Fill a polygon (list of (x, y)) with one palette color, scanline even-odd."""
    ys = [p[1] for p in pts]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        yc = y + 0.5
        xs = []
        for i in range(len(pts)):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
            if (y0 <= yc < y1) or (y1 <= yc < y0):
                xs.append(x0 + (yc - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for a, b in zip(xs[0::2], xs[1::2]):
            for x in range(int(round(a)), int(round(b))):
                s.dot(x, y, color)


def fin(s, pts, dark, light, root):
    """A fin: filled dark, with its edge from the second-to-last point lit; root = (x, y) stays dark.
    Cheap two-tone shading: pixels farther than half the fin from the root take the light tone."""
    poly(s, pts, dark)
    dark_rgb = s.color(dark)
    rx, ry = root
    far = max(abs(x - rx) + abs(y - ry) for x, y in pts) or 1
    ys = [p[1] for p in pts]
    xs = [p[0] for p in pts]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        for x in range(int(min(xs)), int(max(xs)) + 1):
            if s.px.get((x, y)) == dark_rgb and (abs(x - rx) + abs(y - ry)) > far * 0.55:
                s.dot(x, y, light)
