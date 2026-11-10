#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# civ_pieces.py
# Brief   : WHO: the civilization stage's map pieces (docs/stages/04-civilization.md, Toy 1), front three-quarter view.
#           Your people are the lineage grown up: the ochre land walker, now standing upright on two legs, a long
#           snout, a crest of small spines, a stub of a tail. Each piece is one of them doing a job:
#           ARMY: a warrior with a bone-tipped spear and a hide shield (conquest).
#           TRADER: a trader bent under a laden pack, a coin pouch at the hip (trade).
#           PRIEST: a robed priest of the Watcher holding up a staff with a glowing eye-orb (faith).
#           CITY: a small walled town, two towers and a gate, a banner on top.
#           PALETTE: the lineage's ochre lit from the top-left; bone, hide, cloth; the game tints a rival's pieces.
# Purpose : Atlas (32 px): one row per piece, 4 frames (an idle bob; the priest's orb pulses; the banner waves).
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/civ_pieces.py --out public/assets/art/civ_pieces --overwrite --preview-scale 0
# Notes   : PLACEHOLDER toy art. Drawn in light, neutral colours so a tint can mark the owner.
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
ROWS = [(p, "front") for p in ("army", "trader", "priest", "city")]

PALETTE = {
    "deep": (78, 50, 26), "dark": (128, 84, 42), "base": (176, 122, 62), "light": (214, 166, 98), "rim": (240, 210, 154),
    "eye": (16, 12, 10), "glint": (250, 236, 200), "bone": (226, 216, 190), "boneD": (160, 148, 122),
    "hide": (120, 84, 50), "hideL": (160, 118, 72), "cloth": (200, 196, 180), "clothD": (140, 136, 124),
    "wood": (96, 66, 36), "orb": (180, 240, 255), "orbD": (90, 170, 220), "gold": (230, 196, 90),
    "stone": (150, 146, 140), "stoneD": (96, 92, 88), "stoneL": (196, 192, 184), "roof": (140, 60, 44), "banner": (220, 70, 50),
}
RAMP = ["deep", "dark", "base", "light"]


def person(s, o, robe=False):
    """An upright descendant of the walker: legs, body (or robe), head with snout and crest; o = bob offset."""
    if robe:
        poly(s, [(11, 14 + o), (21, 14 + o), (23, 29), (9, 29)], "cloth")
        for y in range(16 + o, 29):
            s.dot(16, y, "clothD")
    else:
        for x0 in (12, 18):  # legs
            for y in range(23 + o, 30):
                s.dot(x0, y, "dark"); s.dot(x0 + 1, y, "base")
            s.dot(x0 - 1, 30, "deep"); s.dot(x0 + 2, 30, "deep")
        lit_blob(s, 15, 19 + o, 5, 6, RAMP, rim="rim")  # body
    lit_blob(s, 16, 10 + o, 5, 4, RAMP, rim="rim")  # head
    for x in range(19, 23):  # the snout
        s.dot(x, 11 + o, "base"); s.dot(x, 12 + o, "dark")
    for x in range(12, 18, 2):  # the crest of spines
        s.dot(x, 5 + o, "deep"); s.dot(x + 1, 6 + o, "dark")
    eye(s, 18, 9 + o, "eye", "glint")


def draw(pose, direction, frame):
    s = Sprite(PALETTE, CELL)
    f = frame % 4
    o = [0, 0, 1, 1][f]
    if pose == "army":
        for y in range(2, 30):  # the spear
            s.dot(24, y, "wood")
        poly(s, [(23, 1), (25, 1), (24, -2 + 4)], "bone"); s.dot(24, 1, "bone"); s.dot(24, 0, "bone"); s.dot(23, 2, "boneD"); s.dot(25, 2, "boneD")
        person(s, o)
        lit_blob(s, 9, 19 + o, 4, 6, ["hide", "hide", "hideL", "hideL"], rim="boneD")  # the shield
        s.dot(9, 19 + o, "bone")
    elif pose == "trader":
        person(s, o)
        lit_blob(s, 10, 13 + o, 6, 6, ["wood", "hide", "hide", "hideL"], rim="hideL")  # the laden pack
        for x in range(5, 16):
            s.dot(x, 13 + o, "wood")
        lit_blob(s, 20, 22 + o, 2, 2, ["gold", "gold", "gold", "glint"])  # coin pouch
    elif pose == "priest":
        person(s, o, robe=True)
        for y in range(6, 30):  # the staff
            s.dot(25, y, "wood")
        pulse = [3, 4, 4, 3][f]
        lit_blob(s, 25, 4, pulse, pulse, ["orbD", "orbD", "orb", "orb"])  # the Watcher's eye-orb
        s.dot(25, 4, "eye")
    else:  # city
        poly(s, [(4, 14), (28, 14), (28, 29), (4, 29)], "stone")
        for x in range(4, 29, 3):  # crenellations
            s.dot(x, 13, "stoneL"); s.dot(x, 12, "stoneL")
        for x0 in (3, 22):  # two towers
            poly(s, [(x0, 8), (x0 + 7, 8), (x0 + 7, 29), (x0, 29)], "stoneD")
            poly(s, [(x0 - 1, 8), (x0 + 3, 2), (x0 + 8, 8)], "roof")
        for y in range(21, 30):  # the gate
            for x in range(13, 19):
                s.dot(x, y, "wood")
        for y in range(16, 20):
            s.dot(8, y, "eye"); s.dot(24, y, "eye")
        for y in range(0, 8):  # banner on a pole
            s.dot(16, y + 4, "wood")
        wave = [0, 1, 0, -1][f]
        poly(s, [(17, 4), (23, 5 + wave), (17, 8)], "banner")
    return s
