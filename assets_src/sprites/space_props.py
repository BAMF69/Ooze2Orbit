#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# space_props.py
# Brief   : WHAT: the two friendly worlds (docs/stages/05-space.md), seen from orbit.
#           HEARTH, the home world of the lineage: deep teal seas, ochre-green land (the Fernwood and the Ridge
#           from above), a pale polar cap, a drifting band of cloud, lit from the top-left, a soft atmosphere rim.
#           TIDEREACH, the Tidewrights' world: almost all ocean, violet-blue, a scatter of pearl reef islands, two
#           bright cloud bands and a wide pale storm; nothing ochre, so the two never read as the same place.
#           PALETTE: sea teals, the lineage's ochre and fern greens, cloud white; violet seas and pearl for Tidereach.
# Purpose : Atlas (32 px): one row per world, 4 frames (the clouds drift). The game draws it three times its size.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/space_props.py --out public/assets/art/space_props --overwrite --preview-scale 0
# Notes   : PLACEHOLDER toy art. No ground shadow: this is space.
# Authored: Written with Claude (Fable 5.2, claude-fable-5-2)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cellart import inside, light_at, lit_blob  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("hearth", "up"), ("tidereach", "up")]

PALETTE = {
    "seaD": (10, 40, 60), "sea": (22, 78, 96), "seaL": (48, 128, 140), "seaR": (120, 200, 200),
    "landD": (70, 78, 34), "land": (128, 132, 56), "landL": (190, 170, 90), "cap": (232, 240, 240), "cloud": (214, 226, 230),
    "vioD": (24, 22, 70), "vio": (44, 52, 128), "vioL": (84, 110, 190), "vioR": (160, 190, 240), "reef": (236, 250, 246), "reefD": (150, 210, 200),
}
REEFS = [(10, 12, 2, 1), (14, 9, 1, 1), (21, 21, 2, 2), (18, 24, 1, 1), (24, 15, 1, 2), (8, 20, 1, 1)]
STORM = (20, 10, 4, 2)
LAND = [(11, 10, 5, 3), (9, 14, 3, 4), (20, 18, 5, 4), (22, 13, 2, 2), (14, 23, 3, 2)]  # (cx, cy, rx, ry) blobs


def draw(pose, direction, frame):
    s = Sprite(PALETTE, CELL)
    f = frame % 4
    if pose == "tidereach":
        lit_blob(s, 16, 16, 14, 14, ["vioD", "vio", "vio", "vioL"], rim="vioR")
        for y in range(2, 30):
            for x in range(2, 30):
                hit = light_at(x, y, 16, 16, 14, 14)
                if hit is None:
                    continue
                lit = hit[0]
                if any(inside(x + 0.5, y + 0.5, cx, cy, rx + 0.5, ry + 0.5) for cx, cy, rx, ry in REEFS):
                    s.dot(x, y, "reef" if lit > 0.4 else "reefD")
                if inside(x + 0.5, y + 0.5, STORM[0] + (f % 2), STORM[1], STORM[2], STORM[3]) and lit > 0.2:
                    s.dot(x, y, "cloud")
                if y in (14, 19) and (x + f * 2 + y * 5) % 8 < 5 and lit > 0.25:
                    s.dot(x, y, "cloud" if y == 14 else "reefD")
        return s
    lit_blob(s, 16, 16, 14, 14, ["seaD", "sea", "sea", "seaL"], rim="seaR")
    for y in range(2, 30):
        for x in range(2, 30):
            hit = light_at(x, y, 16, 16, 14, 14)
            if hit is None:
                continue
            lit = hit[0]
            if any(inside(x + 0.5, y + 0.5, cx, cy, rx, ry) for cx, cy, rx, ry in LAND):
                s.dot(x, y, "landD" if lit < 0.3 else "land" if lit < 0.7 else "landL")
            if y <= 4 and lit > 0.2:
                s.dot(x, y, "cap")
            if y in (17, 18) and (x + f * 2 + y * 3) % 9 < 5 and lit > 0.25:   # the cloud band drifts
                s.dot(x, y, "cloud")
    return s
