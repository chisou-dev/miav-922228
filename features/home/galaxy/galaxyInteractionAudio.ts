"use client";

/**
 * MIAV galaxy voyage's deliberately quiet, gesture-unlocked sound palette.
 * No audio files, background music, continuous oscillator or noise sweeps.
 * All sounds decay to silence; the final glass-orb hold is entirely quiet.
 */
export type GalaxyCue =
  | "glass"
  | "entry"
  | "rupture"
  | "letter"
  | "suction"
  | "space"
  | "arrival";

let context: AudioContext | null = null;
let enabled = true;
let lastGestureAt = -Infinity;

export function isGalaxySoundEnabled(): boolean {
  return enabled;
}

export function setGalaxySoundEnabled(value: boolean): void {
  enabled = value;
  // Closing instead of suspending discards queued notes as well, so
  // switching sound back on cannot replay a delayed cue unexpectedly.
  if (!value && context) {
    const old = context;
    context = null;
    void old.close().catch(() => {});
  }
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!context || context.state === "closed") context = new Ctor();
    if (context.state === "suspended") void context.resume().catch(() => {});
    return context;
  } catch {
    // Audio is always an optional enhancement, never a navigation blocker.
    return null;
  }
}

type Tone = {
  at: number;
  frequency: number;
  ending?: number;
  duration: number;
  volume: number;
  waveform?: OscillatorType;
  attack?: number;
};

// A short, click-free, naturally decaying harmonic. No square wave or
// white/pink noise: those made the quiet galaxy feel like a windstorm.
function tone(ctx: AudioContext, spec: Tone): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const start = spec.at;
  const finish = start + spec.duration;
  osc.type = spec.waveform ?? "sine";
  osc.frequency.setValueAtTime(spec.frequency, start);
  if (spec.ending) {
    osc.frequency.exponentialRampToValueAtTime(spec.ending, finish);
  }
  env.gain.setValueAtTime(.00001, start);
  env.gain.exponentialRampToValueAtTime(
    Math.max(.0001, spec.volume), start + (spec.attack ?? .008),
  );
  env.gain.exponentialRampToValueAtTime(.00001, finish);
  const master = ctx.createGain();
  master.gain.value = .32;
  osc.connect(env);
  env.connect(master);
  master.connect(ctx.destination);
  osc.start(start);
  osc.stop(finish + .018);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
    master.disconnect();
  };
}

/**
 * Call ONLY from a real tap/click or a sound cue arising from that click.
 * Stops by itself; no loop, backing track or persistent animation audio.
 */
export function playGalaxyCue(cue: GalaxyCue, step = 0): void {
  if (!enabled) return;
  const now = performance.now();
  if (cue !== "rupture" && now - lastGestureAt < 115) return;
  if (cue !== "rupture") lastGestureAt = now;
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + .006;
  // Adjacent steps select different notes of the same gentle pentatonic
  // palette, avoiding an identical electronic "beep" 184 times in a row.
  const notes = [0, 2, 4, 7, 9];
  const pitch = Math.pow(2, notes[Math.abs(step) % notes.length] / 12);
  if (cue === "glass") {
    // A tiny crystal struck once: high, pure and slightly rolling away.
    const f = 850 * pitch;
    tone(ctx, { at:t, frequency:f, ending:f*.992, duration:.44, volume:.18 });
    tone(ctx, { at:t+.007, frequency:f*2.41, ending:f*2.37, duration:.27, volume:.050 });
    tone(ctx, { at:t+.115, frequency:f*.75, ending:f*.73, duration:.21, volume:.063 });
    return;
  }
  if (cue === "entry") {
    // A delicate ascending glass note as the enlarged globe opens.
    tone(ctx, { at:t, frequency:760, ending:1080, duration:.51, volume:.14 });
    tone(ctx, { at:t+.14, frequency:1430, ending:1610, duration:.38, volume:.047 });
    return;
  }
  if (cue === "rupture") {
    // Three passing, high, pitched glissandi. Not a wind, crash or explosion.
    const sweep = [740, 1080, 910] as const;
    for (let i = 0; i < sweep.length; i++) {
      const f = sweep[i];
      tone(ctx, {
        at:t+i*.145, frequency:f, ending:f*(i===1?1.47:1.30),
        duration:.38+i*.045, volume:.075-i*.009, attack:.038,
      });
    }
    tone(ctx, { at:t+.19, frequency:1720, ending:1460, duration:.58, volume:.026, attack:.055 });
    return;
  }
  if (cue === "arrival") {
    // One last fading crystal overtone, then THREE MINUTES OF SILENCE.
    tone(ctx, { at:t, frequency:830, ending:824, duration:.82, volume:.12, attack:.022 });
    tone(ctx, { at:t+.16, frequency:1245, ending:1230, duration:.78, volume:.065, attack:.025 });
    tone(ctx, { at:t+.34, frequency:1660, ending:1640, duration:.50, volume:.033, attack:.028 });
    return;
  }
  if (cue === "suction") {
    // The free sand collects into the galaxy on the fourth tap.
    tone(ctx, { at:t, frequency:1180, ending:680, duration:.39, volume:.11, attack:.017 });
    tone(ctx, { at:t+.07, frequency:1490, ending:960, duration:.27, volume:.034, attack:.024 });
    return;
  }
  if (cue === "letter") {
    // The heading sheds a few minute fragments; quieter than the glass.
    const f = 700 * pitch;
    tone(ctx, { at:t, frequency:f, ending:f*.92, duration:.23, volume:.094 });
    tone(ctx, { at:t+.017, frequency:f*1.99, duration:.13, volume:.024 });
    return;
  }
  // A short elastic, clear "tink" with a hint of roundness instead of sonar.
  // Later distant taps are intentionally still soft and never accumulate.
  const f = (step % 7 === 0 ? 560 : 625) * pitch;
  tone(ctx, { at:t, frequency:f*1.15, ending:f, duration:.20, volume:.095 });
  tone(ctx, { at:t+.009, frequency:f*2.03, ending:f*1.96, duration:.11, volume:.025 });
}
