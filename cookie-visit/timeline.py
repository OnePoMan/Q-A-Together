"""Shared timing (100 BPM: beat = 0.6 s, bar = 2.4 s)."""
FPS = 30
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
DUR = 34.5

# S1 hallway
S1 = (0.0, 4.8)
WALK = (0.0, 2.6)
STEPS = [0.15 + 0.3 * i for i in range(9)]
T_BELL = 3.3          # ding (3.3) - dong (3.6)
T_LOCK = 4.0          # digital door lock melody
DOOR_OPEN = (4.35, 4.8)

# S2 greeting at the door
S2 = (4.8, 9.6)
T_BOW = 6.3

# S3 table + unwrap
S3 = (9.6, 14.4)
XFADE = 0.35
UNTIE = (10.2, 10.8)
UNFOLD = (10.8, 11.4)
T_LID = 12.0

# S4 bite
S4 = (14.4, 19.2)
GRAB = (14.6, 15.2)
T_BITE = 15.6
CHEW = (15.75, 18.0)
T_STOP = 17.4          # music drops out
T_REALISE = 18.0
T_GLINT = 18.6

# S5 reaction
S5 = (19.2, 24.0)
T_WOW = 19.2

# S6 eat more
S6 = (24.0, 31.2)
T_GRAB2 = 26.4
T_LAUGH = 28.2

# S7 end card
S7 = (31.2, DUR)
FADE_OUT = (33.7, 34.4)

# dialogue: (start, speaker, korean, english, hold)
LINES = [
    (5.1, "son", "엄마!", "Mom!", 1.4),
    (5.7, "dil", "어머니, 어서 오세요!", "Welcome, Mother!", 1.8),
    (7.2, "mom", "아이고~ 우리 애기들!", "Aigoo~ my babies!", 2.2),
    (12.3, "son", "우와~!", "Wow~!", 0.85),
    (12.45, "dil", "우와~!", "Wow~!", 0.75),
    (13.45, "mom", "엄마가 직접 구웠지~", "I baked them myself~", 1.2),
    (21.6, "son", "엄마 최고!", "Mom, you're the best!", 1.7),
    (22.2, "dil", "진짜 맛있어요, 어머니!", "So delicious, Mother!", 1.7),
    (24.8, "mom", "많이 먹어~ 더 있어!", "Eat lots~ there's more!", 2.0),
    (28.2, "son", "하하하!", "Hahaha!", 1.3),
    (28.35, "dil", "하하하!", "Hahaha!", 1.2),
    (28.5, "mom", "호호호!", "Hohoho!", 1.3),
]
CHAR_RATE = 0.075     # seconds per Hangul syllable on the typewriter


def syllable_times(line):
    """Times at which each spoken syllable is revealed (for the babble voice)."""
    t0, who, ko, en, hold = line
    out = []
    k = 0
    for ch in ko:
        if "가" <= ch <= "힣":
            out.append(t0 + 0.1 + k * CHAR_RATE)
        if ch not in " ":
            k += 1
    return out
