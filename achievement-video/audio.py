"""Synthesised soundtrack: acid-jazz chiptune + SFX, all synced to timeline.py.
Usage: python3 audio.py out.wav"""
import sys, math
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
from timeline import *

SR = 48000
N = int(SR * (DUR + 0.01))
rng = np.random.default_rng(1234)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100), btype="low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, btype="high", fs=SR, output="sos"), x)


def onepole_lp_var(x, fc_arr):
    """Time-varying one-pole lowpass (fc per sample)."""
    a = np.exp(-2 * np.pi * np.clip(fc_arr, 20, SR / 2.2) / SR)
    y = np.empty_like(x)
    z = 0.0
    for i in range(len(x)):
        z = (1 - a[i]) * x[i] + a[i] * z
        y[i] = z
    return y


def polyblep(t, dt):
    out = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    out[m] = x + x - x * x - 1
    m2 = t > 1 - dt
    x = (t[m2] - 1) / dt[m2]
    out[m2] = x * x + x + x + 1
    return out


def osc_pulse(freq, n, duty=0.5, phase0=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,)).copy()
    dt = f / SR
    ph = (phase0 + np.cumsum(dt)) % 1.0
    y = np.where(ph < duty, 1.0, -1.0)
    y += polyblep(ph, dt)
    y -= polyblep((ph - duty) % 1.0, dt)
    return y


def osc_saw(freq, n):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,)).copy()
    dt = f / SR
    ph = np.cumsum(dt) % 1.0
    return 2 * ph - 1 - polyblep(ph, dt)


def osc_tri(freq, n):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,)).copy()
    ph = np.cumsum(f / SR) % 1.0
    return 4 * np.abs(ph - 0.5) - 1


def env(n, a=0.005, d=0.1, s=0.7, r=0.05, hold=None):
    """ADSR where hold = gate length in seconds (default n - release)."""
    t = tt(n)
    gate = hold if hold is not None else max(n / SR - r, 0)
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = t > gate
    if rel.any():
        g_level = e[min(int(gate * SR), n - 1)]
        e[rel] = g_level * np.exp(-(t[rel] - gate) / max(r / 4, 1e-6))
    return e


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, t0, gain=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i >= N:
            return
        if i < 0:
            sig = sig[-i:]; i = 0
        sig = sig[: N - i]
        gl = math.cos((pan + 1) * math.pi / 4) * math.sqrt(2) * gain
        gr = math.sin((pan + 1) * math.pi / 4) * math.sqrt(2) * gain
        if sig.ndim == 2:
            self.L[i:i + sig.shape[1]] += sig[0] * gl
            self.R[i:i + sig.shape[1]] += sig[1] * gr
        else:
            self.L[i:i + len(sig)] += sig * gl
            self.R[i:i + len(sig)] += sig * gr

    def stereo(self):
        return np.vstack([self.L, self.R])


# ======================================================================== instruments
def kick(vel=1.0):
    n = int(0.35 * SR)
    t = tt(n)
    f = 45 + 120 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.16)
    y += 0.4 * np.exp(-t / 0.004) * rng.standard_normal(n) * 0.3
    return np.tanh(1.8 * y) * vel


def snare(vel=1.0, tone=190):
    n = int(0.25 * SR)
    t = tt(n)
    noise = bp(rng.standard_normal(n), 1200, 7000) * np.exp(-t / 0.07)
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.05)
    y = 0.9 * noise + 0.6 * body
    return y * vel


def clap(vel=1.0):
    n = int(0.25 * SR)
    t = tt(n)
    e = np.zeros(n)
    for k, off in enumerate((0, 0.009, 0.018)):
        i = int(off * SR)
        e[i:] += np.exp(-(t[: n - i]) / (0.006 if k < 2 else 0.06))
    return bp(rng.standard_normal(n), 900, 4000) * e * vel * 0.9


def hat(vel=1.0, open_=False):
    n = int((0.35 if open_ else 0.06) * SR)
    t = tt(n)
    # metallic: sum of detuned squares + noise, highpassed
    y = rng.standard_normal(n) * 0.6
    for f in (317, 421, 559, 713, 889, 1011):
        y += 0.25 * np.sign(np.sin(2 * np.pi * f * 7.1 * t))
    y = hp(y, 7000, 2) * np.exp(-t / (0.12 if open_ else 0.018))
    return y * vel * 0.45


def crash(vel=1.0, dur=2.2):
    n = int(dur * SR)
    t = tt(n)
    y = rng.standard_normal(n)
    for f in (273, 381, 447, 593, 671, 811, 977):
        y += 0.2 * np.sign(np.sin(2 * np.pi * f * 5.3 * t + f))
    y = hp(y, 4500, 2) * np.exp(-t / (dur / 3.2)) * (1 - np.exp(-t / 0.002))
    return y * vel * 0.45


def tom(vel=1.0, f0=160):
    n = int(0.3 * SR)
    t = tt(n)
    f = f0 * (1 + 0.6 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) * vel


def bass_note(m, dur, vel=1.0, pop=False):
    n = int((dur + 0.08) * SR)
    t = tt(n)
    f = mtof(m) * (1 + (0.04 if pop else 0.015) * np.exp(-t / 0.01))
    y = 0.55 * osc_pulse(f, n, 0.3) + 0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    fc = (2600 if pop else 900) * np.exp(-t / (0.05 if pop else 0.09)) + 220
    y = onepole_lp_var(y, fc)
    y = onepole_lp_var(y, fc * 1.5)
    e = env(n, 0.002, 0.25, 0.55, 0.05, hold=dur)
    if pop:
        y += 0.3 * hp(rng.standard_normal(n), 2000) * np.exp(-t / 0.004)
    return y * e * vel


def ep_note(m, dur, vel=1.0):
    """FM electric piano (Rhodes-ish, 2-op)."""
    n = int((dur + 0.6) * SR)
    t = tt(n)
    f = mtof(m)
    idx = 1.2 * np.exp(-t / 0.35) + 0.25
    mod = np.sin(2 * np.pi * f * t)
    y = np.sin(2 * np.pi * f * t + idx * mod)
    tine = np.sin(2 * np.pi * f * 7.0 * t) * np.exp(-t / 0.03) * 0.25
    e = env(n, 0.003, 0.9, 0.35, 0.35, hold=dur)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 5.2 * t)
    return (y + tine) * e * trem * vel


def brass_stab(notes, dur=0.28, vel=1.0):
    n = int((dur + 0.2) * SR)
    t = tt(n)
    y = np.zeros(n)
    for m in notes:
        for det in (-0.08, 0.08):
            y += osc_saw(mtof(m + det) * (1 - 0.02 * np.exp(-t / 0.02)), n)
    fc = 5000 * np.exp(-t / 0.12) + 700
    y = onepole_lp_var(y, fc)
    y = onepole_lp_var(y, fc)
    e = env(n, 0.006, 0.15, 0.5, 0.12, hold=dur)
    return y * e * vel / len(notes)


def lead_note(m, dur, vel=1.0, duty=0.25, vib=True):
    n = int((dur + 0.12) * SR)
    t = tt(n)
    f = mtof(m) * np.ones(n)
    if vib:
        vd = np.clip((t - 0.15) / 0.2, 0, 1) * 0.012
        f *= 1 + vd * np.sin(2 * np.pi * 5.8 * t)
    f *= 1 + 0.03 * np.exp(-t / 0.012)   # tiny scoop
    y = osc_pulse(f, n, duty)
    y = lp(y, 6000)
    e = env(n, 0.004, 0.2, 0.75, 0.08, hold=dur)
    return y * e * vel


def vibe_note(m, dur, vel=1.0):
    n = int((dur + 1.2) * SR)
    t = tt(n)
    f = mtof(m)
    y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.15)
    y *= np.exp(-t / 0.9) * (1 + 0.25 * np.sin(2 * np.pi * 6 * t))
    return y * (1 - np.exp(-t / 0.002)) * vel


def bell(m, vel=1.0, dur=1.2):
    n = int(dur * SR)
    t = tt(n)
    f = mtof(m)
    y = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.2)
         + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.08))
    return y * np.exp(-t / (dur / 3)) * (1 - np.exp(-t / 0.001)) * vel


def chip_blip(m0, m1, dur, vel=1.0, duty=0.5):
    n = int(dur * SR)
    t = tt(n)
    f = mtof(m0 + (m1 - m0) * t / dur)
    return osc_pulse(f, n, duty) * np.exp(-t / (dur / 2.5)) * vel


# ======================================================================== SFX
def noise(n):
    return rng.standard_normal(n)


def whoosh(dur=0.35, up=True, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    x = noise(n)
    s = t / dur
    fc = (300 + 5000 * s ** 2) if up else (5000 - 4700 * s ** 0.5)
    y = onepole_lp_var(x, fc)
    y = y - onepole_lp_var(y, fc * 0.3)
    e = np.sin(np.pi * s) ** 1.5
    return y * e * vel * 2.2


def slam(vel=1.0):
    n = int(0.45 * SR)
    t = tt(n)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t / 0.04)) / SR) * np.exp(-t / 0.18)
    hit = lp(noise(n), 3000) * np.exp(-t / 0.05)
    return np.tanh(2 * (boom + 0.6 * hit)) * vel


def tick(m=84, vel=1.0):
    n = int(0.05 * SR)
    t = tt(n)
    return osc_pulse(mtof(m), n, 0.5) * np.exp(-t / 0.012) * vel


def glint(vel=1.0):
    n = int(0.6 * SR)
    t = tt(n)
    f = 2000 + 6000 * (t / 0.6) ** 0.5
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) * 0.5
    y += hp(noise(n), 8000) * np.exp(-t / 0.08) * 0.4
    for k, m in enumerate((96, 100, 103, 108)):
        i = int(k * 0.04 * SR)
        b = bell(m, 0.35, 0.5)[: n - i]
        y[i:i + len(b)] += b
    return y * vel


def growl(vel=1.0):
    n = int(0.6 * SR)
    t = tt(n)
    f = 70 + 25 * np.sin(2 * np.pi * 7 * t) + 15 * np.sin(2 * np.pi * 13 * t)
    y = osc_pulse(f, n, 0.3)
    y = lp(y, 500) * np.sin(np.pi * t / 0.6) ** 0.7
    return y * vel


def pop_sfx(m=76, vel=1.0):
    return chip_blip(m, m + 12, 0.08, vel, 0.5)


def scoot(vel=1.0):
    n = int(0.22 * SR)
    t = tt(n)
    f = 110 + 60 * np.sin(2 * np.pi * 31 * t)
    y = osc_saw(f, n) * 0.5 + bp(noise(n), 300, 1500) * 0.6
    return lp(y, 1500) * np.sin(np.pi * t / 0.22) * vel


def step(vel=1.0):
    n = int(0.09 * SR)
    t = tt(n)
    y = np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.03)
    y += bp(noise(n), 1500, 5000) * np.exp(-t / 0.006) * 0.25
    return y * vel


def click(vel=1.0):
    n = int(0.04 * SR)
    t = tt(n)
    return (bp(noise(n), 2000, 8000) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.006)) * vel


def ignite(vel=1.0):
    n = int(0.7 * SR)
    t = tt(n)
    fc = 200 + 2500 * np.exp(-t / 0.08)
    y = onepole_lp_var(noise(n), fc) * (1 - np.exp(-t / 0.01)) * np.exp(-t / 0.25)
    y += np.sin(2 * np.pi * np.cumsum(60 + 80 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.15) * 0.6
    return y * vel * 1.4


def boil_bed(dur, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    y = bp(noise(n), 200, 900) * 0.5
    # random bubble blips
    for k in range(int(dur * 9)):
        i = rng.integers(0, max(n - 4000, 1))
        m = rng.uniform(70, 88)
        b = chip_blip(m - 5, m + 3, 0.05, 0.25, 0.5)
        y[i:i + len(b)] += b
    return y * vel


def rip(vel=1.0):
    n = int(0.3 * SR)
    t = tt(n)
    cr = (rng.random(n) < 0.08).astype(float) * rng.standard_normal(n)
    y = bp(cr + 0.3 * noise(n), 1500, 9000) * np.sin(np.pi * t / 0.3) ** 0.4
    fc = 2000 + 6000 * t / 0.3
    return y * vel * 1.8


def splash(vel=1.0):
    n = int(0.6 * SR)
    t = tt(n)
    y = onepole_lp_var(noise(n), 5000 * np.exp(-t / 0.1) + 300) * np.exp(-t / 0.15)
    for k in range(10):
        i = int(rng.uniform(0.02, 0.35) * SR)
        m = rng.uniform(72, 92)
        b = chip_blip(m, m + 7, 0.06, 0.4)
        y[i:i + len(b)] += b
    y += np.sin(2 * np.pi * np.cumsum(120 - 60 * t / 0.6) / SR) * np.exp(-t / 0.08) * 0.8
    return y * vel


def shaker(dur=0.3, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    y = np.zeros(n)
    for k in range(int(dur / 0.0625)):
        i = int(k * 0.0625 * SR)
        m = min(int(0.05 * SR), n - i)
        seg = hp(noise(m), 5000) * np.exp(-tt(m) / 0.015) * (1.0 if k % 2 == 0 else 0.6)
        y[i:i + m] += seg
    return y * vel


def crack(vel=1.0):
    n = int(0.25 * SR)
    t = tt(n)
    y = bp(noise(n), 1500, 7000) * np.exp(-t / 0.012) * 1.3
    y += bp((rng.random(n) < 0.05) * noise(n), 1000, 6000) * np.exp(-t / 0.05)
    return y * vel


def plop(vel=1.0):
    n = int(0.15 * SR)
    t = tt(n)
    f = 700 * np.exp(-t / 0.05) + 200
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05) * vel


def swish(vel=1.0):
    n = int(0.4 * SR)
    t = tt(n)
    y = bp(noise(n), 600, 3000) * np.sin(np.pi * t / 0.4) ** 2
    return y * vel


def woodblock(m=86, vel=1.0):
    n = int(0.08 * SR)
    t = tt(n)
    return np.sin(2 * np.pi * mtof(m) * t) * np.exp(-t / 0.015) * vel


def chop(vel=1.0):
    n = int(0.12 * SR)
    t = tt(n)
    y = np.sin(2 * np.pi * np.cumsum(180 + 200 * np.exp(-t / 0.005)) / SR) * np.exp(-t / 0.03)
    y += bp(noise(n), 2500, 9000) * np.exp(-t / 0.005) * 0.8
    return y * vel


def sprinkle(vel=1.0):
    n = int(0.4 * SR)
    y = np.zeros(n)
    for k in range(24):
        i = int(rng.uniform(0, 0.33) * SR)
        m = int(0.02 * SR)
        y[i:i + m] += hp(noise(m), 7000) * np.exp(-tt(m) / 0.004) * rng.uniform(0.4, 1)
    return y * vel


def pour(dur, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    x = noise(n)
    mod = 900 + 500 * np.sin(2 * np.pi * 9 * t) + 300 * np.sin(2 * np.pi * 23 * t)
    y = onepole_lp_var(x, mod * 2) - onepole_lp_var(x, mod * 0.6)
    e = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.15)
    for k in range(int(dur * 14)):
        i = int(rng.uniform(0, dur - 0.08) * SR)
        m = rng.uniform(68, 84)
        b = chip_blip(m, m + 5, 0.05, 0.25)
        y[i:i + len(b)] += b
    return y * e * vel * 1.5


def slurp(vel=1.0):
    dur = 0.42
    n = int(dur * SR)
    t = tt(n)
    s = t / dur
    fc = 500 + 2500 * s ** 1.5 + 300 * np.sin(2 * np.pi * 28 * t)
    x = noise(n)
    y = onepole_lp_var(x, fc) - onepole_lp_var(x, fc * 0.4)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 18 * t)
    e = np.sin(np.pi * s) ** 0.8
    return y * am * e * vel * 3


def boing(vel=1.0):
    n = int(0.25 * SR)
    t = tt(n)
    f = mtof(60 + 24 * (t / 0.25)) * (1 + 0.05 * np.sin(2 * np.pi * 30 * t))
    return osc_pulse(f, n, 0.25) * np.exp(-t / 0.1) * vel


def riser(dur, vel=1.0):
    n = int(dur * SR)
    t = tt(n)
    s = t / dur
    y = onepole_lp_var(noise(n), 300 + 9000 * s ** 2) * s ** 1.5
    y += osc_pulse(mtof(50 + 36 * s), n, 0.5) * 0.15 * s
    return y * vel


# ======================================================================== music
def M(name):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "Bb": 10, "B": 11}
    return names[name[:-1]] + 12 * (int(name[-1]) + 1)


CHORDS = {
    "Em9":   (M("E2"), [55, 59, 62, 66]),
    "A13":   (M("A2"), [55, 61, 66, 71]),
    "Cmaj9": (M("C2"), [52, 55, 59, 62]),
    "B7#9":  (M("B1"), [51, 57, 62, 66]),
    "Bm9":   (M("B1"), [50, 57, 61, 66]),
    "Bm7":   (M("B1"), [50, 57, 62, 66]),
    "Am9":   (M("A1") + 12, [48, 55, 59, 64]),
    "D13":   (M("D2"), [54, 60, 64, 71]),
    "D7b9":  (M("D2"), [54, 60, 63, 69]),
    "Gmaj9": (M("G2") - 12 + 12, [59, 62, 66, 69]),
    "D6/9":  (M("D2"), [54, 59, 64, 69]),
}
# (start beat, chord, length beats)
PROG = [
    (0, "Em9", 4),
    (4, "Em9", 4), (8, "A13", 4),
    (12, "Cmaj9", 2), (14, "B7#9", 2),
    (16, "Cmaj9", 4), (20, "Bm9", 4), (24, "Am9", 4), (28, "D13", 4),
    (32, "Cmaj9", 2), (34, "Bm7", 2), (36, "Am9", 2), (38, "D7b9", 2),
    (40, "Gmaj9", 4), (44, "Cmaj9", 2), (46, "D6/9", 2),
    (48, "Cmaj9", 2), (50, "Bm7", 2), (52, "Am9", 2), (54, "D13", 2),
    (56, "Gmaj9", 5),
]


def b2t(b):
    return b * BEAT


def chord_at(b):
    cur = PROG[0]
    for p in PROG:
        if p[0] <= b:
            cur = p
    return cur


def build_music():
    drums, bass, keys, lead, fx_mus = Bus(), Bus(), Bus(), Bus(), Bus()
    s16 = BEAT / 4

    # ---------------- drums
    def groove(bar, style):
        t0 = bar * BAR
        if style == "A":
            kicks = {0: 1, 6: .55, 10: .9}
            snares = {4: 1, 12: 1}
            ghosts = {7: .22, 15: .18, 9: .15}
            opens = {14}
        elif style == "B":
            kicks = {0: 1, 3: .6, 8: .9, 10: .7}
            snares = {4: 1, 12: 1}
            ghosts = {7: .25, 11: .2, 15: .22}
            opens = {6, 14}
        else:  # half-time outro
            kicks = {0: 1, 10: .6}
            snares = {8: .9}
            ghosts = {14: .15}
            opens = {6}
        for s, v in kicks.items():
            drums.add(kick(v), t0 + s * s16, 0.9)
        for s, v in snares.items():
            drums.add(snare(v), t0 + s * s16, 0.55, 0.05)
            if style == "B":
                drums.add(clap(v), t0 + s * s16, 0.35, -0.1)
        for s, v in ghosts.items():
            drums.add(snare(v), t0 + s * s16, 0.55, 0.05)
        for s in range(16):
            if style == "C" and s % 2 == 1:
                continue
            if s in opens:
                drums.add(hat(0.7, True), t0 + s * s16, 0.5, 0.3)
            elif (s - 1) not in opens:
                acc = 0.8 if s % 2 == 0 else 0.45
                if style == "C":
                    acc *= 0.6
                drums.add(hat(acc), t0 + s * s16 + (0.012 if s % 2 else 0), 0.5, 0.3)

    # intro bar 0: hits + fill
    drums.add(kick(1), T_SAT, 1.0); drums.add(crash(1), T_SAT, 0.7, -0.2)
    drums.add(kick(0.9), T_DOT, 0.9); drums.add(snare(0.9), T_DOT, 0.5)
    for k in range(8):
        tk = T_EVEN + k * s16
        drums.add(hat(0.6 + 0.05 * k), tk, 0.45, 0.3)
    for k in range(4):                       # snare crescendo into bar 1
        drums.add(snare(0.35 + 0.18 * k), 1.5 + k * s16, 0.55)
    for bar in (1, 2):
        groove(bar, "A")
    drums.add(crash(0.9), 2.0, 0.55, -0.2)
    # bar 3: cut-in -> stop time
    drums.add(crash(1), CUT1[0], 0.6, -0.2); drums.add(kick(1), CUT1[0], 1.0)
    for s in range(0, 8):
        drums.add(hat(0.5 + 0.1 * (s % 2 == 0)), CUT1[0] + s * s16, 0.4, 0.3)
    drums.add(kick(1), T_LETSCOOK, 1.0); drums.add(snare(1), T_LETSCOOK, 0.6); drums.add(clap(1), T_LETSCOOK, 0.4)
    for k in range(4):                        # tom fill 7.5-8.0
        drums.add(tom(0.9, 200 - k * 30), 7.5 + k * s16, 0.6, 0.3 - 0.2 * k)
    # cooking bars 4..9
    for bar in range(4, 10):
        if bar == 9:
            # first half groove, then roll to the achievement
            t0 = bar * BAR
            for s, v in {0: 1, 3: .6}.items():
                drums.add(kick(v), t0 + s * s16, 0.9)
            drums.add(snare(1), t0 + 4 * s16, 0.55)
            for s in range(8):
                drums.add(hat(0.7 if s % 2 == 0 else 0.4), t0 + s * s16, 0.5, 0.3)
            # snare roll 16ths -> 32nds (19.0 - 20.0)
            for k in range(8):
                drums.add(snare(0.3 + 0.06 * k), 19.0 + k * s16, 0.5)
            for k in range(8):
                drums.add(snare(0.8 + 0.03 * k), 19.5 + k * s16 / 2, 0.5)
            continue
        groove(bar, "B")
    drums.add(crash(0.9), PANEL[0], 0.6, -0.2)
    # achievement bars 10-11
    drums.add(crash(1.2, 3.0), T_ACH, 0.8, -0.2); drums.add(crash(1.0, 3.0), T_ACH, 0.5, 0.3)
    drums.add(kick(1.2), T_ACH, 1.0)
    groove_start = T_ACH + 2 * BEAT        # let the arpeggio breathe, groove back on beat 3
    for s in range(8, 16):
        drums.add(hat(0.7 if s % 2 == 0 else 0.4), 20.0 + s * s16 - 0 * BAR, 0.5, 0.3)
    drums.add(kick(1), 21.0, 0.9); drums.add(snare(1), 21.5, 0.55); drums.add(clap(1), 21.5, 0.35)
    groove(11, "B")
    drums.add(crash(1), T_STAT + STAT_FILL, 0.55, 0.2)
    # outro half-time bars 12-13
    drums.add(crash(0.8), 24.05, 0.4, -0.2)
    for bar in (12, 13):
        groove(bar, "C")
    drums.add(kick(1), T_FINAL, 0.8); drums.add(crash(0.8, 3.0), T_FINAL, 0.45, -0.2)

    # ---------------- bass
    def bass_bar(b0, length, root, nxt, style):
        t0 = b2t(b0)
        steps = int(length * 4)
        if style == "A":
            pat = [(0, 0, 2, 1.0, False), (3, 12, 1, .8, True), (4, 0, 1, .35, False), (6, 7, 2, .8, False),
                   (8, 10, 1, .8, False), (10, 12, 1, .9, True), (11, 10, 1, .6, False), (12, 7, 2, .85, False),
                   (14, 5, 1, .7, False)]
        elif style == "B":
            pat = [(0, 0, 1.5, 1.0, False), (2, 12, 1, .8, True), (3, 0, 1, .5, False), (5, 7, 1, .8, False),
                   (6, 12, 1, .85, True), (8, 0, 1, .9, False), (10, 10, 1, .8, False), (11, 12, 1, .8, True),
                   (12, 7, 1, .85, False), (13, 5, 1, .6, False)]
        else:
            pat = [(0, 0, 5, 1.0, False), (6, 7, 1.5, .7, False), (10, 12, 1, .6, True), (12, 10, 2, .7, False)]
        for s, iv, ln, v, pop in pat:
            if s >= steps - 1:
                continue
            bass.add(bass_note(root + iv, ln * s16 * 0.95, v, pop), t0 + s * s16)
        # chromatic approach on the last 16th
        if nxt is not None and style != "C":
            appr = nxt - 1 if nxt - 1 >= root - 5 else nxt + 1
            while appr - root > 7:
                appr -= 12
            bass.add(bass_note(appr, s16 * 0.9, .7), t0 + (steps - 1) * s16)

    # intro run into bar 1
    bass.add(bass_note(M("E2"), 0.5, 1.0), T_SAT)
    bass.add(bass_note(M("E2"), 0.2, 0.9, True), T_DOT)
    run = [M("E2"), M("F#2"), M("G2"), M("A2"), M("B2"), M("C#3"), M("D3"), M("D#3")]
    for k, m in enumerate(run):
        bass.add(bass_note(m - 12 if k < 0 else m, s16 * 0.9, 0.8, k % 2 == 1), T_EVEN + k * s16)
    for i, (b0, name, ln) in enumerate(PROG):
        if b0 == 0:
            continue
        root = CHORDS[name][0]
        nxt = CHORDS[PROG[i + 1][1]][0] if i + 1 < len(PROG) else None
        if b0 in (12, 14):       # cut-in bar: long notes
            bass.add(bass_note(root, 0.9, 1.0), b2t(b0))
            bass.add(bass_note(root + 12, 0.2, 0.8, True), b2t(b0) + 0.75)
            continue
        if b0 == 38:             # into the achievement: hold + slide
            bass.add(bass_note(root, 0.45, 1.0), b2t(b0))
            for k in range(4):
                bass.add(bass_note(root + 12 - k, 0.1, 0.7, True), b2t(b0) + 0.5 + k * s16)
            continue
        if b0 == 40:
            bass.add(bass_note(root, 0.9, 1.1), b2t(b0))
            bass.add(bass_note(root + 12, 0.2, 0.8, True), b2t(b0) + 1.0 + s16 * 2)
            bass.add(bass_note(root + 7, 0.2, 0.8), b2t(b0) + 1.5)
            continue
        if b0 == 56:
            bass.add(bass_note(root, 2.0, 1.0), b2t(b0))
            continue
        style = "A" if b0 < 12 else ("C" if b0 >= 48 else "B")
        bass_bar(b0, ln, root, nxt, style)

    # ---------------- keys (FM EP comping)
    def comp(b0, ln, notes, style, vel=0.5):
        t0 = b2t(b0)
        steps = int(ln * 4)
        if style == "A":
            hits = [(0, 3), (3, 1), (6, 2), (10, 1), (11, 3)]
        elif style == "B":
            hits = [(0, 2), (3, 1), (6, 2), (8, 1), (10, 1), (11, 2), (14, 1)]
        elif style == "C":
            hits = [(0, 7), (8, 6)]
        else:
            hits = [(0, 1)]
        for s, l in hits:
            if s >= steps:
                continue
            for k, m in enumerate(notes):
                keys.add(ep_note(m, l * s16 * 0.9, vel * (0.8 + 0.08 * k)), t0 + s * s16 + k * 0.004, 1.0,
                         -0.35 + 0.23 * k)

    for b0, name, ln in PROG:
        notes = CHORDS[name][1]
        if b0 == 0:
            continue
        if b0 in (12, 14, 38, 40, 56):
            continue
        style = "A" if b0 < 12 else ("C" if b0 >= 48 else "B")
        comp(b0, ln, notes, style, 0.42 if style != "C" else 0.5)
    # sustained EP pads at special spots
    for b0, dur, name in ((12, 0.9, "Cmaj9"), (14, 0.5, "B7#9"), (38, 0.9, "D7b9"), (40, 1.8, "Gmaj9"), (56, 2.4, "Gmaj9")):
        for k, m in enumerate(CHORDS[name][1]):
            keys.add(ep_note(m, dur, 0.5), b2t(b0) + k * 0.006, 1.0, -0.35 + 0.23 * k)

    # ---------------- brass stabs at hits
    stabs = [(T_SAT, "Em9", 0.35), (T_DOT, "Em9", 0.18), (2.0, "Em9", 0.25), (CUT1[0], "Cmaj9", 0.35),
             (T_LETSCOOK, "B7#9", 0.4), (PANEL[0], "Cmaj9", 0.3), (T_ACH, "Gmaj9", 0.6), (T_STAT + STAT_FILL, "D6/9", 0.4),
             (T_FINAL, "Gmaj9", 0.8)]
    for ts, name, dur in stabs:
        root, notes = CHORDS[name]
        fx_mus.add(brass_stab([n + 12 for n in notes] + [root + 24], dur, 1.0), ts, 0.55)

    # ---------------- lead melody
    B = lambda n: M(n)
    cook = [
        (16.5, "B4", .5), (17, "D5", .5), (17.5, "E5", 1), (18.5, "G5", .25), (18.75, "F#5", .25), (19, "E5", .5), (19.5, "D5", .5),
        (20, "F#5", 1.5), (21.5, "E5", .5), (22, "D5", .5), (22.5, "B4", 1), (23.5, "A4", .5),
        (24, "B4", 1), (25, "C5", .5), (25.5, "D5", .5), (26, "E5", 1), (27, "G5", .5), (27.5, "A5", .5),
        (28, "F#5", 2), (30, "E5", .5), (30.5, "D5", .5), (31, "B4", .5), (31.5, "D5", .5),
        (32, "E5", 1), (33, "G5", .5), (33.5, "F#5", .5), (34, "D5", 1), (35, "E5", .5), (35.5, "F#5", .5),
        (36, "G5", 1), (37, "A5", .5), (37.5, "B5", .5), (38, "A5", .25), (38.25, "G5", .25), (38.5, "F#5", .5), (39, "A5", 1),
    ]
    for b0, nm, ln in cook:
        lead.add(lead_note(B(nm), ln * BEAT * 0.92, 0.5, 0.25), b2t(b0), 1.0, 0.1)
        lead.add(lead_note(B(nm) - 12, ln * BEAT * 0.92, 0.18, 0.5, False), b2t(b0), 1.0, -0.15)
    fanfare = [(42, "D5", .25), (42.25, "E5", .25), (42.5, "G5", .5), (43, "B5", .5), (43.5, "A5", .5),
               (44, "G5", 1), (45, "E5", .5), (45.5, "G5", .5), (46, "A5", 1.5), (47.5, "B5", .5)]
    for b0, nm, ln in fanfare:
        lead.add(lead_note(B(nm), ln * BEAT * 0.92, 0.5, 0.5), b2t(b0), 1.0, 0.1)
        lead.add(lead_note(B(nm) + 12, ln * BEAT * 0.92, 0.15, 0.125), b2t(b0), 1.0, -0.2)
    outro = [(48, "G5", 1), (49, "E5", .5), (49.5, "D5", .5), (50, "F#5", 2),
             (52, "E5", 1), (53, "C5", .5), (53.5, "B4", .5), (54, "A4", 1), (55, "B4", .5), (55.5, "D5", .5), (56, "G5", 4)]
    for b0, nm, ln in outro:
        lead.add(vibe_note(B(nm), ln * BEAT, 0.45), b2t(b0), 1.0, 0.1)
        lead.add(lead_note(B(nm), ln * BEAT * 0.9, 0.12, 0.5), b2t(b0), 1.0, -0.1)

    # ---------------- musical UI jingles
    # achievement arpeggio, one note per letter pop
    arp = ["G4", "A4", "B4", "D5", "F#5", "G5", "A5", "B5", "D6", "F#6", "G6", "A6", "B6", "D7"]
    for k, ta in enumerate(ach_letter_times()):
        m = B(arp[k % len(arp)])
        fx_mus.add(bell(m, 0.5, 0.8), ta, 1.0, -0.4 + 0.8 * k / 13)
        fx_mus.add(chip_blip(m, m, 0.06, 0.18, 0.25), ta, 1.0, 0.0)
    # shine chord
    for k, m in enumerate(("G6", "B6", "D7", "F#7")):
        fx_mus.add(bell(B(m), 0.4, 1.5), T_ACH + ACH_SHINE + 0.05 + k * 0.03, 1.0, -0.3 + 0.2 * k)
    # stat up chime (rank up)
    for k, m in enumerate(("D5", "F#5", "A5", "D6")):
        fx_mus.add(bell(B(m), 0.55, 1.0), T_STAT + STAT_FILL + k * 0.06, 1.0, 0.2)
        fx_mus.add(chip_blip(B(m), B(m), 0.08, 0.2, 0.5), T_STAT + STAT_FILL + k * 0.06, 1.0, 0.2)
    # done ding at serve
    for k, m in enumerate(("B5", "D6", "G6")):
        fx_mus.add(bell(B(m), 0.45, 1.0), T_SERVE + k * 0.05, 1.0, -0.2)
    # final arpeggio + tail ding
    for k, m in enumerate(("G4", "B4", "D5", "F#5", "A5", "B5", "D6", "G6")):
        fx_mus.add(bell(B(m), 0.4, 2.0), T_FINAL + k * 0.0625, 1.0, -0.4 + 0.1 * k)
    fx_mus.add(bell(B("G6"), 0.35, 1.6), IRIS[1], 1.0, 0.0)
    fx_mus.add(bell(B("D7"), 0.25, 1.6), IRIS[1] + 0.06, 1.0, 0.1)
    return drums, bass, keys, lead, fx_mus


def build_sfx():
    fx = Bus()
    s16 = BEAT / 4
    fx.add(slam(1.0), T_SAT, 0.55)
    fx.add(slam(0.6), T_DOT, 0.4)
    for k in range(7):
        fx.add(tick(84 + k * 2, 0.35), T_EVEN + k * EVEN_GAP, 1.0, -0.3 + 0.1 * k)
    fx.add(whoosh(0.5, True, 0.8), WIPE1[0], 0.6)
    fx.add(slam(0.5), sum(WIPE1) / 2, 0.3)
    fx.add(growl(1.0), T_GROWL, 0.55)
    fx.add(pop_sfx(79, 0.35), BUBBLE[0], 1.0, -0.1)
    fx.add(pop_sfx(72, 0.25), BUBBLE[1] - 0.08, 1.0, -0.1)
    fx.add(scoot(0.8), T_STAND, 0.4, -0.2)
    fx.add(whoosh(0.25, True, 0.4), T_STAND, 0.4)
    for k, ts in enumerate(STEPS):
        fx.add(step(0.7), ts, 0.45, -0.3 + 0.6 * k / 7)
    fx.add(whoosh(0.3, True, 1.0), CUT1[0] - 0.12, 0.6)
    fx.add(slam(0.8), CUT1[0], 0.4)
    fx.add(glint(1.0), T_GLINT, 0.45, 0.2)
    fx.add(slam(1.0), T_LETSCOOK, 0.5)
    fx.add(whoosh(0.25, False, 0.9), CUT1[1] - 0.2, 0.5)
    fx.add(whoosh(0.25, True, 1.0), PANEL[0] - 0.1, 0.6)
    fx.add(slam(0.9), PANEL[0], 0.45)
    fx.add(whoosh(0.25, True, 0.6), PANEL[0] + 0.1, 0.35, 0.5)
    fx.add(click(0.9), T_KNOB, 0.5, 0.3)
    fx.add(click(0.6), T_KNOB + 0.07, 0.4, 0.3)
    fx.add(ignite(1.0), T_FIRE, 0.55, 0.2)
    fx.add(boil_bed(BOWL[0] + 0.6 - T_BUBBLES, 1.0) * np.clip(np.linspace(0, 4, int((BOWL[0] + 0.6 - T_BUBBLES) * SR)), 0, 1)
           * np.clip(np.linspace(6, 0, int((BOWL[0] + 0.6 - T_BUBBLES) * SR)), 0, 1), T_BUBBLES, 0.22, 0.25)
    for k in range(8):
        m = 76 + (k * 5) % 12
        fx.add(chip_blip(m, m + 7, 0.06, 0.35), T_BUBBLES + k * BEAT / 4 + 0.02 * (k % 3), 0.5, 0.2)
    for ts in (PACKET[0], PACKET[1], BOARD[0], BOARD[1], BOWL[0]):
        fx.add(whoosh(0.16, True, 0.6), ts - 0.08, 0.35)
    fx.add(rip(1.0), T_RIP, 0.55)
    fx.add(splash(1.0), T_DROP, 0.55)
    for ts in (T_RED, T_CREAM, T_FLAKE):
        fx.add(shaker(0.32, 1.0), ts, 0.28, 0.25)
    fx.add(crack(1.0), T_EGG, 0.6)
    fx.add(plop(0.8), T_EGG + 0.08, 0.5)
    for k in range(4):
        fx.add(swish(1.0), STIR[0] + k * BEAT - 0.1, 0.28, 0.3 * (1 if k % 2 else -1))
    for k in range(8):
        fx.add(woodblock(88 if k % 2 == 0 else 83, 0.5), STIR[0] + k * BEAT / 2, 0.3, 0.4)
    for ts in CHOPS:
        fx.add(chop(1.0), ts, 0.55, -0.1)
    fx.add(sprinkle(1.0), T_ONION, 0.35)
    fx.add(pour(POUR[1] - POUR[0] + 0.1, 1.0), POUR[0], 0.35)
    fx.add(whoosh(0.25, False, 0.8), PANEL[1] - 0.2, 0.45)
    fx.add(boing(0.8), T_PRESENT, 0.3)
    fx.add(riser(1.0, 1.0), T_ACH - 1.0, 0.35)
    fx.add(slam(1.2), T_ACH, 0.6)
    fx.add(whoosh(0.2, True, 1.0), T_ACH - 0.1, 0.5, 0.4)
    fx.add(glint(1.0), T_ACH + ACH_SHINE, 0.35)
    fx.add(whoosh(0.25, False, 0.8), T_ACH + ACH_DUR - 0.2, 0.4, -0.3)
    fx.add(whoosh(0.2, True, 0.8), T_STAT - 0.05, 0.4, -0.4)
    fx.add(slam(1.0), T_STAT + STAT_FILL, 0.45)
    fx.add(whoosh(0.5, True, 0.8), WIPE2[0], 0.55)
    fx.add(slam(0.5), sum(WIPE2) / 2, 0.3)
    for ts in SLURPS:
        fx.add(slurp(1.0), ts - 0.02, 0.5, -0.15)
    for k in range(3):
        fx.add(pop_sfx(84 + k * 3, 0.4), T_HEARTS + k * 0.12, 1.0, -0.2 + 0.2 * k)
    fx.add(whoosh(0.3, True, 0.9), CUT2[0] - 0.12, 0.5)
    fx.add(slam(0.7), CUT2[0], 0.3)
    for k in range(7):
        fx.add(tick(86 + k, 0.3), CUT2[0] + 0.5 + k * 0.035, 1.0)
    fx.add(whoosh(0.25, False, 0.8), CUT2[1] - 0.2, 0.4)
    fx.add(whoosh(1.1, False, 0.6), IRIS[0], 0.35)
    return fx


def reverb_ir(sec=1.6):
    n = int(sec * SR)
    t = tt(n)
    ir = np.vstack([rng.standard_normal(n), rng.standard_normal(n)]) * np.exp(-t / (sec / 5))
    ir[:, : int(0.012 * SR)] = 0
    ir = np.vstack([lp(ir[0], 6000), lp(ir[1], 6000)])
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def delay(st, time, fb=0.35, mix=0.3):
    out = st.copy()
    d = int(time * SR)
    for k in range(1, 5):
        g = mix * fb ** (k - 1)
        sh = d * k
        # ping-pong
        src = st[0] if k % 2 else st[1]
        tgt = 1 if k % 2 else 0
        out[tgt, sh:] += src[:-sh] * g
    return out


def main():
    drums, bass, keys, lead, fx_mus = build_music()
    fx = build_sfx()
    D, Bs, K, L, FM, F = (b.stereo() for b in (drums, bass, keys, lead, fx_mus, fx))
    # sidechain-ish pump from kick onto keys & bass
    kick_env = np.abs(drums.L)
    kick_env = lp(kick_env, 20)
    duck = 1 - 0.35 * np.clip(kick_env / (kick_env.max() + 1e-9) * 3, 0, 1)
    K *= duck; Bs *= 0.6 + 0.4 * duck
    L = delay(L, BEAT * 0.75, 0.4, 0.28)
    music = 0.9 * D + 0.55 * Bs + 0.55 * K + 0.62 * L + 0.6 * FM
    ir = reverb_ir()
    send = 0.35 * K + 0.3 * L + 0.4 * FM + 0.08 * D + 0.15 * F
    rev = np.vstack([fftconvolve(send[0], ir[0])[:N], fftconvolve(send[1], ir[1])[:N]])
    mix = music + 1.0 * F + 0.28 * rev
    mix = hp(mix, 25, 2)
    # fade out last 0.4s
    fade = np.ones(N)
    fl = int(0.45 * SR)
    fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
    mix *= fade
    peak = np.max(np.abs(mix))
    mix = mix / peak * 1.35
    mix = np.tanh(mix) / np.tanh(1.35) * 0.93   # gentle soft clip
    wavfile.write(sys.argv[1], SR, (mix.T * 32767).astype(np.int16))
    print("peak", peak, "rms dB", 20 * np.log10(np.sqrt(np.mean(mix ** 2))))


if __name__ == "__main__":
    main()
