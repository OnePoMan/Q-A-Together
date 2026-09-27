"""Vector drawing helpers on top of pycairo."""
import math
import cairo

W, H = 1920, 1080
OUT = (0.23, 0.14, 0.13)       # warm dark outline
LW = 5.0


def hx(s, a=1.0):
    s = s.lstrip("#")
    return (int(s[0:2], 16) / 255, int(s[2:4], 16) / 255, int(s[4:6], 16) / 255, a)


def mix(c1, c2, t):
    return tuple(c1[i] + (c2[i] - c1[i]) * t for i in range(4))


def src(ctx, c):
    if len(c) == 3:
        ctx.set_source_rgb(*c)
    else:
        ctx.set_source_rgba(*c)


def fs(ctx, fill, outline=OUT, lw=LW):
    """fill + stroke the current path."""
    if fill is not None:
        src(ctx, fill)
        if outline is not None:
            ctx.fill_preserve()
        else:
            ctx.fill()
    if outline is not None:
        src(ctx, outline)
        ctx.set_line_width(lw)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.stroke()


def ellipse(ctx, x, y, rx, ry, rot=0.0):
    ctx.save()
    ctx.translate(x, y)
    if rot:
        ctx.rotate(rot)
    ctx.scale(max(rx, 0.01), max(ry, 0.01))
    ctx.new_sub_path()
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.restore()


def rrect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 3 * math.pi / 2)
    ctx.close_path()


def smooth_closed(ctx, pts, tension=0.5):
    """Closed Catmull-Rom spline through pts."""
    n = len(pts)
    ctx.move_to(*pts[0])
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3)
        ctx.curve_to(*c1, *c2, *p2)
    ctx.close_path()


def smooth_open(ctx, pts, tension=0.5):
    n = len(pts)
    ctx.move_to(*pts[0])
    for i in range(n - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < n else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3)
        ctx.curve_to(*c1, *c2, *p2)


def lingrad(x0, y0, x1, y1, stops):
    g = cairo.LinearGradient(x0, y0, x1, y1)
    for t, c in stops:
        g.add_color_stop_rgba(t, *c if len(c) == 4 else (*c, 1))
    return g


def radgrad(x, y, r0, r1, stops):
    g = cairo.RadialGradient(x, y, r0, x, y, r1)
    for t, c in stops:
        g.add_color_stop_rgba(t, *c if len(c) == 4 else (*c, 1))
    return g


def text(ctx, s, x, y, size, fill, outline=None, olw=8, anchor="center", font="Jua"):
    ctx.select_font_face(font)
    ctx.set_font_size(size)
    ext = ctx.text_extents(s)
    if anchor == "center":
        tx = x - ext.width / 2 - ext.x_bearing
    elif anchor == "left":
        tx = x
    else:
        tx = x - ext.width - ext.x_bearing
    ty = y - ext.height / 2 - ext.y_bearing
    ctx.new_path()
    ctx.move_to(tx, ty)
    ctx.text_path(s)
    if outline is not None:
        src(ctx, outline)
        ctx.set_line_width(olw)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.stroke_preserve()
    src(ctx, fill)
    ctx.fill()
    return ext.x_advance


def text_width(ctx, s, size, font="Jua"):
    ctx.select_font_face(font)
    ctx.set_font_size(size)
    return ctx.text_extents(s).x_advance


# easing
def clamp01(t):
    return max(0.0, min(1.0, t))


def prog(t, a, b):
    return clamp01((t - a) / (b - a))


def ease_io(t):
    t = clamp01(t)
    return t * t * (3 - 2 * t)


def ease_out(t):
    t = clamp01(t)
    return 1 - (1 - t) ** 3


def ease_in(t):
    t = clamp01(t)
    return t ** 3


def ease_back(t, s=1.70158):
    t = clamp01(t) - 1
    return t * t * ((s + 1) * t + s) + 1


def ease_elastic(t):
    t = clamp01(t)
    if t in (0, 1):
        return t
    return 2 ** (-10 * t) * math.sin((t * 10 - 0.75) * (2 * math.pi) / 3) + 1


def lerp(a, b, t):
    return a + (b - a) * t


def lerp2(p, q, t):
    return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
