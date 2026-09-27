"""Render the cookie-visit animation. Usage: python3 render.py out.mp4 | --still t1,t2 outdir"""
import math, os, sys, subprocess, random
from multiprocessing import Pool
import cairo
from vg import *
from rig import draw_char, default_state, CHARS, blink_eye
import scenes as sc
from timeline import *

SEAT = {"son": (650, 1010), "mom": (960, 985), "dil": (1270, 1010)}
TIN = (960, 742)


def hh(name):
    return CHARS[name]["height"]


def to_rig(name, st, wx, wy):
    k = st["s"] * hh(name)
    return ((wx - st["x"]) / k, (wy - st["y"] - st["bob"] * k) / k)


def head_top(name, st):
    k = st["s"] * hh(name)
    return (st["x"], st["y"] + (st["bob"] - 440 - 135) * k)


def mouth_world(name, st):
    k = st["s"] * hh(name)
    return (st["x"] + st["head_turn"] * 24 * k, st["y"] + (st["bob"] - 440 + 62) * k)


def speaking(name, t):
    for (t0, who, ko, en, hold) in LINES:
        n = sum(1 for ch in ko if ch != " ")
        if who == name and t0 <= t < t0 + 0.1 + n * CHAR_RATE + 0.05:
            return abs(math.sin((t - t0) * 17))
    return 0.0


def beat_bounce(t, amt=6):
    ph = (t % BEAT) / BEAT
    return -amt * max(0, math.sin(ph * math.pi)) ** 2


def cookie_item(bites_fn, r=34, seed=1):
    def f(ctx, hand):
        sc.cookie(ctx, hand[0] + 6, hand[1] - 24, r, bites_fn, 0.3, seed)
    return f


def bundle_item(dx, dy, scale=0.5, t=0):
    def f(ctx, hand):
        ctx.save(); ctx.translate(hand[0] + dx, hand[1] + dy); ctx.scale(scale / 0.92, scale / 0.92)
        sc.bojagi(ctx, 0, 60, t)
        ctx.restore()
    return f


def lerp_pt(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


# ================================================================== scenes
def scene1(ctx, t):
    ctx.save()
    cx = lerp(900, 1040, ease_io(prog(t, 0, 3.0)))
    ctx.translate(960 - cx, 0)
    sc.hallway(ctx, t, prog(t, DOOR_OPEN[0], DOOR_OPEN[1]))
    # mom walking in
    wp = prog(t, 0, 2.9)
    x = lerp(120, 1110, 1 - (1 - wp) ** 1.4 if wp < 1 else 1)
    walking = t < 2.9
    st = default_state(x=x, y=905, s=1.0, legs="walk" if walking else "stand", walk=(t / 0.6) % 1,
                       bob=-abs(math.sin(t / 0.6 * 2 * math.pi)) * 8 if walking else 0,
                       head_turn=0.45, eye_open=blink_eye(t), hair_bounce=0)
    # holding the bundle in the left hand, right arm swinging
    sw = math.sin(t / 0.6 * 2 * math.pi) if walking else 0
    st["hand_l"] = (-120, -200)
    st["item_l"] = bundle_item(10, -40, 0.5, t)
    st["hand_r"] = (130 + sw * 20, -180 - abs(sw) * 10)
    if t >= 3.0:
        bell = to_rig("mom", st, 1275, 520)
        k = ease_back(prog(t, 3.0, 3.3), 1.5)
        press = 6 if T_BELL <= t < T_BELL + 0.2 else 0
        st["hand_r"] = lerp_pt((130, -180), (bell[0] - 24 + press, bell[1]), k)
        st["head_turn"] = 0.7
        st["mouth"] = "smile"
    if t >= T_LOCK:
        st["eyes"] = "happy"; st["mouth"] = "open"; st["hand_r"] = (130, -180); st["blush"] = 0.8
    sc.draw_char(ctx, "mom", st) if False else draw_char(ctx, "mom", st)
    # onomatopoeia
    if T_BELL <= t < T_BELL + 1.0:
        k = ease_back(prog(t, T_BELL, T_BELL + 0.15), 3) * (1 - ease_in(prog(t, T_BELL + 0.8, T_BELL + 1.0)))
        ctx.save(); ctx.translate(1390, 420); ctx.scale(max(k, 1e-3), max(k, 1e-3)); ctx.rotate(-0.12)
        text(ctx, "딩동~", 0, 0, 72, hx("ff6f8a"), hx("ffffff"), 14)
        ctx.restore()
        for i in range(3):
            a = -0.9 + i * 0.6
            src(ctx, hx("ff6f8a")); ctx.set_line_width(6)
            r0 = 40 + 30 * prog(t, T_BELL, T_BELL + 0.3)
            ctx.new_path(); ctx.move_to(1275 + r0 * math.cos(a), 520 + r0 * math.sin(a))
            ctx.line_to(1275 + (r0 + 24) * math.cos(a), 520 + (r0 + 24) * math.sin(a)); ctx.stroke()
    if T_LOCK <= t < S1[1]:
        k = ease_back(prog(t, T_LOCK, T_LOCK + 0.15), 3)
        ctx.save(); ctx.translate(820, 300); ctx.scale(max(k, 1e-3), max(k, 1e-3)); ctx.rotate(0.1)
        text(ctx, "띠리릭♪" if False else "띠리릭~", 0, 0, 60, hx("4f9ed8"), hx("ffffff"), 14)
        ctx.restore()
    ctx.restore()
    # title
    if t < 3.0:
        a = ease_io(prog(t, 0.3, 0.9)) * (1 - ease_io(prog(t, 2.4, 3.0)))
        if a > 0:
            ctx.push_group()
            ctx.new_path(); rrect(ctx, 70, 70, 460, 150, 30); fs(ctx, hx("fffaf3", 0.95), OUT, 5)
            ellipse(ctx, 140, 145, 34, 34); fs(ctx, hx("ffc93c"), OUT, 4)
            for k in range(8):
                ang = k * math.pi / 4 + t
                src(ctx, hx("ffc93c")); ctx.set_line_width(6)
                ctx.move_to(140 + 44 * math.cos(ang), 145 + 44 * math.sin(ang)); ctx.line_to(140 + 56 * math.cos(ang), 145 + 56 * math.sin(ang)); ctx.stroke()
            text(ctx, "일요일 오후", 200, 122, 56, OUT, anchor="left")
            text(ctx, "Sunday afternoon", 202, 178, 34, hx("a07060"), anchor="left")
            ctx.pop_group_to_source(); ctx.paint_with_alpha(a)


def scene2(ctx, t):
    zoom, ccx, ccy = 1.06, 720, 540
    ctx.save()
    ctx.translate(960, 540); ctx.scale(zoom, zoom); ctx.translate(-ccx, -ccy)
    sc.room(ctx, t, door="open")
    sc.sunbeam(ctx, t, 0.8)
    # mom in the doorway
    raise_k = ease_back(prog(t, 7.2, 7.5), 2)
    mom = default_state(x=200, y=905, head_turn=0.5, eye_open=blink_eye(t), eyes="happy",
                        talk=speaking("mom", t), blush=0.6 + 0.3 * raise_k, mouth="smile")
    mom["bob"] = beat_bounce(t, 6) if t > 7.2 else 0
    hy = lerp(-230, -290, raise_k)
    mom["hand_l"] = (-60, hy); mom["hand_r"] = (60, hy)
    mom["item_l"] = bundle_item(60, -40 - 0 * raise_k, 0.55, t)
    draw_char(ctx, "mom", mom)
    # son and dil stepping in from the right
    sp = prog(t, 4.8, 5.3)
    son = default_state(x=lerp(820, 620, ease_out(sp)), y=915, head_turn=-0.55, legs="walk" if sp < 1 else "stand",
                        walk=(t / 0.5) % 1, eye_open=blink_eye(t + 0.4), talk=speaking("son", t), blush=0.5)
    if t >= 5.1:
        k = ease_back(prog(t, 5.1, 5.35), 2)
        son["hand_l"] = lerp_pt((-128, -176), (-190, -420), k)
        son["hand_r"] = lerp_pt((128, -176), (190, -420), k)
        son["mouth"] = "grin"; son["eyes"] = "happy" if t > 5.9 else "dot"
        son["bob"] = beat_bounce(t, 8)
    dp = prog(t, 4.95, 5.55)
    dil = default_state(x=lerp(1100, 880, ease_out(dp)), y=920, head_turn=-0.55, legs="walk" if dp < 1 else "stand",
                        walk=(t / 0.5 + 0.3) % 1, eye_open=blink_eye(t + 0.9), talk=speaking("dil", t), blush=0.6,
                        hair_bounce=3 * math.sin(t * 9) if dp < 1 else 0)
    bow = math.sin(prog(t, T_BOW, T_BOW + 0.8) * math.pi)
    if bow > 0:
        dil["bob"] = 34 * bow; dil["head_tilt"] = -0.05 * bow
        dil["eyes"] = "closed" if bow > 0.4 else "dot"
        dil["hand_l"] = (-30, -190); dil["hand_r"] = (30, -190)
    if t > T_BOW + 0.8:
        dil["mouth"] = "grin"; dil["eyes"] = "happy"
        dil["hand_l"] = (-40, -230); dil["hand_r"] = (40, -230)
    draw_char(ctx, "son", son)
    draw_char(ctx, "dil", dil)
    bubbles(ctx, t, {"son": son, "dil": dil, "mom": mom}, sides={"son": -1, "dil": 1, "mom": 1})
    ctx.restore()


def seated_states(t):
    st = {}
    for name in ("son", "mom", "dil"):
        x, y = SEAT[name]
        st[name] = default_state(x=x, y=y, show_legs=False, eye_open=blink_eye(t + {"son": 0, "mom": 0.7, "dil": 1.3}[name]),
                                 talk=speaking(name, t), head_turn={"son": 0.35, "mom": 0.0, "dil": -0.35}[name])
        spread = 175 if name == "mom" else 100
        st[name]["hand_l"] = to_rig(name, st[name], x - spread, 805)
        st[name]["hand_r"] = to_rig(name, st[name], x + spread, 805)
        st[name]["front_hands"] = True
    st["mom"]["eyes"] = "happy"
    return st


def draw_table_scene(ctx, t, st, tin_fn, burst=False):
    if burst:
        sc.burst_bg(ctx, t)
    else:
        sc.room(ctx, t, door="closed")
    for name in ("son", "mom", "dil"):
        x, y = SEAT[name]
        sc.chair_back(ctx, x, y - 470 * hh(name) + 20)
    for name in ("son", "dil", "mom"):
        draw_char(ctx, name, st[name])
    sc.table(ctx, 760)
    tin_fn(ctx)
    # hands that reach onto the table are redrawn above it
    for name in ("son", "dil", "mom"):
        s2 = dict(st[name])
        if s2.get("front_hands"):
            _front_hands(ctx, name, s2)
    if not burst:
        sc.sunbeam(ctx, t, 1.0)


def _front_hands(ctx, name, st):
    """Redraw only the arms of a character (on top of the table)."""
    c = CHARS[name]
    import rig
    ctx.save()
    k = st["s"] * c["height"]
    ctx.translate(st["x"], st["y"]); ctx.scale(max(k, 1e-3), max(k, 1e-3)); ctx.translate(0, st["bob"])
    rig._arm(ctx, c, (-92, -300), st["hand_l"], st.get("bend_l", -16), st["item_l"])
    rig._arm(ctx, c, (92, -300), st["hand_r"], st.get("bend_r", 16), st["item_r"])
    ctx.restore()


def bubbles(ctx, t, states, sides=None, scale=1.0):
    sides = sides or {"son": -1, "mom": 1, "dil": 1}
    for line in LINES:
        t0, who, ko, en, hold = line
        if who in states and t0 - 0.05 <= t <= t0 + hold + 0.3:
            x, y = head_top(who, states[who])
            sc.bubble(ctx, (x, y), ko, en, t - t0, hold, sides.get(who, 1), scale=scale)


def scene3_4(ctx, t):
    st = seated_states(t)
    # camera
    zoom = 1.12 + (1.5 - 1.12) * ease_io(prog(t, S4[0], S4[0] + 0.7))
    ccx, ccy = 960, lerp(590, 620, ease_io(prog(t, S4[0], S4[0] + 0.7)))
    shake = 0
    if T_BITE <= t < T_BITE + 0.2:
        shake = 6 * (1 - (t - T_BITE) / 0.2)
    ctx.save()
    ctx.translate(960 + shake * math.sin(t * 90), 540 + shake * math.cos(t * 70)); ctx.scale(zoom, zoom); ctx.translate(-ccx, -ccy)
    mom, son, dil = st["mom"], st["son"], st["dil"]
    # ---- unwrap (mom)
    untie = prog(t, *UNTIE); unfold = prog(t, *UNFOLD)
    knot = to_rig("mom", mom, 960, 624)
    if UNTIE[0] - 0.3 <= t < UNFOLD[1]:
        k = ease_io(prog(t, UNTIE[0] - 0.3, UNTIE[0]))
        wig = math.sin(t * 30) * 6 * (1 if t < UNTIE[1] else 0)
        spread = ease_out(unfold) * 90
        mom["hand_l"] = lerp_pt(mom["hand_l"], (knot[0] - 30 - spread, knot[1] + wig + spread * 1.3), k)
        mom["hand_r"] = lerp_pt(mom["hand_r"], (knot[0] + 30 + spread, knot[1] - wig + spread * 1.3), k)
        mom["front_hands"] = True
        mom["eyes"] = "happy"; mom["mouth"] = "smile"
    lid = prog(t, T_LID, T_LID + 0.6)
    glow = math.sin(prog(t, T_LID, T_LID + 1.6) * math.pi) if t >= T_LID else 0
    taken = 0
    if t >= GRAB[0] + 0.35:
        taken = 2
    # reactions to the reveal
    if T_LID <= t < S4[0]:
        for name in ("son", "dil"):
            s = st[name]
            s["eyes"] = "wide" if t < 12.3 else "star"
            s["mouth"] = "o" if t < 12.3 else "grin"
            s["bob"] = -12 * ease_out(prog(t, T_LID, T_LID + 0.3))
            s["blush"] = 0.8
        son["hand_l"] = (-60, -250); son["hand_r"] = (60, -250)
        dil["hand_l"] = (-60, -250); dil["hand_r"] = (60, -250)
        son["look"] = (1, 1); dil["look"] = (-1, 1)
    if 13.45 <= t < S4[0]:
        mom["hand_r"] = (10, -250); mom["mouth"] = "smile"; mom["blush"] = 0.9
    # ---- grab + bite + chew (son & dil)
    if t >= GRAB[0]:
        for name, side in (("son", 1), ("dil", -1)):
            s = st[name]
            hand_key = "hand_r" if side > 0 else "hand_l"
            rest = s[hand_key]
            tin_pt = to_rig(name, s, TIN[0] - side * 40, TIN[1] - 30)
            mw = mouth_world(name, s)
            mouth_pt = to_rig(name, s, mw[0] + side * 20, mw[1] + 34)
            if t < GRAB[0] + 0.35:
                p = lerp_pt(rest, tin_pt, ease_io(prog(t, GRAB[0], GRAB[0] + 0.35)))
                has = False
            elif t < T_BITE:
                p = lerp_pt(tin_pt, mouth_pt, ease_io(prog(t, GRAB[0] + 0.35, T_BITE - 0.15)))
                has = True
            elif t < T_REALISE:
                p = mouth_pt if t < T_BITE + 0.35 else lerp_pt(mouth_pt, (80 * side, -330), ease_io(prog(t, T_BITE + 0.35, T_BITE + 0.8)))
                has = True
            else:
                p = (80 * side, -330)
                has = True
            s[hand_key] = p
            if has:
                bites = 1 if t >= T_BITE else 0
                s["item_r" if side > 0 else "item_l"] = cookie_item(bites, 34, seed=3 if side > 0 else 5)
            s["look"] = (side * 1.0, 1.0) if t < T_BITE else (0, 0)
            if T_BITE - 0.25 <= t < T_BITE:
                s["mouth"] = "o"
            elif T_BITE <= t < T_REALISE:
                s["mouth"] = "chew"
                slow = 1 if t < T_STOP else 0.5
                s["chew_phase"] = 0.5 + 0.5 * math.sin(t * 2 * math.pi / BEAT * 2 * slow)
                s["cheeks_full"] = 1.0
                s["eyes"] = "closed"
                s["bob"] = beat_bounce(t, 5) if t < T_STOP else 0
            elif t >= T_REALISE:
                s["eyes"] = "wide"; s["mouth"] = "o"; s["brow"] = 1.0
                s["bob"] = -10 * ease_back(prog(t, T_REALISE, T_REALISE + 0.2), 3)
                s["glint"] = prog(t, T_GLINT, T_GLINT + 0.3) if t >= T_GLINT else -1
        mom["eyes"] = "happy"; mom["mouth"] = "smile"
        if t >= T_REALISE:
            mom["mouth"] = "flat"; mom["eyes"] = "dot"; mom["brow"] = 0.6    # anxious anticipation
    def tin_fn(ctx):
        if t < UNFOLD[0]:
            sc.bojagi(ctx, TIN[0], TIN[1] + 10, t, untie, 0)
        else:
            if unfold < 1:
                sc.bojagi(ctx, TIN[0], TIN[1] + 10, t, 1, unfold)
            else:
                sc.bojagi(ctx, TIN[0], TIN[1] + 10, t, 1, 1)
            sc.tin(ctx, TIN[0], TIN[1], t, lid if t >= T_LID else 0.0, glow, taken=taken)
        if T_LID <= t < T_LID + 1.8:
            rnd = random.Random(2)
            for k in range(10):
                ph = prog(t, T_LID + k * 0.08, T_LID + k * 0.08 + 0.6)
                if 0 < ph < 1:
                    a = rnd.uniform(-2.8, -0.3); d = 80 + ph * 160
                    sc.sparkle(ctx, TIN[0] + d * math.cos(a), TIN[1] - 40 + d * math.sin(a), 22 * math.sin(ph * math.pi), rot=ph * 3)
    draw_table_scene(ctx, t, st, tin_fn)
    # crumbs
    for name, side in (("son", 1), ("dil", -1)):
        mw = mouth_world(name, st[name])
        sc.crumbs(ctx, mw[0] + side * 20, mw[1] + 20, t - T_BITE, seed=side + 3)
    # "!" marks
    for name in ("son", "dil"):
        x, y = head_top(name, st[name])
        sc.exclaim(ctx, x + 70, y + 40, t - T_REALISE)
    # chomp text
    if T_BITE <= t < T_BITE + 0.8:
        k = ease_back(prog(t, T_BITE, T_BITE + 0.12), 3) * (1 - ease_in(prog(t, T_BITE + 0.6, T_BITE + 0.8)))
        for (x, y, r) in ((800, 470, -0.2), (1120, 470, 0.2)):
            ctx.save(); ctx.translate(x, y); ctx.scale(max(k, 1e-3), max(k, 1e-3)); ctx.rotate(r)
            text(ctx, "바삭!", 0, 0, 64, hx("ff8a3d"), hx("ffffff"), 14)
            ctx.restore()
    if CHEW[0] + 0.2 <= t < T_REALISE:
        for (x, y), ph in (((820, 520), 0), ((1100, 520), 0.5)):
            a = 0.6 + 0.4 * math.sin((t + ph) * 8)
            ctx.push_group()
            text(ctx, "냠냠", x, y - 10 * math.sin((t + ph) * 6), 44, hx("a07060"), hx("ffffff"), 10)
            ctx.pop_group_to_source(); ctx.paint_with_alpha(a * (1 - prog(t, T_STOP, T_STOP + 0.3)))
    bubbles(ctx, t, st, scale=0.9 if t < S4[0] else 0.8)
    ctx.restore()


def scene5(ctx, t):
    st = seated_states(t)
    tl = t - S5[0]
    zoom = 1.3
    shake = 10 * max(0, 1 - tl / 0.35)
    ctx.save()
    ctx.translate(960 + shake * math.sin(t * 80), 540 + shake * math.cos(t * 60)); ctx.scale(zoom, zoom); ctx.translate(-960, -600)
    for name, side in (("son", 1), ("dil", -1)):
        s = st[name]
        s["eyes"] = "star"; s["mouth"] = "grin"; s["blush"] = 1.0
        s["bob"] = beat_bounce(t, 14)
        up = ease_back(prog(t, S5[0], S5[0] + 0.25), 2)
        wave = math.sin(t * 2 * math.pi / BEAT) * 14
        s["hand_l"] = lerp_pt(s["hand_l"], (-175, -430 + wave), up)
        s["hand_r"] = lerp_pt(s["hand_r"], (175, -430 - wave), up)
        s["item_r" if side > 0 else "item_l"] = cookie_item(1, 34, seed=3 if side > 0 else 5)
        s["glint"] = ((t * 0.9 + (0.5 if side < 0 else 0)) % 1.6) if tl > 0.5 else -1
        s["hair_bounce"] = 6 * math.sin(t * 10)
        if speaking(name, t) > 0:
            s["talk"] = speaking(name, t)
    mom = st["mom"]
    mom["eyes"] = "happy"; mom["mouth"] = "grin"; mom["blush"] = 1.0
    mom["hand_l"] = (-112, -392); mom["hand_r"] = (112, -392)
    mom["bob"] = beat_bounce(t + 0.3, 6)

    def tin_fn(ctx):
        sc.bojagi(ctx, TIN[0], TIN[1] + 10, t, 1, 1)
        sc.tin(ctx, TIN[0], TIN[1], t, 1.0, 0.0, taken=2)
    draw_table_scene(ctx, t, st, tin_fn, burst=True)
    # hearts from mom
    for k in range(4):
        ph = ((t - S5[0]) * 0.6 + k / 4) % 1
        x = 960 + math.sin(ph * 6 + k) * 60 + (k - 1.5) * 50
        y = 420 - ph * 260
        a = math.sin(ph * math.pi)
        ctx.push_group(); sc.heart(ctx, x, y, 18 + 6 * k % 3, hx("ff6f8a")); ctx.pop_group_to_source(); ctx.paint_with_alpha(a)
    bubbles(ctx, t, st, sides={"son": -1, "dil": 1}, scale=0.85)
    ctx.restore()
    if tl < 2.3:
        a = 1 - ease_in(prog(tl, 2.0, 2.3))
        ctx.push_group(); sc.big_text(ctx, tl, 960, 170); ctx.pop_group_to_source(); ctx.paint_with_alpha(a)
    if tl < 0.15:
        src(ctx, hx("ffffff", 1 - tl / 0.15)); ctx.paint()


def scene6(ctx, t):
    st = seated_states(t)
    zoom = lerp(1.1, 1.2, ease_io(prog(t, S6[0], S6[1])))
    ctx.save()
    ctx.translate(960, 540); ctx.scale(zoom, zoom); ctx.translate(-960, -590)
    mom, son, dil = st["mom"], st["son"], st["dil"]
    mom["eyes"] = "happy"; mom["blush"] = 1.0; mom["mouth"] = "grin"
    push = math.sin(prog(t, 24.8, 25.6) * math.pi)
    tin_y = TIN[1] + 18 * ease_io(prog(t, 24.8, 25.3))
    if 24.8 <= t < 25.8:
        tp = to_rig("mom", mom, TIN[0], tin_y - 10)
        mom["hand_l"] = lerp_pt(mom["hand_l"], (tp[0] - 110, tp[1]), push)
        mom["hand_r"] = lerp_pt(mom["hand_r"], (tp[0] + 110, tp[1]), push)
    taken = 2
    for name, side in (("son", 1), ("dil", -1)):
        s = st[name]
        s["eyes"] = "happy"; s["mouth"] = "smile"; s["blush"] = 0.9
        hand_key = "hand_r" if side > 0 else "hand_l"
        item_key = "item_r" if side > 0 else "item_l"
        rest = (80 * side, -330)
        g0 = T_GRAB2 + (0.15 if side < 0 else 0)
        tin_pt = to_rig(name, s, TIN[0] - side * 40, tin_y - 30)
        mw = mouth_world(name, s)
        mouth_pt = to_rig(name, s, mw[0] + side * 20, mw[1] + 34)
        bites = 1
        if t < g0:
            p = rest; bites = 3 if t > 25.6 else 2
        elif t < g0 + 0.3:
            p = lerp_pt(rest, tin_pt, ease_io(prog(t, g0, g0 + 0.3))); bites = 0; taken = 2
        else:
            taken = 4
            cyc = (t - g0 - 0.3) % (2 * BEAT)
            if cyc < 0.35:
                p = lerp_pt(rest, mouth_pt, ease_io(cyc / 0.35))
            elif cyc < 0.6:
                p = mouth_pt
            else:
                p = lerp_pt(mouth_pt, rest, ease_io((cyc - 0.6) / 0.4))
            nbite = int((t - g0 - 0.3) / (2 * BEAT) + (1 if cyc >= 0.35 else 0))
            bites = min(nbite, 3)
            if 0.35 <= cyc < 0.9:
                s["mouth"] = "chew"; s["chew_phase"] = 0.5 + 0.5 * math.sin(t * 20); s["cheeks_full"] = 0.8
        if t < g0 + 0.3 and t >= g0:
            s[item_key] = None
        else:
            s[item_key] = cookie_item(bites, 34, seed=(3 if side > 0 else 5) + (10 if t >= g0 else 0))
        s[hand_key] = p
    if t >= T_LAUGH:
        for name in ("son", "dil", "mom"):
            s = st[name]
            lp_ = prog(t, T_LAUGH, T_LAUGH + 1.4)
            if lp_ < 1:
                s["bob"] = -abs(math.sin(t * 2 * math.pi / (BEAT / 2))) * 10
                s["mouth"] = "grin"; s["eyes"] = "happy"
                s["talk"] = speaking(name, t)
    if t > 29.8:
        for name in ("son", "dil"):
            st[name]["head_turn"] = {"son": 0.45, "dil": -0.45}[name] * ease_io(prog(t, 29.8, 30.3))

    def tin_fn(ctx):
        sc.bojagi(ctx, TIN[0], TIN[1] + 10, t, 1, 1)
        sc.tin(ctx, TIN[0], tin_y, t, 1.0, 0.0, taken=taken)
    draw_table_scene(ctx, t, st, tin_fn)
    # floating hearts from mom
    if t < 26.5:
        for k in range(5):
            ph = prog(t, 24.1 + k * 0.25, 24.1 + k * 0.25 + 1.6)
            if 0 < ph < 1:
                x = 960 + (k - 2) * 60 + math.sin(ph * 7 + k) * 20; y = 470 - ph * 240
                ctx.push_group(); sc.heart(ctx, x, y, 16 + (k % 2) * 6, hx("ff6f8a")); ctx.pop_group_to_source(); ctx.paint_with_alpha(math.sin(ph * math.pi))
    bubbles(ctx, t, st, sides={"son": -1, "mom": 1, "dil": 1}, scale=0.85)
    ctx.restore()


def scene7(ctx, t):
    import rig
    tl = t - S7[0]
    ctx.set_source(lingrad(0, 0, 0, H, [(0, hx("fff4e6")), (1, hx("ffe0cc"))])); ctx.paint()
    rnd = random.Random(4)
    for k in range(26):
        x = rnd.uniform(0, W); y = (rnd.uniform(0, H) - tl * 30) % (H + 100) - 50
        ctx.push_group(); sc.cookie(ctx, x, y, rnd.uniform(18, 30), 0, tl * 0.3 + k, seed=k); ctx.pop_group_to_source(); ctx.paint_with_alpha(0.25)
    k = ease_back(prog(tl, 0.2, 0.7), 1.8)
    ctx.save(); ctx.translate(960, 300); ctx.scale(max(k, 1e-3), max(k, 1e-3)); ctx.rotate(math.sin(tl * 2) * 0.08)
    sc.cookie(ctx, 0, 0, 120, 1, 0.2, seed=3)
    ctx.restore()
    for i in range(6):
        a = tl * 1.2 + i * math.pi / 3
        ctx.push_group(); sc.heart(ctx, 960 + 200 * math.cos(a), 300 + 150 * math.sin(a), 16, hx("ff6f8a")); ctx.pop_group_to_source(); ctx.paint_with_alpha(min(k, 1))
    # the family, popping in one by one
    for i, (name, x, turn) in enumerate((("son", 690, 0.3), ("mom", 960, 0.0), ("dil", 1230, -0.3))):
        kk = ease_back(prog(tl, 0.45 + i * 0.12, 0.8 + i * 0.12), 2.2)
        if kk <= 0:
            continue
        st = default_state(head_turn=turn, eyes="happy", mouth="grin", blush=0.9,
                           hair_bounce=3 * math.sin(tl * 6 + i))
        ctx.save(); ctx.translate(x, 600 + 6 * math.sin(tl * 5 + i)); ctx.scale(max(0.62 * kk, 1e-3), max(0.62 * kk, 1e-3))
        rig.draw_head(ctx, rig.CHARS[name], st)
        ctx.restore()
    if tl > 0.8:
        a = ease_io(prog(tl, 0.8, 1.2))
        ctx.push_group()
        text(ctx, "엄마표 쿠키", 960, 830, 104, hx("7a3a2a"), hx("ffffff"), 18)
        text(ctx, "Homemade with love", 950, 925, 50, hx("c06a50"))
        sc.heart(ctx, 1210, 927, 15, hx("ff6f8a"))
        ctx.pop_group_to_source(); ctx.paint_with_alpha(a)


# ================================================================== frame
def render_scene(t):
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    ctx.set_source_rgb(0, 0, 0); ctx.paint()
    if t < S1[1]:
        scene1(ctx, t)
    elif t < S2[1]:
        scene2(ctx, t)
    elif t < S5[0]:
        scene3_4(ctx, t)
    elif t < S5[1]:
        scene5(ctx, t)
    elif t < S7[0]:
        scene6(ctx, t)
    else:
        scene7(ctx, t)
    return surf


def frame(t):
    surf = render_scene(t)
    ctx = cairo.Context(surf)
    # crossfades: S2->S3 and S6->S7
    for (tc, prev_fn) in ((S3[0], scene2), (S7[0], scene6)):
        if tc <= t < tc + XFADE + 0.25:
            a = 1 - ease_io((t - tc) / (XFADE + 0.25))
            s2 = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
            c2 = cairo.Context(s2); prev_fn(c2, t)
            ctx.set_source_surface(s2); ctx.paint_with_alpha(a)
    # quick white wink when the door opens into the flat
    if S2[0] <= t < S2[0] + 0.12:
        src(ctx, hx("fff6e0", 1 - (t - S2[0]) / 0.12)); ctx.paint()
    # soft vignette
    ctx.set_source(radgrad(960, 540, 500, 1250, [(0, hx("000000", 0)), (1, hx("3a1a10", 0.22))])); ctx.paint()
    if t >= FADE_OUT[0]:
        src(ctx, hx("000000", ease_io(prog(t, *FADE_OUT)))); ctx.paint()
    if t < 0.4:
        src(ctx, hx("000000", 1 - ease_io(t / 0.4))); ctx.paint()
    return surf


def frame_bytes(i):
    s = frame(i / FPS)
    return bytes(s.get_data())


def main():
    if sys.argv[1] == "--still":
        for ts in sys.argv[2].split(","):
            frame(float(ts)).write_to_png(os.path.join(sys.argv[3], f"c_{float(ts):06.2f}.png"))
        return
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ff, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", sys.argv[1]]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(round(DUR * FPS))
    with Pool(4) as pool:
        for k, b in enumerate(pool.imap(frame_bytes, range(n), chunksize=4)):
            proc.stdin.write(b)
            if k % 90 == 0:
                print(f"frame {k}/{n}", flush=True)
    proc.stdin.close(); proc.wait()


if __name__ == "__main__":
    main()
