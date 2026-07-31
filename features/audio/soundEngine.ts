/**
 * MIAV shared sound engine — single AudioContext, Web Audio API only.
 * No audio files. All games route through this module.
 */

export const SE_GAIN = 0.055;

let sharedContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let unlockPromise: Promise<AudioContext | null> | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = true;

export function noteToFrequency(note: string): number {
  const match = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!match) return 440;
  const [, letter, acc, octaveStr] = match;
  const semitones: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  let semitone = semitones[letter] ?? 0;
  if (acc === "#") semitone += 1;
  if (acc === "b") semitone -= 1;
  const octave = Number(octaveStr);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedContext) {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    sharedContext = new Ctx();
  }
  return sharedContext;
}

function ensureMasterGain(ctx: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(ctx.destination);
  }
  if (!bgmGain) {
    bgmGain = ctx.createGain();
    bgmGain.gain.value = muted ? 0 : 1;
    bgmGain.connect(masterGain);
  }
  return masterGain;
}

function ensureBgmGain(ctx: AudioContext): GainNode {
  ensureMasterGain(ctx);
  return bgmGain!;
}

/** Cut BGM immediately — scheduled oscillators on the BGM bus go silent. */
export function muteBgmImmediate() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const bus = ensureBgmGain(ctx);
  bus.gain.cancelScheduledValues(ctx.currentTime);
  bus.gain.setValueAtTime(0, ctx.currentTime);
}

/** Restore BGM bus level after a fresh loop start. */
export function unmuteBgm() {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const bus = ensureBgmGain(ctx);
  bus.gain.cancelScheduledValues(ctx.currentTime);
  bus.gain.setValueAtTime(1, ctx.currentTime);
}

export function isSoundMuted() {
  return muted;
}

export function setSoundMuted(value: boolean) {
  muted = value;
  if (masterGain) {
    masterGain.gain.value = value ? 0 : 1;
  }
}

/** Resume audio after a user gesture (browser policy). */
export async function unlockAudio(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;
  ensureMasterGain(ctx);
  if (ctx.state === "running") return ctx;
  if (unlockPromise) return unlockPromise;
  unlockPromise = ctx.resume().then(() => ctx);
  return unlockPromise;
}

export async function ensureAudioReady(): Promise<AudioContext | null> {
  return unlockAudio();
}

export function now(): number {
  return getAudioContext()?.currentTime ?? 0;
}

function getNoiseBuffer(ctx: AudioContext, durationSec = 0.04): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  noiseBuffer = buffer;
  return buffer;
}

export type ToneOpts = {
  type: OscillatorType;
  freq: number;
  duration: number;
  gain: number;
  attack?: number;
  when?: number;
  /** Route to BGM bus (default: SE / master). */
  route?: "se" | "bgm";
};

/** Schedule a tone on the shared master bus. */
export function scheduleTone(opts: ToneOpts) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const bus =
    opts.route === "bgm"
      ? ensureBgmGain(ctx)
      : ensureMasterGain(ctx);
  const when = opts.when ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const attack = opts.attack ?? 0.004;
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(opts.gain, when + attack);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    when + Math.max(attack + 0.01, opts.duration * 0.92),
  );
  osc.connect(gain);
  gain.connect(bus);
  osc.start(when);
  osc.stop(when + opts.duration + 0.03);
}

export function scheduleNoiseBurst(
  when: number,
  duration: number,
  gainValue: number,
  highpassHz = 1200,
  route: "se" | "bgm" = "se",
) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const bus =
    route === "bgm" ? ensureBgmGain(ctx) : ensureMasterGain(ctx);
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = highpassHz;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(bus);
  src.start(when);
  src.stop(when + duration + 0.01);
}

export function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Tear down shared audio (timers already stopped by AudioManager). */
export function disposeSoundEngine() {
  if (masterGain) {
    try {
      masterGain.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  if (bgmGain) {
    try {
      bgmGain.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  if (sharedContext) {
    void sharedContext.close();
  }
  sharedContext = null;
  masterGain = null;
  bgmGain = null;
  noiseBuffer = null;
  unlockPromise = null;
}
