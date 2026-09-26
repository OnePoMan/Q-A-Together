"""Low-level pixel-art helpers."""
import math
from PIL import Image, ImageDraw

W, H = 384, 216          # native canvas; upscaled x5 to 1920x1080
SCALE = 5


def hx(s, a=255):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


# ---------------------------------------------------------------- palette
C = {
    # P5 UI
    "red": hx("e8102a"), "red_d": hx("9c0718"), "red_l": hx("ff4d5e"),
    "black": hx("0c0a12"), "white": hx("f8f4f0"), "gold": hx("ffc93c"),
    "gold_d": hx("c7861c"), "gold_l": hx("fff0a8"),
    # outline / ink
    "ink": hx("24122e"),
    # character
    "hair": hx("7b4526"), "hair_d": hx("4e2816"), "hair_l": hx("b36b3a"), "hair_ll": hx("d99155"),
    "skin": hx("f5c7a1"), "skin_d": hx("dc9474"), "skin_dd": hx("b56a55"), "blush": hx("ff8e9a"),
    "glass": hx("ff2440"), "glass_d": hx("a8102a"), "lens": hx("ffe9ef"),
    "eye": hx("2c1530"),
    "top": hx("20c9d0"), "top_d": hx("0f8d9e"), "top_dd": hx("0b5f78"), "top_l": hx("8af5ef"),
    "pants": hx("2e2f78"), "pants_d": hx("1c1b4d"),
    "sock": hx("ff5fa8"), "sock_d": hx("c4307a"),
    "mouth": hx("a8344a"),
}

BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(int(round(lerp(c1[i], c2[i], t))) for i in range(4))


def sprite(rows, pal):
    """ASCII rows -> RGBA image. '.' or ' ' = transparent."""
    h = len(rows)
    w = max(len(r) for r in rows)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in ". ":
                continue
            px[x, y] = pal[ch]
    return im


def paste(dst, src, x, y):
    """Alpha paste at integer coords (handles off-canvas)."""
    x, y = int(round(x)), int(round(y))
    if x >= dst.width or y >= dst.height or x + src.width <= 0 or y + src.height <= 0:
        return
    dst.alpha_composite(src, dest=(max(x, 0), max(y, 0)),
                        source=(max(-x, 0), max(-y, 0)))


def flip(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


def dither_vgrad(img, box, stops):
    """Vertical gradient through colour stops with 4x4 ordered dithering.
    stops = [(t, color), ...] with t in 0..1. Bands are quantised to stop colours."""
    x0, y0, x1, y1 = box
    px = img.load()
    hgt = max(y1 - y0 - 1, 1)
    for y in range(y0, y1):
        t = (y - y0) / hgt
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                a, b = stops[i], stops[i + 1]
                break
        f = (t - a[0]) / max(b[0] - a[0], 1e-6)
        for x in range(x0, x1):
            thr = (BAYER4[y % 4][x % 4] + 0.5) / 16
            px[x, y] = b[1] if f > thr else a[1]


def dither_blend(img, mask_fn, color, box):
    """For each pixel in box, mask_fn(x,y)->0..1 coverage; ordered-dither colour on."""
    x0, y0, x1, y1 = box
    px = img.load()
    for y in range(max(y0, 0), min(y1, img.height)):
        for x in range(max(x0, 0), min(x1, img.width)):
            v = mask_fn(x, y)
            if v <= 0:
                continue
            thr = (BAYER4[y % 4][x % 4] + 0.5) / 16
            if v > thr:
                if color[3] == 255:
                    px[x, y] = color
                else:
                    px[x, y] = mix(px[x, y], (*color[:3], 255), color[3] / 255)


def glow_layer(size, cx, cy, r, color, strength=1.0, dither=True):
    """RGBA overlay: radial glow, dithered for pixel look."""
    w, h = size
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    px = im.load()
    for y in range(max(0, int(cy - r)), min(h, int(cy + r) + 1)):
        for x in range(max(0, int(cx - r)), min(w, int(cx + r) + 1)):
            d = math.hypot(x - cx, y - cy) / r
            if d >= 1:
                continue
            v = (1 - d) ** 1.6 * strength
            if dither:
                lv = int(v * 4 + (BAYER4[y % 4][x % 4] + 0.5) / 16)
                a = min(lv, 4) / 4
            else:
                a = v
            if a > 0:
                px[x, y] = (*color[:3], int(color[3] * min(a, 1)))
    return im


def ease_out_back(t, s=1.70158):
    t = t - 1
    return t * t * ((s + 1) * t + s) + 1


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def ease_in_cubic(t):
    return t ** 3


def ease_in_out(t):
    return 0.5 - 0.5 * math.cos(math.pi * max(0, min(1, t)))


def clamp01(t):
    return max(0.0, min(1.0, t))


def prog(t, a, b):
    return clamp01((t - a) / (b - a))


def poly(draw, pts, fill):
    draw.polygon([(round(x), round(y)) for x, y in pts], fill=fill)
