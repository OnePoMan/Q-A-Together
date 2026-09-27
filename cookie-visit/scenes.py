"""Backgrounds, props and effects."""
import math, random
import cairo
from vg import *

WOOD = hx("c98655"); WOOD_D = hx("a4643b"); WOOD_L = hx("e4a877")


# ------------------------------------------------------------------ hallway
def hallway(ctx, t, door_open=0.0):
    # wall
    ctx.rectangle(-400, -200, 2800, 1500)
    ctx.set_source(lingrad(0, 0, 0, 820, [(0, hx("efe6da")), (1, hx("e2d6c8"))])); ctx.fill()
    # wainscot
    ctx.rectangle(-400, 640, 2800, 180); src(ctx, hx("d6c3ae")); ctx.fill()
    ctx.rectangle(-400, 632, 2800, 10); src(ctx, hx("c4ab92")); ctx.fill()
    # floor tiles
    ctx.rectangle(-400, 820, 2800, 500); src(ctx, hx("b9b0a6")); ctx.fill()
    src(ctx, hx("a79d93")); ctx.set_line_width(3)
    for k in range(-10, 30):
        ctx.move_to(k * 120, 820); ctx.line_to(k * 120 - 300 + (k * 120 - 960) * 0.6, 1080); ctx.stroke()
    for y in (870, 950, 1050):
        ctx.move_to(-400, y); ctx.line_to(2400, y); ctx.stroke()
    ctx.rectangle(-400, 812, 2800, 10); src(ctx, hx("9a8a7c")); ctx.fill()
    # window at the end of the corridor with sunshine
    ctx.new_path(); rrect(ctx, 1520, 140, 300, 380, 12); fs(ctx, hx("fffaf0"), OUT, 6)
    ctx.rectangle(1536, 156, 268, 348)
    ctx.set_source(lingrad(0, 156, 0, 504, [(0, hx("9fd8f5")), (1, hx("fde7c2"))])); ctx.fill()
    for (x, y, r) in ((1580, 460, 60), (1660, 470, 70), (1760, 455, 65)):
        ellipse(ctx, x, y, r, r * 0.8); src(ctx, hx("7cc98a")); ctx.fill()
    ctx.new_path(); ctx.move_to(1670, 156); ctx.line_to(1670, 504); ctx.move_to(1536, 330); ctx.line_to(1804, 330)
    src(ctx, hx("fffaf0")); ctx.set_line_width(10); ctx.stroke()
    # sunlight patch on floor
    ctx.new_path(); ctx.move_to(1540, 830); ctx.line_to(1810, 830); ctx.line_to(1700, 1080); ctx.line_to(1250, 1080); ctx.close_path()
    src(ctx, hx("fff2c8", 0.35)); ctx.fill()
    # potted plant
    ctx.new_path(); ctx.move_to(1350, 820); ctx.line_to(1430, 820); ctx.line_to(1420, 720); ctx.line_to(1360, 720); ctx.close_path()
    fs(ctx, hx("e07b4f"))
    for a in (-0.9, -0.5, -0.1, 0.3, 0.7):
        ellipse(ctx, 1390 + 70 * math.sin(a), 650 - 60 * math.cos(a), 26, 60, a); fs(ctx, hx("4fb477"))
    # the unit door (302) with digital lock
    dx0, dx1, dy0, dy1 = 880, 1200, 240, 815
    ctx.new_path(); ctx.rectangle(dx0 - 22, dy0 - 22, dx1 - dx0 + 44, dy1 - dy0 + 22); fs(ctx, hx("7a6a60"))
    # interior glimpse when open
    if door_open > 0:
        ctx.rectangle(dx0, dy0, dx1 - dx0, dy1 - dy0)
        ctx.set_source(lingrad(0, dy0, 0, dy1, [(0, hx("ffe6b8")), (1, hx("f6c890"))])); ctx.fill()
    w = (dx1 - dx0) * (1 - 0.82 * ease_io(door_open))
    ctx.new_path(); ctx.rectangle(dx0, dy0, w, dy1 - dy0); fs(ctx, hx("3f6f7a"))
    ctx.new_path(); ctx.rectangle(dx0 + 22 * w / 320, dy0 + 30, w - 44 * w / 320, 250); src(ctx, hx("4a7f8b")); ctx.fill()
    ctx.new_path(); ctx.rectangle(dx0 + 22 * w / 320, dy0 + 310, w - 44 * w / 320, 230); src(ctx, hx("4a7f8b")); ctx.fill()
    if door_open < 0.5:
        # lock + handle
        lx = dx0 + w - 70 * w / 320
        ctx.new_path(); rrect(ctx, lx - 22, 470, 44, 110, 10); fs(ctx, hx("2a2a2e"))
        for r in range(4):
            for cc in range(3):
                on = door_open > 0 or (T_LOCK_GLOW(t) and (r * 3 + cc) % 2 == 0)
                ellipse(ctx, lx - 12 + cc * 12, 486 + r * 16, 3.5, 3.5)
                src(ctx, hx("8fe0ff") if on else hx("4a5a66")); ctx.fill()
        ctx.new_path(); rrect(ctx, lx - 30, 600, 60, 18, 9); fs(ctx, hx("c0c4cc"))
    # number plate
    ctx.new_path(); rrect(ctx, 960, 170, 160, 50, 8); fs(ctx, hx("f7f1e6"))
    text(ctx, "302호", 1040, 196, 38, OUT)
    # intercom/doorbell
    ctx.new_path(); rrect(ctx, 1240, 440, 70, 110, 10); fs(ctx, hx("f2f2f2"))
    ellipse(ctx, 1275, 470, 16, 16); fs(ctx, hx("2a2a2e"), OUT, 3)
    ellipse(ctx, 1275, 520, 14, 14)
    lit = T_BELL_GLOW(t)
    fs(ctx, hx("ffcf4a") if lit else hx("d9d9d9"), OUT, 3)
    # shoe mat
    ctx.new_path(); rrect(ctx, 880, 820, 320, 40, 12); fs(ctx, hx("8a5a4a"))


def T_LOCK_GLOW(t):
    from timeline import T_LOCK
    return T_LOCK <= t < T_LOCK + 0.5 and int((t - T_LOCK) * 16) % 2 == 0


def T_BELL_GLOW(t):
    from timeline import T_BELL
    return T_BELL <= t < T_BELL + 0.5


# ------------------------------------------------------------------ living room
def room(ctx, t, door="closed", door_mom=None):
    # wall
    ctx.rectangle(-600, -300, 3200, 1400)
    ctx.set_source(lingrad(0, 0, 0, 820, [(0, hx("fbe6d2")), (1, hx("f3cfb2"))])); ctx.fill()
    src(ctx, hx("ffffff", 0.18))
    for x in range(-600, 2600, 64):
        ctx.rectangle(x, -300, 22, 1110); ctx.fill()
    # ceiling line
    ctx.rectangle(-600, -300, 3200, 330); src(ctx, hx("fff4e8")); ctx.fill()
    ctx.rectangle(-600, 26, 3200, 10); src(ctx, hx("e7c9ae")); ctx.fill()
    # floor
    ctx.rectangle(-600, 810, 3200, 600)
    ctx.set_source(lingrad(0, 810, 0, 1080, [(0, hx("c98655")), (1, hx("b5703f"))])); ctx.fill()
    src(ctx, WOOD_D); ctx.set_line_width(3)
    for y in (850, 900, 960, 1030):
        ctx.move_to(-600, y); ctx.line_to(2600, y); ctx.stroke()
    rnd = random.Random(3)
    for i, (y0, y1) in enumerate(((810, 850), (850, 900), (900, 960), (960, 1030), (1030, 1100))):
        for x in range(-600 + rnd.randint(0, 200), 2600, 260 + 40 * i):
            ctx.move_to(x, y0); ctx.line_to(x, y1); ctx.stroke()
    ctx.rectangle(-600, 796, 3200, 18); src(ctx, hx("fffaf3")); ctx.fill()
    # rug
    ellipse(ctx, 960, 960, 600, 100); src(ctx, hx("9cc9a6")); ctx.fill()
    ellipse(ctx, 960, 960, 560, 84); src(ctx, hx("b8dcbc")); ctx.fill()
    ellipse(ctx, 960, 960, 520, 70); src(ctx, hx("9cc9a6")); ctx.set_line_width(4); ctx.stroke()
    # front door (left) with entrance tiles + shoes
    ctx.rectangle(-600, 800, 520 + 380, 22); src(ctx, hx("d9cfc5")); ctx.fill()
    dx0, dx1 = 60, 330
    ctx.new_path(); ctx.rectangle(dx0 - 20, 250, dx1 - dx0 + 40, 560); fs(ctx, hx("e8dccf"))
    if door == "open":
        ctx.rectangle(dx0, 270, dx1 - dx0, 540)
        ctx.set_source(lingrad(0, 270, 0, 810, [(0, hx("e9e2d8")), (1, hx("c9c0b6"))])); ctx.fill()
        # door leaf swung against the wall (thin parallelogram)
        ctx.new_path(); ctx.move_to(dx0, 270); ctx.line_to(dx0 - 70, 240); ctx.line_to(dx0 - 70, 840); ctx.line_to(dx0, 810); ctx.close_path()
        fs(ctx, hx("3f6f7a"))
    else:
        ctx.new_path(); ctx.rectangle(dx0, 270, dx1 - dx0, 540); fs(ctx, hx("3f6f7a"))
        ctx.new_path(); rrect(ctx, dx1 - 60, 500, 36, 90, 8); fs(ctx, hx("2a2a2e"))
    # shoes by the door
    for (x, col) in ((380, hx("f4f1ea")), (440, hx("ff6fa8"))):
        for k in range(2):
            ellipse(ctx, x + k * 26, 850, 16, 9); fs(ctx, col, OUT, 3)
    # bookshelf
    ctx.new_path(); rrect(ctx, 400, 360, 200, 440, 8); fs(ctx, WOOD)
    for k in range(4):
        y = 380 + k * 104
        ctx.new_path(); ctx.rectangle(414, y, 172, 88); src(ctx, WOOD_D); ctx.fill()
        rnd = random.Random(k)
        x = 418
        while x < 570:
            bw = rnd.randint(14, 26); bh = rnd.randint(52, 84)
            col = rnd.choice([hx("e8664f"), hx("4f9ed8"), hx("f2c14e"), hx("7ac47f"), hx("b48ad8"), hx("fff4e0")])
            ctx.new_path(); ctx.rectangle(x, y + 88 - bh, bw, bh); fs(ctx, col, OUT, 3)
            x += bw + 3
    # plant on shelf
    ctx.new_path(); ctx.move_to(450, 360); ctx.line_to(550, 360); ctx.line_to(538, 300); ctx.line_to(462, 300); ctx.close_path(); fs(ctx, hx("f3a37a"))
    for a in (-1.0, -0.5, 0.0, 0.5, 1.0):
        ellipse(ctx, 500 + 60 * math.sin(a), 250 - 40 * math.cos(a), 20, 44, a); fs(ctx, hx("5cbf7e"))
    # photo frames
    frames = [(660, 300, 150, 120, "couple"), (850, 330, 100, 130, "mom")]
    for (x, y, w, h, kind) in frames:
        ctx.new_path(); rrect(ctx, x, y, w, h, 6); fs(ctx, hx("fff8ec"))
        ctx.rectangle(x + 10, y + 10, w - 20, h - 20); src(ctx, hx("cfe8f5")); ctx.fill()
        if kind == "couple":
            for k, (hc, gc) in enumerate(((hx("2a2228"), hx("1e1a1c")), (hx("8a5230"), hx("e8243c")))):
                cx = x + 52 + k * 46
                ellipse(ctx, cx, y + h - 20, 26, 30); src(ctx, hx("ffffff") if k else hx("2a2a3a")); ctx.fill()
                ellipse(ctx, cx, y + 58, 17, 19); fs(ctx, hx("f3c9a5"), OUT, 2.5)
                ellipse(ctx, cx, y + 44, 18, 10); src(ctx, hc); ctx.fill()
                src(ctx, gc); ctx.set_line_width(2)
                for sx in (-6, 6):
                    ellipse(ctx, cx + sx, y + 58, 5, 4); ctx.stroke()
            # heart
            heart(ctx, x + w / 2, y + 28, 9, hx("ff6f8a"))
        else:
            ellipse(ctx, x + w / 2, y + 74, 20, 22); fs(ctx, hx("efc19b"), OUT, 2.5)
            for k in range(7):
                a = math.pi * (1.0 + k / 6)
                ellipse(ctx, x + w / 2 + 20 * math.cos(a), y + 70 + 20 * math.sin(a), 8, 8); src(ctx, hx("3b2c2e")); ctx.fill()
            ellipse(ctx, x + w / 2, y + h - 12, 28, 22); src(ctx, hx("9a4f9c")); ctx.fill()
    # clock
    ellipse(ctx, 1030, 200, 44, 44); fs(ctx, hx("fffaf3"))
    src(ctx, OUT); ctx.set_line_width(5)
    ctx.move_to(1030, 200); ctx.line_to(1030, 172); ctx.stroke()
    ctx.move_to(1030, 200); ctx.line_to(1052, 212); ctx.stroke()
    # window
    wx0, wy0, wx1, wy1 = 1200, 170, 1640, 600
    ctx.new_path(); rrect(ctx, wx0 - 16, wy0 - 16, wx1 - wx0 + 32, wy1 - wy0 + 32, 10); fs(ctx, hx("fffaf3"))
    ctx.rectangle(wx0, wy0, wx1 - wx0, wy1 - wy0)
    ctx.set_source(lingrad(0, wy0, 0, wy1, [(0, hx("a9dcf7")), (0.7, hx("dff0f2")), (1, hx("ffe3bd"))])); ctx.fill()
    ctx.save(); ctx.rectangle(wx0, wy0, wx1 - wx0, wy1 - wy0); ctx.clip()
    # clouds
    for (x, y, r) in ((1290, 240, 30), (1320, 228, 38), (1356, 242, 28), (1520, 280, 24), (1546, 270, 30)):
        ellipse(ctx, x + math.sin(t * 0.2) * 10, y, r, r * 0.8); src(ctx, hx("ffffff", 0.9)); ctx.fill()
    # apartment blocks
    for (x, w, h, num) in ((1210, 150, 290, "103"), (1400, 130, 330, "104"), (1560, 150, 250, "")):
        ctx.new_path(); ctx.rectangle(x, wy1 - h, w, h); fs(ctx, hx("e9eef5"), hx("b7c3d3"), 4)
        for yy in range(wy1 - h + 20, wy1 - 10, 26):
            for xx in range(x + 14, x + w - 14, 24):
                ctx.rectangle(xx, yy, 14, 12); src(ctx, hx("c4d4e4")); ctx.fill()
        if num:
            text(ctx, num, x + w / 2, wy1 - h + 40, 34, hx("7c8aa0"))
    for (x, r) in ((1230, 60), (1330, 70), (1460, 64), (1600, 70)):
        ellipse(ctx, x, wy1 + 10, r, r * 0.9); src(ctx, hx("6cc28a")); ctx.fill()
    ctx.restore()
    src(ctx, hx("fffaf3")); ctx.set_line_width(14)
    ctx.move_to((wx0 + wx1) / 2, wy0); ctx.line_to((wx0 + wx1) / 2, wy1); ctx.stroke()
    ctx.new_path(); ctx.rectangle(wx0 - 30, wy1 + 14, wx1 - wx0 + 60, 18); fs(ctx, hx("fffaf3"))
    # sheer curtains
    for side in (0, 1):
        x0 = wx0 - 60 if side == 0 else wx1 - 30
        for k in range(5):
            xx = x0 + k * 18
            ctx.new_path(); ctx.move_to(xx, wy0 - 40)
            ctx.curve_to(xx + 14, wy0 + 150, xx - 10, wy1 - 100, xx + 6 + math.sin(t * 1.3 + k) * 3, wy1 + 70)
            src(ctx, hx("ffffff", 0.55)); ctx.set_line_width(20); ctx.stroke()
    ctx.new_path(); ctx.rectangle(wx0 - 90, wy0 - 50, wx1 - wx0 + 180, 12); fs(ctx, WOOD_D, OUT, 3)
    # big plant (floor, right)
    ctx.new_path(); ctx.move_to(1700, 810); ctx.line_to(1840, 810); ctx.line_to(1820, 690); ctx.line_to(1720, 690); ctx.close_path()
    fs(ctx, hx("f7f1e6"))
    for k, a in enumerate((-1.1, -0.6, -0.2, 0.25, 0.7, 1.1)):
        sway = math.sin(t * 1.1 + k) * 0.03
        ex = 1770 + 150 * math.sin(a + sway); ey = 690 - 200 * math.cos(a + sway)
        ctx.new_path(); ctx.move_to(1770, 690); ctx.curve_to(1770, 600, ex, ey + 60, ex, ey); src(ctx, hx("3f9a5f")); ctx.set_line_width(5); ctx.stroke()
        ellipse(ctx, ex, ey, 44, 70, a); fs(ctx, hx("4fb477"))
        ctx.new_path(); ctx.move_to(ex - 30 * math.cos(a), ey - 30 * math.sin(a)); ctx.line_to(ex + 30 * math.cos(a), ey + 30 * math.sin(a))
    # pendant lamp
    src(ctx, OUT); ctx.set_line_width(4); ctx.move_to(960, 30); ctx.line_to(960, 210); ctx.stroke()
    ctx.new_path(); ctx.move_to(900, 260); ctx.curve_to(900, 200, 1020, 200, 1020, 260); ctx.close_path(); fs(ctx, hx("f2c14e"))
    ellipse(ctx, 960, 262, 16, 10); src(ctx, hx("fff6d8")); ctx.fill()


def sunbeam(ctx, t, strength=1.0):
    ctx.new_path()
    ctx.move_to(1200, 170); ctx.line_to(1640, 170); ctx.line_to(1200, 1080); ctx.line_to(520, 1080); ctx.close_path()
    ctx.set_source(lingrad(1400, 170, 900, 1080, [(0, hx("fff4c4", 0.28 * strength)), (1, hx("fff4c4", 0.0))]))
    ctx.fill()
    rnd = random.Random(5)
    for k in range(36):
        u = rnd.random(); v = (rnd.random() + t * 0.03 * rnd.uniform(0.5, 1.5)) % 1
        x = lerp(1200 + 440 * u, 520 + 680 * u, v) + math.sin(t * 0.7 + k) * 12
        y = lerp(170, 1080, v)
        ellipse(ctx, x, y, 2.5, 2.5); src(ctx, hx("fffbe8", 0.6 * strength * (1 - v))); ctx.fill()


def chair_back(ctx, x, y):
    ctx.new_path(); rrect(ctx, x - 90, y, 180, 190, 30); fs(ctx, WOOD)
    ctx.new_path(); rrect(ctx, x - 70, y + 20, 140, 40, 14); src(ctx, WOOD_L); ctx.fill()


def table(ctx, top_y=760):
    cx = 960
    ctx.new_path(); rrect(ctx, cx - 36, top_y + 20, 72, 200, 10); fs(ctx, WOOD_D)
    ellipse(ctx, cx, top_y + 225, 150, 26); fs(ctx, WOOD_D)
    ctx.new_path()
    ctx.move_to(cx - 360, top_y); ctx.line_to(cx - 360, top_y + 24)
    ctx.curve_to(cx - 360, top_y + 110, cx + 360, top_y + 110, cx + 360, top_y + 24); ctx.line_to(cx + 360, top_y); ctx.close_path()
    fs(ctx, WOOD_D)
    ellipse(ctx, cx, top_y, 360, 80); fs(ctx, WOOD)
    ellipse(ctx, cx, top_y, 330, 66); src(ctx, WOOD_L); ctx.set_line_width(3); ctx.stroke()
    # little tea cups
    for (x, y) in ((720, top_y + 10), (1200, top_y + 12)):
        ctx.new_path(); ctx.move_to(x - 26, y - 30); ctx.line_to(x + 26, y - 30); ctx.line_to(x + 20, y + 4); ctx.line_to(x - 20, y + 4); ctx.close_path()
        fs(ctx, hx("fffaf3"))
        ellipse(ctx, x, y - 30, 26, 7); fs(ctx, hx("c7e59a"), OUT, 3)


def heart(ctx, x, y, r, col, outline=True):
    ctx.new_path()
    ctx.move_to(x, y + r)
    ctx.curve_to(x - r * 2.2, y - r * 0.6, x - r * 0.9, y - r * 2.1, x, y - r * 0.8)
    ctx.curve_to(x + r * 0.9, y - r * 2.1, x + r * 2.2, y - r * 0.6, x, y + r)
    ctx.close_path()
    fs(ctx, col, OUT if outline else None, max(2, r * 0.18))


def cookie(ctx, x, y, r, bites=0, rot=0.0, seed=0):
    """Chocolate-chip cookie; bites = number of bite marks (0-3)."""
    ctx.save()
    ctx.translate(x, y); ctx.rotate(rot)
    ctx.push_group()
    rnd = random.Random(seed)
    pts = [(r * (1 + rnd.uniform(-0.05, 0.05)) * math.cos(a), r * (1 + rnd.uniform(-0.05, 0.05)) * math.sin(a))
           for a in [k * 2 * math.pi / 12 for k in range(12)]]
    smooth_closed(ctx, pts)
    fs(ctx, hx("e2a45c"), OUT, max(2.5, r * 0.08))
    smooth_closed(ctx, [(p[0] * 0.8, p[1] * 0.8 - r * 0.05) for p in pts])
    src(ctx, hx("f0bf78")); ctx.fill()
    for k in range(7):
        a = rnd.uniform(0, 6.28); rr = rnd.uniform(0.1, 0.7) * r
        ellipse(ctx, rr * math.cos(a), rr * math.sin(a), r * 0.12, r * 0.1, a)
        src(ctx, hx("5a3020")); ctx.fill()
    if bites:
        ctx.set_operator(cairo.OPERATOR_CLEAR)
        for k in range(bites):
            a = -0.6 + k * 0.5
            for j in (-1, 0, 1):
                ellipse(ctx, r * 1.05 * math.cos(a) + j * r * 0.22 * math.sin(a), r * 1.05 * math.sin(a) - j * r * 0.22 * math.cos(a), r * 0.28, r * 0.28)
                ctx.fill()
        ctx.set_operator(cairo.OPERATOR_OVER)
    ctx.pop_group_to_source()
    ctx.paint()
    ctx.restore()


def bojagi(ctx, x, y, t, untie=0.0, unfold=0.0):
    """Wrapped bundle on the table. untie 0..1 loosens knot, unfold 0..1 opens cloth flat."""
    silk = hx("e8497a"); silk_d = hx("c02e5e"); silk_l = hx("ff8fb0")
    if unfold > 0:
        # flat cloth: four corners spreading out as a diamond under the tin
        u = ease_out(unfold)
        s = 140 + 120 * u
        ctx.new_path()
        ctx.move_to(x - s, y + 10); ctx.line_to(x, y - s * 0.28 + 10); ctx.line_to(x + s, y + 10); ctx.line_to(x, y + s * 0.32 + 10); ctx.close_path()
        fs(ctx, silk)
        src(ctx, silk_l); ctx.set_line_width(4)
        for k in range(1, 4):
            f = k / 4
            ctx.move_to(x - s * f, y + 10); ctx.line_to(x, y - s * 0.28 * f + 10); ctx.stroke()
        # flopping corner flaps (lift then fall)
        lift = math.sin(u * math.pi) * 60
        for sx in (-1, 1):
            ctx.new_path(); ctx.move_to(x + sx * 90, y - 30)
            ctx.curve_to(x + sx * 130, y - 60 - lift, x + sx * (s + 10), y - 10 - lift * 0.5, x + sx * s, y + 10)
            ctx.line_to(x + sx * 90, y + 30); ctx.close_path()
            fs(ctx, silk_d if sx < 0 else silk)
        tin(ctx, x, y, t, 0.0)
        return
    # wrapped box
    ctx.new_path(); rrect(ctx, x - 130, y - 110, 260, 130, 40); fs(ctx, silk)
    src(ctx, silk_d); ctx.set_line_width(5)
    ctx.move_to(x - 110, y - 20); ctx.curve_to(x - 40, y - 50, x + 40, y - 50, x + 110, y - 20); ctx.stroke()
    # pattern dots
    for k in range(6):
        ellipse(ctx, x - 90 + k * 36, y - 60 + (k % 2) * 30, 6, 6); src(ctx, hx("ffd23f")); ctx.fill()
    # knot with bunny ears
    loose = ease_io(untie)
    kx, ky = x, y - 118
    for sx in (-1, 1):
        ctx.new_path(); ctx.move_to(kx, ky)
        ctx.curve_to(kx + sx * 70, ky - 80 + loose * 60, kx + sx * 110, ky - 10 + loose * 40, kx + sx * (30 + loose * 60), ky + 8 + loose * 30)
        ctx.close_path(); fs(ctx, silk_l if sx < 0 else silk)
    ellipse(ctx, kx, ky, 26 - loose * 10, 20 - loose * 8); fs(ctx, silk_d)


def tin(ctx, x, y, t, lid_off=0.0, glow=0.0, count=7, taken=0):
    """Round cookie tin seen from 3/4 above, lid lifts off to the right."""
    # body
    ctx.new_path(); ctx.move_to(x - 110, y - 30); ctx.line_to(x - 110, y + 20)
    ctx.curve_to(x - 110, y + 60, x + 110, y + 60, x + 110, y + 20); ctx.line_to(x + 110, y - 30); ctx.close_path()
    fs(ctx, hx("3f7fd0"))
    src(ctx, hx("ffffff", 0.8)); ctx.set_line_width(4)
    for k in range(9):
        a = math.pi * (0.1 + 0.8 * k / 8)
        ctx.new_path(); ctx.arc(x + 100 * math.cos(a) * 1.0, y + 12 + 26 * math.sin(a), 4, 0, 6.28); ctx.stroke()
    ellipse(ctx, x, y - 30, 110, 36); fs(ctx, hx("2f64aa"))
    ellipse(ctx, x, y - 30, 100, 30); src(ctx, hx("f8efe0")); ctx.fill()
    # cookies inside
    spots = [(-50, -36), (0, -44), (50, -36), (-30, -22), (28, -22), (-70, -26), (70, -26)]
    for k, (dx, dy) in enumerate(spots[:count]):
        if k < taken:
            continue
        cookie(ctx, x + dx, y + dy, 26, 0, k * 0.7, seed=k)
    if glow > 0:
        ctx.new_path(); ellipse(ctx, x, y - 40, 220 * glow + 60, 120 * glow + 40)
        ctx.set_source(radgrad(x, y - 40, 0, 260, [(0, hx("fff6c8", 0.55 * glow)), (1, hx("fff6c8", 0))])); ctx.fill()
    if lid_off < 1:
        lo = ease_io(lid_off)
        lx = x + lo * 260; ly = y - 30 - math.sin(lo * math.pi) * 140 + lo * 40
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(lo * 0.5)
        ctx.new_path(); ctx.move_to(-114, 0); ctx.line_to(-114, 14); ctx.curve_to(-114, 50, 114, 50, 114, 14); ctx.line_to(114, 0); ctx.close_path()
        fs(ctx, hx("2f64aa"))
        ellipse(ctx, 0, 0, 114, 38); fs(ctx, hx("3f7fd0"))
        ellipse(ctx, 0, 0, 70, 22); src(ctx, hx("ffffff", 0.85)); ctx.set_line_width(4); ctx.stroke()
        heart(ctx, 0, 0, 12, hx("ff6f8a"), False)
        ctx.restore()


def sparkle(ctx, x, y, r, col=None, rot=0.0):
    col = col or hx("fff6c0")
    ctx.new_path()
    for k in range(8):
        rr = r if k % 2 == 0 else r * 0.22
        a = rot + k * math.pi / 4
        (ctx.move_to if k == 0 else ctx.line_to)(x + rr * math.cos(a), y + rr * math.sin(a))
    ctx.close_path()
    src(ctx, col); ctx.fill()


def burst_bg(ctx, t, cx=960, cy=560, strength=1.0):
    ctx.rectangle(-600, -300, 3200, 1800); src(ctx, hx("ffe7ef")); ctx.fill()
    n = 20
    for k in range(n):
        a0 = t * 0.4 + k * 2 * math.pi / n
        a1 = a0 + math.pi / n
        ctx.new_path(); ctx.move_to(cx, cy)
        ctx.line_to(cx + 3000 * math.cos(a0), cy + 3000 * math.sin(a0))
        ctx.line_to(cx + 3000 * math.cos(a1), cy + 3000 * math.sin(a1)); ctx.close_path()
        src(ctx, hx("fff0b8") if k % 2 else hx("ffc6d6")); ctx.fill()
    ctx.set_source(radgrad(cx, cy, 0, 700, [(0, hx("ffffff", 0.9)), (1, hx("ffffff", 0))]))
    ctx.paint()
    rnd = random.Random(8)
    for k in range(40):
        x = rnd.uniform(-100, 2020); y = (rnd.uniform(-100, 1180) - t * rnd.uniform(40, 120)) % 1300 - 100
        s = rnd.uniform(8, 26) * (0.7 + 0.3 * math.sin(t * 6 + k))
        if k % 3 == 0:
            flower(ctx, x, y, s * 1.2, t * 1.5 + k)
        else:
            sparkle(ctx, x, y, s, hx("ffffff") if k % 2 else hx("ffd23f"), t + k)


def flower(ctx, x, y, r, rot):
    for k in range(5):
        a = rot + k * 2 * math.pi / 5
        ellipse(ctx, x + r * 0.7 * math.cos(a), y + r * 0.7 * math.sin(a), r * 0.55, r * 0.55)
        src(ctx, hx("ffa3c0")); ctx.fill()
    ellipse(ctx, x, y, r * 0.35, r * 0.35); src(ctx, hx("ffe066")); ctx.fill()


def bubble(ctx, who_xy, ko, en, t_local, hold, side=1, n_chars=None, scale=1.0):
    """Speech bubble anchored above a head. who_xy = (x, y) of head top in current coords."""
    if t_local < 0 or t_local > hold + 0.25:
        return
    pop = ease_back(t_local / 0.18, 2.2) if t_local < 0.18 else 1.0
    out = 1 - ease_in((t_local - hold) / 0.25) if t_local > hold else 1.0
    k = pop * out
    if k <= 0.01:
        return
    from timeline import CHAR_RATE
    shown = int(max(0, t_local - 0.1) / CHAR_RATE) + 1
    ko_vis = ko[:shown]
    fs_ko, fs_en = 58 * scale, 32 * scale
    w = max(text_width(ctx, ko, fs_ko), text_width(ctx, en, fs_en)) + 70 * scale
    h = 150 * scale
    x, y = who_xy
    bx = x + side * 40 * scale - (w if side < 0 else 0) - (0 if side < 0 else 0)
    bx = x - w / 2 + side * w * 0.22
    by = y - h - 50 * scale
    ctx.save()
    ctx.translate(x, y - 30 * scale)
    ctx.scale(max(k, 1e-3), max(k, 1e-3))
    ctx.translate(-x, -(y - 30 * scale))
    # tail
    ctx.new_path()
    ctx.move_to(x - 22 * scale + side * 30 * scale, by + h - 6); ctx.line_to(x + 22 * scale + side * 30 * scale, by + h - 6)
    ctx.line_to(x + side * 4 * scale, y - 20 * scale); ctx.close_path()
    fs(ctx, hx("ffffff"), OUT, 5)
    ctx.new_path(); rrect(ctx, bx, by, w, h, 44 * scale); fs(ctx, hx("ffffff"), OUT, 5)
    ctx.new_path(); ctx.rectangle(x - 18 * scale + side * 30 * scale, by + h - 12, 36 * scale, 12); src(ctx, hx("ffffff")); ctx.fill()
    ctx.select_font_face("Jua"); ctx.set_font_size(fs_ko)
    full_w = text_width(ctx, ko, fs_ko)
    text(ctx, ko_vis, bx + w / 2 - full_w / 2, by + h * 0.38, fs_ko, OUT, anchor="left")
    text(ctx, en, bx + w / 2, by + h * 0.75, fs_en, hx("a07060"))
    ctx.restore()


def exclaim(ctx, x, y, t_local, col=hx("ff4f6d")):
    if t_local < 0 or t_local > 1.1:
        return
    k = ease_back(t_local / 0.15, 3) if t_local < 0.15 else 1 - ease_in((t_local - 0.9) / 0.2)
    ctx.save(); ctx.translate(x, y); ctx.scale(max(k, 1e-3), max(k, 1e-3)); ctx.rotate(0.12)
    ctx.new_path(); ctx.move_to(-14, -90); ctx.line_to(14, -90); ctx.line_to(8, -20); ctx.line_to(-8, -20); ctx.close_path()
    fs(ctx, col, OUT, 5)
    ellipse(ctx, 0, 6, 12, 12); fs(ctx, col, OUT, 5)
    ctx.restore()


def crumbs(ctx, x, y, t_local, seed=0):
    if t_local < 0 or t_local > 0.9:
        return
    rnd = random.Random(seed)
    for k in range(16):
        vx = rnd.uniform(-260, 260); vy = rnd.uniform(-420, -120)
        px = x + vx * t_local; py = y + vy * t_local + 900 * t_local ** 2
        r = rnd.uniform(3, 7) * (1 - t_local / 0.9)
        ellipse(ctx, px, py, r, r); src(ctx, hx("d9954c") if k % 2 else hx("f0bf78")); ctx.fill()


def big_text(ctx, t_local, cx=960, cy=190):
    """Bouncy 맛있어요!! + SO DELICIOUS!!"""
    ko = "맛있어요!!"
    en = "SO DELICIOUS!!"
    size = 170
    ctx.select_font_face("Jua"); ctx.set_font_size(size)
    total = ctx.text_extents(ko).x_advance
    x = cx - total / 2
    cols = [hx("ff4f6d"), hx("ff8a3d"), hx("ffc93c"), hx("4fc3a1"), hx("4f9ed8"), hx("b06fd8")]
    for i, ch in enumerate(ko):
        adv = ctx.text_extents(ch).x_advance
        tt_ = t_local - i * 0.06
        if tt_ > 0:
            k = ease_back(tt_ / 0.25, 3) if tt_ < 0.25 else 1.0
            bounce = math.sin((t_local - i * 0.08) * 7) * 10 if t_local > 0.4 else 0
            ctx.save(); ctx.translate(x + adv / 2, cy + bounce); ctx.scale(max(k, 1e-3), max(k, 1e-3)); ctx.rotate(math.sin(i * 1.7) * 0.08)
            text(ctx, ch, 4, 8, size, hx("7a2a3a"), outline=hx("7a2a3a"), olw=26)
            text(ctx, ch, 0, 0, size, cols[i % len(cols)], outline=hx("ffffff"), olw=16)
            ctx.restore()
            ctx.select_font_face("Jua"); ctx.set_font_size(size)
        x += adv
    if t_local > 0.45:
        k = ease_back((t_local - 0.45) / 0.25, 2)
        ctx.save(); ctx.translate(cx, cy + 130); ctx.scale(max(k, 1e-3), max(k, 1e-3))
        text(ctx, en, 3, 5, 72, hx("7a2a3a"), outline=hx("7a2a3a"), olw=18)
        text(ctx, en, 0, 0, 72, hx("ffffff"), outline=hx("ff4f6d"), olw=12)
        ctx.restore()
