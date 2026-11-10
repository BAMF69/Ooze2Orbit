#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# space_sfx.py
# Purpose : The space stage's own sci-fi sound set (BAMF69 2026-11-10: "better, more sci-fi sound effects for the space
#           stage"), synthesized in code like every other sound in the game (no downloaded packs). Electronic and
#           metallic where the earlier stages are wet and organic: oscillators gliding in pitch, filtered noise, ring
#           tones. One recipe per moment: each weapon family firing, turrets, hits on T0, your shield vs your hull, a ship
#           exploding, the Mothership arriving and dying, the wormhole jump, landing and launching, the hangar's buy /
#           remove / denied, an escort lost, the wave-incoming warning, a map click.
# Usage   : imported by assets_src/audio/make_sfx.py (SPACE_SOUNDS merged into its SOUNDS); render with
#           python assets_src/audio/make_sfx.py --only space   (or a single name, e.g. --only sp_jump)
# Notes   : Each recipe is fn(rng, j) -> list of float samples at RATE; j(x) jitters a number per variant.
#           make_sfx.py normalizes and fades the ends. Levels, cooldowns and captions: data/audio_events.json.
#           Original sounds made here; nothing taken from Endless Sky or any other game.
# Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
# ---------------------------------------------------------------------------
import math

RATE = 44100
TAU = 2 * math.pi


# ---- building blocks --------------------------------------------------------------------------------------------
def n(dur):
    return int(dur * RATE)


def osc(shape, f0, f1, dur, vib_hz=0.0, vib=0.0):
    """An oscillator gliding exponentially from f0 to f1 Hz over dur seconds (sine, square, saw or tri), with vibrato."""
    out, ph = [], 0.0
    for i in range(n(dur)):
        t = i / RATE
        f = f0 * (f1 / f0) ** min(1.0, t / dur)
        if vib:
            f *= 1 + vib * math.sin(TAU * vib_hz * t)
        ph = (ph + f / RATE) % 1.0
        if shape == "sine":
            v = math.sin(TAU * ph)
        elif shape == "square":
            v = 1.0 if ph < 0.5 else -1.0
        elif shape == "saw":
            v = 2 * ph - 1
        else:  # tri
            v = 4 * abs(ph - 0.5) - 1
        out.append(v)
    return out


def noise(rng, dur):
    return [rng.uniform(-1, 1) for _ in range(n(dur))]


def env(s, attack, decay, hold=0.0):
    """A fast attack, an optional hold, then an exponential decay with time constant `decay`."""
    out = []
    for i, v in enumerate(s):
        t = i / RATE
        if t < attack:
            g = t / attack
        elif t < attack + hold:
            g = 1.0
        else:
            g = math.exp(-(t - attack - hold) / decay)
        out.append(v * g)
    return out


def swell(s, rise):
    """Fades in over `rise` seconds and out over the last quarter: for sounds that grow (the Mothership, the jump)."""
    L = len(s)
    return [v * min(1.0, (i / RATE) / rise) * min(1.0, (L - i) / (L * 0.25 + 1)) for i, v in enumerate(s)]


def lowpass(s, f0, f1=None):
    """One-pole low-pass whose cutoff glides f0 -> f1 across the sound."""
    f1 = f1 or f0
    y, out, L = 0.0, [], max(1, len(s))
    for i, v in enumerate(s):
        fc = f0 * (f1 / f0) ** (i / L)
        a = math.exp(-TAU * fc / RATE)
        y = (1 - a) * v + a * y
        out.append(y)
    return out


def highpass(s, fc):
    lp = lowpass(s, fc)
    return [a - b for a, b in zip(s, lp)]


def mix(*layers):
    """Mix (samples, gain, start seconds) layers into one."""
    L = max(n(at) + len(s) for s, _, at in layers)
    out = [0.0] * L
    for s, g, at in layers:
        o = n(at)
        for i, v in enumerate(s):
            out[o + i] += v * g
    return out


def boom(rng, dur, f0=90.0, f1=30.0, bright=2400.0):
    """An explosion: a falling sub thump plus a noise burst whose brightness falls away."""
    sub = env(osc("sine", f0, f1, dur), 0.004, dur / 3)
    burst = env(lowpass(noise(rng, dur), bright, 180), 0.002, dur / 4)
    crackle = [v if rng.random() < 0.04 else 0.0 for v in env(noise(rng, dur * 0.7), 0.01, dur / 3)]
    return mix((sub, 1.0, 0), (burst, 0.9, 0), (crackle, 0.6, 0.03))


# ---- the sounds --------------------------------------------------------------------------------------------------
def sp_fire_kinetic(rng, j):
    """Spines (kinetic guns): a hard mechanical clack and a short pitched-down thunk, like a rail spike leaving."""
    click = env(noise(rng, 0.012), 0.0005, 0.002)
    body = env(lowpass(osc("square", j(260), j(80), 0.09), 2200), 0.001, 0.03)
    return mix((click, 0.8, 0), (body, 0.7, 0.002))


def sp_fire_beam(rng, j):
    """Lances (beams): a bright falling laser zap with a thin metallic overtone and a little shimmer."""
    zap = env(lowpass(osc("saw", j(1900), j(520), 0.17, vib_hz=55, vib=0.02), 5200), 0.002, 0.06)
    ring = env(osc("sine", j(3800), j(1300), 0.14), 0.001, 0.04)
    return mix((zap, 0.7, 0), (ring, 0.35, 0))


def sp_fire_spore(rng, j):
    """Spores (homing missiles): a soft launch thump and a rising rocket whoosh."""
    thump = env(osc("sine", j(140), j(60), 0.12), 0.002, 0.04)
    whoosh = swell(env(lowpass(highpass(noise(rng, 0.42), 300), j(500), j(3200)), 0.03, 0.18), 0.06)
    return mix((thump, 0.8, 0), (whoosh, 0.8, 0.01))


def sp_turret(rng, j):
    """Turret fire: two quick electronic pips, lighter than your guns so a chattering turret does not drown them."""
    pip = lambda: env(lowpass(osc("square", j(1250), j(760), 0.045), 3800), 0.001, 0.015)
    return mix((pip(), 0.6, 0), (pip(), 0.45, 0.05))


def sp_hit_t0(rng, j):
    """A hit on a T0 ship: a cold crystalline ping (inharmonic tones) with a tick: its lattice hull rings."""
    tones = [env(osc("sine", j(f), j(f * 0.985), 0.32), 0.001, d) for f, d in ((1320, 0.09), (2035, 0.06), (2870, 0.04))]
    tick = env(noise(rng, 0.01), 0.0005, 0.002)
    return mix((tones[0], 0.6, 0), (tones[1], 0.4, 0), (tones[2], 0.3, 0), (tick, 0.5, 0))


def sp_hit_shield(rng, j):
    """A hit on your shield: an electric shimmer, two tones trembling fast over a hiss: the field holds."""
    a = osc("sine", j(880), j(760), 0.32)
    b = osc("sine", j(1320), j(1180), 0.32)
    trem = [0.5 + 0.5 * math.sin(TAU * 38 * i / RATE) for i in range(len(a))]
    hum = env([(x + 0.6 * y) * t for x, y, t in zip(a, b, trem)], 0.003, 0.1)
    hiss = env(highpass(noise(rng, 0.25), 2500), 0.002, 0.05)
    return mix((hum, 0.7, 0), (hiss, 0.35, 0))


def sp_hit_hull(rng, j):
    """A hit on your hull: a heavy metal crunch with a low clang under it: the shield is down."""
    crunch = env(lowpass(noise(rng, 0.2), j(1500), 300), 0.001, 0.05)
    clang = env(osc("square", j(118), j(62), 0.22), 0.001, 0.07)
    ring = env(osc("sine", j(410), j(395), 0.3), 0.002, 0.09)
    return mix((crunch, 0.9, 0), (lowpass(clang, 900), 0.7, 0), (ring, 0.25, 0.005))


def sp_explode(rng, j):
    """A ship exploding: a bright burst falling to a deep boom, with crackling debris."""
    return boom(rng, j(0.75), f0=j(95), f1=28, bright=j(3000))


def sp_mother_arrive(rng, j):
    """The Mothership arrives: a vast detuned brass drone swelling up out of the sub, the filter slowly opening."""
    L = 2.6
    drone = [a + 0.8 * b + 0.6 * c for a, b, c in zip(osc("saw", 55, 52, L), osc("saw", 82.6, 80, L), osc("saw", 110.4, 105, L))]
    sub = osc("sine", 36, 33, L)
    body = swell(lowpass(drone, 220, 1400), 1.6)
    return mix((body, 0.8, 0), (swell(sub, 1.2), 0.9, 0))


def sp_mother_die(rng, j):
    """The Mothership dies: three explosions rolling into each other over a long falling groan."""
    groan = swell(lowpass(osc("saw", 210, 32, 2.2), 900, 200), 0.05)
    return mix((boom(rng, 1.2, 100, 30, 3200), 1.0, 0), (boom(rng, 1.4, 80, 26, 2400), 0.9, 0.45),
               (boom(rng, 1.8, 70, 22, 1800), 1.0, 0.9), (groan, 0.5, 0.1))


def sp_jump(rng, j):
    """The wormhole jump: a tone sweeping up through the octaves with a rushing tunnel of noise, then a sharp snap."""
    sweep = swell(osc("sine", 110, 2600, 0.95), 0.25)
    tunnel = swell(lowpass(noise(rng, 0.95), 300, 6000), 0.3)
    snap = env(noise(rng, 0.04), 0.0005, 0.01)
    tail = env(osc("sine", 1800, 900, 0.5), 0.002, 0.15)
    return mix((sweep, 0.6, 0), (tunnel, 0.5, 0), (snap, 0.7, 0.95), (tail, 0.35, 0.96))


def sp_land(rng, j):
    """Landing: engines spooling down, a falling hum over settling hiss, ending in a soft clamp."""
    hum = env(lowpass(osc("saw", 320, 85, 0.9), 1500, 400), 0.02, 0.4)
    hiss = env(lowpass(noise(rng, 0.8), 1800, 300), 0.02, 0.3)
    clamp = env(osc("square", 160, 120, 0.06), 0.001, 0.02)
    return mix((hum, 0.6, 0), (hiss, 0.4, 0), (lowpass(clamp, 1200), 0.6, 0.85))


def sp_launch(rng, j):
    """Launching: engines rising from a rumble to a roar, the filter opening as the ship lifts."""
    roar = swell(lowpass(osc("saw", 75, 330, 1.1), 300, 2400), 0.15)
    rumble = swell(lowpass(noise(rng, 1.1), 400, 3500), 0.2)
    return mix((roar, 0.6, 0), (rumble, 0.6, 0))


def sp_buy(rng, j):
    """Hangar buy or install: two bright rising tones and a sparkle: done."""
    a = env(osc("tri", 660, 660, 0.12), 0.002, 0.05)
    b = env(osc("tri", 990, 990, 0.18), 0.002, 0.07)
    sparkle = env(osc("sine", 2640, 2700, 0.12), 0.001, 0.03)
    return mix((a, 0.6, 0), (b, 0.6, 0.08), (sparkle, 0.25, 0.1))


def sp_remove(rng, j):
    """Hangar remove: one falling tone: a part comes out."""
    return env(osc("tri", 760, 340, 0.18), 0.002, 0.07)


def sp_deny(rng, j):
    """Hangar denied: a low double buzz."""
    buzz = lambda: env(lowpass(osc("square", 140, 132, 0.09), 1600), 0.002, 0.04)
    return mix((buzz(), 0.7, 0), (buzz(), 0.7, 0.12))


def sp_escort_lost(rng, j):
    """An escort lost: a falling two-step alarm over a distant explosion: one of yours is gone."""
    alarm = mix((env(osc("saw", 900, 640, 0.22), 0.005, 0.1), 0.5, 0), (env(osc("saw", 640, 380, 0.3), 0.005, 0.14), 0.5, 0.2))
    return mix((lowpass(alarm, 2600), 0.8, 0), (boom(rng, 0.6, 80, 30, 1600), 0.6, 0.05))


def sp_wave_warn(rng, j):
    """The wave-incoming warning: a two-tone klaxon, three times."""
    parts = []
    for k in range(3):
        parts.append((env(lowpass(osc("square", 620, 620, 0.16), 2200), 0.005, 0.12, hold=0.08), 0.5, k * 0.36))
        parts.append((env(lowpass(osc("square", 470, 470, 0.16), 2200), 0.005, 0.12, hold=0.08), 0.5, k * 0.36 + 0.18))
    return mix(*parts)


def sp_choose(rng, j):
    """A star-map click: a short clean blip."""
    return env(osc("sine", 1500, 1700, 0.05), 0.001, 0.015)


# name -> (variants, recipe); merged into make_sfx.py's SOUNDS
SPACE_SOUNDS = {
    "sp_fire_kinetic": (3, sp_fire_kinetic), "sp_fire_beam": (3, sp_fire_beam), "sp_fire_spore": (2, sp_fire_spore),
    "sp_turret": (2, sp_turret), "sp_hit_t0": (3, sp_hit_t0), "sp_hit_shield": (2, sp_hit_shield), "sp_hit_hull": (2, sp_hit_hull),
    "sp_explode": (2, sp_explode), "sp_mother_arrive": (1, sp_mother_arrive), "sp_mother_die": (1, sp_mother_die),
    "sp_jump": (1, sp_jump), "sp_land": (1, sp_land), "sp_launch": (1, sp_launch), "sp_buy": (1, sp_buy),
    "sp_remove": (1, sp_remove), "sp_deny": (1, sp_deny), "sp_escort_lost": (1, sp_escort_lost),
    "sp_wave_warn": (1, sp_wave_warn), "sp_choose": (1, sp_choose),
}
