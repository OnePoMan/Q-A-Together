"""Cartoon character rig (front/3-4 view) drawn with cairo."""
import math
import cairo
from vg import *

CHARS = {
    "son": dict(skin=hx("f1c6a0"), skin_d=hx("dc9f7c"), hair=hx("2a2228"), hair_l=hx("4a3e48"),
                top=hx("f2a93b"), top_d=hx("d58624"), pants=hx("3a4a7a"), shoe=hx("f4f1ea"),
                glasses=("rect", hx("1e1a1c")), height=1.06, hair_style="short"),
    "dil": dict(skin=hx("f6cfae"), skin_d=hx("e3a584"), hair=hx("8a5230"), hair_l=hx("b3743f"),
                top=hx("2bbfc4"), top_d=hx("1a93a0"), pants=hx("2e3470"), shoe=hx("ff6fa8"),
                glasses=("round", hx("e8243c")), height=1.0, hair_style="wavy"),
    "mom": dict(skin=hx("efc19b"), skin_d=hx("d69a76"), hair=hx("3b2c2e"), hair_l=hx("6d5a5c"),
                top=hx("9a4f9c"), top_d=hx("773a7a"), pants=hx("5a4a44"), shoe=hx("7a3a3a"),
                blouse=hx("fff3e0"), glasses=None, height=0.92, hair_style="perm"),
}


def default_state(**kw):
    st = dict(x=0, y=0, s=1.0, bob=0.0, lean=0.0, head_turn=0.0, head_tilt=0.0,
              eyes="dot", eye_open=1.0, look=(0, 0), mouth="smile", talk=0.0, blush=0.35, brow=0.0,
              hand_l=None, hand_r=None, item_l=None, item_r=None, legs="stand", walk=0.0,
              glint=-1.0, show_legs=True, hair_bounce=0.0, cheeks_full=0.0)
    st.update(kw)
    return st


# ------------------------------------------------------------------ parts
def _hair_back(ctx, c, st):
    style = c["hair_style"]
    hb = st["hair_bounce"]
    if style == "wavy":
        pts = [(-114, -60), (-128, 0), (-140, 50 + hb), (-126, 92 + hb), (-146, 130 + hb), (-128, 172 + hb),
               (-88, 182 + hb), (-60, 150), (60, 150), (88, 182 + hb), (128, 172 + hb), (146, 130 + hb),
               (126, 92 + hb), (140, 50 + hb), (128, 0), (114, -60), (92, -112), (0, -134), (-92, -112)]
        smooth_closed(ctx, pts)
        fs(ctx, c["hair"])
        src(ctx, c["hair_l"])
        ctx.set_line_width(6)
        for sx in (-1, 1):
            smooth_open(ctx, [(sx * 120, 20), (sx * 132, 60 + hb), (sx * 118, 100 + hb), (sx * 134, 140 + hb)])
            ctx.stroke()
    elif style == "perm":
        pass
    else:
        pass


def _hair_front(ctx, c, st):
    style = c["hair_style"]
    if style == "wavy":
        hb = st["hair_bounce"]
        # side locks falling in front of the ears, wavy to the shoulders
        for sx in (-1, 1):
            pts = [(sx * 96, -70), (sx * 118, -20), (sx * 108, 30), (sx * 124, 76 + hb), (sx * 108, 118 + hb),
                   (sx * 124, 150 + hb), (sx * 98, 160 + hb), (sx * 84, 124 + hb), (sx * 92, 80 + hb),
                   (sx * 80, 34), (sx * 90, -16), (sx * 74, -50)]
            smooth_closed(ctx, pts)
            fs(ctx, c["hair"])
            src(ctx, c["hair_l"]); ctx.set_line_width(5)
            smooth_open(ctx, [(sx * 102, -20), (sx * 96, 30), (sx * 110, 76 + hb), (sx * 98, 118 + hb)])
            ctx.stroke()
        # side-parted swoop of bangs
        pts = [(-104, -34), (-110, -86), (-64, -122), (8, -132), (74, -118), (110, -80), (110, -28),
               (94, -58), (66, -80), (28, -84), (-8, -76), (-44, -58), (-76, -34)]
        smooth_closed(ctx, pts)
        fs(ctx, c["hair"])
        src(ctx, c["hair_l"])
        ctx.set_line_width(7)
        smooth_open(ctx, [(-60, -108), (0, -120), (50, -110)])
        ctx.stroke()
    elif style == "short":
        pts = [(-106, -10), (-110, -70), (-80, -116), (-20, -134), (50, -128), (98, -100), (112, -50), (106, -6),
               (94, -40), (74, -58), (60, -44), (40, -66), (14, -52), (-10, -70), (-40, -52), (-70, -62), (-92, -36)]
        smooth_closed(ctx, pts)
        fs(ctx, c["hair"])
        src(ctx, c["hair_l"])
        ctx.set_line_width(7)
        smooth_open(ctx, [(-50, -112), (0, -124), (50, -114)])
        ctx.stroke()
    elif style == "perm":
        curls = [(-100, -30, 34), (-108, 10, 30), (-96, 44, 26), (-80, -78, 36), (-40, -110, 38), (8, -122, 38),
                 (54, -110, 38), (90, -78, 36), (104, -30, 34), (108, 10, 30), (96, 44, 26),
                 (-56, -70, 30), (-12, -84, 32), (32, -82, 32), (70, -60, 28)]
        for (x, y, r) in curls:
            ellipse(ctx, x, y, r, r)
            fs(ctx, c["hair"])
        for (x, y, r) in curls:
            ellipse(ctx, x, y, r - 4, r - 4)
            src(ctx, c["hair"]); ctx.fill()
        src(ctx, c["hair_l"])
        ctx.set_line_width(5)
        for (x, y, r) in curls[:11]:
            ctx.new_path()
            ctx.arc(x - 4, y - 4, r * 0.5, math.pi * 1.1, math.pi * 1.7)
            ctx.stroke()


def _glasses(ctx, c, st, ex):
    g = c["glasses"]
    if not g:
        return
    shape, col = g
    for sx, (x, y) in zip((-1, 1), ex):
        ctx.new_path()
        if shape == "rect":
            rrect(ctx, x - 30, y - 22, 60, 44, 10)
        else:
            ellipse(ctx, x, y, 31, 27)
        src(ctx, hx("ffffff", 0.18)); ctx.fill_preserve()
        src(ctx, col); ctx.set_line_width(8 if shape == "rect" else 7); ctx.stroke()
        # lens glare
        src(ctx, hx("ffffff", 0.75))
        ctx.set_line_width(4)
        ctx.move_to(x - 14, y + 10); ctx.line_to(x - 4, y - 4); ctx.stroke()
    # bridge + temples
    src(ctx, col)
    ctx.set_line_width(6)
    (x1, y1), (x2, y2) = ex
    ctx.move_to(x1 + 28, y1 - 4); ctx.curve_to(x1 + 38, y1 - 12, x2 - 38, y2 - 12, x2 - 28, y2 - 4); ctx.stroke()
    ctx.move_to(x1 - 30, y1 - 6); ctx.line_to(-100, y1 - 10); ctx.stroke()
    ctx.move_to(x2 + 30, y2 - 6); ctx.line_to(100, y2 - 10); ctx.stroke()
    # glint sweep
    gp = st["glint"]
    if 0 <= gp <= 1:
        for (x, y) in ex:
            gx = x - 40 + gp * 80
            ctx.save()
            ctx.new_path()
            if shape == "rect":
                rrect(ctx, x - 30, y - 22, 60, 44, 10)
            else:
                ellipse(ctx, x, y, 31, 27)
            ctx.clip()
            src(ctx, hx("ffffff", 0.9))
            ctx.move_to(gx - 8, y + 30); ctx.line_to(gx + 8, y - 30); ctx.line_to(gx + 20, y - 30); ctx.line_to(gx + 4, y + 30)
            ctx.close_path(); ctx.fill()
            ctx.restore()


def _star(ctx, x, y, r, rot=0):
    ctx.new_path()
    for k in range(10):
        rr = r if k % 2 == 0 else r * 0.45
        a = -math.pi / 2 + rot + k * math.pi / 5
        (ctx.move_to if k == 0 else ctx.line_to)(x + rr * math.cos(a), y + rr * math.sin(a))
    ctx.close_path()


def _face(ctx, c, st):
    turn = st["head_turn"]
    ex = [(-40 + turn * 20, 8), (40 + turn * 20, 8)]
    lx, ly = st["look"]
    # blush
    if st["blush"] > 0:
        for (x, y) in ex:
            ellipse(ctx, x + (-8 if x < turn * 20 else 8), y + 42, 22, 12)
            src(ctx, hx("ff7f8a", 0.55 * st["blush"])); ctx.fill()
    style = st["eyes"]
    op = st["eye_open"]
    for (x, y) in ex:
        if style == "happy" or (style == "dot" and c["hair_style"] == "perm"):
            ctx.new_path()
            ctx.arc(x, y + 6, 13, math.pi * 1.1, math.pi * 1.9)
            src(ctx, OUT); ctx.set_line_width(6); ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.stroke()
        elif style == "closed":
            ctx.new_path(); ctx.arc(x, y - 4, 12, math.pi * 0.15, math.pi * 0.85)
            src(ctx, OUT); ctx.set_line_width(6); ctx.stroke()
        elif style == "star":
            _star(ctx, x, y, 19, 0.2)
            fs(ctx, hx("ffd23f"), OUT, 3.5)
        elif style == "wide":
            ellipse(ctx, x, y, 15, 19)
            fs(ctx, hx("ffffff"), OUT, 4)
            ellipse(ctx, x + lx * 4, y + ly * 4, 6, 7); src(ctx, OUT); ctx.fill()
        else:
            ry = max(1.5, 15 * op)
            ellipse(ctx, x + lx * 5, y + ly * 4, 11, ry)
            src(ctx, OUT); ctx.fill()
            if op > 0.5:
                ellipse(ctx, x + lx * 5 - 4, y + ly * 4 - 6, 4, 4)
                src(ctx, hx("ffffff")); ctx.fill()
    # brows
    br = st["brow"]
    src(ctx, c["hair"] if c["hair_style"] != "perm" else OUT)
    ctx.set_line_width(7)
    for (x, y), sx in zip(ex, (-1, 1)):
        ctx.new_path()
        ctx.move_to(x - 16, y - 34 - br * 10 + (2 if sx < 0 else 0))
        ctx.curve_to(x - 6, y - 42 - br * 12, x + 6, y - 42 - br * 12, x + 16, y - 34 - br * 10)
        ctx.stroke()
    # nose
    src(ctx, c["skin_d"])
    ctx.set_line_width(5)
    ctx.new_path(); ctx.arc(turn * 26, 34, 8, math.pi * 0.2, math.pi * 0.8); ctx.stroke()
    # mouth
    mx, my = turn * 18, 62
    m = st["mouth"]
    talk = st["talk"]
    if talk > 0 and m in ("smile", "grin"):
        m = "open"
    if m == "smile":
        ctx.new_path(); ctx.arc(mx, my - 12, 20, math.pi * 0.2, math.pi * 0.8)
        src(ctx, OUT); ctx.set_line_width(6); ctx.stroke()
    elif m == "open" or m == "grin":
        o = 0.5 + 0.5 * (talk if talk > 0 else 1)
        ctx.new_path()
        ctx.move_to(mx - 24, my - 6)
        ctx.curve_to(mx - 20, my + 30 * o, mx + 20, my + 30 * o, mx + 24, my - 6)
        ctx.close_path()
        fs(ctx, hx("8a2a36"), OUT, 5)
        ellipse(ctx, mx, my + 14 * o, 12, 7 * o)
        src(ctx, hx("ff7a8a")); ctx.fill()
        ctx.new_path(); ctx.rectangle(mx - 20, my - 6, 40, 6); src(ctx, hx("ffffff")); ctx.fill()
    elif m == "o":
        ellipse(ctx, mx, my + 4, 11, 14)
        fs(ctx, hx("8a2a36"), OUT, 5)
    elif m == "chew":
        # puffed cheeks + wavy mouth
        ph = st.get("chew_phase", 0)
        ctx.new_path()
        ctx.move_to(mx - 16, my + 2)
        ctx.curve_to(mx - 8, my - 6 + 6 * ph, mx + 8, my + 8 - 6 * ph, mx + 16, my + 2)
        src(ctx, OUT); ctx.set_line_width(6); ctx.stroke()
    elif m == "flat":
        ctx.new_path(); ctx.move_to(mx - 12, my + 2); ctx.line_to(mx + 12, my + 2)
        src(ctx, OUT); ctx.set_line_width(6); ctx.stroke()
    # mom's smile lines
    if c["hair_style"] == "perm":
        src(ctx, c["skin_d"]); ctx.set_line_width(4)
        for sx in (-1, 1):
            ctx.new_path(); ctx.arc(mx + sx * 36, my - 10, 12, math.pi * (0.35 if sx > 0 else 0.45), math.pi * (0.6 if sx > 0 else 0.7)); ctx.stroke()
    _glasses(ctx, c, st, ex)


def draw_head(ctx, c, st):
    ctx.save()
    ctx.rotate(st["head_tilt"])
    _hair_back(ctx, c, st)
    # ears
    for sx in (-1, 1):
        ellipse(ctx, sx * 104, 16, 18, 24)
        fs(ctx, c["skin"])
    # face
    pts = [(-104, -40), (-100, 40), (-70, 100), (0, 124), (70, 100), (100, 40), (104, -40), (70, -104), (0, -116), (-70, -104)]
    cf = st["cheeks_full"]
    if cf:
        pts[1] = (-106 - 8 * cf, 44); pts[5] = (106 + 8 * cf, 44)
    smooth_closed(ctx, pts)
    fs(ctx, c["skin"])
    _face(ctx, c, st)
    _hair_front(ctx, c, st)
    if c["hair_style"] == "perm":
        pass
    ctx.restore()


def _arm(ctx, c, sh, hand, bend, item=None):
    mx, my = (sh[0] + hand[0]) / 2, (sh[1] + hand[1]) / 2
    dx, dy = hand[0] - sh[0], hand[1] - sh[1]
    L = math.hypot(dx, dy) + 1e-6
    ex, ey = mx - dy / L * bend, my + dx / L * bend
    ctx.new_path(); ctx.move_to(*sh); ctx.curve_to(ex, ey, ex, ey, *hand)
    src(ctx, OUT); ctx.set_line_width(46); ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.stroke()
    ctx.new_path(); ctx.move_to(*sh); ctx.curve_to(ex, ey, ex, ey, *hand)
    src(ctx, c["top"]); ctx.set_line_width(36); ctx.stroke()
    ellipse(ctx, hand[0], hand[1], 21, 21)
    fs(ctx, c["skin"])
    if item:
        item(ctx, hand)


def draw_char(ctx, name, st):
    c = CHARS[name]
    ctx.save()
    ctx.translate(st["x"], st["y"])
    ctx.scale(st["s"] * c["height"], st["s"] * c["height"])
    # ground shadow
    if st["show_legs"]:
        ellipse(ctx, 0, 0, 120, 18)
        src(ctx, hx("3a2020", 0.18)); ctx.fill()
    bob = st["bob"]
    # legs
    if st["show_legs"]:
        ph = st["walk"]
        for sx in (-1, 1):
            sw = math.sin(ph * 2 * math.pi) * sx if st["legs"] == "walk" else 0
            hip = (sx * 38, -150 + bob)
            foot = (sx * 38 + sw * 40, -14 - max(0, -sw) * 16 * (1 if st["legs"] == "walk" else 0))
            ctx.new_path(); ctx.move_to(*hip); ctx.line_to(*foot)
            src(ctx, OUT); ctx.set_line_width(54); ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.stroke()
            ctx.new_path(); ctx.move_to(*hip); ctx.line_to(*foot)
            src(ctx, c["pants"]); ctx.set_line_width(44); ctx.stroke()
            ellipse(ctx, foot[0] + sx * 8, foot[1] + 4, 34, 18)
            fs(ctx, c["shoe"])
    ctx.translate(0, bob)
    ctx.rotate(st["lean"])
    # torso pivot at hips (0,-150)
    sh_l, sh_r = (-92, -300), (92, -300)
    hl = st["hand_l"] or (-128, -176)
    hr = st["hand_r"] or (128, -176)
    # back arm order: arms drawn after torso unless crossing behind
    # torso
    pts = [(-92, -318), (92, -318), (104, -250), (98, -140), (0, -128), (-98, -140), (-104, -250)]
    smooth_closed(ctx, pts, 0.35)
    fs(ctx, c["top"])
    src(ctx, c["top_d"])
    ctx.set_line_width(5)
    ctx.new_path(); ctx.move_to(-80, -150); ctx.line_to(80, -150); ctx.stroke()
    if name == "mom":
        # blouse V + pearls
        ctx.new_path(); ctx.move_to(-44, -318); ctx.line_to(0, -230); ctx.line_to(44, -318); ctx.close_path()
        fs(ctx, c["blouse"], OUT, 4)
        for k in range(9):
            a = math.pi * (0.15 + 0.7 * k / 8)
            ellipse(ctx, 46 * math.cos(a), -326 + 40 * math.sin(a), 6, 6)
            fs(ctx, hx("fffaf0"), OUT, 2.5)
        # cardigan buttons
        for k in range(3):
            ellipse(ctx, 0, -210 + k * 26, 5, 5); fs(ctx, hx("f0d27a"), OUT, 2)
    elif name == "son":
        # hoodie strings / collar
        ctx.new_path(); ctx.arc(0, -318, 44, 0, math.pi); fs(ctx, c["top_d"], OUT, 4)
    else:
        ctx.new_path(); ctx.arc(0, -318, 40, 0, math.pi); fs(ctx, hx("f8f2ea"), OUT, 4)
        # knit texture
        src(ctx, c["top_d"]); ctx.set_line_width(4)
        for x in (-50, 50):
            ctx.new_path(); ctx.move_to(x, -270); ctx.line_to(x, -160); ctx.stroke()
    # neck
    ctx.new_path(); rrect(ctx, -22, -350, 44, 40, 12); fs(ctx, c["skin_d"])
    # head
    ctx.save()
    ctx.translate(st["head_turn"] * 6, -440 - 4 * math.sin(st.get("bounce", 0)))
    draw_head(ctx, c, st)
    ctx.restore()
    # arms (in front)
    _arm(ctx, c, sh_l, hl, st.get("bend_l", -16), st["item_l"])
    _arm(ctx, c, sh_r, hr, st.get("bend_r", 16), st["item_r"])
    ctx.restore()


def blink_eye(t, seeds=(1.3, 3.7, 6.1, 8.9, 11.2, 14.8, 17.3, 20.9, 23.6, 27.1, 29.4, 32.0), dur=0.12):
    for b in seeds:
        if b <= t < b + dur:
            return 1 - math.sin((t - b) / dur * math.pi)
    return 1.0
