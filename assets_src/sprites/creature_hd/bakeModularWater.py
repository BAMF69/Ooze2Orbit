
"""Bake modular Water art from the original Reed Shallows painted PNG masters.

Run from any directory with Pillow installed, then run tools/art/compress_art.py.
"""
from collections.abc import Callable
from math import ceil, pi, sin
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[3]
MASTERS = ROOT / "assets_src" / "art_masters"
CELL = 48
VARIANTS = 4
MASKS = 16
COLOR = tuple[int, int, int]


def mix(a: COLOR, b: COLOR, weight: float) -> COLOR:
    return tuple(round(x + (y - x) * weight) for x, y in zip(a, b))


def ease(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def wrap(image: Image.Image, band: int, vertical: bool = False) -> Image.Image:
    """Use the same crossfade at the beginning and end, with zero slope at the wrap."""
    if vertical:
        image = image.transpose(Image.Transpose.TRANSPOSE)
    out = image.copy()
    src, dst = image.load(), out.load()
    for y in range(image.height):
        for x in range(band):
            opposite = image.width - 1 - x
            midpoint = mix(src[x, y], src[opposite, y], 0.5)
            weight = ease(x / (band - 1))
            dst[x, y] = mix(midpoint, src[x, y], weight)
            dst[opposite, y] = mix(midpoint, src[opposite, y], weight)
    return out.transpose(Image.Transpose.TRANSPOSE) if vertical else out


def edge_color(side: int, depth: int, along: int, rock: COLOR) -> COLOR:
    # Every face has the same ink and ledge profile, regardless of material or variant.
    grain = (sin(4 * pi * along / (CELL - 1)) + sin(10 * pi * along / (CELL - 1))) * 0.5
    if depth < 2:
        return mix((10, 26, 24), rock, 0.22 + depth * 0.12)
    if side == 1:
        moss_depth = 8 + round(2.9 * grain)
        if depth <= moss_depth:
            return mix((128, 148, 65), (62, 94, 45), (depth - 2) / 10)
    elif side == 4 and depth <= 4 + round(2 * grain):
        return mix(rock, (86, 104, 49), (5 - depth) * 0.13)
    elif depth <= 4:
        wash = (78, 104, 73) if side == 8 else (29, 57, 53)
        return mix(rock, wash, (5 - depth) * 0.21)
    return rock


def bake_rocks() -> None:
    source = Image.open(MASTERS / "creature_hd_reed_shallows_tiles_v1.png").convert("RGB")
    # The archived Reed Shallows atlas stores 96 autotiles, then the room-position
    # painting cells in 16 columns. Sample only the interior of the old broad rock.
    def patch(x: int, y: int) -> Image.Image:
        index = 96 + y * 40 + x
        left, top = (index % 16) * CELL, (index // 16) * CELL
        return source.crop((left, top, left + CELL, top + CELL))

    cols, rows = 40, 23
    edge_count = 3 * VARIANTS * MASKS
    output = Image.new("RGBA", (MASKS * CELL, ceil((edge_count + cols * rows) / MASKS) * CELL))
    last = CELL - 1

    def paste_tile(tile: Image.Image, index: int) -> None:
        output.paste(tile, ((index % MASKS) * CELL, (index // MASKS) * CELL))

    def painted_strip(source_rows: range) -> Image.Image:
        strip = Image.new("RGB", (cols * CELL, len(source_rows) * CELL))
        for y, source_y in enumerate(source_rows):
            for x in range(cols):
                # Replace the old room's baked shaft with another stretch of the same rock.
                strip.paste(patch(x if x < 7 or x >= 9 or source_y >= 6 else x + 18, source_y), (x * CELL, y * CELL))
        return wrap(strip, CELL)

    ceiling = painted_strip(range(6))
    # Blend in the replacement rock where the one-room original painted a shaft.
    for y in range(ceiling.height):
        left = ceiling.getpixel((7 * CELL - 1, y))
        right = ceiling.getpixel((9 * CELL, y))
        for x in range(2 * CELL):
            original = ceiling.getpixel((7 * CELL + x, y))
            transition = mix(left, right, ease(x / (2 * CELL - 1)))
            detail = ease(min(x, 2 * CELL - 1 - x) / 20)
            ceiling.putpixel((7 * CELL + x, y), mix(transition, original, detail))
    floor_source = painted_strip(range(6, 10))
    # The original top moss belongs on exposed floors only. Underlay begins below it.
    floor = floor_source.crop((0, 20, cols * CELL, 4 * CELL)).resize((cols * CELL, 4 * CELL), Image.Resampling.LANCZOS)
    walls = ceiling.crop((0, CELL, cols * CELL, 5 * CELL)).resize((cols * CELL, 13 * CELL), Image.Resampling.LANCZOS)
    terrain = Image.new("RGB", (cols * CELL, rows * CELL))
    terrain.paste(ceiling, (0, 0))
    terrain.paste(walls, (0, 6 * CELL))
    terrain.paste(floor, (0, 19 * CELL))

    # A tower straddling a material boundary uses the same painted surface, with
    # a short blend to the roof and floor so the horizontal joins do not show.
    for border in (6 * CELL, 19 * CELL):
        margin = 14
        upper = terrain.crop((0, border - margin, terrain.width, border))
        lower = terrain.crop((0, border, terrain.width, border + margin)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        for delta in range(margin):
            left = upper.crop((0, margin - 1 - delta, terrain.width, margin - delta))
            right = lower.crop((0, margin - 1 - delta, terrain.width, margin - delta))
            half = 0.5 * (1 - ease(delta / (margin - 1)))
            terrain.paste(Image.blend(left, right, half), (0, border - 1 - delta))
            terrain.paste(Image.blend(right, left, half), (0, border + delta))

    for y in range(rows):
        for x in range(cols):
            left, top = x * CELL, y * CELL
            paste_tile(terrain.crop((left, top, left + CELL, top + CELL)).convert("RGBA"), edge_count + y * cols + x)

    for material in range(3):
        for variant in range(VARIANTS):
            moss = patch((11, 16, 23, 31)[variant], 6)
            for mask in range(MASKS):
                tile = Image.new("RGBA", (CELL, CELL))
                for y in range(CELL):
                    for x in range(CELL):
                        faces = ((1, y, x), (2, last - x, y), (4, last - y, x), (8, x, y))
                        exposed = [face for face in faces if mask & face[0]]
                        if not exposed:
                            continue
                        side, depth, along = min(exposed, key=lambda face: face[1])
                        rock = (43, 76, 60)
                        if side == 1 and depth < 15:
                            rim = edge_color(side, depth, along, rock)
                            weight = ease(min(x, last - x) / 10) * 0.85
                            color = mix(rim, moss.getpixel((x, depth + 1)), weight)
                            alpha = round(255 * (1 - ease((depth - 8) / 7)))
                            tile.putpixel((x, y), (*color, alpha))
                        elif depth < 5:
                            tile.putpixel((x, y), (*edge_color(side, depth, along, rock), (223, 188, 90, 56, 26)[depth]))
                paste_tile(tile, (material * VARIANTS + variant) * MASKS + mask)

    output.save(MASTERS / "creature_hd_water_modular_v1.png")


def bake_backdrops() -> None:
    image = Image.open(MASTERS / "creature_hd_reed_shallows_bg_v1.png").convert("RGB")
    seamless = wrap(image, 104)
    # Artwork is graded for the existing runtime tier tints. Keep the beam legible while
    # leaving the foreground silhouettes brighter than the background on every tier.
    grades: dict[str, tuple[float, Callable[[int, int, int], COLOR]]] = {
        "reed": (1.0, lambda r, g, b: (r, g, b)),
        "drowned": (0.91, lambda r, g, b: (round(r * 0.91), round(g * 0.93), min(255, round(b * 1.13 + 5)))),
        "torrent": (0.86, lambda r, g, b: (min(255, round(r * 1.26 + 7)), round(g * 0.88), min(255, round(b * 1.21 + 4)))),
    }
    for name, (brightness, grade) in grades.items():
        out = ImageEnhance.Brightness(seamless).enhance(brightness)
        out.putdata([grade(*pixel) for pixel in out.get_flattened_data()])
        out.save(MASTERS / f"creature_hd_{name}_water_bg_v1.png")


if __name__ == "__main__":
    bake_rocks()
    bake_backdrops()
