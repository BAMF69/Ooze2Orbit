#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# make_sfx.py
# Purpose : Ooze2Orbit's sound effects, synthesized from code as wet, organic, squishy sounds (water-drop bubbles,
#           resonant squelches, rubbery thuds), so they can be re-rendered or tuned at any time and carry no licence
#           question (ship-safe: no samples, no models).
# Usage   : python assets_src/audio/make_sfx.py            # writes public/assets/audio/sfx/<name>[_n].wav + recipes
#           python assets_src/audio/make_sfx.py --only pop  # one sound family
# Notes   : v2 2026-11-07 (playtest: "more organic and squishy"): replaces the Wavesmith retro-synth version
#           (square/sine blips). Standard library only; WAVs written with tools/audio/wavesmith/wavfile.py.
#           Building blocks:
#             bubble  - a sine whose pitch glides fast (rising = the classic water drop "plip", falling = a "bloop")
#             squelch - white noise through a resonant band-pass whose centre sweeps (wet, fleshy), with a wobble
#             thud    - a low sine dropping in pitch plus a dull noise puff (rubbery collision)
#           Each family renders a few seeded variations (pitches and timings jitter by VARY). Every file is
#           normalized to PEAK; data/audio_events.json sets the mix levels. Recipe JSON next to each WAV.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import argparse
import json
import math
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "audio" / "wavesmith"))
from wavfile import write_wav  # noqa: E402

OUT = ROOT / "public" / "assets" / "audio" / "sfx"
RATE = 44100
PEAK = 0.7          # -3 dBFS before the mix (data/audio_events.json does the levels)
VARY = 0.1          # +-10 % jitter per variation
FADE_S = 0.004      # click-free ends


# ---- building blocks: each returns a list of float samples ----------------------------------------------------
def silence(seconds):
    return [0.0] * int(seconds * RATE)


def mix_into(dst, src, at_s, gain=1.0):
    """Add src into dst starting at at_s seconds, growing dst if needed."""
    i0 = int(at_s * RATE)
    if len(dst) < i0 + len(src):
        dst.extend([0.0] * (i0 + len(src) - len(dst)))
    for i, v in enumerate(src):
        dst[i0 + i] += v * gain
    return dst


def bubble(f0, f1, dur, decay=None):
    """A sine gliding exponentially from f0 to f1 over dur, with a fast attack and an exponential decay."""
    n = int(dur * RATE)
    decay = decay or dur / 4
    out, phase = [], 0.0
    for i in range(n):
        t = i / RATE
        f = f0 * (f1 / f0) ** min(1.0, t / dur)
        phase += 2 * math.pi * f / RATE
        amp = min(1.0, t / 0.003) * math.exp(-t / decay)
        out.append(math.sin(phase) * amp)
    return out


def squelch(fc0, fc1, dur, q, rng, wobble_hz=0.0, wobble=0.0, decay=None):
    """White noise through a resonant band-pass sweeping fc0 -> fc1; optional amplitude wobble (wet flutter)."""
    n = int(dur * RATE)
    decay = decay or dur / 3
    x1 = x2 = y1 = y2 = 0.0
    out = []
    for i in range(n):
        t = i / RATE
        fc = fc0 * (fc1 / fc0) ** min(1.0, t / dur)
        w0 = 2 * math.pi * fc / RATE
        alpha = math.sin(w0) / (2 * q)
        a0 = 1 + alpha
        b0, b2 = alpha / a0, -alpha / a0
        a1, a2 = -2 * math.cos(w0) / a0, (1 - alpha) / a0
        x0 = rng.uniform(-1, 1)
        y0 = b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, x0, y1, y0
        amp = min(1.0, t / 0.004) * math.exp(-t / decay)
        if wobble:
            amp *= 1 - wobble * (0.5 + 0.5 * math.sin(2 * math.pi * wobble_hz * t))
        out.append(y0 * amp * 3.0)  # the band-pass is quiet; the normalize step sets the final level
    return out


def lowpass(samples, cutoff):
    """One-pole low-pass: rounds off harsh edges."""
    a = math.exp(-2 * math.pi * cutoff / RATE)
    y, out = 0.0, []
    for v in samples:
        y = (1 - a) * v + a * y
        out.append(y)
    return out


def thud(f0, f1, dur, rng):
    """A rubbery body hit: a low dropping sine plus a dull noise puff."""
    body = bubble(f0, f1, dur, decay=dur / 3)
    puff = lowpass([rng.uniform(-1, 1) * math.exp(-i / (RATE * 0.02)) for i in range(int(0.06 * RATE))], 500)
    return mix_into(body, puff, 0.0, 0.8)


def finish(samples):
    """Normalize to PEAK and fade both ends (no clicks)."""
    peak = max(1e-9, max(abs(v) for v in samples))
    out = [v * PEAK / peak for v in samples]
    f = int(FADE_S * RATE)
    for i in range(min(f, len(out))):
        out[i] *= i / f
        out[-1 - i] *= i / f
    return out


# ---- the sounds: (variants, render(rng, j) where j jitters a number by +-VARY) -----------------------------------
def eat_algae(rng, j):
    s = bubble(j(420), j(1300), j(0.06))                          # a water-drop plip
    return mix_into(s, squelch(j(2600), j(1200), 0.05, 4, rng), 0.0, 0.25)


def eat_meat(rng, j):
    s = squelch(j(1100), j(240), j(0.18), 5, rng, wobble_hz=j(24), wobble=0.6)   # a fleshy squelch
    return mix_into(s, bubble(j(240), j(110), 0.12), 0.01, 0.5)


def bump(rng, j):
    s = thud(j(95), j(48), j(0.14), rng)                          # rubbery bodies colliding
    return mix_into(s, squelch(j(700), j(220), 0.09, 3, rng), 0.0, 0.5)


def pop(rng, j):
    s = [rng.uniform(-1, 1) * math.exp(-i / (RATE * 0.0015)) for i in range(int(0.006 * RATE))]  # the membrane gives
    mix_into(s, bubble(j(900), j(260), j(0.07)), 0.002, 0.9)                                     # a falling bloop
    mix_into(s, squelch(j(1600), j(350), j(0.18), 4, rng, wobble_hz=30, wobble=0.5), 0.01, 0.8)  # the wet spill
    mix_into(s, bubble(j(600), j(1500), 0.04), j(0.09), 0.35)                                    # stray bubbles
    return mix_into(s, bubble(j(700), j(1800), 0.035), j(0.14), 0.25)


def part(rng, j):
    s = bubble(j(280), j(700), j(0.13))                           # a slow gloop as it is absorbed
    mix_into(s, bubble(j(480), j(1100), 0.08), 0.09, 0.7)
    return mix_into(s, squelch(500, 1400, 0.2, 6, rng), 0.0, 0.3)


def upgrade(rng, j):
    s = []
    for k, f in enumerate((380, 520, 720)):                       # three rising bubbles: something grew
        mix_into(s, bubble(j(f), j(f * 2.6), 0.07), k * 0.075, 0.9)
    return mix_into(s, squelch(400, 1800, 0.3, 5, rng), 0.0, 0.25)


def deny(rng, j):
    n = int(0.17 * RATE)                                          # a dull wet "blorp", wobbling down
    s, phase = [], 0.0
    for i in range(n):
        t = i / RATE
        phase += 2 * math.pi * (165 - 60 * t / 0.17) / RATE
        s.append(math.sin(phase) * (0.6 + 0.4 * math.sin(2 * math.pi * 18 * t)) * math.exp(-t / 0.07))
    return lowpass(s, 900)


def evolve(rng, j):
    s = squelch(200, 1700, 1.4, 4, rng, decay=2.0)                # a rising, swelling churn
    s = [v * min(1.0, (i / RATE) / 0.9) for i, v in enumerate(s)]
    for k in range(18):                                           # bubbles thickening and rising
        t = 0.1 + 1.1 * (k / 18) ** 0.7
        f = 300 + 900 * k / 18
        mix_into(s, bubble(j(f), j(f * 2.4), 0.06), t + rng.uniform(-0.02, 0.02), 0.35 + 0.3 * k / 18)
    return mix_into(s, bubble(220, 900, 0.35, decay=0.12), 1.15, 1.0)   # one big final gulp


def choose(rng, j):
    return bubble(j(380), j(950), 0.07)


def warn_behind(rng, j):
    """Aquatic stage: something is behind you. A low double throb, like a heartbeat in deep water: distinct from
    every pickup sound and low enough to cut through them (docs/stages/02-aquatic.md, the behind-you warning)."""
    s = []
    for k, at in enumerate((0.0, 0.2)):
        beat = thud(70 - 8 * k, 38, 0.16, rng)
        mix_into(s, beat, at, 1.0 - 0.25 * k)
    n = int(0.42 * RATE)  # a faint low growl under both beats
    growl, phase = [], 0.0
    for i in range(n):
        t = i / RATE
        phase += 2 * math.pi * 55 / RATE
        growl.append(math.sin(phase) * (0.5 + 0.5 * math.sin(2 * math.pi * 11 * t)) * math.exp(-t / 0.25))
    return mix_into(s, lowpass(growl, 400), 0.0, 0.35)


def chomp(rng, j):
    """Aquatic stage: the deepmaw bites you. A wet snap: a sharp click of jaws, then a heavy squelch."""
    s = [rng.uniform(-1, 1) * math.exp(-i / (RATE * 0.002)) for i in range(int(0.01 * RATE))]
    mix_into(s, thud(j(120), j(60), 0.12, rng), 0.004, 0.9)
    return mix_into(s, squelch(j(900), j(200), j(0.2), 5, rng, wobble_hz=26, wobble=0.5), 0.02, 0.8)


def clicks(rng, n, gap, decay, at=0.0):
    """n sharp noise clicks gap seconds apart: teeth meeting."""
    s = []
    for k in range(n):
        c = [rng.uniform(-1, 1) * math.exp(-i / (RATE * decay)) for i in range(int(decay * 6 * RATE))]
        mix_into(s, c, at + k * gap, 1.0 - 0.2 * k)
    return s


def crunch(rng, dur, grains, cutoff):
    """A gritty crunch: a run of short noise grains, lowpassed (a beak through shell)."""
    s = silence(dur)
    for _ in range(grains):
        at = rng.uniform(0, dur * 0.8)
        g = [rng.uniform(-1, 1) * math.exp(-i / (RATE * 0.004)) for i in range(int(0.02 * RATE))]
        mix_into(s, g, at, rng.uniform(0.4, 1.0))
    env = [math.exp(-(i / RATE) / (dur / 2.5)) for i in range(len(s))]
    return lowpass([v * e for v, e in zip(s, env)], cutoff)


# Each biter has its own chomp (BAMF69 2026-11-09: "can each fish have a unique chomp sound"). Read as size: the
# smaller the fish, the higher, shorter and lighter its bite; the sharks are deep, long and tearing.
def chomp_darter(rng, j):
    """A darter school nibbling: a flurry of tiny high nips."""
    s = clicks(rng, 3, j(0.035), 0.0012)
    return mix_into(s, squelch(j(2600), j(1400), j(0.06), 6, rng), 0.01, 0.5)


def chomp_spinefish(rng, j):
    """A spinefish: a sharp needle snap and a bright rattle of spines."""
    s = clicks(rng, 2, j(0.02), 0.0015)
    mix_into(s, squelch(j(3000), j(900), j(0.09), 8, rng), 0.004, 0.7)
    return mix_into(s, clicks(rng, 3, 0.018, 0.001), 0.06, 0.35)


def chomp_shellback(rng, j):
    """A shellback: a heavy beak crunching down, like a shell cracking."""
    s = thud(j(140), j(70), 0.1, rng)
    return mix_into(s, crunch(rng, j(0.22), 26, 2400), 0.01, 0.9)


def chomp_shark(rng, j):
    """A medium shark: two big jaw snaps, a deep body thud and a long tearing rip."""
    s = clicks(rng, 2, j(0.05), 0.003)
    mix_into(s, thud(j(90), j(38), 0.22, rng), 0.005, 1.0)
    mix_into(s, squelch(j(700), j(140), j(0.35), 3, rng, wobble_hz=18, wobble=0.6), 0.04, 0.9)
    return mix_into(s, crunch(rng, 0.3, 20, 1200), 0.08, 0.4)


def chomp_hammer(rng, j):
    """The hammerhead: deepest and longest, a crushing double bite with a sub-bass hit under it."""
    s = clicks(rng, 2, j(0.09), 0.004)
    mix_into(s, thud(j(70), j(28), 0.35, rng), 0.0, 1.0)
    mix_into(s, thud(j(60), j(26), 0.3, rng), 0.09, 0.8)
    mix_into(s, squelch(j(500), j(100), j(0.45), 3, rng, wobble_hz=14, wobble=0.6), 0.05, 0.9)
    return mix_into(s, crunch(rng, 0.4, 30, 900), 0.1, 0.5)


def chomp_you(rng, j):
    """Your own bite when you ram something: a crisp satisfying chomp, mid-pitched, between the darter and the deepmaw."""
    s = clicks(rng, 1, 0, 0.002)
    mix_into(s, thud(j(170), j(85), 0.09, rng), 0.003, 0.9)
    return mix_into(s, squelch(j(1500), j(400), j(0.12), 5, rng, wobble_hz=30, wobble=0.4), 0.012, 0.7)


def twinkle(rng, j):
    """Aquatic river runs: the unique part comes into view. Bright rising chimes, a sparkle you notice over the water
    (2026-11-08, BAMF69: "twinkle sound effect when it comes into view")."""
    s = []
    for k, f in enumerate((1320, 1760, 2093, 2637)):  # rising notes, each a soft bell (sine with a fast decay)
        n = int(0.32 * RATE)
        bell = [math.sin(2 * math.pi * f * (i / RATE)) * math.exp(-(i / RATE) / 0.11) * 0.8
                + math.sin(2 * math.pi * f * 2.01 * (i / RATE)) * math.exp(-(i / RATE) / 0.05) * 0.2 for i in range(n)]
        mix_into(s, bell, k * 0.07, 0.8 - k * 0.1)
    return s


SOUNDS = {
    "eat_algae": (3, eat_algae), "eat_meat": (3, eat_meat), "bump": (3, bump), "pop": (2, pop),
    "part": (1, part), "upgrade": (1, upgrade), "deny": (1, deny), "evolve": (1, evolve), "choose": (1, choose),
    "warn_behind": (1, warn_behind), "chomp": (2, chomp), "twinkle": (1, twinkle),
    "chomp_darter": (2, chomp_darter), "chomp_spinefish": (2, chomp_spinefish), "chomp_shellback": (2, chomp_shellback),
    "chomp_shark": (2, chomp_shark), "chomp_hammer": (2, chomp_hammer), "chomp_you": (3, chomp_you),
}
sys.path.insert(0, str(Path(__file__).resolve().parent))
from space_sfx import SPACE_SOUNDS  # noqa: E402  the space stage's sci-fi set (2026-11-10)
SOUNDS.update(SPACE_SOUNDS)


def render(name, variants, fn):
    for v in range(1, variants + 1):
        seed = v * 1009 + sum(map(ord, name))
        rng = random.Random(seed)
        jit = random.Random(seed + 1)
        j = (lambda x: x * (1 + jit.uniform(-VARY, VARY))) if variants > 1 else (lambda x: x)
        samples = finish(fn(rng, j))
        stem = f"{name}_{v}" if variants > 1 else name
        clipped = write_wav(OUT / f"{stem}.wav", samples, RATE)
        if clipped:
            raise SystemExit(f"[FAIL] {stem}: {clipped} clipped samples")
        (OUT / f"{stem}.sfx.json").write_text(json.dumps(
            {"tool": "assets_src/audio/make_sfx.py", "sound": name, "variant": v, "seed": seed, "rate": RATE,
             "seconds": round(len(samples) / RATE, 3)}, indent=1) + "\n", encoding="utf-8")
    print(f"[ OK ] {name}: {variants} file(s)")


MUSIC_OUT = ROOT / "public" / "assets" / "audio" / "music"


def hunt_loop():
    """Aquatic stage: the ominous loop while a shark hunts you. An original 8 s seamless loop.
    v2 2026-11-09 (BAMF69: "more ominous with more bass", "louder"): a sub-bass pedal under the beating drone, a
    driving low pulse in eighths with growling overtones (so the bass carries on small speakers too), the heartbeat,
    a slow swelling tritone, and a soft saturation that makes the whole loop denser and louder. Every frequency
    repeats a whole number of times in 8 s, so the loop point is seamless. (It avoids the famous shark-film motif.)"""
    n = int(8.0 * RATE)
    out = [0.0] * n
    two_pi = 2 * math.pi
    for i in range(n):
        t = i / RATE
        sub = 0.55 * math.sin(two_pi * 30.75 * t)  # felt more than heard
        drone = 0.45 * math.sin(two_pi * 41.0 * t) + 0.35 * math.sin(two_pi * 43.5 * t) + 0.12 * math.sin(two_pi * 82.0 * t)
        swell = 0.5 - 0.5 * math.cos(two_pi * t / 8.0)  # rises and falls once per loop
        tritone = swell * (0.22 * math.sin(two_pi * 55.0 * t) + 0.18 * math.sin(two_pi * 77.75 * t))
        e = t % 0.4  # a driving low pulse in eighths: a growl at 41 Hz with its 2nd-4th overtones
        pulse_env = math.exp(-e / 0.12) * (1.0 if int(t / 0.4) % 4 != 3 else 0.55)
        growl = pulse_env * (0.6 * math.sin(two_pi * 41.0 * t) + 0.35 * math.sin(two_pi * 82.0 * t)
                             + 0.25 * math.sin(two_pi * 123.0 * t) + 0.15 * math.sin(two_pi * 164.0 * t))
        beat = t % 0.8  # heartbeat: a thump, and a softer one after it
        thump = math.sin(two_pi * 52 * beat) * math.exp(-beat / 0.06) + 0.6 * (math.sin(two_pi * 48 * (beat - 0.22)) * math.exp(-(beat - 0.22) / 0.05) if beat > 0.22 else 0)
        out[i] = sub + 0.5 * drone + tritone + 0.8 * growl + 0.8 * thump
    out = lowpass(out, 900)
    peak = max(abs(v) for v in out) or 1
    out = [math.tanh(2.2 * v / peak) for v in out]  # soft saturation: denser, louder
    peak = max(abs(v) for v in out) or 1
    return [v * 0.85 / peak for v in out]


def calm_loop():
    """Aquatic stage: the regular background music (BAMF69 2026-11-09: "something calm and simple"). An original 16 s
    seamless loop: a soft warm pad that breathes slowly, and a sparse, gentle plucked tune on an A minor pentatonic.
    Pad frequencies are multiples of 1/16 Hz and the pluck tails wrap around, so the loop point is seamless."""
    L = 16.0
    n = int(L * RATE)
    out = [0.0] * n
    two_pi = 2 * math.pi
    pad = [(110.0, 0.30), (164.8125, 0.18), (220.0, 0.12), (261.625, 0.08)]  # A2, E3, A3, C4
    tune = [(0.0, 440.0), (2.0, 392.0), (3.0, 329.625), (4.5, 293.6875), (6.0, 329.625), (8.0, 261.625), (10.0, 293.6875),
            (11.0, 329.625), (12.5, 392.0), (14.0, 329.625)]
    for i in range(n):
        t = i / RATE
        breath = 0.75 + 0.25 * math.sin(two_pi * t / 8.0)
        v = breath * sum(a * math.sin(two_pi * f * t) for f, a in pad)
        for at, f in tune:
            d = (t - at) % L  # tails wrap around the loop point
            if d < 2.5:
                v += 0.22 * math.exp(-d / 0.55) * min(1.0, d / 0.01) * (math.sin(two_pi * f * d) + 0.3 * math.sin(two_pi * 2 * f * d))
        out[i] = v
    out = lowpass(out, 2200)
    peak = max(abs(v) for v in out) or 1
    return [v * 0.6 / peak for v in out]


def render_loop(name, fn, seconds_label):
    MUSIC_OUT.mkdir(parents=True, exist_ok=True)
    samples = fn()
    clipped = write_wav(MUSIC_OUT / f"{name}.wav", samples, RATE)
    if clipped:
        raise SystemExit(f"[FAIL] {name}: {clipped} clipped samples")
    (MUSIC_OUT / f"{name}.sfx.json").write_text(json.dumps(
        {"tool": "assets_src/audio/make_sfx.py", "sound": f"{name} (loop)", "rate": RATE, "seconds": round(len(samples) / RATE, 3)}, indent=1) + "\n", encoding="utf-8")
    print(f"[ OK ] music/{name}.wav: {seconds_label}")


def render_music():
    render_loop("hunt", hunt_loop, "an 8 s loop")
    render_loop("calm", calm_loop, "a 16 s loop")


def main():
    ap = argparse.ArgumentParser(description="Render Ooze2Orbit's organic sound effects.")
    ap.add_argument("--only", help="render only this family")
    a = ap.parse_args()
    if a.only in (None, "music", "hunt", "calm"):
        render_music()
    if a.only in ("music", "hunt", "calm"):
        return
    for name, (variants, fn) in SOUNDS.items():
        if not a.only or a.only == name or (a.only == "space" and name in SPACE_SOUNDS):
            render(name, variants, fn)


if __name__ == "__main__":
    main()
