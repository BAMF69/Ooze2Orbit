#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_swimmer.py
# Brief   : WHO: your species in the aquatic stage (the avatar and its kin): the cell stage's ochre cell grown into
#           a first fish. Silhouette: a rounded body, a forked tail, a dorsal fin and two paddle fins. Seen mostly
#           from BEHIND (the camera follows it). ITS TEMPERAMENT SHAPES IT (BAMF69 2026-11-08), three families of
#           three steps each, from look 0 (the plain ochre fish):
#           AGGRESSIVE -> a shark: 1 a taller pointed dorsal; 2 grey-olive countershading, teeth, slender; 3 slate grey,
#             long and narrow, pointed snout, angry brows, crescent tail, gill slits.
#           CAUTIOUS -> armoured: 1 bony plates on the back; 2 bronze-olive, rounder, a spiny ridge; 3 heavy armour,
#             spines along the flanks, small deep-set eyes.
#           ADAPTABLE -> streamlined: 1 longer flowing fins; 2 teal-violet, slimmer, an iridescent stripe; 3 a ribbon
#             of a fish, long trailing fins and tail streamers.
#           PALETTE: the player cell's ochre ramp at look 0, shading to slate (shark), bronze-olive (armoured) or
#           teal-violet (streamlined).
# Purpose : Atlas: three views (back, side facing right, front) x ten looks, 4 swim frames each.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_swimmer.py --out public/assets/art/aquatic_swimmer --overwrite --preview-scale 0
# Notes   : Rows = ("swim", "<view><look>"), look in 0, 1..3 (shark), c1..c3 (armoured), a1..a3 (streamlined): see
#           creature.ts bodyLook(). Body thickness (an evolving trait) is applied in game by scaling the sprite.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import FLAP, WAG, fin, poly  # noqa: E402
from cellart import eye, lit_blob, speckle  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
LOOKS = ("0", "1", "2", "3", "c1", "c2", "c3", "a1", "a2", "a3")
ROWS = [("swim", f"{v}{lk}") for v in ("back", "side", "front") for lk in LOOKS]

PALETTE = {
    "o0": (88, 56, 30), "o1": (134, 88, 44), "o2": (176, 122, 62), "o3": (212, 164, 96), "oR": (238, 208, 152),
    "g0": (52, 54, 40), "g1": (86, 88, 66), "g2": (124, 124, 96), "g3": (164, 162, 128), "gR": (204, 200, 168),
    "s0": (34, 42, 52), "s1": (58, 70, 84), "s2": (88, 102, 116), "s3": (124, 138, 150), "sR": (176, 188, 196),
    "b0": (52, 40, 22), "b1": (92, 76, 40), "b2": (132, 112, 58), "b3": (170, 150, 86), "bR": (206, 190, 128),
    "t0": (24, 46, 64), "t1": (36, 84, 104), "t2": (56, 128, 140), "t3": (100, 176, 176), "tR": (170, 226, 220),
    "grain": (150, 100, 52), "belly": (226, 214, 186), "bellyS": (220, 226, 228),
    "fin": (104, 84, 46), "finL": (150, 126, 74), "finS": (50, 60, 72), "finSL": (92, 106, 120),
    "finB": (80, 64, 34), "finBL": (124, 104, 58), "finT": (60, 70, 130), "finTL": (130, 120, 200),
    "plate": (70, 58, 34), "plateL": (180, 160, 100), "spike": (214, 200, 160),
    "irid": (150, 110, 210), "iridL": (110, 210, 220),
    "eye": (20, 16, 20), "glint": (232, 228, 214), "mouth": (60, 30, 22), "tooth": (236, 232, 220), "gill": (30, 36, 44),
}


def look(lk):
    """('shark' | 'armour' | 'stream', step 0..3) from a look code."""
    if lk == "0":
        return "shark", 0
    if lk[0] == "c":
        return "armour", int(lk[1])
    if lk[0] == "a":
        return "stream", int(lk[1])
    return "shark", int(lk)


def ramp(fam, t):
    if t == 0 or (fam == "shark" and t == 1) or t == 1:
        return ["o0", "o1", "o2", "o3"], "oR"
    if fam == "shark":
        return (["g0", "g1", "g2", "g3"], "gR") if t == 2 else (["s0", "s1", "s2", "s3"], "sR")
    if fam == "armour":
        return ["b0", "b1", "b2", "b3"], "bR"
    return ["t0", "t1", "t2", "t3"], "tR"


def fins(fam, t):
    if fam == "shark" and t >= 2:
        return "finS", "finSL"
    if fam == "armour" and t >= 2:
        return "finB", "finBL"
    if fam == "stream" and t >= 1:
        return "finT", "finTL"
    return "fin", "finL"


def body(s, cx, cy, rx, ry, fam, t, seed):
    r, rim = ramp(fam, t)
    lit_blob(s, cx, cy, rx, ry, r, rim=rim)
    if t < 2 and fam != "stream":
        speckle(s, cx, cy, rx, ry, "grain", seed=seed, n=6)
    return r


def back(f, fam, t):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 14
    w = WAG[f]
    fd, fl = fins(fam, t)
    long_ = fam == "stream" and t >= 1
    tip = 16 + (2 if long_ else 0) + (1 if fam == "shark" and t == 3 else 0)
    fin(s, [(cx - 1, cy + 4), (cx + 2, cy + 4), (cx + 3 + w, cy + tip), (cx + 1 + w, cy + 12), (cx - 2 + w, cy + tip)], fd, fl, (cx, cy + 4))
    f2 = FLAP[f]
    reach = 14 + (2 if long_ else 0)
    fin(s, [(cx - 7, cy + 1), (cx - reach, cy + 3 + f2), (cx - reach + 1, cy + 6 + f2), (cx - 6, cy + 4)], fd, fl, (cx - 7, cy + 2))
    fin(s, [(cx + 7, cy + 1), (cx + reach, cy + 3 + f2), (cx + reach - 1, cy + 6 + f2), (cx + 6, cy + 4)], fd, fl, (cx + 7, cy + 2))
    if fam == "shark":
        rx, ry = (8, 7) if t < 2 else (6, 6) if t == 2 else (5, 6)
    elif fam == "armour":
        rx, ry = (8, 7) if t < 2 else (9, 8)
    else:
        rx, ry = (8, 7) if t < 2 else (6, 6) if t == 2 else (5, 7)
    r = body(s, cx, cy, rx, ry, fam, t, 5)
    if fam == "shark":
        h = {0: 4, 1: 7, 2: 9, 3: 11}[t]
        poly(s, [(cx - 1, cy - 3), (cx, cy - 4 - h), (cx + 2, cy - 3)], fd)
        s.dot(cx, cy - 3 - h, fl)
        if t >= 2:
            s.dot(cx - rx, cy - 4, r[0]); s.dot(cx - rx + 1, cy - 5, r[0]); s.dot(cx + rx, cy - 4, r[0]); s.dot(cx + rx - 1, cy - 5, r[0])
    elif fam == "armour":
        for y in range(cy - ry + 2, cy + 3, 3):  # plate rows across the back
            for x in range(cx - rx + 2, cx + rx - 1):
                s.dot(x, y, "plate" if (x + y) % 4 else "plateL")
        if t >= 2:  # a spiny ridge
            for y in range(cy - ry - 2, cy + 2, 3):
                poly(s, [(cx - 1, y + 2), (cx, y - 1), (cx + 2, y + 2)], "spike")
        if t >= 3:  # spines along the flanks
            for y in (cy - 3, cy + 1):
                s.dot(cx - rx - 1, y, "spike"); s.dot(cx - rx - 2, y - 1, "spike"); s.dot(cx + rx + 1, y, "spike"); s.dot(cx + rx + 2, y - 1, "spike")
    else:
        for y in range(cy - ry + 1, cy + ry - 1):  # a low ridge down the back
            s.dot(cx, y, r[1] if y % 2 else r[0])
        if t >= 2:  # an iridescent stripe along each side
            for y in range(cy - 3, cy + 4):
                s.dot(cx - rx + 1, y, "irid" if y % 2 else "iridL"); s.dot(cx + rx - 1, y, "iridL" if y % 2 else "irid")
    return s


def side(f, fam, t):
    s = Sprite(PALETTE, CELL)
    cx, cy = 17, 16
    w = WAG[f]
    fd, fl = fins(fam, t)
    if fam == "shark":
        rx, ry = (10, 7) if t < 2 else (12, 5) if t == 2 else (13, 5)
    elif fam == "armour":
        rx, ry = (10, 7) if t < 2 else (10, 8)
    else:
        rx, ry = (10, 7) if t < 2 else (12, 5) if t == 2 else (13, 4)
    if fam == "shark" and t == 3:  # crescent
        fin(s, [(cx - rx + 1, cy - 1), (cx - rx - 4, cy - 10 + w), (cx - rx - 2, cy + w), (cx - rx - 4, cy + 5 + w), (cx - rx + 1, cy + 2)], fd, fl, (cx - rx + 1, cy))
    elif fam == "stream" and t >= 1:  # long streamers
        ln = 6 + 2 * t
        fin(s, [(cx - rx + 1, cy - 1), (cx - rx - ln, cy - 6 + w), (cx - rx - ln + 3, cy + w), (cx - rx - ln, cy + 6 + w), (cx - rx + 1, cy + 2)], fd, fl, (cx - rx + 1, cy))
    else:
        fin(s, [(cx - rx + 1, cy - 1), (cx - rx - 5, cy - 7 + w), (cx - rx - 3, cy + w), (cx - rx - 5, cy + 7 + w), (cx - rx + 1, cy + 2)], fd, fl, (cx - rx + 1, cy))
    h = {0: 4, 1: 7, 2: 9, 3: 11}[t] if fam == "shark" else (4 if fam == "armour" else 3 + 2 * t)
    if fam == "stream" and t >= 1:  # a long, low, flowing dorsal
        poly(s, [(cx - 7, cy - ry + 1), (cx - 2, cy - ry - h), (cx + 6, cy - ry + 1)], fd)
    else:
        poly(s, [(cx - 4, cy - ry + 1), (cx - (1 if t == 3 else 0), cy - ry - h), (cx + 4, cy - ry + 1)], fd)
    r = body(s, cx, cy, rx, ry, fam, t, 11)
    for x in range(cx - rx + 4, cx + rx - 2):  # pale belly
        s.dot(x, cy + ry - 2, "belly" if t < 2 else "bellyS")
    if fam == "armour" and t >= 1:  # plates along the flank, and spines
        for x in range(cx - rx + 3, cx + rx - 3, 3):
            for y in range(cy - ry + 2, cy + 2):
                if (x + y) % 3 == 0:
                    s.dot(x, y, "plate")
            if t >= 2:
                poly(s, [(x - 1, cy - ry + 1), (x, cy - ry - 2), (x + 1, cy - ry + 1)], "spike")
    if fam == "stream" and t >= 2:  # the iridescent stripe
        for x in range(cx - rx + 2, cx + rx - 3):
            s.dot(x, cy, "irid" if x % 2 else "iridL")
    f2 = FLAP[f]
    pl = 4 + (4 if fam == "stream" and t >= 1 else 0)
    fin(s, [(cx + 1, cy + 2), (cx - pl, cy + 7 + f2), (cx + 3, cy + 5)], fd, fl, (cx + 1, cy + 2))
    if fam == "shark" and t == 3:
        for k in range(3):
            for dy in (-1, 0, 1):
                s.dot(cx + 4 + k * 2, cy + dy, "gill")
    if fam == "shark" and t >= 2:  # pointed snout, angry brow
        poly(s, [(cx + rx - 2, cy - 3), (cx + rx + 4, cy - 1), (cx + rx - 2, cy + 2)], r[2])
    small = fam == "armour" and t == 3
    if small:
        s.dot(cx + rx - 4, cy - 2, "eye")
    else:
        eye(s, cx + rx - 4, cy - 2 if (fam != "armour" and t >= 2) else cy - 3, "eye", "glint")
    if fam == "shark" and t >= 2:
        s.dot(cx + rx - 5, cy - 4, r[0]); s.dot(cx + rx - 4, cy - 4, r[0]); s.dot(cx + rx - 3, cy - 3, r[0])
        for x in range(cx + rx - 6, cx + rx):
            s.dot(x, cy + 2, "mouth")
            if x % 2 == 0:
                s.dot(x, cy + 1, "tooth")
    else:
        s.dot(cx + rx - 1, cy + 1, "mouth")
    return s


def front(f, fam, t):
    s = Sprite(PALETTE, CELL)
    cx, cy = 16, 15
    fd, fl = fins(fam, t)
    f2 = FLAP[f]
    reach = 14 + (2 if fam == "stream" and t >= 1 else 0)
    fin(s, [(cx - 7, cy + 1), (cx - reach, cy + 3 + f2), (cx - reach + 1, cy + 6 + f2), (cx - 6, cy + 4)], fd, fl, (cx - 7, cy + 2))
    fin(s, [(cx + 7, cy + 1), (cx + reach, cy + 3 + f2), (cx + reach - 1, cy + 6 + f2), (cx + 6, cy + 4)], fd, fl, (cx + 7, cy + 2))
    h = {0: 4, 1: 7, 2: 9, 3: 11}[t] if fam == "shark" else 4 + t
    poly(s, [(cx - 1, cy - 6), (cx, cy - 7 - h), (cx + 2, cy - 6)], fd)
    w = WAG[f] // 2
    fin(s, [(cx - 1, cy + 6), (cx + 1 + w, cy + 12), (cx + 2, cy + 6)], fd, fl, (cx, cy + 6))
    hw = 8 if t < 2 else 6 if fam != "armour" else 9
    r = body(s, cx, cy, hw, 7 if fam != "armour" or t < 2 else 8, fam, t, 3)
    for x in range(cx - 4, cx + 5):
        s.dot(x, cy + 5, "belly" if t < 2 else "bellyS")
    if fam == "armour" and t >= 1:  # a plated brow
        for x in range(cx - hw + 2, cx + hw - 1):
            s.dot(x, cy - 5, "plate" if x % 2 else "plateL")
        if t >= 2:
            for x in (cx - hw - 1, cx + hw + 1):
                s.dot(x, cy - 2, "spike"); s.dot(x, cy, "spike")
    ex = 5 if t < 2 else 4
    if fam == "armour" and t == 3:
        s.dot(cx - ex, cy - 2, "eye"); s.dot(cx + ex - 1, cy - 2, "eye")
    else:
        eye(s, cx - ex, cy - 2, "eye", "glint")
        eye(s, cx + ex - 1, cy - 2, "eye", "glint")
    if fam == "shark" and t >= 2:
        for k in range(3):
            s.dot(cx - ex - 1 + k, cy - 5 + k, r[0]); s.dot(cx + ex + 1 - k, cy - 5 + k, r[0])
        half = 3 if t == 2 else 5
        for x in range(cx - half, cx + half + 1):
            s.dot(x, cy + 2, "mouth")
            s.dot(x, cy + 1, "tooth" if x % 2 == 0 else "mouth")
            if t == 3:
                s.dot(x, cy + 3, "tooth" if x % 2 == 1 else "mouth")
    else:
        for x in range(cx - 1, cx + 2):
            s.dot(x, cy + 2, "mouth")
        s.dot(cx, cy + 3, "mouth")
    if fam == "stream" and t >= 2:
        s.dot(cx - hw + 1, cy, "irid"); s.dot(cx + hw - 1, cy, "iridL")
    return s


def draw(pose, direction, frame):
    for view in ("back", "side", "front"):
        if direction.startswith(view):
            fam, t = look(direction[len(view):])
            return {"back": back, "side": side, "front": front}[view](frame % 4, fam, t)
    raise ValueError(direction)
