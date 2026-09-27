"""Soundtrack for the cookie visit: cozy acoustic score + babble voices + SFX, synced to timeline.py.
Usage: python3 audio.py out.wav"""
import sys, math
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve, lfilter
from scipy.io import wavfile
from timeline import *

SR = 48000
N = int(SR * (DUR + 0.3))
rng = np.random.default_rng(7)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def M(n):
    names = {"C": 0, "C#": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "Bb": 10, "B": 11}
    return names[n[:-1]] + 12 * (int(n[-1]) + 1)


def tt(n):
    return np.arange(n) / SR


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, min(hi, SR / 2 - 100)], btype="band", fs=SR, output="sos"), x)


def lp(x, fc, o=2):
    return sosfilt(butter(o, min(fc, SR / 2 - 100), btype="low", fs=SR, output="sos"), x)


def hp(x, fc, o=2):
    return sosfilt(butter(o, fc, btype="high", fs=SR, output="sos"), x)


def polyblep(t, dt):
    out = np.zeros_like(t)
    m = t < dt; x = t[m] / dt[m]; out[m] = x + x - x * x - 1
    m2 = t > 1 - dt; x = (t[m2] - 1) / dt[m2]; out[m2] = x * x + x + x + 1
    return out


def saw(f, n):
    f = np.broadcast_to(np.asarray(f, float), (n,)).copy()
    dt = f / SR; ph = np.cumsum(dt) % 1
    return 2 * ph - 1 - polyblep(ph, dt)


def pulse(f, n, duty=0.5):
    f = np.broadcast_to(np.asarray(f, float), (n,)).copy()
    dt = f / SR; ph = np.cumsum(dt) % 1
    y = np.where(ph < duty, 1.0, -1.0)
    return y + polyblep(ph, dt) - polyblep((ph - duty) % 1, dt)


def sine(f, n):
    f = np.broadcast_to(np.asarray(f, float), (n,))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


class Bus:
    def __init__(self):
        self.L = np.zeros(N); self.R = np.zeros(N)

    def add(self, sig, t0, gain=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i >= N:
            return
        sig = sig[: N - i]
        gl = math.cos((pan + 1) * math.pi / 4) * math.sqrt(2) * gain
        gr = math.sin((pan + 1) * math.pi / 4) * math.sqrt(2) * gain
        self.L[i:i + len(sig)] += sig * gl
        self.R[i:i + len(sig)] += sig * gr

    def st(self):
        return np.vstack([self.L, self.R])


# ======================================================================== instruments
def gayageum(m, dur, vel=1.0, bend=0.0, vib=0.0):
    """Karplus-Strong pluck with optional scoop bend and late vibrato (nonghyeon)."""
    n = int((dur + 1.2) * SR)
    f0 = mtof(m)
    # KS delay line via lfilter comb: y[n] = x[n] + g*(y[n-L] + y[n-L-1])/2
    L = int(SR / f0)
    frac = SR / f0 - L
    burst = lp(rng.standard_normal(L + 2), 5000) * 1.0
    x = np.zeros(n); x[:len(burst)] = burst
    g = 0.996
    a = np.zeros(L + 2); a[0] = 1; a[L] = -g * 0.5; a[L + 1] = -g * 0.5
    tune = f0 / (SR / (L + 0.5))     # correct the integer-delay pitch error
    y = lfilter([1.0], a, x)
    # pitch modulation by resampling (bend + vibrato)
    t = tt(n)
    cents = bend * 100 * np.exp(-t / 0.08) * -1
    cents += vib * 100 * np.clip((t - 0.25) / 0.3, 0, 1) * np.sin(2 * np.pi * 5.5 * t)
    ratio = tune * 2 ** (cents / 1200)
    pos = np.cumsum(ratio)
    pos = np.clip(pos, 0, n - 2)
    y = np.interp(pos, np.arange(n), y)
    env = np.minimum(1, np.maximum(0, (dur + 0.5 - t) / 0.5)) * np.exp(-t / (1.4 + 0.3 * (m < 70)))
    y = y * env
    y = y + 0.3 * hp(y, 1500)       # woody brightness
    return y / (np.max(np.abs(y)) + 1e-9) * vel


def ep(m, dur, vel=1.0):
    n = int((dur + 0.9) * SR)
    t = tt(n); f = mtof(m)
    idx = 0.9 * np.exp(-t / 0.4) + 0.15
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    y += 0.15 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t / 0.08)
    gate = dur
    e = np.where(t < 0.004, t / 0.004, np.exp(-t / 1.4))
    e *= np.where(t > gate, np.exp(-(t - gate) / 0.25), 1)
    return y * e * vel


def upright(m, dur, vel=1.0):
    n = int((dur + 0.3) * SR)
    t = tt(n); f = mtof(m)
    y = sine(f * (1 + 0.01 * np.exp(-t / 0.02)), n) + 0.35 * sine(2 * f, n) * np.exp(-t / 0.15) + 0.15 * saw(f, n)
    y = lp(y, 900)
    e = np.minimum(t / 0.006, 1) * np.exp(-t / 0.6) * np.where(t > dur, np.exp(-(t - dur) / 0.06), 1)
    y += 0.2 * bp(rng.standard_normal(n), 800, 3000) * np.exp(-t / 0.01)
    return y * e * vel


def glock(m, vel=1.0, dur=1.4):
    n = int(dur * SR); t = tt(n); f = mtof(m)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.12) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.05)
    return y * np.exp(-t / (dur / 3.5)) * np.minimum(t / 0.001, 1) * vel


def strings(notes, dur, vel=1.0):
    n = int((dur + 0.8) * SR); t = tt(n)
    y = np.zeros(n)
    for m in notes:
        for d in (-0.07, 0.0, 0.07):
            y += saw(mtof(m + d) * (1 + 0.003 * np.sin(2 * np.pi * 5 * t + m)), n)
    y = lp(y, 2500)
    e = np.minimum(t / 0.25, 1) * np.where(t > dur, np.exp(-(t - dur) / 0.35), 1)
    return y * e * vel / (3 * len(notes))


def kick(vel=1.0):
    n = int(0.3 * SR); t = tt(n)
    return np.tanh(1.5 * sine(48 + 70 * np.exp(-t / 0.03), n) * np.exp(-t / 0.14)) * vel


def brush(vel=1.0, dur=0.22):
    n = int(dur * SR); t = tt(n)
    return bp(rng.standard_normal(n), 1500, 9000) * np.minimum(t / 0.012, 1) * np.exp(-t / (dur / 3)) * vel


def shaker(vel=1.0):
    n = int(0.08 * SR); t = tt(n)
    return hp(rng.standard_normal(n), 6000) * np.minimum(t / 0.01, 1) * np.exp(-t / 0.02) * vel


def snap(vel=1.0):
    n = int(0.12 * SR); t = tt(n)
    return bp(rng.standard_normal(n), 1200, 5000) * np.exp(-t / 0.02) * vel


# ======================================================================== voices
VOWELS = {"a": (800, 1250), "e": (480, 1900), "i": (320, 2300), "o": (480, 880), "u": (360, 800)}
VOICE = {"son": dict(f0=150, spread=3, vib=0.0, bright=1.0), "dil": dict(f0=265, spread=4, vib=0.0, bright=1.15),
         "mom": dict(f0=225, spread=5, vib=0.25, bright=1.05)}


def syllable(who, idx, excited=1.0, dur=0.085, seed=0):
    v = VOICE[who]
    r = np.random.default_rng(seed)
    n = int(dur * SR); t = tt(n)
    semis = r.integers(-v["spread"], v["spread"] + 1) + (3 if excited > 1 else 0)
    f0 = v["f0"] * 2 ** (semis / 12) * (1 + 0.06 * (excited - 1))
    contour = 1 + 0.05 * np.sin(np.pi * t / dur) + v["vib"] * 0.03 * np.sin(2 * np.pi * 9 * t)
    src_ = saw(f0 * contour, n) + 0.08 * r.standard_normal(n)
    vw = list(VOWELS.values())[r.integers(0, 5)]
    y = bp(src_, vw[0] * 0.8, vw[0] * 1.25) * 1.0 + bp(src_, vw[1] * 0.85 * v["bright"], vw[1] * 1.2 * v["bright"]) * 0.6
    y += 0.25 * bp(src_, 2600, 3400)
    e = np.minimum(t / 0.008, 1) * np.minimum((dur - t) / 0.02, 1)
    return y * np.clip(e, 0, 1)


def babble(bus, who, times, excited=1.0, gain=1.0, pan=0.0):
    for k, ts in enumerate(times):
        s = syllable(who, k, excited, 0.08 if excited < 1.5 else 0.1, seed=int(ts * 1000) + k)
        bus.add(s / (np.max(np.abs(s)) + 1e-9), ts, gain, pan)


# ======================================================================== SFX
def whoosh(dur=0.3, vel=1.0):
    n = int(dur * SR); t = tt(n); s = t / dur
    y = bp(rng.standard_normal(n), 400, 5000) * np.sin(np.pi * s) ** 2
    return y * vel


def step_sfx(vel=1.0):
    n = int(0.1 * SR); t = tt(n)
    return (sine(110 + 60 * np.exp(-t / 0.01), n) * np.exp(-t / 0.03) + 0.3 * bp(rng.standard_normal(n), 1500, 5000) * np.exp(-t / 0.01)) * vel


def dingdong_tone(m, vel=1.0):
    n = int(1.4 * SR); t = tt(n); f = mtof(m)
    y = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.3) + 0.1 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.2)
    return y * np.exp(-t / 0.5) * np.minimum(t / 0.002, 1) * vel


def beep(m, dur=0.07, vel=1.0):
    n = int(dur * SR); t = tt(n)
    return pulse(mtof(m), n, 0.5) * np.minimum((dur - t) / 0.01, 1) * vel * 0.5


def clunk(vel=1.0):
    n = int(0.25 * SR); t = tt(n)
    return (sine(90 + 50 * np.exp(-t / 0.02), n) * np.exp(-t / 0.06) + 0.4 * bp(rng.standard_normal(n), 800, 4000) * np.exp(-t / 0.02)) * vel


def creak(vel=1.0):
    n = int(0.45 * SR); t = tt(n)
    f = 300 + 120 * np.sin(np.pi * t / 0.45)
    y = bp(saw(f, n) * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * t)), 400, 2500)
    return y * np.sin(np.pi * t / 0.45) * vel * 0.4


def rustle(dur=0.6, vel=1.0):
    n = int(dur * SR); t = tt(n)
    x = rng.standard_normal(n) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * t + rng.random())))
    return bp(x, 1500, 7000) * np.sin(np.pi * t / dur) * vel


def lid_pop(vel=1.0):
    n = int(0.5 * SR); t = tt(n)
    y = sine(600 * np.exp(-t / 0.04) + 300, n) * np.exp(-t / 0.05)
    y += 0.4 * sine(1650, n) * np.exp(-t / 0.3) + 0.2 * sine(2480, n) * np.exp(-t / 0.2)
    return y * vel


def crunch(vel=1.0):
    n = int(0.35 * SR); t = tt(n)
    cr = (rng.random(n) < 0.06) * rng.standard_normal(n) * 3
    y = bp(cr + 0.4 * rng.standard_normal(n), 1200, 9000) * np.exp(-t / 0.08)
    y += 0.5 * sine(140, n) * np.exp(-t / 0.03)
    return y * vel


def munch(vel=1.0):
    n = int(0.16 * SR); t = tt(n)
    y = lp(rng.standard_normal(n), 1200) * np.exp(-t / 0.04) + 0.3 * sine(170, n) * np.exp(-t / 0.03)
    y += 0.3 * bp((rng.random(n) < 0.03) * rng.standard_normal(n), 2000, 7000) * np.exp(-t / 0.05)
    return y * vel


def pop(m=84, vel=1.0):
    n = int(0.12 * SR); t = tt(n)
    return sine(mtof(m) * (1 + 0.6 * t / 0.12), n) * np.exp(-t / 0.04) * vel


def shimmer(vel=1.0):
    n = int(0.9 * SR); t = tt(n)
    y = np.zeros(n)
    for k, m in enumerate((91, 95, 98, 103, 107)):
        i = int(k * 0.05 * SR)
        g = glock(m, 0.5, 0.8)[: n - i]
        y[i:i + len(g)] += g
    y += hp(rng.standard_normal(n), 8000) * np.exp(-t / 0.1) * 0.3
    return y * vel


def riser(dur=0.6, vel=1.0):
    n = int(dur * SR); t = tt(n); s = t / dur
    return bp(rng.standard_normal(n), 800, 9000) * s ** 2 * vel


# ======================================================================== score
CH = {  # (bass root, voicing)
    "G69":  (M("G2"), [59, 64, 69, 74]),
    "Cadd9": (M("C3"), [55, 62, 64, 67]),
    "D":    (M("D3"), [54, 57, 62, 66]),
    "Gmaj7": (M("G2"), [59, 62, 66, 71]),
    "G":    (M("G2"), [59, 62, 67, 71]),
    "Em7":  (M("E2"), [55, 59, 62, 67]),
    "Cmaj7": (M("C3"), [55, 59, 64, 67]),
    "D7":   (M("D3"), [54, 60, 62, 66]),
    "C":    (M("C3"), [55, 60, 64, 67]),
    "Bm7":  (M("B2"), [54, 57, 62, 66]),
}
# (start beat, chord, beats)
PROG = [(0, "G69", 4), (4, "Cadd9", 2), (6, "D", 2), (8, "G", 4), (12, "Em7", 4), (16, "Cmaj7", 4), (20, "D", 4),
        (24, "Gmaj7", 4), (28, "Em7", 1), (32, "G", 4), (36, "C", 2), (38, "D", 2), (40, "Em7", 4), (44, "C", 2),
        (46, "D", 2), (48, "G", 2), (50, "Cmaj7", 2), (52, "G69", 6)]


def b2t(b):
    return b * BEAT


def build():
    drums, bass, keys, lead, fx, vox, pad = (Bus() for _ in range(7))
    e8 = BEAT / 2

    # ---------------- keys + bass
    for b0, name, ln in PROG:
        root, notes = CH[name]
        t0 = b2t(b0)
        if b0 == 28:      # music drops out after the bite
            for k, m in enumerate(notes):
                keys.add(ep(m, 0.5, 0.35), t0 + k * 0.01, 1, -0.3 + 0.2 * k)
            bass.add(upright(root, 0.5, 0.8), t0)
            continue
        soft = b0 < 8 or 24 <= b0 < 32
        # comp: on 1 (long) + "and of 2" + 4 (short)
        hits = [(0, min(ln, 2) * BEAT * 0.95, 0.42)] if b0 < 8 else [(0, 1.4 * BEAT, 0.4), (1.5, 0.4 * BEAT, 0.28), (3, 0.8 * BEAT, 0.3)]
        for hb, hd, v in hits:
            if hb >= ln:
                continue
            for k, m in enumerate(notes):
                keys.add(ep(m, hd, v * (0.7 if soft else 1.0)), t0 + hb * BEAT + k * 0.012, 1, -0.3 + 0.2 * k)
        if b0 >= 8 and b0 != 52:
            pat = [(0, 0, 1.2), (1.5, 7, 0.4), (2, 12, 0.8), (3, 7, 0.4), (3.5, 5 if name != "D" else 4, 0.4)]
            for pb, iv, d in pat:
                if pb >= ln:
                    continue
                bass.add(upright(root + iv, d * BEAT, 0.9 if pb == 0 else 0.6), t0 + pb * BEAT)
        elif b0 == 52:
            bass.add(upright(root, 3.0, 1.0), t0)
        else:
            bass.add(upright(root, ln * BEAT * 0.9, 0.7), t0)

    # ---------------- drums (brushes)
    def groove(b_from, b_to, busy=1.0):
        for b in np.arange(b_from, b_to, 1.0):
            t0 = b2t(b)
            beat_in_bar = int(b) % 4
            if beat_in_bar in (0, 2):
                drums.add(kick(0.8), t0, 0.9)
            if beat_in_bar in (1, 3):
                drums.add(brush(0.9), t0, 0.5, 0.1)
                drums.add(snap(0.5), t0, 0.35, 0.1)
            if busy > 0.5 and beat_in_bar == 3:
                drums.add(kick(0.5), t0 + e8, 0.7)
            for k in range(2):
                drums.add(shaker(0.6 if k == 0 else 0.35), t0 + k * e8 + (0.02 if k else 0), 0.35 * busy, 0.4)

    for b in np.arange(0, 8, 0.5):                       # intro: shaker only
        drums.add(shaker(0.4 if b % 1 else 0.6), b2t(b), 0.25, 0.4)
    groove(8, 24, 0.9)
    for b in np.arange(24, 29, 0.5):                     # grab/bite: sparse shaker
        drums.add(shaker(0.4), b2t(b), 0.25, 0.4)
    drums.add(kick(0.8), b2t(24), 0.8)
    # fill into the big moment (18.9 -> 19.2)
    for k in range(4):
        drums.add(snap(0.4 + 0.2 * k), T_WOW - 0.3 + k * 0.075, 0.5)
    groove(32, 52, 1.0)
    drums.add(kick(1.0), b2t(52), 0.9)
    drums.add(brush(1.0, 1.2), b2t(52), 0.4, -0.2)

    # ---------------- gayageum melody: (beat, note, beats, bend, vib)
    mel = [
        (0, "D5", 1, 0.5, 0.3), (1, "E5", .5, 0, 0), (1.5, "D5", .5, 0, 0), (2, "B4", 1, 0.4, 0.2), (3, "A4", .5, 0, 0), (3.5, "G4", .5, 0, 0),
        (4, "E5", 1.2, 0.6, 0.5),
        (11.5, "D5", .25, 0, 0), (11.75, "E5", .25, 0, 0),
        (16, "B4", 1, 0, 0.2), (17, "D5", 1, 0, 0.2), (18, "E5", 1, 0.3, 0.2), (19, "G5", 1, 0.3, 0.3),
        (20, "A5", 2, 0.6, 0.6), (22, "F#5", 1, 0, 0.3), (23, "E5", 1, 0, 0.3),
        (32, "G5", .5, 0.3, 0), (32.5, "A5", .5, 0, 0), (33, "B5", 1, 0.3, 0.3), (34, "D6", 1, 0.5, 0.4), (35, "B5", .5, 0, 0), (35.5, "A5", .5, 0, 0),
        (36, "G5", 1.5, 0.4, 0.5), (37.5, "E5", .5, 0, 0), (38, "D5", 1, 0.3, 0.3), (39, "E5", .5, 0, 0), (39.5, "G5", .5, 0, 0),
        (40, "B5", 2, 0.5, 0.6), (42, "A5", .5, 0, 0), (42.5, "G5", .5, 0, 0), (43, "E5", 1, 0.3, 0.3),
        (44, "E5", 1, 0, 0.2), (45, "G5", 1, 0.3, 0.3), (46, "A5", 1, 0, 0.3), (47, "B5", .5, 0, 0), (47.5, "A5", .5, 0, 0),
        (48, "G5", 2, 0.5, 0.6), (50, "D5", 1, 0, 0.3), (51, "E5", 1, 0.3, 0.3),
        (52, "G5", 4, 0.6, 0.7),
    ]
    for b0, nm, ln, bend, vib in mel:
        quiet = 40 <= b0 < 44 or 12 <= b0 < 24     # tuck under dialogue
        lead.add(gayageum(M(nm), ln * BEAT, 0.55 if quiet else 0.75, bend, vib), b2t(b0), 1, 0.15)
    # final glissando
    gl = ["G4", "A4", "B4", "D5", "E5", "G5", "A5", "B5", "D6", "E6", "G6"]
    for k, nm in enumerate(gl):
        lead.add(gayageum(M(nm), 0.8, 0.35, 0, 0), b2t(52) - 0.35 + k * 0.032, 1, -0.3 + 0.06 * k)

    # ---------------- strings for the big moment + outro
    for b0, name, ln in PROG:
        if 32 <= b0 < 52:
            pad.add(strings([m + 12 for m in CH[name][1][1:]], ln * BEAT, 0.8 if b0 < 40 else 0.55), b2t(b0), 1)
        if b0 == 52:
            pad.add(strings([m + 12 for m in CH[name][1]], 2.6, 0.6), b2t(b0), 1)
    pad.add(strings([M("D5"), M("F#5"), M("A5")], 1.1, 0.35), T_LID, 1)      # reveal swell

    # ---------------- glock sparkles
    for k, nm in enumerate(("D6", "F#6", "A6", "D7", "A6", "F#6")):
        fx.add(glock(M(nm), 0.35), T_LID + 0.05 + k * 0.07, 1, 0.3 - 0.1 * k)
    for k, nm in enumerate(("G5", "B5", "D6", "G6", "B6")):
        fx.add(glock(M(nm), 0.35), T_WOW + k * 0.06, 1, -0.3 + 0.15 * k)
    for k, nm in enumerate(("B6", "G6", "D7")):
        fx.add(glock(M(nm), 0.3, 2.0), b2t(52) + 0.2 + k * 0.15, 1, 0)

    # ---------------- SFX
    for k, ts in enumerate(STEPS):
        fx.add(step_sfx(0.6), ts, 0.4, -0.6 + 1.0 * k / 8)
    fx.add(dingdong_tone(M("B5"), 1.0), T_BELL, 0.45, 0.3)
    fx.add(dingdong_tone(M("G5"), 1.0), T_BELL + 0.3, 0.45, 0.3)
    for k, nm in enumerate(("G6", "B6", "D7", "G7")):
        fx.add(beep(M(nm), 0.06, 1.0), T_LOCK + k * 0.075, 0.28, -0.1)
    fx.add(clunk(0.8), T_LOCK + 0.35, 0.4, -0.1)
    fx.add(creak(0.8), DOOR_OPEN[0], 0.35, -0.1)
    fx.add(whoosh(0.2, 0.6), S2[0] - 0.08, 0.3)
    for k in range(3):
        fx.add(step_sfx(0.5), 4.85 + k * 0.17, 0.35, 0.3)
    fx.add(rustle(0.7, 1.0), UNTIE[0], 0.28, 0)
    fx.add(rustle(0.6, 1.0), UNFOLD[0], 0.35, 0)
    fx.add(lid_pop(1.0), T_LID, 0.45, 0.2)
    fx.add(rustle(0.25, 0.8), GRAB[0] + 0.3, 0.2)
    fx.add(crunch(1.0), T_BITE, 0.7, -0.25)
    fx.add(crunch(1.0), T_BITE + 0.03, 0.7, 0.25)
    t = CHEW[0] + 0.05
    k = 0
    while t < T_REALISE - 0.1:
        fx.add(munch(0.8), t, 0.45, -0.3 if k % 2 == 0 else 0.3)
        t += BEAT / 2 if t < T_STOP else BEAT * 0.8
        k += 1
    fx.add(pop(84, 1.0), T_REALISE, 0.4, -0.3)
    fx.add(pop(88, 1.0), T_REALISE + 0.04, 0.4, 0.3)
    fx.add(shimmer(1.0), T_GLINT, 0.4)
    fx.add(riser(0.5, 1.0), T_WOW - 0.5, 0.3)
    fx.add(kick(1.0), T_WOW, 0.8)
    for k in range(4):
        fx.add(pop(86 + k * 2, 0.6), 24.1 + k * 0.25, 0.25, 0.1)
    fx.add(whoosh(0.4, 0.8), 24.8, 0.25)
    for name, side in (("son", -0.3), ("dil", 0.3)):
        g0 = T_GRAB2 + (0.15 if name == "dil" else 0)
        tt_ = g0 + 0.3
        while tt_ < S6[1]:
            fx.add(munch(0.6), tt_ + 0.35, 0.3, side)
            fx.add(munch(0.5), tt_ + 0.6, 0.25, side)
            tt_ += 2 * BEAT
    fx.add(whoosh(0.6, 0.6), S7[0], 0.25)

    # ---------------- voices
    pans = {"son": -0.3, "mom": 0.0, "dil": 0.3}
    for line in LINES:
        t0, who, ko, en, hold = line
        ex = 1.4 if "!" in ko and who != "mom" else 1.1
        babble(vox, who, syllable_times(line), ex, 0.9, pans[who])
    # big shout 맛있어요!! (both) + little gasps
    shout = [T_WOW + 0.02 + i * 0.07 for i in range(4)]
    babble(vox, "son", shout, 2.0, 1.0, -0.3)
    babble(vox, "dil", [s + 0.015 for s in shout], 2.0, 1.0, 0.3)
    babble(vox, "son", [T_REALISE + 0.05], 1.8, 0.7, -0.3)
    babble(vox, "dil", [T_REALISE + 0.08], 1.8, 0.7, 0.3)
    babble(vox, "mom", [T_BELL + 0.9, T_BELL + 0.98], 1.0, 0.5, 0.2)   # "hmm~" at the door
    return drums, bass, keys, lead, pad, fx, vox


def reverb_ir(sec=2.0):
    n = int(sec * SR); t = tt(n)
    ir = np.vstack([rng.standard_normal(n), rng.standard_normal(n)]) * np.exp(-t / (sec / 5))
    ir[:, : int(0.015 * SR)] = 0
    ir = np.vstack([lp(ir[0], 5000), lp(ir[1], 5000)])
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def main():
    drums, bass, keys, lead, pad, fx, vox = build()
    D, B, K, L, P, F, V = (b.st() for b in (drums, bass, keys, lead, pad, fx, vox))
    music = 0.8 * D + 0.55 * B + 0.36 * K + 2.4 * L + 0.7 * P
    # duck music under dialogue
    venv = lp(np.abs(V[0] + V[1]), 8)
    venv = venv / (venv.max() + 1e-9)
    duck = 1 - 0.35 * np.clip(venv * 4, 0, 1)
    music = music * duck
    send = 0.3 * K + 1.2 * L + 0.5 * P + 0.25 * F + 0.12 * V + 0.1 * D
    ir = reverb_ir()
    rev = np.vstack([fftconvolve(send[0], ir[0])[:N], fftconvolve(send[1], ir[1])[:N]])
    mix = music + 0.9 * F + 0.8 * V + 0.3 * rev
    mix = hp(mix, 30)
    fl = int(1.0 * SR)
    end = int((DUR) * SR)
    fade = np.ones(N); fade[end - fl:end] = np.linspace(1, 0, fl) ** 1.3; fade[end:] = 0
    mix *= fade
    mix = mix[:, :int(DUR * SR)]
    pk = np.max(np.abs(mix))
    mix = np.tanh(mix / pk * 1.25) / np.tanh(1.25) * 0.92
    wavfile.write(sys.argv[1], SR, (mix.T * 32767).astype(np.int16))
    for name, s_ in (("drums", D), ("bass", B), ("keys", K), ("lead", L), ("pad", P), ("sfx", F), ("vox", V)):
        print(f"{name:6s} rms {20*np.log10(np.sqrt(np.mean(s_**2))+1e-9):6.1f} dB  peak {np.abs(s_).max():5.2f}")


if __name__ == "__main__":
    main()
