"""Single source of truth for timing. 120 BPM -> 1 beat = 0.5 s, 1 bar = 2 s (15 frames/beat @30fps)."""
FPS = 30
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
DUR = 30.5

# intro / title card
T_SAT = 0.0
T_DOT = 0.75
T_EVEN = 1.0
EVEN_GAP = 0.125            # one letter per 16th
WIPE1 = (1.8, 2.3)          # shard wipe, covered at midpoint 2.05

# apartment
T_GROWL = 3.0
BUBBLE = (3.05, 3.9)
T_STAND = 4.0
STAND_DUR = 0.4
T_TURN = 4.45
WALK = (4.5, 6.5)
STEPS = [4.5 + 0.25 * i for i in range(8)]
X_CHAIR, X_STOVE = 150, 244

# cut-in 1
CUT1 = (6.0, 7.9)
T_GLINT = 6.5
T_LETSCOOK = 7.0

# cooking
PANEL = (8.0, 18.0)
T_KNOB = 8.25
T_FIRE = 8.5
T_BUBBLES = 9.0
PACKET = (10.0, 11.0)
T_RIP = 10.5
T_DROP = 11.0
T_RED = 11.5
T_CREAM = 12.0
T_FLAKE = 12.5
T_EGG = 13.0
STIR = (13.5, 15.5)
BOARD = (15.5, 16.0)
CHOPS = [15.5, 15.625, 15.75, 15.875]
T_ONION = 16.0
BOWL = (16.5, 18.0)
POUR = (16.5, 17.25)
T_SERVE = 17.5

LABELS = [  # (time, text)
    (8.5, "BOIL!"), (10.5, "RIP!"), (11.0, "DROP!"), (11.5, "SEASON!"), (13.0, "CRACK!"),
    (13.5, "STIR!"), (15.5, "CHOP!"), (16.5, "POUR!"), (17.5, "DONE!"),
]

# achievement + stat
T_PRESENT = 18.0
T_ACH = 20.0
ACH_DUR = 2.5
ACH_LETTER0 = 0.1
ACH_GAP = 0.032
ACH_SHINE = 0.62
T_STAT = 22.5
STAT_FILL = 0.5
STAT_DUR = 1.5

# outro
WIPE2 = (23.8, 24.3)
SLURPS = [25.0, 26.0]
T_HEARTS = 25.5
CUT2 = (26.5, 27.75)
T_FINAL = 28.0
IRIS = (28.6, 29.8)


def ach_letter_times():
    """Times at which each visible letter of YOU MADE DINNER! pops (for audio sync)."""
    n = len("YOU MADE DINNER!".replace(" ", ""))
    return [T_ACH + ACH_LETTER0 + i * ACH_GAP for i in range(n)]
