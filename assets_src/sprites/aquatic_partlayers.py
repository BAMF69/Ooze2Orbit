#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# aquatic_partlayers.py
# Brief   : WHAT: your parts, worn on your body (BAMF69 2026-11-08: "visual changes to the model for the parts"), as
#           overlays drawn over the swimmer seen from BEHIND (how you always see yourself). FINS: big extra side fins.
#           JAWS: jaw corners with teeth jutting past the head. PLATES: armour plates across the back. GILLS: red
#           frills either side of the head. ENDURANCE: red muscle bands along the flanks. TORRENT: a big golden tail.
#           PALETTE: each part's orb colours (aquatic_props.py) so the part on the body matches the part you grabbed.
# Purpose : Overlay atlas, one row per part, 4 frames in step with the swimmer's swim frames; centred on the swimmer
#           (back view: body centre 16, 14). The scene puts each worn part's layer over your back view.
# Usage   : python tools/art/pixel_sprite.py build assets_src/sprites/aquatic_partlayers.py --out public/assets/art/aquatic_partlayers --overwrite --preview-scale 0
# Notes   : Overlays are partial by design, so they fail the first-art floor ALONE (like the cell stage's
#           player_upgrades); judge them on the swimmer, in game. No outline: they sit on an outlined body.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aquaticart import FLAP, WAG, fin, poly  # noqa: E402
from pixel_sprite import Sprite  # noqa: E402

CELL = 32
FRAMES = 4
SHADOW = False
OUTLINE = False
ROWS = [("on", p) for p in ("fins", "jaws", "plates", "gills", "endurance", "torrent")]

PALETTE = {
    "fin": (60, 130, 132), "finL": (120, 190, 184), "finD": (30, 70, 80),
    "tooth": (240, 236, 224), "gum": (120, 40, 52),
    "plateD": (34, 60, 62), "plate": (70, 96, 104), "plateL": (130, 150, 156),
    "gill": (170, 50, 64), "gillL": (230, 120, 130),
    "m1": (150, 34, 40), "m2": (200, 70, 66), "fiber": (240, 150, 132),
    "gold": (250, 214, 110), "goldD": (190, 140, 50),
}
CX, CY = 16, 14


def fins(f):
    s = Sprite(PALETTE, CELL)
    fl = FLAP[f]
    for side in (-1, 1):
        fin(s, [(CX + side * 7, CY - 1), (CX + side * 16, CY - 3 + fl), (CX + side * 15, CY + 4 + fl), (CX + side * 7, CY + 3)], "fin", "finL", (CX + side * 7, CY + 1))
        s.dot(CX + side * 15, CY - 2 + fl, "finD")
    return s


def jaws(f):
    s = Sprite(PALETTE, CELL)
    for side in (-1, 1):  # jaw corners jutting out past the head, teeth up
        for k in range(4):
            s.dot(CX + side * (6 + k), CY - 6 + k // 2, "gum")
        for k in range(0, 4, 2):
            s.dot(CX + side * (6 + k), CY - 7, "tooth"); s.dot(CX + side * (6 + k), CY - 8, "tooth")
    return s


def plates(f):
    s = Sprite(PALETTE, CELL)
    for i, y in enumerate((CY - 6, CY - 3, CY)):  # three armour plates across the back
        half = 5 - i
        for x in range(CX - half, CX + half + 1):
            s.dot(x, y, "plateL"); s.dot(x, y + 1, "plate")
        s.dot(CX - half - 1, y + 1, "plateD"); s.dot(CX + half + 1, y + 1, "plateD")
    return s


def gills(f):
    s = Sprite(PALETTE, CELL)
    wave = FLAP[f]
    for side in (-1, 1):  # frilly gills either side of the head, fluttering
        for k in range(4):
            x = CX + side * (8 + (k % 2))
            s.dot(x, CY - 5 + k * 2 + (wave if k % 2 else 0), "gill" if k % 2 else "gillL")
            s.dot(x + side, CY - 5 + k * 2, "gill")
    return s


def endurance(f):
    s = Sprite(PALETTE, CELL)
    for side in (-1, 1):  # red muscle bands down the flanks
        for y in range(CY - 4, CY + 5):
            s.dot(CX + side * 6, y, "m2" if y % 2 else "m1")
            s.dot(CX + side * 5, y, "fiber" if y % 3 == 0 else "m1")
    return s


def torrent(f):
    s = Sprite(PALETTE, CELL)
    w = WAG[f]
    poly(s, [(CX - 2, CY + 6), (CX + 3, CY + 6), (CX + 6 + w, CY + 18), (CX + 1 + w, CY + 13), (CX - 4 + w, CY + 18)], "goldD")
    poly(s, [(CX - 1, CY + 7), (CX + 2, CY + 7), (CX + 4 + w, CY + 16), (CX + 1 + w, CY + 12)], "gold")
    return s


def draw(pose, direction, frame):
    return {"fins": fins, "jaws": jaws, "plates": plates, "gills": gills, "endurance": endurance, "torrent": torrent}[direction](frame % 4)
