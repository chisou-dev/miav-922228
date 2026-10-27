"use client";

/**
 * One soft, naturally resonant crystal note for every 5–10 ACCEPTED taps.
 * No music, loop, downloaded audio, synthetic boings or changing pitch.
 * Everything is generated locally by Web Audio on the visitor's device.
 * The final three-minute glass-sphere scene is silent.
 */
export type GalaxyCue =
  | "glass" | "entry" | "rupture" | "letter" | "suction" | "space" | "arrival";

let context: AudioContext | null = null;
let enabled = true;
let untilNextChime = 5 + Math.floor(Math.random() * 6);

export function isGalaxySoundEnabled(): boolean {
  return enabled;
}

export function setGalaxySoundEnabled(value: boolean): void {
  enabled = value;
  // Stop currently playing and scheduled tones when the visitor mutes.
  if (!value && context) {
    const previous = context;
    context = null;
    void previous.close().catch(() => {});
  }
}

function getContext(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!context || context.state === "closed") context = new Ctor();
    if (context.state === "suspended") void context.resume().catch(() => {});
    return context;
  } catch {
    return null;
  }
}

function ringOneCrystalNote(ctx: AudioContext): void {
  const t = ctx.currentTime + .012;
  const master = ctx.createGain();
  // A genuine crystal-like spectrum: delicately detuned, non-integer
  // partials fade at different rates. No rubbery frequency swoops.
  // This ONE sound has the same pitch and timbre every time.
  master.gain.value = .36;
  master.connect(ctx.destination);
  const partials = [
    { ratio: 1,      amp: .135, duration: 1.58, attack: .026 },
    { ratio: 2.006,  amp: .045, duration: 1.09, attack: .012 },
    { ratio: 2.76,   amp: .014, duration: .72,  attack: .010 },
    { ratio: 4.11,   amp: .007, duration: .47,  attack: .008 },
    { ratio: 1.003,  amp: .019, duration: 1.77, attack: .034 },
  ];
  let finished = 0;
  for (const p of partials) {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880 * p.ratio, t);
    envelope.gain.setValueAtTime(.00001, t);
    envelope.gain.exponentialRampToValueAtTime(p.amp, t + p.attack);
    envelope.gain.exponentialRampToValueAtTime(.00001, t + p.duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(t);
    oscillator.stop(t + p.duration + .012);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      finished++;
      if (finished === partials.length) master.disconnect();
    };
  }
}

/**
 * Called ONLY after an accepted tap. Ignore scheduled effects: silence
 * between clicks is intentional. One note at random 5–10 tap intervals.
 */
export function playGalaxyCue(cue: GalaxyCue, _step = 0): void {
  if (!enabled || cue === "rupture") return;
  untilNextChime--;
  if (untilNextChime > 0) return;
  untilNextChime = 5 + Math.floor(Math.random() * 6);
  const ctx = getContext();
  if (ctx) ringOneCrystalNote(ctx);
}
