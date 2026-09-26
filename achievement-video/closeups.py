"""Close-up illustrations used inside the P5-style cooking panel and cut-ins."""
import math, random
from PIL import Image, ImageDraw
from gfx import C, hx, mix, poly, paste, dither_blend, sprite, BAYER4

PW, PH = 200, 160   # panel content size

BROTH = hx("e8452a"); BROTH_D = hx("b82a1e"); BROTH_L = hx("ff7a45")
WATER = hx("7fd8ff"); WATER_D = hx("4fa8e8"); WATER_L = hx("d4f4ff")
NOODLE = hx("ffe29a"); NOODLE_D = hx("e0b060"); NOODLE_DD = hx("a8743a")
STEEL = hx("c9cfe0"); STEEL_D = hx("8a8fb0"); STEEL_DD = hx("5a5a84"); STEEL_L = hx("f4f6ff")
GREEN = hx("5ee06a"); GREEN_D = hx("2a9a48"); GREEN_L = hx("c8ffb8")
EGG = hx("fffaf0"); EGG_S = hx("e8e0d8"); YOLK = hx("ffb020"); YOLK_L = hx("ffe070")


def _stovetop(d):
    d.rectangle([0, 0, PW, PH], fill=hx("1c1a33"))
    for x in range(-PH, PW, 14):
        d.line([x, 0, x + PH, PH], fill=hx("24223f"), width=5)
    # grate
    cx, cy = PW // 2, PH // 2 + 4
    for a in range(0, 360, 45):
        ex = cx + 74 * math.cos(math.radians(a)); ey = cy + 74 * math.sin(math.radians(a))
        d.line([cx, cy, ex, ey], fill=hx("3c3a5e"), width=3)


def _flames(d, cx, cy, r, t, strength):
    if strength <= 0:
        return
    n = 28
    for i in range(n):
        a = i / n * 2 * math.pi
        fl = (3 + 3 * strength) + 2 * math.sin(t * 40 + i * 2.1) + 1.5 * math.sin(t * 23 + i)
        x0 = cx + (r + 1) * math.cos(a); y0 = cy + (r + 1) * math.sin(a)
        x1 = cx + (r + fl) * math.cos(a); y1 = cy + (r + fl) * math.sin(a)
        d.line([x0, y0, x1, y1], fill=hx("3a7bff"), width=3)
        x2 = cx + (r + fl * .55) * math.cos(a); y2 = cy + (r + fl * .55) * math.sin(a)
        d.line([x0, y0, x2, y2], fill=hx("8fe8ff"), width=1)
        if i % 3 == 0 and strength > .6:
            x3 = cx + (r + fl + 2) * math.cos(a); y3 = cy + (r + fl + 2) * math.sin(a)
            d.point((round(x3), round(y3)), fill=hx("ffb040"))


def _noodle_block(img, cx, cy, s, loosen, ang, rnd_seed=3):
    d = ImageDraw.Draw(img)
    if loosen < 0.05:
        hw = 22 * s
        d.rectangle([cx - hw - 1, cy - hw - 1, cx + hw + 1, cy + hw + 1], fill=NOODLE_DD)
        d.rectangle([cx - hw, cy - hw, cx + hw, cy + hw], fill=NOODLE)
        rows = int(2 * hw // 4)
        for k in range(rows):
            y = cy - hw + 2 + k * 4
            pts = [(cx - hw + 1 + j, y + 1.5 * math.sin(j * 0.9 + k)) for j in range(int(2 * hw - 1))]
            d.line(pts, fill=NOODLE_D)
        d.line([cx - hw, cy - hw, cx + hw, cy - hw], fill=hx("fff4c8"))
        return
    rnd = random.Random(rnd_seed)
    n = 26
    for k in range(n):
        base = rnd.uniform(0, 2 * math.pi)
        rad = rnd.uniform(6, 22 + 20 * loosen)
        span = rnd.uniform(1.2, 2.6)
        pts = []
        for j in range(22):
            u = base + ang + j / 21 * span
            rr = rad + 2.2 * math.sin(j * 1.3 + k)
            # blend from block-ish square to swirl
            pts.append((cx + rr * math.cos(u), cy + rr * math.sin(u) * 0.95))
        d.line(pts, fill=NOODLE_DD, width=3)
        d.line(pts, fill=NOODLE if k % 3 else hx("fff0b8"), width=1)


def _egg(d, cx, cy, s=1.0, cooked=0.0):
    rnd = random.Random(11)
    pts = []
    for i in range(16):
        a = i / 16 * 2 * math.pi
        r = (13 + rnd.uniform(-2, 3)) * s
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a) * .85))
    poly(d, [(x + 1, y + 1) for x, y in pts], EGG_S)
    poly(d, pts, EGG)
    d.ellipse([cx - 5 * s + 1, cy - 5 * s, cx + 5 * s + 1, cy + 5 * s], fill=hx("e88a10"))
    d.ellipse([cx - 5 * s, cy - 5 * s - 1, cx + 5 * s, cy + 5 * s - 1], fill=YOLK)
    d.ellipse([cx - 2 * s, cy - 3 * s, cx, cy - 1 * s], fill=YOLK_L)


def _onions(d, pts):
    for (x, y) in pts:
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=GREEN_D)
        d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=GREEN_L)
        d.point((x, y), fill=GREEN)


def pot_closeup(t, st):
    """st: dict of state values computed by timeline."""
    img = Image.new("RGBA", (PW, PH), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    _stovetop(d)
    cx, cy = PW // 2, PH // 2 + 4
    R = 60
    _flames(d, cx, cy, R + 2, t, st["flame"])
    # handles
    for sx in (-1, 1):
        d.rounded_rectangle([cx + sx * (R + 4) - 9, cy - 6, cx + sx * (R + 4) + 9, cy + 6], 3, fill=C["ink"])
        d.rounded_rectangle([cx + sx * (R + 4) - 8, cy - 5, cx + sx * (R + 4) + 8, cy + 5], 3, fill=hx("2a2a3a"))
        d.line([cx + sx * (R + 4) - 6, cy - 3, cx + sx * (R + 4) + 6, cy - 3], fill=hx("55557a"))
    # rim
    d.ellipse([cx - R - 2, cy - R - 2, cx + R + 2, cy + R + 2], fill=C["ink"])
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=STEEL)
    d.arc([cx - R, cy - R, cx + R, cy + R], 180, 300, fill=STEEL_L, width=2)
    d.arc([cx - R, cy - R, cx + R, cy + R], 20, 140, fill=STEEL_D, width=2)
    r2 = R - 6
    d.ellipse([cx - r2 - 1, cy - r2 - 1, cx + r2 + 1, cy + r2 + 1], fill=STEEL_DD)
    # liquid
    bm = st["broth"]
    wet = bm > 0.5
    col = BROTH if wet else WATER; col_d = BROTH_D if wet else WATER_D; col_l = BROTH_L if wet else WATER_L
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=WATER)
    if bm > 0:
        sa = st["stir_ang"]
        def cov(x, y):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy > r2 * r2:
                return 0
            a = math.atan2(dy, dx); rr = math.hypot(dx, dy)
            return bm * 1.6 - 0.3 + 0.35 * math.sin(a * 2 + rr * 0.12 - sa)
        dither_blend(img, cov, BROTH, (cx - r2, cy - r2, cx + r2 + 1, cy + r2 + 1))
    d.arc([cx - r2, cy - r2, cx + r2, cy + r2], 200, 330, fill=col_l, width=1)
    d.arc([cx - r2 + 1, cy - r2 + 1, cx + r2 - 1, cy + r2 - 1], 20, 160, fill=col_d, width=3)
    # swirl of powder dissolving
    if 0.02 < bm < 0.98:
        for k in range(3):
            pts = []
            for j in range(30):
                u = st["stir_ang"] * 0.3 + k * 2.1 + j * 0.18
                rr = 8 + j * 1.4
                pts.append((cx + rr * math.cos(u), cy + rr * math.sin(u)))
            d.line(pts, fill=BROTH_D if k % 2 else hx("ff9a50"), width=2)
    # oil dots on broth
    if bm > 0.5:
        rnd = random.Random(5)
        for k in range(22):
            a = rnd.uniform(0, 6.28) + st["stir_ang"] * 0.5
            rr = rnd.uniform(10, r2 - 4)
            x = cx + rr * math.cos(a); y = cy + rr * math.sin(a)
            d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=hx("ffb060"))
    # cream powder specks, flakes
    rnd = random.Random(9)
    for k in range(int(40 * st["flakes"])):
        a = rnd.uniform(0, 6.28) + st["stir_ang"] * 0.6
        rr = rnd.uniform(4, r2 - 4)
        x = cx + rr * math.cos(a); y = cy + rr * math.sin(a)
        c = [GREEN, hx("ff9a30"), hx("fff0d0"), hx("c85a2a")][k % 4]
        d.rectangle([x, y, x + 1, y + (k % 2)], fill=c)
    # noodles
    if st["noodle"] > 0:
        s = st["noodle_scale"]
        _noodle_block(img, cx, cy, s, st["loosen"], st["stir_ang"])
    # egg
    if st["egg"] > 0:
        _egg(d, cx + 16, cy - 12, st["egg_scale"])
    # onions
    if st["onion"] > 0:
        rnd = random.Random(21)
        pts = []
        for k in range(int(18 * st["onion"])):
            a = rnd.uniform(0, 6.28); rr = rnd.uniform(6, r2 - 6)
            pts.append((round(cx + rr * math.cos(a)), round(cy + rr * math.sin(a))))
        _onions(d, pts)
    # bubbles
    rnd = random.Random(1)
    nb = int(34 * st["boil"])
    for k in range(nb):
        per = rnd.uniform(0.25, 0.6)
        ph = (t / per + rnd.random()) % 1
        a = rnd.uniform(0, 6.28); rr = rnd.uniform(4, r2 - 4)
        x = cx + rr * math.cos(a); y = cy + rr * math.sin(a)
        br = 1 + ph * rnd.uniform(1.5, 3.5)
        if ph < .9:
            d.ellipse([x - br, y - br, x + br, y + br], outline=col_l)
        else:
            d.point((round(x), round(y)), fill=C["white"])
    # splash ring
    if st["splash"] > 0:
        p = st["splash"]
        rr = 10 + p * 40
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=mix(C["white"], col_l, p), width=2)
        rnd = random.Random(4)
        for k in range(16):
            a = k / 16 * 6.28 + rnd.uniform(-.2, .2)
            r3 = 14 + p * 55 * rnd.uniform(.7, 1.1)
            x = cx + r3 * math.cos(a); y = cy + r3 * math.sin(a) - 20 * math.sin(p * math.pi)
            d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=C["white"])
    # chopsticks while stirring
    if st["chop"] > 0:
        a = st["stir_ang"]
        tipx = cx + 22 * math.cos(a); tipy = cy + 22 * math.sin(a)
        for off in (-3, 3):
            x0, y0 = tipx + off, tipy
            x1, y1 = PW + 30 + off, -40 + off
            d.line([x0, y0, x1, y1], fill=C["ink"], width=4)
            d.line([x0, y0, x1, y1], fill=hx("e8904e"), width=2)
    return img


def falling_particles(img, t, t0, kind, cx, cy):
    """Powder / onions / egg falling into pot from top-left."""
    d = ImageDraw.Draw(img)
    rnd = random.Random(hash(kind) & 0xffff)
    dt = t - t0
    if dt < 0 or dt > 0.6:
        return
    cols = {"red": [hx("ff4020"), hx("c81e10"), hx("ff9050")],
            "cream": [hx("fff0d0"), hx("e8d0a0"), C["white"]],
            "flake": [GREEN, hx("ff9a30"), hx("c85a2a")],
            "onion": [GREEN, GREEN_L, GREEN_D]}[kind]
    for k in range(60):
        st = rnd.uniform(0, 0.3)
        p = (dt - st) / 0.3
        if p < 0 or p > 1:
            continue
        sx = cx - 50 + rnd.uniform(-10, 10); sy = -10 + rnd.uniform(-10, 10)
        ex = cx + rnd.uniform(-35, 35); ey = cy + rnd.uniform(-30, 30)
        x = sx + (ex - sx) * p; y = sy + (ey - sy) * p
        c = cols[k % 3]
        if kind == "onion":
            d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=GREEN_D)
            d.point((round(x), round(y)), fill=GREEN_L)
        else:
            d.rectangle([x, y, x + 1, y + 1], fill=c)
    # the sachet
    if kind in ("red", "cream", "flake"):
        sp = min(1, dt / 0.1) if dt < 0.5 else max(0, (0.6 - dt) / 0.1)
        sx = cx - 58 - (1 - sp) * 60; sy = -6
        colr = {"red": hx("e8102a"), "cream": hx("f4e8d0"), "flake": hx("3aa860")}[kind]
        poly(d, [(sx - 12, sy - 14), (sx + 12, sy - 20), (sx + 18, sy + 6), (sx - 6, sy + 12)], C["ink"])
        poly(d, [(sx - 10, sy - 12), (sx + 10, sy - 17), (sx + 15, sy + 4), (sx - 5, sy + 9)], colr)


# ------------------------------------------------------------ 辛 glyph
SHIN = [
    "......###.......",
    ".......###......",
    "################",
    "################",
    "...###.....###..",
    "....###...###...",
    ".....###.###....",
    "################",
    "################",
    ".......###......",
    ".......###......",
    "################",
    "################",
    ".......###......",
    ".......###......",
    ".......###......",
    ".......###......",
    ".......###......",
]


def shin_glyph(color):
    return sprite(SHIN, {"#": color})


def packet_closeup(t, rip_p, t_local):
    """Shin Ramyun Black packet held up; rip_p 0..1 tears the top strip."""
    from font import text_mask, outlined
    img = Image.new("RGBA", (PW, PH), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    # radial P5 burst background
    d.rectangle([0, 0, PW, PH], fill=C["red"])
    cx, cy = PW // 2, PH // 2
    for k in range(18):
        a0 = k / 18 * 2 * math.pi + t_local * 0.6
        a1 = a0 + math.pi / 18
        poly(d, [(cx, cy), (cx + 300 * math.cos(a0), cy + 300 * math.sin(a0)),
                 (cx + 300 * math.cos(a1), cy + 300 * math.sin(a1))], C["red_d"])
    bob = round(math.sin(t_local * 9) * 1)
    x0, y0, x1, y1 = 48, 22 + bob, 152, 150 + bob
    # crimp edges
    def crimp(y, top):
        pts = []
        for x in range(x0, x1 + 1, 4):
            pts.append((x, y))
            pts.append((x + 2, y + (-3 if top else 3)))
        return pts
    body = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    bd.rectangle([x0 - 2, y0 - 2, x1 + 2, y1 + 2], fill=C["ink"])
    bd.rectangle([x0, y0, x1, y1], fill=hx("141018"))
    bd.rectangle([x0, y0, x1, y0 + 10], fill=hx("26202e"))
    bd.rectangle([x0, y1 - 10, x1, y1], fill=hx("26202e"))
    for x in range(x0, x1, 3):
        bd.line([x, y0, x, y0 + 8], fill=hx("3a3246"))
        bd.line([x, y1 - 8, x, y1], fill=hx("3a3246"))
    # gold frame lines
    bd.rectangle([x0 + 4, y0 + 13, x1 - 4, y1 - 13], outline=C["gold"])
    bd.line([x0 + 6, y0 + 15, x1 - 6, y0 + 15], fill=C["gold_d"])
    # 辛 big red with dark shadow
    g = shin_glyph(hx("7a0010")).resize((32, 36), Image.NEAREST)
    body.alpha_composite(g, (x0 + 10, y0 + 22))
    g = shin_glyph(C["red"]).resize((32, 36), Image.NEAREST)
    body.alpha_composite(g, (x0 + 8, y0 + 20))
    # text
    m = text_mask("SHIN", 2)
    body.alpha_composite(outlined(m, C["white"], C["ink"]), (x0 + 46, y0 + 20))
    m = text_mask("RAMYUN", 1)
    body.alpha_composite(outlined(m, C["white"], C["ink"]), (x0 + 47, y0 + 37))
    m = text_mask("BLACK", 2)
    body.alpha_composite(outlined(m, C["gold"], hx("5a3a00")), (x0 + 44, y0 + 48))
    # bowl picture
    bx, by = x0 + 52, y0 + 72
    bd.ellipse([bx - 2, by + 2, bx + 46, by + 30], fill=hx("2a2030"))
    bd.pieslice([bx, by - 8, bx + 44, by + 30], 0, 180, fill=hx("f4f0f0"))
    bd.ellipse([bx, by + 2, bx + 44, by + 18], fill=hx("fff8f0"))
    bd.ellipse([bx + 3, by + 4, bx + 41, by + 16], fill=hx("f0dcc0"))
    for k in range(5):
        bd.arc([bx + 6 + k * 5, by + 5, bx + 20 + k * 5, by + 14], 180, 360, fill=NOODLE_D)
    bd.ellipse([bx + 26, by + 5, bx + 34, by + 10], fill=hx("a0502a"))
    bd.point((bx + 10, by + 8), fill=GREEN); bd.point((bx + 30, by + 12), fill=GREEN)
    bd.point((bx + 20, by + 7), fill=hx("ff5020"))
    # steam lines on picture
    for k in range(3):
        bd.line([bx + 12 + k * 10, by - 2, bx + 14 + k * 10, by - 10], fill=hx("6a6078"))
    # small red badge
    bd.ellipse([x0 + 10, y0 + 62, x0 + 40, y0 + 92], fill=C["gold"])
    bd.ellipse([x0 + 12, y0 + 64, x0 + 38, y0 + 90], fill=C["red"])
    m = text_mask("NEW", 1)
    body.alpha_composite(outlined(m, C["white"], C["red_d"]), (x0 + 15, y0 + 72))
    bd.text((0, 0), "")
    # tear strip
    tear_y = y0 + 12
    top = body.crop((0, 0, PW, tear_y))
    rest = body.crop((0, tear_y, PW, PH))
    # jagged tear edge on rest
    rd = ImageDraw.Draw(rest)
    if rip_p > 0:
        for x in range(x0, x1 + 1):
            if (x // 2) % 2 == 0:
                rd.point((x, 0), fill=(0, 0, 0, 0))
    img.alpha_composite(rest, (0, tear_y))
    if rip_p < 1:
        if rip_p <= 0:
            img.alpha_composite(top, (0, 0))
        else:
            ang = -rip_p * 50
            dx = rip_p * 90; dy = -rip_p * 60
            tp = top.rotate(ang, resample=Image.NEAREST, center=(x0, tear_y), expand=False)
            paste(img, tp, dx, dy)
    # tear particles
    if 0 < rip_p < 1:
        rnd = random.Random(2)
        for k in range(14):
            px_ = x0 + rnd.uniform(0, x1 - x0) * rip_p
            py_ = tear_y - rip_p * rnd.uniform(10, 40)
            d.rectangle([px_, py_, px_ + 1, py_ + 1], fill=C["white"])
    # hands holding the packet sides
    for hxp in (x0 - 4, x1 - 6):
        d.rounded_rectangle([hxp - 1, y0 + 60 + bob, hxp + 11, y0 + 84 + bob], 4, fill=C["ink"])
        d.rounded_rectangle([hxp, y0 + 61 + bob, hxp + 10, y0 + 83 + bob], 4, fill=C["skin"])
        d.line([hxp + 2, y0 + 66 + bob, hxp + 8, y0 + 66 + bob], fill=C["skin_d"])
        d.line([hxp + 2, y0 + 72 + bob, hxp + 8, y0 + 72 + bob], fill=C["skin_d"])
        d.rectangle([hxp - 2, y0 + 84 + bob, hxp + 12, y0 + 100 + bob], fill=C["ink"])
        d.rectangle([hxp - 1, y0 + 85 + bob, hxp + 11, y0 + 100 + bob], fill=C["top"])
    return img


def board_closeup(t, chops):
    """chops: list of chop times relative; returns image with knife + scallions."""
    img = Image.new("RGBA", (PW, PH), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, PW, PH], fill=hx("58d6c8"))
    for y in range(0, PH, 10):
        d.line([0, y, PW, y], fill=hx("fdf1e4"))
    d.rounded_rectangle([14, 30, 186, 140], 8, fill=hx("8a4128"))
    d.rounded_rectangle([16, 28, 188, 134], 8, fill=hx("e8904e"))
    for y in range(40, 130, 9):
        d.line([30, y, 170, y + 2], fill=hx("d27a40"))
    n_cut = sum(1 for c in chops if t >= c)
    stalk_end = 150 - n_cut * 16
    # stalk (white -> green)
    d.rounded_rectangle([30, 74, stalk_end, 90], 6, fill=GREEN_D)
    d.rounded_rectangle([30, 75, stalk_end - 1, 88], 6, fill=GREEN)
    d.rectangle([30, 75, 60, 88], fill=hx("f0ffe8"))
    d.line([36, 78, stalk_end - 6, 78], fill=GREEN_L)
    # cut rings pile
    rnd = random.Random(8)
    for k in range(n_cut * 5):
        x = stalk_end + 10 + rnd.uniform(0, 34); y = 70 + rnd.uniform(0, 26)
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=GREEN_D)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=GREEN_L)
        d.point((round(x), round(y)), fill=GREEN_D)
    # knife: goes down on each chop
    down = 0.0
    for c in chops:
        dt = t - c
        if 0 <= dt < 0.11:
            down = max(down, 1 - dt / 0.11)
    kx = stalk_end + 2
    ky = 40 + down * 36
    d.polygon([(kx - 2, ky - 40), (kx + 12, ky - 40), (kx + 12, ky + 8), (kx - 2, ky + 14)], fill=C["ink"])
    d.polygon([(kx - 1, ky - 39), (kx + 11, ky - 39), (kx + 11, ky + 7), (kx - 1, ky + 12)], fill=STEEL)
    d.line([kx - 1, ky - 39, kx - 1, ky + 12], fill=STEEL_L)
    d.rectangle([kx - 1, ky - 70, kx + 11, ky - 40], fill=C["ink"])
    d.rectangle([kx, ky - 69, kx + 10, ky - 41], fill=hx("3a2a3a"))
    d.point((kx + 5, ky - 50), fill=STEEL); d.point((kx + 5, ky - 60), fill=STEEL)
    if down > 0.7:
        for k in range(6):
            a = k / 6 * math.pi + math.pi
            d.line([kx + 5 + 10 * math.cos(a), 92 + 6 * math.sin(a), kx + 5 + 18 * math.cos(a), 92 + 12 * math.sin(a)], fill=C["white"])
    return img


def bowl_closeup(t, fill_p, garnish, t_local):
    img = Image.new("RGBA", (PW, PH), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    # table cloth: gingham red/white
    for y in range(0, PH, 8):
        for x in range(0, PW, 8):
            c = C["white"] if (x // 8 + y // 8) % 2 == 0 else hx("ff8a9a")
            if (x // 8) % 2 == 1 and (y // 8) % 2 == 1:
                c = C["red"]
            d.rectangle([x, y, x + 7, y + 7], fill=c)
    cx, cy, R = PW // 2, PH // 2 + 6, 58
    d.ellipse([cx - R + 4, cy - R + 8, cx + R + 4, cy + R + 8], fill=hx("a03048"))
    d.ellipse([cx - R - 2, cy - R - 2, cx + R + 2, cy + R + 2], fill=C["ink"])
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=hx("fbfbff"))
    # blue pattern rim
    for k in range(24):
        a = k / 24 * 2 * math.pi
        x = cx + (R - 4) * math.cos(a); y = cy + (R - 4) * math.sin(a)
        d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=hx("3a5ae8") if k % 2 else hx("8ab0ff"))
    r2 = R - 9
    d.ellipse([cx - r2 - 1, cy - r2 - 1, cx + r2 + 1, cy + r2 + 1], fill=hx("c8c8e0"))
    if fill_p > 0:
        rr = r2 * min(1, 0.35 + 0.65 * fill_p)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=BROTH)
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 200, 330, fill=BROTH_L, width=2)
        rnd = random.Random(5)
        for k in range(int(20 * fill_p)):
            a = rnd.uniform(0, 6.28); r3 = rnd.uniform(6, rr - 3)
            x = cx + r3 * math.cos(a); y = cy + r3 * math.sin(a)
            d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=hx("ffb060"))
    if fill_p > 0.3:
        _noodle_block(img, cx, cy, 1, 0.6 * min(1, fill_p), 0.5 + t_local * 0.2, rnd_seed=12)
    if garnish > 0:
        _egg(d, cx + 18, cy - 10, 1.0)
        rnd = random.Random(21)
        pts = [(round(cx + rnd.uniform(-30, 30)), round(cy + rnd.uniform(-26, 26))) for _ in range(16)]
        _onions(d, pts)
        # sesame / chili threads
        for k in range(8):
            x = cx - 26 + k * 6; y = cy + 18 + (k % 3) * 3
            d.line([x, y, x + 3, y - 2], fill=C["red"])
    # pour stream from the pot lip (top-right)
    if 0 < fill_p < 1:
        d.ellipse([PW - 44, -40, PW + 40, 22], fill=C["ink"])
        d.ellipse([PW - 42, -38, PW + 38, 19], fill=STEEL)
        d.arc([PW - 42, -38, PW + 38, 19], 90, 200, fill=STEEL_L, width=2)
        wob = [(PW - 36 + (cx + 6 - (PW - 36)) * k / 10 + math.sin(t_local * 40 + k) * 1.2,
                10 + (cy - 10) * k / 10) for k in range(11)]
        d.line(wob, fill=C["ink"], width=7)
        d.line(wob, fill=BROTH, width=5)
        d.line([(x - 1, y) for x, y in wob], fill=BROTH_L, width=1)
        d.ellipse([cx - 2, cy - 8, cx + 14, cy + 4], outline=BROTH_L)
    return img


# --------------------------------------------------------------- portrait
def portrait(expr="normal", glint=-1.0, w=120, h=90):
    """Close-up face (3/4 facing right) for P5 cut-ins. glint: 0..1 sweep across glasses."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ink = C["ink"]
    ox, oy = 18, 4
    def P(pts): return [(ox + x, oy + y) for x, y in pts]
    # back hair mass
    back = [(8, 20), (22, 4), (48, -2), (76, 4), (92, 22), (96, 48), (98, 70), (92, 86), (84, 92), (70, 90),
            (60, 94), (40, 94), (24, 90), (10, 94), (0, 84), (4, 70), (-2, 56), (4, 40)]
    poly(d, P([(x - 2, y) for x, y in back]), ink)
    poly(d, P(back), C["hair"])
    # waves on lower hair
    for k, (x, y) in enumerate([(6, 70), (16, 80), (86, 70), (80, 82), (4, 56)]):
        d.arc([ox + x - 6, oy + y - 6, ox + x + 6, oy + y + 6], 200, 340, fill=C["hair_l"], width=2)
        d.arc([ox + x - 6, oy + y - 2, ox + x + 6, oy + y + 10], 20, 160, fill=C["hair_d"], width=2)
    # neck
    poly(d, P([(38, 66), (60, 66), (58, 92), (40, 92)]), C["skin_d"])
    # face
    face = [(24, 30), (80, 26), (84, 44), (82, 58), (74, 72), (60, 80), (46, 80), (32, 70), (24, 54)]
    poly(d, P([(x - 1, y + 1) for x, y in face]), ink)
    poly(d, P(face), C["skin"])
    poly(d, P([(24, 54), (32, 70), (46, 80), (40, 70), (30, 58)]), C["skin_d"])
    # ear
    d.ellipse(P([(18, 44), (28, 58)]), fill=C["skin_d"])
    # bangs
    bangs = [(18, 30), (28, 10), (50, 4), (74, 8), (90, 24), (88, 38), (80, 30), (74, 38), (66, 28), (56, 36),
             (48, 26), (38, 36), (32, 28), (24, 40)]
    poly(d, P([(x, y + 1) for x, y in bangs]), ink)
    poly(d, P(bangs), C["hair"])
    d.line(P([(34, 12), (58, 8), (76, 14)]), fill=C["hair_l"], width=2)
    d.line(P([(40, 14), (56, 11)]), fill=C["hair_ll"], width=1)
    d.line(P([(50, 26), (56, 34)]), fill=C["hair_d"], width=1)
    d.line(P([(68, 28), (74, 36)]), fill=C["hair_d"], width=1)
    # side strand in front (right)
    strand = [(84, 22), (94, 36), (92, 60), (86, 74), (90, 84), (82, 82), (84, 66), (86, 44)]
    poly(d, P(strand), C["hair"])
    d.line(P([(88, 36), (88, 60)]), fill=C["hair_d"])
    # eyes
    def eye(ex, ey, wdt):
        if expr in ("happy",):
            d.arc(P([(ex - 1, ey - 1), (ex + wdt + 1, ey + 7)]), 200, 340, fill=ink, width=2)
            return
        if expr == "blink":
            d.line(P([(ex, ey + 4), (ex + wdt, ey + 4)]), fill=ink, width=2)
            return
        d.rectangle(P([(ex, ey), (ex + wdt, ey + 7)]), fill=ink)
        d.rectangle(P([(ex + 1, ey + 2), (ex + wdt - 1, ey + 7)]), fill=hx("5a2a3a"))
        d.rectangle(P([(ex + 1, ey + 5), (ex + wdt - 1, ey + 6)]), fill=hx("9a4a3a"))
        d.rectangle(P([(ex + 1, ey + 1), (ex + 2, ey + 2)]), fill=C["white"])
        d.line(P([(ex - 1, ey - 1), (ex + wdt + 1, ey - 1)]), fill=ink, width=2)
    eye(40, 44, 6)
    eye(66, 43, 5)
    # brows
    d.line(P([(38, 38), (48, 37)]), fill=C["hair_d"], width=2)
    d.line(P([(64, 37), (72, 37)]), fill=C["hair_d"], width=2)
    # glasses
    for (gx0, gy0, gx1, gy1) in [(34, 40, 54, 56), (61, 39, 79, 55)]:
        d.rounded_rectangle(P([(gx0, gy0), (gx1, gy1)]), 3, outline=C["glass_d"], width=3)
        d.rounded_rectangle(P([(gx0, gy0 - 1), (gx1, gy1 - 1)]), 3, outline=C["glass"], width=2)
    d.line(P([(54, 45), (61, 44)]), fill=C["glass"], width=2)
    d.line(P([(34, 44), (22, 42)]), fill=C["glass"], width=2)
    # lens tint highlight
    d.line(P([(37, 53), (41, 49)]), fill=C["lens"])
    d.line(P([(64, 52), (67, 49)]), fill=C["lens"])
    # nose + mouth + blush
    d.line(P([(62, 58), (64, 62)]), fill=C["skin_dd"])
    if expr in ("happy", "smile"):
        d.arc(P([(50, 62), (64, 72)]), 20, 160, fill=C["mouth"], width=2)
        for bx, by in ((34, 60), (72, 59)):
            dither_blend(img, lambda x, y: 0.7, C["blush"], (ox + bx, oy + by, ox + bx + 8, oy + by + 4))
    elif expr == "slurp":
        d.ellipse(P([(53, 64), (61, 72)]), fill=C["mouth"])
        d.line(P([(57, 68), (58, 94)]), fill=NOODLE_DD, width=3)
        d.line(P([(57, 68), (58, 94)]), fill=NOODLE, width=1)
        d.line(P([(55, 68), (52, 94)]), fill=NOODLE_DD, width=3)
        d.line(P([(55, 68), (52, 94)]), fill=NOODLE, width=1)
        for bx, by in ((34, 60), (72, 59)):
            dither_blend(img, lambda x, y: 0.7, C["blush"], (ox + bx, oy + by, ox + bx + 8, oy + by + 4))
    else:
        d.line(P([(52, 67), (60, 66)]), fill=C["mouth"], width=2)
        d.point((ox + 61, oy + 65), fill=C["mouth"])
    # glint sweep
    if 0 <= glint <= 1:
        gx = 30 + glint * 56
        for (gx0, gy0, gx1, gy1) in [(35, 41, 53, 55), (62, 40, 78, 54)]:
            for k in range(-2, 3):
                x_top = gx + k; x_bot = gx + k - 10
                d.line(P([(max(gx0, min(gx1, x_top)), gy0), (max(gx0, min(gx1, x_bot)), gy1)]),
                       fill=C["white"] if abs(k) < 2 else C["lens"])
    return img


def sparkle(d, x, y, s, col):
    x, y = round(x), round(y)
    s = max(1, round(s))
    d.line([x - s, y, x + s, y], fill=col)
    d.line([x, y - s, x, y + s], fill=col)
    if s > 2:
        d.point((x - 1, y - 1), fill=col); d.point((x + 1, y + 1), fill=col)
        d.point((x + 1, y - 1), fill=col); d.point((x - 1, y + 1), fill=col)
