"""Static apartment background (dining nook + kitchen) at 384x216."""
import math, random
from PIL import Image, ImageDraw
from gfx import W, H, C, hx, mix, dither_vgrad, dither_blend, sprite, paste, poly

P = {
    "wall": hx("4a2470"), "wall_d": hx("3a1a5c"), "wall_l": hx("5c2f86"),
    "trim": hx("2a1344"), "base": hx("ff4f8b"), "base_d": hx("c4306a"),
    "floor": hx("a64a4a"), "floor_d": hx("7e3440"), "floor_l": hx("c8645a"), "floor_seam": hx("5e2438"),
    "rug": hx("ffb13b"), "rug_d": hx("e0782a"), "rug_c": hx("ff5f8f"),
    "sky0": hx("2a1660"), "sky1": hx("6a2a8e"), "sky2": hx("d23c86"), "sky3": hx("ff7a4a"), "sky4": hx("ffc05a"),
    "city": hx("2c1648"), "city_d": hx("1d0e33"), "city_l": hx("3e2064"),
    "win_lit": hx("ffd76a"), "win_cy": hx("5ff2ff"),
    "frame": hx("f4e4d8"), "frame_d": hx("c7a9b8"),
    "curt": hx("ff3d6e"), "curt_d": hx("c0184c"), "curt_l": hx("ff8aa6"),
    "wood": hx("c46a3a"), "wood_d": hx("8a4128"), "wood_l": hx("e8904e"), "wood_dd": hx("5c2a1e"),
    "cab": hx("ff6f91"), "cab_d": hx("d4456e"), "cab_l": hx("ffa3b8"),
    "tile": hx("fdf1e4"), "tile_g": hx("58d6c8"), "tile_s": hx("e8d2c8"),
    "counter": hx("2fd3c0"), "counter_d": hx("1c9a95"), "counter_l": hx("9ff5e6"),
    "steel": hx("c9cfe0"), "steel_d": hx("8a8fb0"), "steel_dd": hx("5a5a84"), "steel_l": hx("f2f4ff"),
    "fridge": hx("ffe066"), "fridge_d": hx("e0b43a"), "fridge_l": hx("fff4b0"),
    "plant": hx("3ddc84"), "plant_d": hx("1f9a5c"), "pot_t": hx("ff8a3d"),
    "lamp": hx("ffd24a"), "lamp_d": hx("e8962a"),
}


def build():
    rnd = random.Random(7)
    im = Image.new("RGBA", (W, H), P["wall"])
    d = ImageDraw.Draw(im)

    # ---- wall: subtle vertical wallpaper stripes + ceiling trim
    for x in range(0, W, 12):
        d.rectangle([x, 0, x + 5, 172], fill=P["wall_d"])
    for x in range(0, W, 12):
        for y in range(8, 172, 14):
            d.point((x + 8, y), fill=P["wall_l"])
            d.point((x + 2, y + 7), fill=P["wall_l"])
    d.rectangle([0, 0, W, 5], fill=P["trim"])
    d.rectangle([0, 6, W, 6], fill=P["wall_l"])

    # ---- floor
    d.rectangle([0, 172, W, H], fill=P["floor"])
    for i, y in enumerate(range(176, H, 7)):
        d.line([0, y, W, y], fill=P["floor_seam"])
        d.line([0, y + 1, W, y + 1], fill=P["floor_l"])
        off = (i * 23) % 40
        for x in range(off, W, 40 + (i % 3) * 6):
            d.line([x, y + 1, x, y + 6], fill=P["floor_seam"])
    # baseboard
    d.rectangle([0, 166, W, 172], fill=P["base"])
    d.line([0, 166, W, 166], fill=P["cab_l"])
    d.line([0, 172, W, 172], fill=P["base_d"])
    d.line([0, 173, W, 173], fill=P["floor_d"])

    # ---- rug under table (ellipse, dithered border)
    d.ellipse([52, 184, 176, 204], fill=P["rug_d"])
    d.ellipse([56, 186, 172, 202], fill=P["rug"])
    d.ellipse([74, 189, 154, 199], fill=P["rug_c"])
    d.ellipse([92, 192, 136, 196], fill=P["rug"])
    for a in range(0, 360, 20):
        x = 114 + 60 * math.cos(math.radians(a)); y = 194 + 10 * math.sin(math.radians(a))
        d.point((round(x), round(y)), fill=P["floor_l"])

    # ---- window
    wx0, wy0, wx1, wy1 = 16, 28, 92, 110
    d.rectangle([wx0 - 4, wy0 - 4, wx1 + 4, wy1 + 4], fill=P["frame_d"])
    d.rectangle([wx0 - 3, wy0 - 3, wx1 + 3, wy1 + 3], fill=P["frame"])
    dither_vgrad(im, (wx0, wy0, wx1 + 1, wy1 + 1),
                 [(0, P["sky0"]), (0.3, P["sky1"]), (0.55, P["sky2"]), (0.78, P["sky3"]), (1, P["sky4"])])
    # stars
    for _ in range(14):
        x = rnd.randint(wx0 + 2, wx1 - 2); y = rnd.randint(wy0 + 2, wy0 + 26)
        d.point((x, y), fill=C["white"] if rnd.random() < .5 else P["sky2"])
    # crescent moon
    d.ellipse([72, 34, 83, 45], fill=hx("fff2c4"))
    d.ellipse([75, 32, 86, 43], fill=P["sky0"])
    # far skyline
    x = wx0
    while x < wx1:
        bw = rnd.randint(6, 12); bh = rnd.randint(18, 40)
        d.rectangle([x, wy1 - bh, x + bw, wy1], fill=P["city_l"])
        x += bw + 1
    # near skyline with lit windows
    x = wx0 - 2
    while x < wx1:
        bw = rnd.randint(9, 16); bh = rnd.randint(14, 32)
        d.rectangle([x, wy1 - bh, x + bw, wy1], fill=P["city"])
        d.line([x, wy1 - bh, x + bw, wy1 - bh], fill=P["city_l"])
        for yy in range(wy1 - bh + 3, wy1 - 1, 4):
            for xx in range(x + 2, x + bw - 1, 3):
                if rnd.random() < 0.38:
                    d.point((xx, yy), fill=P["win_lit"] if rnd.random() < .75 else P["win_cy"])
        x += bw + 1
    # neon sign on a building
    d.rectangle([40, 84, 52, 90], fill=P["city_d"])
    d.line([41, 86, 51, 86], fill=hx("ff4fd8"))
    d.line([41, 88, 51, 88], fill=hx("5ff2ff"))
    # mullions
    mx = (wx0 + wx1) // 2
    d.rectangle([mx - 1, wy0, mx + 1, wy1], fill=P["frame"])
    d.rectangle([wx0, 66, wx1, 67], fill=P["frame"])
    # sill
    d.rectangle([wx0 - 7, wy1 + 4, wx1 + 7, wy1 + 8], fill=P["frame"])
    d.line([wx0 - 7, wy1 + 8, wx1 + 7, wy1 + 8], fill=P["frame_d"])
    # small cactus on sill
    d.rectangle([22, wy1 - 2, 30, wy1 + 3], fill=P["pot_t"])
    d.rectangle([24, wy1 - 11, 28, wy1 - 2], fill=P["plant"])
    d.line([24, wy1 - 11, 24, wy1 - 2], fill=P["plant_d"])
    d.rectangle([21, wy1 - 8, 22, wy1 - 5], fill=P["plant"])
    d.rectangle([30, wy1 - 9, 31, wy1 - 6], fill=P["plant"])
    # curtains
    for side in (0, 1):
        cx0 = wx0 - 10 if side == 0 else wx1 - 2
        for i in range(12):
            col = P["curt"] if (i // 3) % 2 == 0 else P["curt_d"]
            if i % 3 == 0:
                col = P["curt_l"] if side == 0 else P["curt_d"]
            xx = cx0 + i
            sway = int(2 * math.sin(i * 0.9))
            d.line([xx, wy0 - 8, xx + sway, wy1 + 14], fill=col)
        d.rectangle([cx0 + 1, 82, cx0 + 11, 84], fill=C["gold"])
    d.rectangle([wx0 - 14, wy0 - 10, wx1 + 14, wy0 - 8], fill=C["gold_d"])
    d.ellipse([wx0 - 16, wy0 - 11, wx0 - 12, wy0 - 7], fill=C["gold"])
    d.ellipse([wx1 + 12, wy0 - 11, wx1 + 16, wy0 - 7], fill=C["gold"])

    # ---- poster (P5-ish red/black star) and clock
    px0, py0 = 128, 34
    d.rectangle([px0, py0, px0 + 30, py0 + 42], fill=C["black"])
    d.rectangle([px0 + 2, py0 + 2, px0 + 28, py0 + 40], fill=C["red"])
    poly(d, [(px0 + 2, py0 + 30), (px0 + 28, py0 + 14), (px0 + 28, py0 + 22), (px0 + 2, py0 + 38)], C["black"])
    star = []
    for k in range(10):
        r = 9 if k % 2 == 0 else 4
        a = -math.pi / 2 + k * math.pi / 5
        star.append((px0 + 15 + r * math.cos(a), py0 + 16 + r * math.sin(a)))
    poly(d, star, C["white"])
    d.rectangle([px0 + 5, py0 + 33, px0 + 16, py0 + 34], fill=C["white"])

    # ---- kitchen: backsplash tiles
    kx0, kx1 = 190, 334
    d.rectangle([kx0, 92, kx1, 156], fill=P["tile"])
    for y in range(92, 156, 6):
        d.line([kx0, y, kx1, y], fill=P["tile_g"])
    for j, y in enumerate(range(92, 156, 6)):
        for x in range(kx0 + (3 if j % 2 else 0), kx1, 6):
            d.line([x, y, x, y + 6], fill=P["tile_g"])
    # upper cabinets
    d.rectangle([kx0, 26, kx1, 76], fill=P["cab_d"])
    for i, cx in enumerate(range(kx0, kx1, 36)):
        if 256 < cx + 18 < 316:
            continue
        d.rectangle([cx + 1, 27, cx + 34, 74], fill=P["cab"])
        d.rectangle([cx + 4, 30, cx + 31, 71], fill=P["cab_l"])
        d.rectangle([cx + 5, 31, cx + 30, 70], fill=P["cab"])
        hxp = cx + 30 if i % 2 == 0 else cx + 5
        d.rectangle([hxp - 1, 62, hxp, 67], fill=C["gold"])
    d.rectangle([kx0 - 2, 76, kx1 + 2, 78], fill=P["cab_d"])
    # open shelf with jars where the hood sits
    # range hood
    hood = [(262, 48), (310, 48), (318, 78), (254, 78)]
    poly(d, hood, P["steel"])
    d.rectangle([272, 26, 300, 48], fill=P["steel_d"])
    d.rectangle([274, 26, 298, 48], fill=P["steel"])
    d.line([254, 78, 318, 78], fill=P["steel_dd"])
    d.line([262, 48, 310, 48], fill=P["steel_l"])
    d.rectangle([262, 79, 310, 80], fill=P["steel_dd"])
    d.rectangle([270, 81, 302, 81], fill=hx("ffe7a6"))  # hood light
    # utensil rail + hanging tools
    d.line([200, 86, 250, 86], fill=P["steel_dd"])
    tools = [(206, "ladle"), (216, "spat"), (226, "whisk"), (238, "ladle")]
    for tx, kind in tools:
        d.line([tx, 86, tx, 100], fill=P["steel_d"])
        if kind == "ladle":
            d.ellipse([tx - 3, 99, tx + 3, 104], fill=P["steel"])
        elif kind == "spat":
            d.rectangle([tx - 2, 98, tx + 2, 105], fill=hx("ff9f43"))
        else:
            d.ellipse([tx - 2, 96, tx + 2, 105], outline=P["steel"])
    # little shelf with jars/spices right of hood
    d.rectangle([318, 100, 334, 102], fill=P["wood_d"])
    for i, col in enumerate([hx("ff5f5f"), hx("ffd23f"), hx("7ce86b")]):
        d.rectangle([319 + i * 5, 93, 322 + i * 5, 99], fill=col)
        d.line([319 + i * 5, 93, 322 + i * 5, 93], fill=C["white"])
    # counter (top at y=156)
    d.rectangle([kx0 - 2, 156, kx1 + 2, 162], fill=P["counter"])
    d.line([kx0 - 2, 156, kx1 + 2, 156], fill=P["counter_l"])
    d.line([kx0 - 2, 162, kx1 + 2, 162], fill=P["counter_d"])
    # lower cabinets
    d.rectangle([kx0, 163, kx1, 186], fill=P["cab_d"])
    for cx in range(kx0, kx1, 36):
        if 256 < cx + 18 < 316:
            continue
        d.rectangle([cx + 1, 164, cx + 34, 183], fill=P["cab"])
        d.rectangle([cx + 4, 166, cx + 31, 181], fill=P["cab_l"])
        d.rectangle([cx + 5, 167, cx + 30, 180], fill=P["cab"])
        d.rectangle([cx + 14, 168, cx + 21, 169], fill=C["gold"])
    d.rectangle([kx0, 184, kx1, 186], fill=P["wood_dd"])
    # stove / oven
    ox0, ox1 = 258, 314
    d.rectangle([ox0, 155, ox1, 186], fill=P["steel_dd"])
    d.rectangle([ox0 + 1, 156, ox1 - 1, 161], fill=hx("2a2a44"))   # cooktop
    d.rectangle([ox0 + 1, 163, ox1 - 1, 185], fill=P["steel"])
    d.rectangle([ox0 + 1, 163, ox1 - 1, 167], fill=P["steel_d"])
    for k in range(4):
        d.ellipse([ox0 + 6 + k * 13, 164, ox0 + 9 + k * 13, 166], fill=C["black"])
    d.rectangle([ox0 + 6, 170, ox1 - 6, 183], fill=P["steel_dd"])
    d.rectangle([ox0 + 8, 172, ox1 - 8, 181], fill=hx("1d1830"))
    d.line([ox0 + 10, 173, ox0 + 18, 173], fill=hx("4a4670"))
    d.rectangle([ox0 + 8, 169, ox1 - 8, 169], fill=P["steel_l"])
    # burners (grates)
    for bx in (273, 299):
        d.line([bx - 8, 156, bx + 8, 156], fill=hx("55557a"))
        d.line([bx, 155, bx, 157], fill=hx("55557a"))
    # fridge
    fx0, fx1 = 338, 382
    d.rectangle([fx0, 66, fx1, 186], fill=P["fridge_d"])
    d.rectangle([fx0 + 1, 67, fx1 - 1, 110], fill=P["fridge"])
    d.rectangle([fx0 + 1, 112, fx1 - 1, 185], fill=P["fridge"])
    d.line([fx0 + 2, 68, fx0 + 2, 108], fill=P["fridge_l"])
    d.line([fx0 + 2, 113, fx0 + 2, 183], fill=P["fridge_l"])
    d.rectangle([fx0 + 5, 96, fx0 + 6, 106], fill=P["steel"])
    d.rectangle([fx0 + 5, 116, fx0 + 6, 130], fill=P["steel"])
    # magnets + note on fridge
    d.rectangle([fx0 + 16, 120, fx0 + 30, 134], fill=C["white"])
    for yy in (123, 126, 129):
        d.line([fx0 + 18, yy, fx0 + 28, yy], fill=hx("9a9ac0"))
    d.ellipse([fx0 + 21, 118, fx0 + 24, 121], fill=C["red"])
    d.ellipse([fx0 + 30, 80, fx0 + 34, 84], fill=hx("5ff2ff"))
    d.rectangle([fx0 + 12, 86, fx0 + 17, 91], fill=hx("7ce86b"))
    # plant on fridge
    d.rectangle([fx0 + 12, 56, fx0 + 26, 66], fill=P["pot_t"])
    d.line([fx0 + 12, 56, fx0 + 26, 56], fill=hx("ffb37a"))
    for i, (ax, ay) in enumerate([(-8, -14), (-3, -18), (3, -17), (9, -12), (12, -6), (-11, -6)]):
        d.line([fx0 + 19, 56, fx0 + 19 + ax, 56 + ay], fill=P["plant"] if i % 2 else P["plant_d"], width=2)
    # counter items: cutting board w/ scallions (left), utensil crock, kettle
    d.rectangle([214, 153, 242, 156], fill=P["wood_l"])
    d.line([214, 156, 242, 156], fill=P["wood_d"])
    d.line([218, 152, 238, 151], fill=P["plant"])
    d.line([218, 153, 228, 152], fill=hx("d8ffd0"))
    d.rectangle([198, 142, 207, 155], fill=hx("5a6ad8"))
    d.rectangle([199, 143, 206, 154], fill=hx("7a8cff"))
    for i, tx in enumerate((200, 203, 205)):
        d.line([tx, 134 + i * 2, tx, 142], fill=P["wood"] if i != 1 else P["steel"])
    d.ellipse([318, 144, 332, 156], fill=C["red"])
    d.rectangle([318, 150, 332, 155], fill=C["red"])
    d.line([320, 146, 324, 145], fill=C["red_l"])
    d.rectangle([323, 141, 327, 143], fill=C["black"])
    d.line([315, 148, 318, 150], fill=C["red_d"])
    return im


def chair(facing_left=True):
    """Bistro chair sprite (24x34). Backrest on the side away from table."""
    rows = [
        "..ooo...................",
        ".oyyo...................",
        ".oyyo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYo...................",
        ".oyYoooooooooooooooooo..",
        ".oyYyyyyyyyyyyyyyyyyyyo.",
        ".oyYYYYYYYYYYYYYYYYYYYo.",
        ".oooooooooooooooooooooo.",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        "..oYo..............oYo..",
        ".ooYoo............ooYoo.",
    ]
    pal = {"o": C["ink"], "y": C["gold"], "Y": C["gold_d"]}
    im = sprite(rows, pal)
    # cushion
    from PIL import ImageDraw as D
    dd = D.Draw(im)
    dd.rectangle([5, 13, 21, 15], fill=hx("ff3d6e"))
    dd.line([5, 13, 21, 13], fill=hx("ff8aa6"))
    return im if not facing_left else im.transpose(Image.FLIP_LEFT_RIGHT)


def table():
    """Round pedestal table, side view (64x22). Top at y=0..8."""
    im = Image.new("RGBA", (64, 22), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, 63, 8], fill=C["ink"])
    d.ellipse([1, 0, 62, 6], fill=hx("fdf6ee"))
    d.ellipse([4, 1, 59, 5], fill=hx("fffdf8"))
    d.rectangle([1, 4, 62, 7], fill=hx("e0c8cc"))
    d.line([2, 8, 61, 8], fill=C["ink"])
    # tablecloth drape hint
    for x in range(4, 60, 6):
        d.line([x, 8, x + 2, 10], fill=C["red"])
    d.rectangle([29, 9, 34, 18], fill=C["ink"])
    d.rectangle([30, 9, 33, 18], fill=C["gold_d"])
    d.line([30, 9, 30, 18], fill=C["gold"])
    d.ellipse([18, 17, 45, 21], fill=C["ink"])
    d.ellipse([19, 17, 44, 20], fill=C["gold_d"])
    d.line([22, 17, 40, 17], fill=C["gold"])
    return im


def lamp():
    im = Image.new("RGBA", (26, 70), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.line([13, 0, 13, 52], fill=C["ink"])
    poly(d, [(7, 52), (19, 52), (25, 64), (1, 64)], P["lamp_d"])
    poly(d, [(8, 52), (18, 52), (23, 63), (3, 63)], P["lamp"])
    d.line([9, 53, 5, 62], fill=hx("fff0a8"))
    d.rectangle([1, 64, 25, 65], fill=hx("c05a1e"))
    d.ellipse([9, 63, 17, 69], fill=hx("fffbe0"))
    return im
