"""Persona-5-flavoured UI pieces: ransom-note text, shards, cut-in band, achievement, stat-up."""
import math, random
from PIL import Image, ImageDraw
from gfx import C, hx, W, H, poly, paste, mix, BAYER4, ease_out_back, ease_out_cubic, clamp01
from font import text_mask, glyph_mask, outlined

STYLES = [
    (C["white"], C["black"]),   # (glyph, box)
    (C["black"], C["white"]),
    (C["white"], C["red"]),
    (C["black"], C["white"]),
    (C["white"], C["black"]),
]


def ransom_tiles(text, scale=2, seed=0, styles=STYLES, overlap=1):
    rnd = random.Random(seed)
    tiles = []
    x = 0
    for i, ch in enumerate(text):
        if ch == " ":
            x += 2 * scale + 2
            continue
        big = rnd.random() < 0.3
        s = scale + (1 if big else 0)
        m = glyph_mask(ch, s)
        fg, bg = styles[rnd.randrange(len(styles))]
        pad = max(2, s - 1)
        tw, th = m.width + pad * 2, m.height + pad * 2
        sk = rnd.choice([-2, -1, 1, 2])
        tile = Image.new("RGBA", (tw + 6, th + 4), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        ox, oy = 2, 1
        pts = [(ox + max(sk, 0), oy), (ox + tw + max(sk, 0), oy), (ox + tw - min(-sk, 0) - max(sk, 0) + min(sk, 0) , oy + th),
               (ox + min(sk, 0) + (0 if sk > 0 else -sk) - (sk if sk > 0 else 0), oy + th)]
        pts = [(ox + (sk if sk > 0 else 0), oy), (ox + tw + (sk if sk > 0 else 0), oy),
               (ox + tw + (0 if sk > 0 else -sk), oy + th), (ox + (0 if sk > 0 else -sk), oy + th)]
        edge = C["white"] if bg in (C["black"], C["red"]) else C["black"]
        grow = [(pts[0][0] - 1, pts[0][1] - 1), (pts[1][0] + 1, pts[1][1] - 1),
                (pts[2][0] + 1, pts[2][1] + 1), (pts[3][0] - 1, pts[3][1] + 1)]
        poly(td, [(a + 1, b + 2) for a, b in grow], C["black"])
        poly(td, grow, edge)
        poly(td, pts, bg)
        tile.paste(fg, (ox + pad + (abs(sk) // 2), oy + pad), m)
        dy = rnd.randint(-3, 3) - (2 if big else 0)
        tiles.append((tile, x, dy, i))
        x += tile.width - 3 - overlap
    return tiles, x


def draw_ransom(img, text, x, y, t_since, scale=2, seed=0, stagger=0.04, anchor="left", styles=STYLES,
                pop=True, overlap=1):
    tiles, total = ransom_tiles(text, scale, seed, styles, overlap)
    if anchor == "center":
        x -= total // 2
    elif anchor == "right":
        x -= total
    n = 0
    for tile, tx, dy, idx in tiles:
        ts = t_since - n * stagger
        n += 1
        if ts < 0:
            continue
        if pop:
            p = clamp01(ts / 0.12)
            off = (1 - ease_out_back(p)) * -10
            if ts < 0.035:
                flash = Image.new("RGBA", tile.size, C["white"])
                flash.putalpha(tile.getchannel("A"))
                paste(img, flash, x + tx, y + dy - tile.height // 2 + off)
                continue
        else:
            off = 0
        paste(img, tile, x + tx, y + dy - tile.height // 2 + off)
    return total


# ------------------------------------------------------------------ shards
def _shard_set(seed):
    rnd = random.Random(seed)
    tris = []
    step = 36
    pts = {}
    for gy in range(-1, H // step + 3):
        for gx in range(-1, W // step + 3):
            pts[(gx, gy)] = (gx * step + rnd.randint(-12, 12) + (gy % 2) * 18, gy * step + rnd.randint(-12, 12))
    for gy in range(-1, H // step + 2):
        for gx in range(-1, W // step + 2):
            a, b, c, d = pts[(gx, gy)], pts[(gx + 1, gy)], pts[(gx, gy + 1)], pts[(gx + 1, gy + 1)]
            for tri in ((a, b, c), (b, d, c)):
                cx = sum(p[0] for p in tri) / 3; cy = sum(p[1] for p in tri) / 3
                key = cx * 0.85 + cy * 0.55 + rnd.uniform(-30, 30)
                r = rnd.random()
                col = C["black"] if r < 0.55 else (C["red"] if r < 0.9 else C["white"])
                tris.append((key, tri, col))
    return tris


_SHARDS = {}


def shards(img, p, seed=1):
    """p: 0..1. 0..0.5 covers the screen, 0.5..1 reveals. Returns True if fully covered."""
    if seed not in _SHARDS:
        _SHARDS[seed] = _shard_set(seed)
    tris = _SHARDS[seed]
    kmin = -40; kmax = W * 0.85 + H * 0.55 + 40
    d = ImageDraw.Draw(img)
    if p <= 0.5:
        s = kmin + (p / 0.5) * (kmax - kmin)
        for key, tri, col in tris:
            if key < s:
                g = clamp01((s - key) / 60)
                cx = sum(q[0] for q in tri) / 3; cy = sum(q[1] for q in tri) / 3
                poly(d, [(cx + (q[0] - cx) * g, cy + (q[1] - cy) * g) for q in tri], col)
    else:
        s = kmin + ((p - 0.5) / 0.5) * (kmax - kmin)
        for key, tri, col in tris:
            if key >= s:
                g = clamp01((key - s) / 60)
                cx = sum(q[0] for q in tri) / 3; cy = sum(q[1] for q in tri) / 3
                poly(d, [(cx + (q[0] - cx) * g, cy + (q[1] - cy) * g) for q in tri], col)


# ------------------------------------------------------------------ bits
def halftone(img, box, color, density_fn, spacing=4):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    for y in range(y0, y1, spacing):
        for x in range(x0 + ((y // spacing) % 2) * spacing // 2, x1, spacing):
            r = density_fn(x, y)
            if r > 0.15:
                rr = r * spacing * 0.5
                if rr < 0.8:
                    d.point((x, y), fill=color)
                else:
                    d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=color)


def speed_lines(img, box, t, color, n=18, seed=3, dirx=1):
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    w = x1 - x0
    for k in range(n):
        y = rnd.uniform(y0, y1)
        ln = rnd.uniform(30, 90)
        sp = rnd.uniform(500, 900)
        x = x0 + ((rnd.uniform(0, w) + t * sp) % (w + ln)) - ln
        if dirx < 0:
            x = x1 - (x - x0)
        d.line([x, y, x + ln * dirx, y], fill=color)


def bowl_icon(scale=1):
    """Small pixel ramen bowl icon (w/ steam)."""
    rows = [
        "....o...o...o.....",
        "...o...o...o......",
        "....o...o...o.....",
        ".................",
        "..oooooooooooooo..",
        ".oRRRRRRRRRRRRRRo.",
        "oRyyRyRRyyRRyReRRo",
        "oWWWWWWWWWWWWWWWWo",
        ".oWWWBWWWBWWWBWWo.",
        ".oWWWWWWWWWWWWWSo.",
        "..oWWWWWWWWWWWSo..",
        "...ooWWWWWWWWoo...",
        ".....oooooooo.....",
    ]
    pal = {"o": C["ink"], "R": hx("e8452a"), "y": hx("ffe29a"), "e": hx("ffb020"),
           "W": C["white"], "B": hx("3a5ae8"), "S": hx("c8c8e0")}
    from gfx import sprite
    im = sprite([r.ljust(18, ".") for r in rows], {**pal, "o": C["ink"]})
    # steam in light colour
    px = im.load()
    for y in range(3):
        for x in range(im.width):
            if px[x, y][3]:
                px[x, y] = C["white"]
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    return im


# ------------------------------------------------------------------ cut-in
def cutin(img, t_local, dur, portrait_img, text=None, text_t=None, seed=5, y_mid=100, tilt=-18):
    """P5 style diagonal band with a portrait. t_local from band start."""
    enter = clamp01(t_local / 0.14)
    leave = clamp01((t_local - (dur - 0.16)) / 0.16)
    if leave >= 1:
        return
    hh = 44
    # band polygon (slanted)
    def band_pts(ext=0):
        return [(-20, y_mid - hh - ext + tilt / 2), (W + 20, y_mid - hh - ext - tilt / 2),
                (W + 20, y_mid + hh + ext - tilt / 2), (-20, y_mid + hh + ext + tilt / 2)]
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    poly(ld, band_pts(7), C["red"])
    poly(ld, band_pts(4), C["white"])
    poly(ld, band_pts(0), C["black"])
    # red diagonal stripes inside
    inner = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    idr = ImageDraw.Draw(inner)
    off = int(t_local * 120) % 40
    for x in range(-200, W + 200, 40):
        poly(idr, [(x + off, 0), (x + off + 14, 0), (x + off - 110, H), (x + off - 124, H)], hx("2a0610"))
    speed_lines(inner, (0, y_mid - 50, W, y_mid + 50), t_local, hx("5a0a1a"), n=22, seed=seed)
    halftone(inner, (0, y_mid - 50, W, y_mid + 50), C["red_d"],
             lambda x, y: max(0, 1 - x / 160), spacing=5)
    # portrait (slides slightly)
    px_ = W // 2 - portrait_img.width // 2 + 40 - int((t_local) * 14)
    py_ = y_mid - portrait_img.height // 2 + 6
    inner.alpha_composite(portrait_img, (px_, py_))
    mask = Image.new("L", (W, H), 0)
    poly(ImageDraw.Draw(mask), band_pts(0), 255)
    layer.paste(inner, (0, 0), Image.composite(inner.getchannel("A"), Image.new("L", (W, H), 0), mask))
    # accent: white slash + red triangle
    poly(ld, [(20, y_mid + 30), (120, y_mid + 18), (118, y_mid + 22), (18, y_mid + 34)], C["white"])
    # slide in/out via horizontal offset & clip
    if enter < 1:
        cut = int(W * ease_out_cubic(enter))
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).rectangle([0, 0, cut, H], fill=255)
        layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", (W, H), 0), m))
    if leave > 0:
        cut = int(W * ease_out_cubic(leave))
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).rectangle([cut, 0, W, H], fill=255)
        layer.putalpha(Image.composite(layer.getchannel("A"), Image.new("L", (W, H), 0), m))
    img.alpha_composite(layer)
    if text and text_t is not None and t_local >= text_t and leave < 1:
        draw_ransom(img, text, 16, y_mid + 34, t_local - text_t, scale=3, seed=seed + 7, stagger=0.035)


# ---------------------------------------------------------------- achievement
def achievement(img, tl, letters_t0=0.1, letter_gap=0.032, shine_t=0.62, dur=2.5):
    """tl: time since achievement start."""
    if tl < 0 or tl > dur:
        return
    bw, bh = 318, 62
    bx_final, by = (W - bw) // 2 + 4, 14
    enter = clamp01(tl / 0.18)
    leave = clamp01((tl - (dur - 0.2)) / 0.2)
    bx = bx_final + (1 - ease_out_back(enter, 2.2)) * (W + 40) - ease_out_cubic(leave) * (W + 60)
    sk = 12
    box = Image.new("RGBA", (bw + 40, bh + 40), (0, 0, 0, 0))
    bd = ImageDraw.Draw(box)
    o = 10
    def para(x0, y0, x1, y1):
        return [(x0 + sk, y0), (x1 + sk, y0), (x1 - sk, y1), (x0 - sk, y1)]
    poly(bd, [(x + 7, y + 7) for x, y in para(o, o, o + bw, o + bh)], C["red"])
    poly(bd, para(o - 3, o - 3, o + bw + 3, o + bh + 3), C["white"])
    poly(bd, para(o, o, o + bw, o + bh), C["black"])
    # inner red accent stripe
    poly(bd, [(o + 60, o + bh - 8), (o + bw - 10, o + bh - 8), (o + bw - 12, o + bh - 5), (o + 58, o + bh - 5)], C["red"])
    # icon area: gold star burst with bowl
    icx, icy = o + 32, o + bh // 2
    rot = tl * 2.0
    star = []
    for k in range(16):
        r = 26 if k % 2 == 0 else 15
        a = rot + k * math.pi / 8
        star.append((icx + r * math.cos(a), icy + r * math.sin(a)))
    poly(bd, [(x + 2, y + 2) for x, y in star], C["red_d"])
    poly(bd, star, C["gold"])
    inner_star = [(icx + (x - icx) * .7, icy + (y - icy) * .7) for x, y in star]
    poly(bd, inner_star, C["gold_l"])
    icon = bowl_icon(1)
    box.alpha_composite(icon, (icx - icon.width // 2, icy - icon.height // 2 + 1))
    # header
    hm = text_mask("ACHIEVEMENT UNLOCKED", 1)
    box.alpha_composite(outlined(hm, C["red"], C["black"]), (o + 70, o + 6))
    poly(bd, [(o + 70, o + 17), (o + 70 + hm.width + 30, o + 17), (o + 68 + hm.width + 30, o + 18), (o + 68, o + 18)], C["white"])
    img_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    paste(img_layer, box, bx - o, by - o)
    # main text: ransom letters popping
    draw_ransom(img_layer, "YOU MADE DINNER!", bx + 68, by + 38, tl - letters_t0, scale=2, seed=42,
                stagger=letter_gap, overlap=2,
                styles=[(C["white"], C["black"]), (C["black"], C["white"]), (C["white"], C["red"]), (C["black"], C["white"])])
    # shine sweep
    if tl >= shine_t:
        sp = clamp01((tl - shine_t) / 0.35)
        sx = bx - 40 + sp * (bw + 80)
        mask = Image.new("L", (W, H), 0)
        md = ImageDraw.Draw(mask)
        poly(md, [(sx, by - 4), (sx + 14, by - 4), (sx - 16, by + bh + 4), (sx - 30, by + bh + 4)], 170)
        poly(md, [(sx + 20, by - 4), (sx + 24, by - 4), (sx - 6, by + bh + 4), (sx - 10, by + bh + 4)], 120)
        clip = Image.composite(mask, Image.new("L", (W, H), 0), img_layer.getchannel("A").point(lambda a: 255 if a > 0 else 0))
        white = Image.new("RGBA", (W, H), C["white"])
        img_layer.paste(white, (0, 0), clip)
    img.alpha_composite(img_layer)
    # sparkles after the shine
    if tl > shine_t + 0.1 and leave < 1:
        from closeups import sparkle
        d = ImageDraw.Draw(img)
        rnd = random.Random(77)
        for k in range(14):
            st = shine_t + 0.1 + rnd.uniform(0, 1.4)
            ph = (tl - st) / 0.45
            if 0 <= ph <= 1:
                x = bx + rnd.uniform(-10, bw + 10); y = by + rnd.uniform(-10, bh + 10)
                s = 1 + 3 * math.sin(ph * math.pi)
                sparkle(d, x, y, s, C["gold_l"] if k % 2 else C["white"])


def stat_up(img, tl, fill_t=0.5, dur=1.5):
    if tl < 0 or tl > dur:
        return
    enter = clamp01(tl / 0.16)
    leave = clamp01((tl - (dur - 0.18)) / 0.18)
    x = -260 + ease_out_back(enter, 1.6) * 272 - ease_out_cubic(leave) * 300
    y = 176
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    poly(d, [(x - 10, y - 6), (x + 250, y - 14), (x + 246, y + 30), (x - 14, y + 38)], C["black"])
    poly(d, [(x - 6, y - 3), (x + 244, y - 10), (x + 240, y + 26), (x - 10, y + 34)], C["red"])
    poly(d, [(x - 6, y + 22), (x + 242, y + 14), (x + 241, y + 17), (x - 7, y + 25)], C["red_d"])
    m = text_mask("PROFICIENCY", 2)
    layer.alpha_composite(outlined(m, C["white"], C["black"], shadow=C["black"], shadow_off=(2, 2)), (round(x) + 2, y))
    # rank pips
    rank = 1 + (1 if tl >= fill_t else 0)
    for k in range(5):
        px_ = round(x) + 148 + k * 14; py_ = y + 7 - k * 0.4
        dm = [(px_, py_ - 6), (px_ + 6, py_), (px_, py_ + 6), (px_ - 6, py_)]
        poly(d, [(a + 1, b + 1) for a, b in dm], C["black"])
        poly(d, dm, C["gold"] if k < rank else hx("5a0a18"))
        if k == 1 and fill_t <= tl < fill_t + 0.12:
            poly(d, [(px_, py_ - 10), (px_ + 10, py_), (px_, py_ + 10), (px_ - 10, py_)], C["white"])
    m = text_mask("RANK 1 > 2" if tl >= fill_t else "RANK 1", 1)
    layer.alpha_composite(outlined(m, C["gold_l"], C["black"]), (round(x) + 146, y + 16))
    img.alpha_composite(layer)
    if tl >= fill_t and leave < 1:
        draw_ransom(img, "UP!", round(x) + 222, y - 4, tl - fill_t, scale=3, seed=9, stagger=0.05,
                    styles=[(C["red"], C["white"]), (C["white"], C["black"])])
        # rising arrows
        d2 = ImageDraw.Draw(img)
        for k in range(3):
            ph = ((tl - fill_t) * 2.2 + k / 3) % 1
            ax = round(x) + 200 + k * 16; ay = y + 20 - ph * 30
            poly(d2, [(ax, ay - 5), (ax + 5, ay), (ax + 2, ay), (ax + 2, ay + 5), (ax - 2, ay + 5), (ax - 2, ay), (ax - 5, ay)],
                 C["gold"] if k % 2 else C["white"])


# ---------------------------------------------------------------- title card
def title_card(img, t, t_sat=0.0, t_dot=0.75, t_even=1.0, gap=0.125):
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, H], fill=C["red"])
    off = int(t * 60) % 48
    for x in range(-300, W + 300, 48):
        poly(d, [(x + off, 0), (x + off + 18, 0), (x + off - 130, H), (x + off - 148, H)], C["red_d"])
    halftone(img, (0, 0, W, H), hx("b00a20"), lambda x, y: max(0, (x + y) / (W + H) * 1.2 - 0.2), spacing=6)
    # big black slash
    poly(d, [(-10, 58), (W + 10, 30), (W + 10, 150), (-10, 178)], C["black"])
    poly(d, [(-10, 172), (W + 10, 144), (W + 10, 150), (-10, 178)], C["white"])
    speed_lines(img, (0, 40, W, 170), t, hx("2a1020"), n=16, seed=4)
    # moon + stars
    mx, my = 318, 62
    d.ellipse([mx - 14, my - 14, mx + 14, my + 14], fill=C["gold_l"])
    d.ellipse([mx - 6, my - 18, mx + 20, my + 8], fill=C["black"])
    from closeups import sparkle
    rnd = random.Random(3)
    for k in range(8):
        x = rnd.uniform(200, 370); y = rnd.uniform(46, 130)
        s = 1 + 2 * (0.5 + 0.5 * math.sin(t * 8 + k * 1.7))
        sparkle(d, x, y, s, C["white"])
    if t >= t_sat:
        draw_ransom(img, "SAT", 34, 92, t - t_sat, scale=5, seed=11, stagger=0.06)
    if t >= t_dot:
        # bullet dot as a red diamond
        p = ease_out_back(clamp01((t - t_dot) / 0.12))
        cx, cy, r = 150, 94, 8 * p
        poly(d, [(cx, cy - r - 2), (cx + r + 2, cy), (cx, cy + r + 2), (cx - r - 2, cy)], C["white"])
        poly(d, [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], C["red"])
    if t >= t_even:
        draw_ransom(img, "EVENING", 168, 128, t - t_even, scale=3, seed=21, stagger=gap)
    # small date strip


def iris(img, p, cx, cy):
    """Star-shaped iris wipe. p: 0 open .. 1 closed."""
    if p <= 0:
        return
    R = (1 - p) ** 1.5 * 480
    mask = Image.new("L", (W, H), 255)
    md = ImageDraw.Draw(mask)
    if R > 1:
        pts = []
        rot = p * 1.2
        for k in range(10):
            r = R if k % 2 == 0 else R * 0.5
            a = -math.pi / 2 + rot + k * math.pi / 5
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        poly(md, pts, 0)
    black = Image.new("RGBA", (W, H), C["black"])
    img.paste(black, (0, 0), mask)
