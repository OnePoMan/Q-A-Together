"""Pixel-puppet character: hand-drawn head/torso sprites + procedurally drawn limbs."""
import math
from PIL import Image, ImageDraw
from gfx import C, sprite, paste, flip

PAL = {
    "o": C["ink"], "h": C["hair"], "H": C["hair_d"], "l": C["hair_l"], "L": C["hair_ll"],
    "s": C["skin"], "S": C["skin_d"], "D": C["skin_dd"], "b": C["blush"],
    "r": C["glass"], "R": C["glass_d"], "w": C["lens"], "e": C["eye"], "m": C["mouth"],
    "t": C["top"], "T": C["top_d"], "U": C["top_dd"], "y": C["top_l"],
    "p": C["pants"], "P": C["pants_d"], "k": C["sock"], "K": C["sock_d"],
    "W": C["white"],
}

# Head facing right (3/4).  Chin is at row 18; neck pivot col 10.
HEAD_BASE = [
    "........oooooo.......",  # 0
    "......oohhhhhhoo.....",  # 1
    ".....ohhhhlllhhhoo...",  # 2
    "....ohhhhllLLllhhho..",  # 3
    "...ohhhhhhllllhhhhho.",  # 4
    "...ohhhhhhhhhhhhhhho.",  # 5
    "..ohhhhhhhhhhhhhhhhho",  # 6
    "..ohhhhhhhhhhhhHhhhho",  # 7
    "..ohhhhhhHHhhhHHhhhho",  # 8
    ".ohhhhhhHsshhHsssshho",  # 9  bangs
    ".ohhhhhHsssssHssssshho",  # 10 forehead
    ".ohhhhhSrrrrsrrrrsHho",  # 11 glasses top
    ".ohhhhhSr{}rrr{}rsHho",  # 12 eyes row 1
    ".ohhhhhSr[]rsr[]rsHho",  # 13 eyes row 2
    ".oHhhhhSsrrssssrrsHho",  # 14 glasses bottom
    ".oHhhhhhSbsssssbssHho",  # 15 cheeks
    "ohHhhhhhSsss<>sssShho",  # 16 mouth
    "ohHhHhhhhSsssssssShHo",  # 17
    "ohHhHhhhhHSSssssSohho",  # 18 chin
    "ohhHhHhhHhoSSSSSo.oHo",  # 19 neck
    "ohHlhHhlho..SSS...oho",  # 20
    "ohhHhHhhHo........oHo",  # 21
    ".ohHlhHlHo........oHo",  # 22
    "ohHhoHhHo.........oo.",  # 23
    ".oHo.oHo.............",  # 24
    "..o...o..............",  # 25
]

EYES = {
    # eyes: {} = upper row of each eye (2 chars), [] = lower row, <> = mouth
    "normal": ("se", "se", "DD"),
    "blink":  ("ss", "ee", "ss"),
    "happy":  ("ss", "ee", "mm"),
    "look":   ("es", "es", "sm"),   # looking toward camera
    "open":   ("se", "se", "mm"),   # mouth open (slurp)
    "smile":  ("se", "se", "mm"),
}


def _head_rows(expr):
    up, lo, mouth = EYES[expr]
    rows = []
    for r in HEAD_BASE:
        r = r.replace("{}", up).replace("[]", lo).replace("<>", mouth)
        rows.append(r)
    # fix widths
    w = max(len(r) for r in rows)
    return [r.ljust(w, ".") for r in rows]


_head_cache = {}


def head(expr="normal"):
    if expr not in _head_cache:
        im = sprite(_head_rows(expr), PAL)
        if expr in ("happy", "smile"):
            px = im.load()
            for bx in (8, 9, 15, 16):
                px[bx, 15] = PAL["b"]
        _head_cache[expr] = im
    return _head_cache[expr]


TORSO = [
    "......oSSo......",   # 0 neck
    "....ootWWtTo....",   # 1 collar
    "..ootyyyttTTTo..",   # 2
    ".otyyttttttTTTo.",   # 3
    ".otytttttttTTTo.",   # 4
    ".otytttttttTTTo.",   # 5
    ".otyttttttttTTo.",   # 6
    ".otyttttttttTTo.",   # 7
    ".otytttttttTTUo.",   # 8
    ".otytttttttTTUo.",   # 9
    "..otttttttTTUo..",   # 10
    "..otttttttTTUo..",   # 11
    "..oytytytyTyUo..",   # 12 ribbed hem
    "..oooooooooooo..",   # 13
    "..oppppppppPPo..",   # 14
    "..opppppppPPPo..",   # 15
]
_torso = None


def torso():
    global _torso
    if _torso is None:
        _torso = sprite(TORSO, PAL)
    return _torso


def limb(d, pts, fill, shade=None, width=3):
    pts = [(round(x), round(y)) for x, y in pts]
    d.line(pts, fill=C["ink"], width=width + 2, joint="curve")
    for p in pts:
        r = (width + 2) / 2
        d.ellipse([p[0] - r + .5, p[1] - r + .5, p[0] + r - .5, p[1] + r - .5], fill=C["ink"])
    d.line(pts, fill=fill, width=width, joint="curve")
    for p in pts[1:-1]:
        r = width / 2
        d.ellipse([p[0] - r + .5, p[1] - r + .5, p[0] + r - .5, p[1] + r - .5], fill=fill)
    if shade:
        # 1px shade along the lower/back edge
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            d.line([(x0 - 1, y0 + 1), (x1 - 1, y1 + 1)], fill=shade)
        d.line(pts, fill=fill, width=max(width - 2, 1))


def hand(d, x, y, r=2):
    x, y = round(x), round(y)
    d.ellipse([x - r - 1, y - r - 1, x + r + 1, y + r + 1], fill=C["ink"])
    d.ellipse([x - r, y - r, x + r, y + r], fill=C["skin"])
    d.point((x - 1, y + 1), fill=C["skin_d"])


def foot(d, x, y, forward=1):
    x, y = round(x), round(y)
    # slipper pointing right
    d.rectangle([x - 3, y - 3, x + 4, y], fill=C["ink"])
    d.rectangle([x - 2, y - 2, x + 4, y - 1], fill=C["sock"])
    d.point((x + 4, y), fill=(0, 0, 0, 0))
    d.line([x - 2, y - 1, x + 3, y - 1], fill=C["sock_d"])


# --------------------------------------------------------------- posing
# local frame: canvas 60x80, feet baseline at y=76, body centre x=28
CW, CH = 60, 80
BX, BY = 28, 76


def render(pose):
    """pose: dict with keys
       body_dy, head_dx, head_dy, head (expr), lean,
       arm_near, arm_far : list of 3 points (shoulder, elbow, hand) relative to (BX,BY)
       leg_near, leg_far : list of 3 points (hip, knee, ankle)
       items: list of callables(draw, img, ox, oy) drawn at stages ('back','front')
    """
    im = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ox, oy = BX, BY
    bdy = pose.get("body_dy", 0)

    def P(pts, dy=0):
        return [(ox + x, oy + y + dy) for x, y in pts]

    for it in pose.get("items_back", []):
        it(d, im, ox, oy + bdy)
    # far limbs
    limb(d, P(pose["leg_far"]), C["pants_d"], width=5)
    ax, ay = pose["leg_far"][-1]
    foot(d, ox + ax, oy + ay + 2)
    limb(d, P(pose["arm_far"], bdy), C["top_d"], width=3)
    hx_, hy_ = pose["arm_far"][-1]
    hand(d, ox + hx_, oy + hy_ + bdy, 1)
    # near leg
    limb(d, P(pose["leg_near"]), C["pants"], C["pants_d"], width=5)
    ax, ay = pose["leg_near"][-1]
    foot(d, ox + ax, oy + ay + 2)
    # torso
    tor = torso()
    paste(im, tor, ox - 8 + pose.get("torso_dx", 0), oy - 39 + bdy)
    # head
    hd = head(pose.get("head", "normal"))
    paste(im, hd, ox - 11 + pose.get("head_dx", 0), oy - 58 + bdy + pose.get("head_dy", 0))
    for it in pose.get("items_mid", []):
        it(d, im, ox, oy + bdy)
    # near arm
    limb(d, P(pose["arm_near"], bdy), C["top"], C["top_d"], width=3)
    hx_, hy_ = pose["arm_near"][-1]
    hand(d, ox + hx_, oy + hy_ + bdy, 1)
    for it in pose.get("items_front", []):
        it(d, im, ox, oy + bdy)
    if pose.get("facing", 1) < 0:
        im = flip(im)
    return im


# ------------------------------------------------------------ pose library
SH_N = (-5, -34)   # near shoulder
SH_F = (5, -34)    # far shoulder
HIP_N = (-2, -21)
HIP_F = (3, -21)


def stand(breath=0.0, expr="normal", **kw):
    b = round(math.sin(breath * 2 * math.pi) * 0.6)
    p = dict(body_dy=b, head=expr,
             arm_near=[SH_N, (-6, -26), (-5, -19)],
             arm_far=[SH_F, (7, -26), (7, -19)],
             leg_near=[HIP_N, (-2, -11), (-2, -2)],
             leg_far=[HIP_F, (3, -11), (3, -2)])
    p.update(kw)
    return p


def walk(phase, expr="normal", **kw):
    """phase in [0,1): full stride cycle (two steps)."""
    a = math.sin(phase * 2 * math.pi)
    bob = -round(abs(math.cos(phase * 2 * math.pi)) * 1.0)

    def leg(hip, s):
        lift = max(0.0, s) * 0
        kx = hip[0] + s * 4 + 1
        ky = -11
        ax = hip[0] + s * 6
        ay = -2 - (2 if (s < -0.2 and False) else 0)
        return [hip, (kx, ky), (ax, ay)]

    p = dict(body_dy=bob, head=expr,
             arm_near=[SH_N, (-6 - a * 2, -26), (-5 - a * 4, -19)],
             arm_far=[SH_F, (7 + a * 2, -26), (7 + a * 4, -19)],
             leg_near=leg(HIP_N, a), leg_far=leg(HIP_F, -a))
    p.update(kw)
    return p


def sit(expr="normal", **kw):
    # hips on the seat (y=-15 at body_dy=0)
    p = dict(body_dy=7, head=expr,
             arm_near=[SH_N, (-3, -21), (5, -20)],
             arm_far=[SH_F, (9, -22), (12, -22)],
             leg_near=[(-1, -14), (10, -14), (10, -2)],
             leg_far=[(4, -14), (14, -14), (13, -2)])
    p.update(kw)
    return p


def lerp_pose(p1, p2, t):
    out = dict(p2)
    for k in ("arm_near", "arm_far", "leg_near", "leg_far"):
        out[k] = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p1[k], p2[k])]
    for k in ("body_dy", "head_dx", "head_dy", "torso_dx"):
        out[k] = round(p1.get(k, 0) + (p2.get(k, 0) - p1.get(k, 0)) * t)
    return out
