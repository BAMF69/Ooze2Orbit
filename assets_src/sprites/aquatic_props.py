#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_props.py
# Brief   : WHAT: the lake's things that are not creatures. ALGAE: a rising strand of glowing green beads on the
#           seabed (plant food). PLANKTON: a drifting clump of glowing beads near the surface (plant food, up where
#           it is riskier). MEAT: a torn red chunk a dead creature drops (meat food). ORBS: a pale vesicle with a
#           part inside (fins, jaws, plates, gills), dropped by a beaten creature. ROCK and WEED: scenery.
#           KEY FEATURES: food is the brightest thing in the water (algae and plankton glow, meat is raw red); orbs
#           read as "pick me up" with the part's shape inside; rock and weed stay dim.
#           PALETTE: cell-stage algae greens and plankton aqua-greens, raw meat reds, the pond's vesicle blue-grey,
#           slate stone, dark olive weed. BLOOM (2026-11-08): a great kelp bloom, a tall stalk crowned with big
#           glowing pods, a big plant reward you ram open; POD: one of its pods, a big glowing plant chunk.
# Purpose : Prop atlas, 4 frames each (sway, drift and bob; the rock is still).
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_props.py --out public/assets/art/aquatic_props --overwrite --preview-scale 0
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import poly  # noqa: E402
from cellart import inside, lit_blob, speckle  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
ROWS = [("drift", "algae"), ("still", "rock"), ("sway", "weed"), ("drift", "plankton"), ("drift", "meat"),
        ("bob", "fins"), ("bob", "jaws"), ("bob", "plates"), ("bob", "gills"),
        ("drift", "log"), ("bob", "endurance"), ("bob", "torrent"), ("sway", "bloom"), ("drift", "pod")]

PALETTE = {
    "a0": (40, 92, 40), "a1": (70, 150, 60), "a2": (126, 217, 87), "a3": (196, 250, 150), "aR": (230, 255, 200),
    "p0": (30, 90, 80), "p1": (60, 150, 128), "p2": (110, 210, 170), "p3": (180, 246, 214), "pR": (226, 255, 240),
    "r0": (38, 46, 50), "r1": (62, 74, 78), "r2": (90, 104, 106), "r3": (126, 140, 138), "rR": (160, 172, 166),
    "grit": (52, 62, 66),
    "w0": (30, 46, 30), "w1": (48, 70, 40), "w2": (70, 96, 52), "w3": (96, 122, 66),
    "mD": (88, 18, 26), "m1": (138, 30, 38), "m2": (186, 52, 54), "m3": (222, 96, 86), "fiber": (240, 150, 132),
    "vesD": (70, 104, 112), "ves": (118, 156, 160), "vesL": (164, 200, 200), "glint": (250, 252, 248),
    "fin": (60, 130, 132), "finL": (120, 190, 184), "tooth": (232, 222, 196), "gum": (120, 40, 52),
    "plateD": (34, 60, 62), "plate": (70, 96, 104), "plateL": (120, 140, 146), "seam": (24, 40, 42),
    "gill": (150, 50, 64), "gillL": (210, 110, 120),
    "bark0": (40, 28, 20), "bark1": (70, 50, 34), "bark2": (104, 78, 52), "bark3": (140, 108, 74), "ring": (176, 146, 100),
    "k0": (34, 70, 30), "k1": (60, 110, 44), "k2": (96, 156, 60), "pod0": (90, 120, 30), "pod1": (150, 190, 50), "pod2": (210, 236, 110), "podR": (250, 255, 200),
    "line": (230, 210, 120), "lineD": (170, 140, 60), "gold": (250, 214, 110), "goldD": (190, 140, 50),
}
BOB = [0, 1, 0, -1]
CX, CY = 16, 16


def algae(f):
    s = Sprite(PALETTE, CELL)
    for i in range(6):  # beads up a strand, swaying more toward the top
        y = 28 - i * 4
        x = 16 + round(math.sin(i * 0.8 + f * math.pi / 2) * (i * 0.6))
        r = 3 if i < 4 else 2
        lit_blob(s, x, y, r + 0.4, r, ["a0", "a1", "a2", "a3"], rim="aR", dither=False)
    return s


def plankton(f):
    s = Sprite(PALETTE, CELL)
    pts = [(16, 8), (11, 12), (20, 13), (15, 16), (9, 19), (22, 19), (17, 22), (12, 25), (19, 26)]
    for i, (x, y) in enumerate(pts):  # a loose glowing clump, each bead drifting a little
        dx = round(math.sin(f * math.pi / 2 + i) * 1.2)
        lit_blob(s, x + dx, y, 2.6, 2.6, ["p0", "p1", "p2", "p3"], rim="pR", dither=False)
    return s


def rock(f):
    s = Sprite(PALETTE, CELL)
    lit_blob(s, 16, 20, 13, 9.5, ["r0", "r1", "r2", "r3"], rim="rR")
    speckle(s, 16, 20, 13, 9.5, "grit", seed=21, n=14, min_light=0.0)
    return s


def weed(f):
    s = Sprite(PALETTE, CELL)
    for k, (bx, h) in enumerate(((11, 24), (16, 27), (21, 22))):
        for i in range(h):
            y = 30 - i
            x = bx + round(math.sin(i * 0.25 + (f + k) * math.pi / 2) * (i / h) * 3)
            c = ["w0", "w1", "w2", "w3"][min(3, i * 4 // h)]
            s.dot(x, y, c)
            s.dot(x + 1, y, "w0" if i % 3 else c)
            if i % 6 == 3:  # small leaves
                s.dot(x - 1, y, "w2")
                s.dot(x + 2, y - 1, "w3")
    return s


def meat(f):
    s = Sprite(PALETTE, CELL)
    b = BOB[f]
    lit_blob(s, 15, 18 + b, 9, 7, ["mD", "m1", "m2", "m3"], rim="fiber")
    lit_blob(s, 20, 11 + b, 5, 5, ["mD", "m1", "m2", "m3"], rim="fiber")
    for k in range(5):  # fiber streaks
        s.dot(10 + k * 2, 16 + b + (k % 2), "fiber")
    return s


def vesicle(f):
    s = Sprite(PALETTE, CELL)
    b = BOB[f]
    for y in range(CY - 10, CY + 11):
        for x in range(CX - 10, CX + 11):
            if inside(x + 0.5, y + 0.5 + b, CX, CY, 10.4, 10.4):
                rim = not inside(x + 0.5, y + 0.5 + b, CX, CY, 8.8, 8.8)
                lit = (x - CX) + (y + b - CY) < -6
                s.dot(x, y, "vesD" if rim and not lit else "vesL" if rim else "ves")
    s.dot(CX - 5, CY - 6 - b, "glint"); s.dot(CX - 6, CY - 5 - b, "glint")
    return s, b


def orb_fins(f):
    s, b = vesicle(f)
    poly(s, [(CX - 1, CY - b), (CX - 7, CY - 5 - b), (CX - 6, CY + 3 - b)], "fin")
    poly(s, [(CX + 1, CY - b), (CX + 7, CY - 5 - b), (CX + 6, CY + 3 - b)], "finL")
    return s


def orb_jaws(f):
    s, b = vesicle(f)
    for x in range(CX - 5, CX + 6):  # a gum arc with teeth
        s.dot(x, CY + 2 - b, "gum")
        if x % 2 == 0:
            s.dot(x, CY + 1 - b, "tooth")
            s.dot(x, CY - b, "tooth")
    for x in range(CX - 4, CX + 5):
        s.dot(x, CY - 4 - b, "gum")
        if x % 2 == 1:
            s.dot(x, CY - 3 - b, "tooth")
    return s


def orb_plates(f):
    s, b = vesicle(f)
    for k, y in enumerate((CY - 5, CY - 1, CY + 3)):  # three overlapping plates
        for x in range(CX - 6 + k, CX + 7 - k):
            s.dot(x, y - b, "plateL")
            s.dot(x, y + 1 - b, "plate")
            s.dot(x, y + 2 - b, "plateD" if x % 3 else "seam")
    return s


def orb_gills(f):
    s, b = vesicle(f)
    for k in range(3):  # three curved gill slits
        for t in range(7):
            x = CX - 4 + k * 4 + (1 if t in (2, 3, 4) else 0)
            s.dot(x, CY - 4 + t - b, "gill")
            s.dot(x + 1, CY - 4 + t - b, "gillL" if t % 2 else "gill")
    return s


def log(f):
    """A sunken-and-floating log: a lit bark cylinder seen end-on-ish, with a pale cut end and a snapped branch."""
    s = Sprite(PALETTE, CELL)
    b = BOB[f]
    lit_blob(s, 16, 17 + b, 14, 7, ["bark0", "bark1", "bark2", "bark3"], dither=False)
    for x in range(4, 29, 4):  # bark furrows
        for y in range(13 + b, 22 + b):
            if (y + x) % 3 == 0:
                s.dot(x, y, "bark0")
    lit_blob(s, 27, 17 + b, 3, 6, ["bark1", "bark2", "ring", "ring"], dither=False)  # the cut end
    poly(s, [(10, 11 + b), (7, 3 + b), (9, 3 + b), (12, 11 + b)], "bark1")  # a snapped branch
    return s


def orb_endurance(f):
    """River 1's part: the endurance muscle (replaced the lateral line, 2026-11-08), a red striated muscle bundle:
    double stamina."""
    s, b = vesicle(f)
    lit_blob(s, CX, CY - b, 6, 4, ["mD", "m1", "m2", "m3"], rim="fiber", dither=False)
    for k in range(-5, 6, 2):  # striations
        s.dot(CX + k, CY - 1 - b, "fiber")
        s.dot(CX + k + 1, CY + 1 - b, "mD")
    for k in (-7, 7):  # tendons at both ends
        s.dot(CX + k, CY - b, "memb" if "memb" in PALETTE else "fiber")
    return s


def orb_torrent(f):
    """River 2's part: the torrent tail, a golden swept crescent fin (dash faster, more often)."""
    s, b = vesicle(f)
    poly(s, [(CX - 5, CY - b), (CX + 5, CY - 8 - b), (CX + 2, CY - b), (CX + 5, CY + 6 - b)], "goldD")
    poly(s, [(CX - 3, CY - b), (CX + 4, CY - 6 - b), (CX + 1, CY - b)], "gold")
    return s


def bloom(f):
    """A great kelp bloom: a thick swaying stalk with leaves, crowned with big glowing pods (break it open)."""
    s = Sprite(PALETTE, CELL)
    sway = [0, 1, 0, -1][f]
    for i in range(18):  # the stalk, leaning with the sway toward the top
        y = 31 - i
        x = 16 + round(sway * i / 18)
        for dx in (-1, 0, 1):
            s.dot(x + dx, y, "k0" if dx < 0 else "k1" if dx == 0 else "k2")
        if i % 5 == 2:  # broad leaves
            for k in range(1, 5):
                s.dot(x - 1 - k, y - k // 2, "k1"); s.dot(x + 1 + k, y - k // 2, "k2")
    for (px, py, r) in ((16, 9, 4), (10, 12, 3), (22, 12, 3), (13, 5, 3), (20, 5, 3)):  # the glowing pods on top
        lit_blob(s, px + sway, py, r + 0.4, r, ["pod0", "pod1", "pod2", "pod2"], rim="podR", dither=False)
    return s


def pod(f):
    """One pod of a great kelp bloom: a big glowing seed-pod, worth a lot of plant food."""
    s = Sprite(PALETTE, CELL)
    b = BOB[f]
    lit_blob(s, 16, 17 + b, 9, 10, ["pod0", "pod1", "pod2", "pod2"], rim="podR", dither=False)
    for y in range(9 + b, 26 + b, 3):  # seams
        s.dot(16, y, "pod0")
    for x in range(14, 19):  # its torn stalk
        s.dot(x, 6 + b, "k1")
    return s


DRAW = {"bloom": bloom, "pod": pod, "log": log, "endurance": orb_endurance, "torrent": orb_torrent, "algae": algae, "rock": rock, "weed": weed, "plankton": plankton, "meat": meat,
        "fins": orb_fins, "jaws": orb_jaws, "plates": orb_plates, "gills": orb_gills}


def draw(pose, direction, frame):
    return DRAW[direction](frame % 4)
