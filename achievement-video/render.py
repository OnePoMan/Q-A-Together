"""Frame renderer. Usage: python3 render.py out.mp4 [start_s end_s] | --still t out.png"""
import math, random, sys, subprocess, os
from multiprocessing import Pool
from PIL import Image, ImageDraw
from gfx import (W, H, SCALE, C, hx, paste, flip, poly, mix, glow_layer, dither_blend, prog, clamp01,
                 ease_out_back, ease_out_cubic, ease_in_out, BAYER4)
import background as bgm
import character as ch
import closeups as cu
import ui
from font import text_mask, outlined
from timeline import *

BG = bgm.build()
paste(BG, bgm.lamp(), 101, 6)
paste(BG, bgm.chair(False), 58, 160)          # empty chair (left of table)
TABLE = bgm.table()
CHAIR_R = bgm.chair(True)
TABLE_X, TABLE_Y = 82, 170
FLOOR = 192
X_PRESENT = 212

# warm light pools (static)
GLOW = Image.new("RGBA", (W, H), (0, 0, 0, 0))
GLOW.alpha_composite(glow_layer((W, H), 114, 80, 100, hx("ffd27a", 70)))
GLOW.alpha_composite(glow_layer((W, H), 286, 84, 60, hx("fff0b0", 50)))
GLOW.alpha_composite(glow_layer((W, H), 54, 70, 70, hx("ff7ad0", 40)))


# ------------------------------------------------------------------ props
def pot_side(d, x, y):
    """x centre, y bottom."""
    d.rectangle([x - 12, y - 10, x + 12, y], fill=C["ink"])
    d.rectangle([x - 11, y - 9, x + 11, y - 1], fill=cu.STEEL)
    d.rectangle([x - 11, y - 9, x + 11, y - 8], fill=cu.STEEL_L)
    d.rectangle([x + 5, y - 7, x + 10, y - 2], fill=cu.STEEL_D)
    d.line([x - 9, y - 6, x - 9, y - 3], fill=cu.STEEL_L)
    for sx in (-1, 1):
        d.rectangle([x + sx * 13 - 2, y - 8, x + sx * 13 + 2, y - 6], fill=C["ink"])
    d.rectangle([x - 13, y - 12, x + 13, y - 10], fill=C["ink"])
    d.rectangle([x - 12, y - 11, x + 12, y - 11], fill=cu.STEEL_D)


def flame_side(d, x, y, t, s):
    if s <= 0:
        return
    for k in range(-9, 10, 3):
        h = round((1.5 + 1.5 * math.sin(t * 50 + k)) * s)
        d.line([x + k, y, x + k, y - h], fill=hx("3a7bff"))
        d.point((x + k, y), fill=hx("8fe8ff"))


def steam(img, x, y, t, amount, seed=0, spread=10, height=34):
    if amount <= 0:
        return
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    n = int(14 * amount)
    for k in range(n):
        per = rnd.uniform(1.1, 1.8)
        ph = (t / per + rnd.random()) % 1
        sx = x + rnd.uniform(-spread, spread)
        px_ = sx + math.sin(ph * 6 + k) * 3
        py_ = y - ph * height
        fade = 1 - ph
        thr = (BAYER4[k % 4][int(ph * 16) % 4] + 0.5) / 16
        if fade < thr * 0.9:
            continue
        col = hx("fff6ff") if ph < 0.5 else hx("d8c8f0")
        r = 1 if ph < 0.4 else 2
        d.ellipse([px_ - r, py_ - r, px_ + r, py_ + r], fill=col)


def bowl_side(d, x, y, full=True):
    """x centre, y bottom. 16x7."""
    d.rectangle([x - 8, y - 7, x + 8, y - 5], fill=C["ink"])
    d.pieslice([x - 8, y - 12, x + 8, y], 0, 180, fill=C["ink"])
    d.pieslice([x - 7, y - 11, x + 7, y - 1], 0, 180, fill=C["white"])
    d.line([x - 7, y - 6, x + 7, y - 6], fill=cu.BROTH if full else C["white"])
    d.line([x - 6, y - 7, x + 6, y - 7], fill=cu.BROTH_L if full else C["white"])
    d.point((x - 3, y - 7), fill=cu.NOODLE); d.point((x + 2, y - 7), fill=cu.GREEN)
    d.point((x + 4, y - 8), fill=cu.EGG)
    d.line([x - 4, y - 3, x + 4, y - 3], fill=hx("3a5ae8"))


def packet_small(d, x, y, torn=False):
    d.rectangle([x - 4, y - 6, x + 4, y + 5], fill=C["ink"])
    d.rectangle([x - 3, y - (4 if torn else 5), x + 3, y + 4], fill=hx("201820"))
    d.rectangle([x - 2, y - 2, x, y + 1], fill=C["red"])
    d.point((x + 2, y - 2), fill=C["gold"]); d.point((x + 2, y), fill=C["gold"])


def heart(d, x, y, col):
    x, y = round(x), round(y)
    for dx, dy in [(-2, -1), (-1, -2), (1, -2), (2, -1), (-2, 0), (-1, -1), (0, -1), (1, -1), (2, 0), (-1, 0), (0, 0),
                   (1, 0), (-1, 1), (0, 1), (1, 1), (0, 2)]:
        d.point((x + dx, y + dy), fill=col)


def rays(img, cx, cy, t, strength):
    if strength <= 0:
        return
    # dim room with dithered dark overlay
    dither_blend(img, lambda x, y: 0.55 * strength, hx("1a0820"), (0, 0, W, H))
    d = ImageDraw.Draw(img)
    n = 14
    rot = t * 0.5
    for k in range(n):
        a0 = rot + k * 2 * math.pi / n
        a1 = a0 + math.pi / n * 0.8
        L = 420 * strength
        col = C["gold"] if k % 2 == 0 else hx("ff3d8e")
        poly(d, [(cx, cy), (cx + L * math.cos(a0), cy + L * math.sin(a0)), (cx + L * math.cos(a1), cy + L * math.sin(a1))], col)
    d.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=C["gold"])
    d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=C["gold_l"])


# ------------------------------------------------------------ character logic
def her(t):
    """Return (cx, facing, pose dict, draw_extras list of (stage, fn))."""
    beat_bob = 1 if (t % BEAT) < 0.12 else 0
    extras = []

    def blink(expr, times):
        for bt in times:
            if bt <= t < bt + 0.1:
                return "blink"
        return expr

    # ---------------- outro: seated at table eating
    if t >= WIPE2[0] + (WIPE2[1] - WIPE2[0]) / 2:
        p = ch.sit("smile")
        rest = [ch.SH_N, (6, -30), (15, -34)]
        mouth = [ch.SH_N, (1, -36), (7, -41)]
        arm = rest
        expr = "smile"
        slurping = False
        for st in SLURPS:
            if st - 0.25 <= t < st:
                k = ease_in_out((t - (st - 0.25)) / 0.25)
                arm = [(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k) for a, b in zip(rest, mouth)]
            elif st <= t < st + 0.4:
                arm = mouth; expr = "open"; slurping = True
            elif st + 0.4 <= t < st + 0.6:
                k = ease_in_out((t - st - 0.4) / 0.2)
                arm = [(b[0] + (a[0] - b[0]) * k, b[1] + (a[1] - b[1]) * k) for a, b in zip(rest, mouth)]
        if T_HEARTS <= t < T_HEARTS + 0.5 or t >= T_FINAL:
            expr = "happy"
        expr = blink(expr, [24.6, 27.2]) if expr == "smile" else expr
        p["arm_near"] = arm
        p["arm_far"] = [ch.SH_F, (10, -30), (16, -34)]
        p["head"] = expr
        if t >= T_FINAL:
            p["head_dy"] = -1
        hand = arm[-1]

        def chopsticks(d, im, ox, oy, hand=hand, slurping=slurping, t=t):
            hx_, hy_ = ox + hand[0], oy + hand[1]
            d.line([hx_ - 1, hy_ - 5, hx_ + 5, hy_ + 3], fill=hx("c46a3a"))
            d.line([hx_ + 1, hy_ - 5, hx_ + 6, hy_ + 2], fill=hx("e8904e"))
            if slurping:
                # noodles from mouth down to bowl
                for k2 in (0, 2):
                    pts = [(ox + 3 + k2, oy - 34), (ox + 6 + k2 + math.sin(t * 30) , oy - 29), (ox + 10 + k2, oy - 26)]
                    d.line(pts, fill=cu.NOODLE_DD, width=1)
                    d.line([pts[0], pts[1]], fill=cu.NOODLE)
        p["items_front"] = [chopsticks]
        return X_CHAIR, -1, p, extras

    # ---------------- sitting with phone
    if t < T_STAND:
        p = ch.sit("normal")
        p["head_dy"] = beat_bob
        p["arm_near"] = [ch.SH_N, (2, -26), (8, -30)]
        p["arm_far"] = [ch.SH_F, (10, -26), (12, -30)]
        expr = "normal"
        if BUBBLE[0] <= t < BUBBLE[1]:
            expr = "smile"
        p["head"] = blink(expr, [2.7, 3.95])

        def phone(d, im, ox, oy):
            d.rectangle([ox + 9, oy - 36, ox + 13, oy - 30], fill=C["ink"])
            d.rectangle([ox + 10, oy - 35, ox + 12, oy - 31], fill=hx("7ff8ff"))
        p["items_mid"] = [phone]
        return X_CHAIR, -1, p, extras

    # ---------------- standing up
    if t < T_STAND + STAND_DUR:
        k = ease_in_out((t - T_STAND) / STAND_DUR)
        p = ch.lerp_pose(ch.sit(), ch.stand(), k)
        p["head"] = "normal"
        return X_CHAIR, -1, p, extras
    if t < WALK[0]:
        p = ch.stand(expr="normal")
        return X_CHAIR, (-1 if t < T_TURN else 1), p, extras

    # ---------------- walk to stove
    if t < WALK[1]:
        u = (t - WALK[0]) / (WALK[1] - WALK[0])
        x = X_CHAIR + (X_STOVE - X_CHAIR) * u
        p = ch.walk(((t - WALK[0]) / (2 * 0.25)) % 1, expr="normal")
        return x, 1, p, extras

    # ---------------- at the stove
    x = X_STOVE
    SHN, SHF = ch.SH_N, ch.SH_F
    p = ch.stand(breath=t / 2, expr="normal")
    p["head_dy"] = beat_bob if t >= 8.0 else 0
    over_pot_f = [SHF, (13, -40), (19, -47)]
    over_pot_n = [SHN, (4, -38), (13, -45)]
    if t < 8.0:
        pass
    elif t < T_FIRE + 0.2:
        # reach to knob
        k = clamp01((t - 8.0) / 0.2)
        tgt = [SHF, (12, -30), (19, -27)]
        p["arm_far"] = [(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k) for a, b in zip(p["arm_far"], tgt)]
        if t >= T_KNOB:
            p["arm_far"][-1] = (19, -26)
    elif t < PACKET[0]:
        p["head"] = "smile" if t > 9.0 else "normal"
    elif t < PACKET[1] - 0.15:
        p["arm_near"] = [SHN, (2, -27), (8, -33)]
        p["arm_far"] = [SHF, (11, -28), (15, -34)]
        torn = t >= T_RIP

        def pk(d, im, ox, oy, torn=torn):
            packet_small(d, ox + 12, oy - 36, torn)
        p["items_front"] = [pk]
        if torn:
            p["head"] = "smile"
    elif t < T_EGG + 0.3:
        p["arm_far"] = list(over_pot_f)
        p["arm_near"] = list(over_pot_n)
        # shaking during seasoning
        for ts in (T_RED, T_CREAM, T_FLAKE, T_ONION):
            if ts <= t < ts + 0.3:
                j = round(math.sin((t - ts) * 60) * 1.5)
                p["arm_far"][-1] = (19, -47 + j)
                def sachet(d, im, ox, oy, j=j, ts=ts):
                    col = {T_RED: C["red"], T_CREAM: hx("f4e8d0"), T_FLAKE: hx("3aa860"), T_ONION: cu.GREEN}[ts]
                    d.rectangle([ox + 18, oy - 54 + j, ox + 22, oy - 49 + j], fill=C["ink"])
                    d.rectangle([ox + 19, oy - 53 + j, ox + 21, oy - 50 + j], fill=col)
                p["items_front"] = [sachet]
        if T_EGG - 0.3 <= t < T_EGG:
            def egg(d, im, ox, oy):
                d.ellipse([ox + 17, oy - 53, ox + 22, oy - 47], fill=C["ink"])
                d.ellipse([ox + 18, oy - 52, ox + 21, oy - 48], fill=hx("f4dcb8"))
            p["items_front"] = [egg]
        if t < T_DROP:
            pass
    elif t < STIR[1] + 0.9:
        # stir (one circle per beat)
        a = (t - STIR[0]) / BEAT * 2 * math.pi
        hx_, hy_ = 19 + 3 * math.cos(a), -47 + 1.2 * math.sin(a)
        p["arm_far"] = [SHF, (12, -40), (hx_, hy_)]
        p["arm_near"] = [SHN, (-2, -30), (3, -33)]  # hand on hip-ish
        if t >= T_ONION - 0.05 and t < T_ONION + 0.3:
            p["arm_near"] = list(over_pot_n)

        def sticks(d, im, ox, oy, hx_=hx_, hy_=hy_):
            d.line([ox + hx_ - 2, oy + hy_ - 6, ox + hx_ + 2, oy - 46], fill=hx("c46a3a"))
            d.line([ox + hx_, oy + hy_ - 7, ox + hx_ + 4, oy - 46], fill=hx("e8904e"))
        p["items_back"] = [sticks]
        p["head"] = "smile"
    elif t < T_PRESENT:
        # pour done, bowl appears at 17.5
        p["head"] = "smile"
        if t >= T_SERVE:
            p["arm_near"] = [SHN, (2, -28), (8, -34)]
            p["arm_far"] = [SHF, (11, -28), (16, -34)]
            def bw(d, im, ox, oy):
                bowl_side(d, ox + 12, oy - 32)
            p["items_front"] = [bw]
            extras.append(("steam_bowl", (x + 12, FLOOR - 44)))
    else:
        # presenting the bowl: hop away from the stove, then lift it on the downbeat of 20.0
        hp = clamp01((t - T_PRESENT) / 0.4)
        x = X_STOVE + (X_PRESENT - X_STOVE) * ease_in_out(hp)
        if hp < 1:
            p["body_dy"] = -round(5 * math.sin(hp * math.pi))
            for leg in ("leg_near", "leg_far"):
                p[leg] = [(a, b - round(5 * math.sin(hp * math.pi))) for a, b in p[leg]]
        k = ease_out_back(clamp01((t - 19.4) / 0.6), 1.4) if t >= 19.4 else 0
        bx_, by_ = 12 + 5 * k, -32 - 11 * k
        p["arm_near"] = [SHN, (2 + 2 * k, -28 - 6 * k), (bx_ - 4, by_ - 2)]
        p["arm_far"] = [SHF, (11 + 2 * k, -28 - 6 * k), (bx_ + 4, by_ - 2)]
        p["head"] = "happy" if t >= T_ACH else "smile"
        if t >= T_ACH:
            p["head_dy"] = beat_bob
            p["body_dy"] = -beat_bob
        def bw(d, im, ox, oy, by_=by_, bx_=bx_):
            bowl_side(d, ox + bx_, oy + by_)
        p["items_front"] = [bw]
        extras.append(("steam_bowl", (x + bx_, FLOOR + by_ - 10)))
    return x, 1, p, extras


def place_char(img, cx, facing, pose):
    pose = dict(pose)
    pose["facing"] = facing
    spr = ch.render(pose)
    if facing > 0:
        paste(img, spr, cx - ch.BX, FLOOR - ch.BY)
    else:
        paste(img, spr, cx - (ch.CW - 1 - ch.BX), FLOOR - ch.BY)


# ------------------------------------------------------------ room scene
def room(t):
    img = BG.copy()
    d = ImageDraw.Draw(img)
    outro = t >= (WIPE2[0] + WIPE2[1]) / 2
    # neon flicker in window
    if int(t * 7) % 9 == 0:
        d.line([41, 86, 51, 86], fill=hx("6a2a6a"))
    # rays behind her during the achievement build-up
    if not outro and t >= 19.0:
        s = ease_out_cubic(clamp01((t - 19.0) / 1.0)) if t < T_ACH else 1.0
        s = s * (1 - clamp01((t - 23.6) / 0.4))
        rays(img, X_PRESENT + 4, 156, t, s)
    # pot + flame + steam
    fl = 0.0
    if not outro and T_FIRE <= t < BOWL[0] + 0.5:
        fl = clamp01((t - T_FIRE) / 0.15)
    flame_side(d, 273, 155, t, fl)
    pot_side(d, 273, 155)
    boil = clamp01((t - T_BUBBLES) / 1.0) if not outro else 0.3
    if not outro and t >= BOWL[0] + 0.5:
        boil = max(0, 1 - (t - BOWL[0] - 0.5))
    steam(img, 273, 142, t, boil, seed=2)
    # her chair (scoots back when she stands)
    scoot = round(6 * ease_out_cubic(clamp01((t - T_STAND) / 0.2))) if t >= T_STAND and not outro else 0
    paste(img, CHAIR_R, X_CHAIR - 14 + scoot, 160)
    cx, facing, pose, extras = her(t)
    place_char(img, cx, facing, pose)
    paste(img, TABLE, TABLE_X, TABLE_Y)
    d = ImageDraw.Draw(img)
    if outro:
        bowl_side(d, 128, 171)
        steam(img, 128, 162, t, 0.8, seed=5, spread=5, height=26)
        # hearts
        if T_HEARTS <= t < T_HEARTS + 1.2:
            for k in range(3):
                ph = (t - T_HEARTS - k * 0.12) / 0.9
                if 0 <= ph <= 1:
                    heart(d, cx - 6 + k * 7 + math.sin(ph * 8 + k) * 2, 136 - ph * 26, C["red_l"] if k % 2 else hx("ff5fa8"))
        # music notes after final chord
        if t >= T_FINAL:
            for k in range(3):
                ph = ((t - T_FINAL) * 0.8 + k / 3) % 1
                m = text_mask("~", 1)
                paste(img, outlined(m, C["gold"] if k % 2 else C["white"], C["ink"]),
                      cx - 14 + k * 9 + math.sin(ph * 6) * 2, 132 - ph * 22)
    for kind, pos in extras:
        if kind == "steam_bowl":
            steam(img, pos[0], pos[1], t, 0.7, seed=9, spread=4, height=20)
    # thought bubble
    if BUBBLE[0] <= t < BUBBLE[1]:
        k = ease_out_back(clamp01((t - BUBBLE[0]) / 0.12))
        k *= 1 - clamp01((t - (BUBBLE[1] - 0.1)) / 0.1)
        if k > 0.05:
            bx, by = 166, 114
            w2, h2 = 18 * k, 13 * k
            d.ellipse([130 + 2, 136, 134 + 2, 140], fill=C["ink"]); d.ellipse([131 + 2, 137, 133 + 2, 139], fill=C["white"])
            d.ellipse([137, 128, 143, 134], fill=C["ink"]); d.ellipse([138, 129, 142, 133], fill=C["white"])
            d.rounded_rectangle([bx - w2 - 1, by - h2 - 1, bx + w2 + 1, by + h2 + 1], 6, fill=C["ink"])
            d.rounded_rectangle([bx - w2, by - h2, bx + w2, by + h2], 6, fill=C["white"])
            if k > 0.8:
                ic = ui.bowl_icon(1)
                paste(img, ic, bx - ic.width // 2, by - ic.height // 2)
    # warm light
    img.alpha_composite(GLOW)
    return img


# ------------------------------------------------------------ cooking panel
def pot_state(t):
    st = dict(flame=clamp01((t - T_FIRE) / 0.15),
              boil=clamp01((t - T_BUBBLES) / 1.0),
              broth=clamp01((t - T_RED - 0.1) / 0.7),
              noodle=1 if t >= T_DROP - 0.12 else 0,
              noodle_scale=1 + 0.8 * (1 - clamp01((t - (T_DROP - 0.12)) / 0.12)),
              splash=clamp01((t - T_DROP) / 0.35) if T_DROP <= t < T_DROP + 0.35 else 0,
              flakes=clamp01((t - T_CREAM - 0.1) / 0.8),
              egg=1 if t >= T_EGG else 0, egg_scale=1 + 0.4 * (1 - clamp01((t - T_EGG) / 0.08)),
              loosen=clamp01((t - STIR[0]) / 1.5),
              stir_ang=(t - STIR[0]) / BEAT * 2 * math.pi if t >= STIR[0] else 0,
              chop=1 if STIR[0] <= t < STIR[1] else 0,
              onion=clamp01((t - T_ONION - 0.2) / 0.2))
    if T_EGG <= t < T_EGG + 0.3:
        st["splash"] = max(st["splash"], 0.3 + (t - T_EGG) / 0.3 * 0.5)
    return st


def panel_content(t):
    if PACKET[0] <= t < PACKET[1]:
        rip = clamp01((t - T_RIP) / 0.3) if t >= T_RIP else 0
        return cu.packet_closeup(t, rip, t - PACKET[0])
    if BOARD[0] <= t < BOARD[1]:
        return cu.board_closeup(t, CHOPS)
    if BOWL[0] <= t < BOWL[1] + 0.2:
        fill = clamp01((t - POUR[0]) / (POUR[1] - POUR[0]))
        garn = 1 if t >= T_SERVE - 0.2 else 0
        im = cu.bowl_closeup(t, fill, garn, t - BOWL[0])
        if t >= T_SERVE:
            d = ImageDraw.Draw(im)
            rnd = random.Random(4)
            for k in range(10):
                st = T_SERVE + rnd.uniform(0, 0.4)
                ph = (t - st) / 0.35
                if 0 <= ph <= 1:
                    cu.sparkle(d, rnd.uniform(30, 170), rnd.uniform(20, 140), 1 + 3 * math.sin(ph * math.pi), C["white"])
        return im
    st = pot_state(t)
    im = cu.pot_closeup(t, st)
    cx, cy = cu.PW // 2, cu.PH // 2 + 4
    for t0, kind in ((T_RED - 0.05, "red"), (T_CREAM - 0.05, "cream"), (T_FLAKE - 0.05, "flake"), (T_ONION - 0.05, "onion")):
        cu.falling_particles(im, t, t0, kind, cx, cy)
    d = ImageDraw.Draw(im)
    # egg falling / shell halves
    if T_EGG - 0.2 <= t < T_EGG:
        p = (t - (T_EGG - 0.2)) / 0.2
        ex, ey = cx + 16, cy - 12 - (1 - p) * 70
        d.ellipse([ex - 8, ey - 10, ex + 8, ey + 10], fill=C["ink"])
        d.ellipse([ex - 7, ey - 9, ex + 7, ey + 9], fill=hx("f4dcb8"))
        d.line([ex - 4, ey - 6, ex - 4, ey - 2], fill=C["white"])
    if T_EGG <= t < T_EGG + 0.35:
        p = (t - T_EGG) / 0.35
        for sgn in (-1, 1):
            sx = cx + 16 + sgn * (8 + p * 40); sy = cy - 30 - p * 20 + p * p * 40
            d.pieslice([sx - 7, sy - 7, sx + 7, sy + 7], 0 if sgn > 0 else 180, 180 if sgn > 0 else 360, fill=hx("f4dcb8"))
    # timer icon while stirring
    if STIR[0] <= t < STIR[1]:
        tx, ty = cu.PW - 24, 20
        d.ellipse([tx - 12, ty - 12, tx + 12, ty + 12], fill=C["ink"])
        d.ellipse([tx - 10, ty - 10, tx + 10, ty + 10], fill=C["white"])
        frac = (t - STIR[0]) / (STIR[1] - STIR[0])
        d.pieslice([tx - 8, ty - 8, tx + 8, ty + 8], -90, -90 + 360 * frac, fill=C["red"])
        a = -math.pi / 2 + frac * 2 * math.pi * 4
        d.line([tx, ty, tx + 7 * math.cos(a), ty + 7 * math.sin(a)], fill=C["ink"], width=2)
    # quick splash on noodle drop handled by state
    return im


def cooking_panel(img, t):
    if not (PANEL[0] <= t < PANEL[1]):
        return
    enter = clamp01((t - PANEL[0]) / 0.16)
    leave = clamp01((t - (PANEL[1] - 0.16)) / 0.16)
    dx = -240 * (1 - ease_out_back(enter, 1.8)) - 260 * ease_out_cubic(leave)
    quad = [(14, 20), (206, 10), (200, 178), (8, 188)]
    Q = lambda ext=0, off=(0, 0): [(x + dx + off[0] + (-ext if i in (0, 3) else ext),
                                     y + off[1] + (-ext if i in (0, 1) else ext)) for i, (x, y) in enumerate(quad)]
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    poly(ld, Q(5, (7, 7)), C["red"])
    poly(ld, Q(5), C["black"])
    poly(ld, Q(3), C["white"])
    poly(ld, Q(0), C["black"])
    content = panel_content(t)
    # flash on content switch
    for ts in (PACKET[0], PACKET[1], BOARD[0], BOARD[1], BOWL[0]):
        if ts <= t < ts + 0.05:
            content = Image.new("RGBA", content.size, C["white"])
    mask = Image.new("L", (W, H), 0)
    poly(ImageDraw.Draw(mask), Q(0), 255)
    cl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    paste(cl, content, 10 + dx, 18)
    layer.paste(cl, (0, 0), mask)
    img.alpha_composite(layer)
    # label
    cur = None
    for lt, txt in LABELS:
        if t >= lt:
            cur = (lt, txt)
    if cur and leave < 1:
        ui.draw_ransom(img, cur[1], 18 + dx, 184, t - cur[0], scale=3, seed=hash(cur[1]) % 1000, stagger=0.03)


def menu_banner(img, t):
    if not (PANEL[0] + 0.1 <= t < PANEL[1]):
        return
    enter = clamp01((t - PANEL[0] - 0.1) / 0.2)
    leave = clamp01((t - (PANEL[1] - 0.2)) / 0.2)
    dx = 200 * (1 - ease_out_cubic(enter)) + 220 * ease_out_cubic(leave)
    x0 = 222 + dx
    d = ImageDraw.Draw(img)
    poly(d, [(x0 + 6, 6), (W + 10, 4), (W + 10, 32), (x0, 34)], C["white"])
    poly(d, [(x0 + 8, 8), (W + 10, 6), (W + 10, 30), (x0 + 3, 32)], C["black"])
    m = text_mask("TONIGHT'S MENU", 1)
    paste(img, outlined(m, C["red"], C["black"]), x0 + 12, 9)
    m = text_mask("SHIN RAMYUN BLACK", 1)
    paste(img, outlined(m, C["white"], C["black"]), x0 + 12, 20)
    icon = ui.bowl_icon(1)
    paste(img, icon, x0 + 128, 12)


# ------------------------------------------------------------ shake
SHAKES = [(T_SAT, 3), (T_DOT, 2), (sum(WIPE1) / 2, 2), (T_STAND, 1), (CUT1[0], 2), (T_LETSCOOK, 3),
          (PANEL[0], 3), (T_ACH, 4), (T_STAT + STAT_FILL, 3), (sum(WIPE2) / 2, 2), (T_FINAL, 2), (T_DROP, 2),
          (T_EGG, 2)] + [(lt, 1) for lt, _ in LABELS]


def shake_offset(t):
    ox = oy = 0.0
    for ts, amp in SHAKES:
        dt = t - ts
        if 0 <= dt < 0.2:
            e = amp * math.exp(-dt * 18)
            ox += e * math.sin(dt * 90 + ts)
            oy += e * math.cos(dt * 110 + ts * 2)
    return round(ox), round(oy)


# ------------------------------------------------------------ frame
def frame(t):
    mid1 = sum(WIPE1) / 2
    if t < mid1:
        img = Image.new("RGBA", (W, H), C["black"])
        ui.title_card(img, t, T_SAT, T_DOT, T_EVEN, EVEN_GAP)
    else:
        img = room(t)
    # cut-in 1
    if CUT1[0] <= t < CUT1[1]:
        g = (t - T_GLINT) / 0.25
        por = cu.portrait("normal", glint=g if 0 <= g <= 1 else -1)
        ui.cutin(img, t - CUT1[0], CUT1[1] - CUT1[0], por, "LET'S COOK!", T_LETSCOOK - CUT1[0], seed=5)
        if T_GLINT + 0.2 <= t < T_GLINT + 0.45:
            ph = (t - T_GLINT - 0.2) / 0.25
            d = ImageDraw.Draw(img)
            sx = W // 2 - 60 + 40 + 18 + 78 - int((t - CUT1[0]) * 14); sy = 100 - 45 + 6 + 4 + 40
            cu.sparkle(d, sx, sy, 2 + 6 * math.sin(ph * math.pi), C["white"])
    cooking_panel(img, t)
    menu_banner(img, t)
    ui.achievement(img, t - T_ACH, ACH_LETTER0, ACH_GAP, ACH_SHINE, ACH_DUR)
    ui.stat_up(img, t - T_STAT, STAT_FILL, STAT_DUR)
    if CUT2[0] <= t < CUT2[1]:
        tl = t - CUT2[0]
        por = cu.portrait("slurp" if tl < 0.45 else "happy")
        ui.cutin(img, tl, CUT2[1] - CUT2[0], por, "SO GOOD!", 0.5, seed=8, y_mid=96, tilt=14)
    for a, b in (WIPE1, WIPE2):
        if a <= t < b:
            ui.shards(img, (t - a) / (b - a), seed=1 if a == WIPE1[0] else 2)
    if t >= IRIS[0]:
        ui.iris(img, clamp01((t - IRIS[0]) / (IRIS[1] - IRIS[0])), X_CHAIR - 2, 150)
    ox, oy = shake_offset(t)
    if ox or oy:
        out = Image.new("RGBA", (W, H), C["black"])
        out.alpha_composite(img, (max(ox, 0), max(oy, 0)), (max(-ox, 0), max(-oy, 0)))
        img = out
    return img


def frame_bytes(i):
    t = i / FPS
    im = frame(t).convert("RGB").resize((W * SCALE, H * SCALE), Image.NEAREST)
    return im.tobytes()


def main():
    if sys.argv[1] == "--still":
        for ts in sys.argv[2].split(","):
            frame(float(ts)).convert("RGB").resize((W * 3, H * 3), Image.NEAREST).save(
                os.path.join(sys.argv[3], f"f_{float(ts):06.2f}.png"))
        return
    out = sys.argv[1]
    t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0
    t1 = float(sys.argv[3]) if len(sys.argv) > 3 else DUR
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ff, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W * SCALE}x{H * SCALE}",
           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-tune", "animation",
           "-pix_fmt", "yuv420p", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    idx = range(int(round(t0 * FPS)), int(round(t1 * FPS)))
    with Pool(4) as pool:
        for n, b in enumerate(pool.imap(frame_bytes, idx, chunksize=4)):
            proc.stdin.write(b)
            if n % 60 == 0:
                print(f"frame {n}/{len(idx)}", flush=True)
    proc.stdin.close()
    proc.wait()


if __name__ == "__main__":
    main()
