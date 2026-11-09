// ---------------------------------------------------------------------------
// sfx.ts
// Purpose : The cell stage's sound effects: loads the clips listed in data/audio_events.json once, plays events by
//           name through the kit's AudioPlayer (variants, pitch/volume jitter, voice caps, buses), and follows the
//           player's volume sliders.
// Usage   : const sfx = cellSfx();  sfx.play("pop");  each frame: sfx.update(shell.settings.audio)
// Notes   : One shared AudioContext for the whole page (browsers limit how many exist), created on first use and
//           resumed on the first click or key (autoplay policy, ENGINE.md gotcha 3). Until the clips are decoded,
//           play() is a no-op, so the scene never waits on audio. A missing clip is a real bug: Log.error (smoke
//           fails on it). No Web Audio at all (very old browser): one Log.warn, then silence.
//           Clips are made from code: assets_src/audio/make_sfx.py. Event names: data/audio_events.json.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import eventsJson from "../../../data/audio_events.json";
import type { AudioSliders } from "../../core/audioAccess";
import { Log } from "../../core/log";
import { AudioPlayer, type EventsFile } from "../../shell/audioPlayer";

const LOG = "sfx";
const AUDIO_ROOT = "assets/audio/"; // relative to the page (ENGINE.md: never /assets/...)
const EVENTS = eventsJson as unknown as EventsFile;

/** A looping track (the aquatic stage's hunt music): faded in and out, on the music slider. */
interface Loop {
  buffer: AudioBuffer | null;
  gain: GainNode;
  src: AudioBufferSourceNode | null;
  on: boolean;
  level: number;
}

export class CellSfx {
  private player: AudioPlayer | null = null;
  private ctx: AudioContext | null = null;
  private loops: Record<string, Loop> = {};
  private sliders: AudioSliders | null = null;

  constructor(ctx: AudioContext | null) {
    if (!ctx) return;
    this.ctx = ctx;
    void this.load(ctx);
    const wake = () => void ctx.resume();
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
  }

  private async load(ctx: AudioContext): Promise<void> {
    const files = [...new Set(Object.values(EVENTS.events).flatMap((e) => e.files))];
    const buffers: Record<string, AudioBuffer> = {};
    try {
      await Promise.all(files.map(async (f) => {
        const res = await fetch(AUDIO_ROOT + f);
        if (!res.ok) throw new Error(`${AUDIO_ROOT + f}: HTTP ${res.status}`);
        buffers[f] = await ctx.decodeAudioData(await res.arrayBuffer());
      }));
      this.player = new AudioPlayer(ctx, EVENTS, buffers);
      Log.info(LOG, `SFX_READY ${files.length} clips`);
    } catch (err) {
      Log.error(LOG, `sound effects failed to load: ${(err as Error).message} (run assets_src/audio/make_sfx.py?)`);
    }
  }

  /** Play an event from data/audio_events.json now (silent until loaded). */
  play(name: string): void {
    if (!this.player) return;
    if (!(name in EVENTS.events)) {
      Log.error(LOG, `unknown sound event ${name}`);
      return;
    }
    this.player.play(name);
  }

  /**
   * Fade a looping track in or out (2026-11-08: ominous music while a shark hunts you). `file` is under
   * assets/audio/; it loads on first use. level: its loudness (0..1) before the master and music sliders.
   */
  loop(name: string, file: string, on: boolean, level = 0.8): void {
    const ctx = this.ctx;
    if (!ctx) return;
    let l = this.loops[name];
    if (!l) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      l = this.loops[name] = { buffer: null, gain, src: null, on: false, level };
      void fetch(AUDIO_ROOT + file)
        .then((r) => { if (!r.ok) throw new Error(`${AUDIO_ROOT + file}: HTTP ${r.status}`); return r.arrayBuffer(); })
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => { l!.buffer = buf; Log.info(LOG, `LOOP_READY ${name}`); })
        .catch((err) => Log.error(LOG, `music loop ${name} failed to load: ${(err as Error).message} (run assets_src/audio/make_sfx.py?)`));
    }
    l.level = level;
    if (on === l.on) return;
    l.on = on;
    if (on && l.buffer && !l.src) {
      l.src = ctx.createBufferSource();
      l.src.buffer = l.buffer;
      l.src.loop = true;
      l.src.connect(l.gain);
      l.src.start();
    }
    if (!on && !l.buffer) l.on = false;
  }

  private updateLoops(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const s = this.sliders;
    const vol = s ? Math.max(0, Math.min(1, s.master)) * Math.max(0, Math.min(1, s.music)) : 1;
    for (const l of Object.values(this.loops)) {
      if (l.on && l.buffer && !l.src) { // it finished loading after it was asked for
        l.src = ctx.createBufferSource();
        l.src.buffer = l.buffer;
        l.src.loop = true;
        l.src.connect(l.gain);
        l.src.start();
      }
      const target = l.on ? l.level * vol : 0;
      const g = l.gain.gain;
      g.value += (target - g.value) * 0.03; // about a second to fade in or out
      if (!l.on && l.src && g.value < 0.002) { l.src.stop(); l.src.disconnect(); l.src = null; }
    }
  }

  /** Volume sliders and bus levels; call once per frame. */
  update(sliders: AudioSliders): void {
    this.sliders = sliders;
    this.updateLoops();
    if (!this.player) return;
    this.player.applySettings(sliders);
    this.player.update();
  }
}

let shared: CellSfx | null = null;

/** The page's one CellSfx (scene restarts reuse it, so clips load and the context is created only once). */
export function cellSfx(): CellSfx {
  if (shared) return shared;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) Log.warn(LOG, "no Web Audio in this browser: the game runs silent");
  shared = new CellSfx(Ctx ? new Ctx() : null);
  return shared;
}
