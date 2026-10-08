import type { ReentryOutcome } from "./reentryTypes";

type AudioState = {
  ctx: AudioContext;
  master: GainNode;
  pad: GainNode;
  wind: GainNode;
  windFilter: BiquadFilterNode;
  oscillators: OscillatorNode[];
  noise: AudioBufferSourceNode | null;
};

let state: AudioState | null = null;
let resultTimer: number | null = null;

function hasAudio(): boolean {
  return typeof window !== "undefined" && "AudioContext" in window;
}

function getContext(): AudioContext | null {
  if (!hasAudio()) return null;

  if (state) return state.ctx;

  const ctx = new AudioContext();

  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  const pad = ctx.createGain();
  pad.gain.value = 0.0001;
  pad.connect(master);

  const wind = ctx.createGain();
  wind.gain.value = 0.0001;

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 950;
  windFilter.Q.value = 0.7;

  wind.connect(windFilter);
  windFilter.connect(master);

  state = {
    ctx,
    master,
    pad,
    wind,
    windFilter,
    oscillators: [],
    noise: null,
  };

  return ctx;
}

function now(ctx: AudioContext): number {
  return ctx.currentTime;
}

function clearResultTimer(): void {
  if (resultTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(resultTimer);
  }
  resultTimer = null;
}

function stopNodes(): void {
  if (!state) return;

  for (const osc of state.oscillators) {
    try {
      osc.stop();
    } catch {
      // already stopped
    }
  }
  state.oscillators = [];

  if (state.noise) {
    try {
      state.noise.stop();
    } catch {
      // already stopped
    }
    state.noise = null;
  }
}

function glassTone(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  at: number,
  duration: number,
  peak: number,
): void {
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const gain = ctx.createGain();
  const overtoneGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.value = frequency;

  overtone.type = "sine";
  overtone.frequency.value = frequency * 2.01;

  filter.type = "highshelf";
  filter.frequency.value = 2400;
  filter.gain.value = -4;

  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  overtoneGain.gain.setValueAtTime(0.0001, at);
  overtoneGain.gain.exponentialRampToValueAtTime(
    peak * 0.20,
    at + 0.02,
  );
  overtoneGain.gain.exponentialRampToValueAtTime(
    0.0001,
    at + duration * 0.72,
  );

  osc.connect(gain);
  overtone.connect(overtoneGain);
  gain.connect(filter);
  overtoneGain.connect(filter);
  filter.connect(destination);

  osc.start(at);
  overtone.start(at);
  osc.stop(at + duration + 0.05);
  overtone.stop(at + duration + 0.05);
}

function makeNoise(ctx: AudioContext): AudioBufferSourceNode {
  const seconds = 2;
  const buffer = ctx.createBuffer(
    1,
    ctx.sampleRate * seconds,
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.55;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

export function playPowerLockTone(): void {
  const ctx = getContext();
  if (!ctx || !state) return;

  void ctx.resume();

  const t = now(ctx);
  glassTone(ctx, state.master, 740, t, 0.55, 0.045);
}

export function playDirectionTick(delta: number): void {
  const ctx = getContext();
  if (!ctx || !state) return;

  void ctx.resume();

  const t = now(ctx);
  glassTone(
    ctx,
    state.master,
    delta < 0 ? 880 : 620,
    t,
    0.42,
    0.032,
  );
}

export function startReentryAudio(): void {
  const ctx = getContext();
  if (!ctx || !state) return;

  clearResultTimer();
  stopNodes();
  void ctx.resume();

  const t = now(ctx);

  state.master.gain.cancelScheduledValues(t);
  state.master.gain.setValueAtTime(0.0001, t);
  state.master.gain.exponentialRampToValueAtTime(0.28, t + 0.9);

  state.pad.gain.cancelScheduledValues(t);
  state.pad.gain.setValueAtTime(0.0001, t);
  state.pad.gain.exponentialRampToValueAtTime(0.12, t + 1.7);

  const baseFrequencies = [55, 82.5, 110];
  state.oscillators = baseFrequencies.map((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = index === 0 ? "sine" : "triangle";
    osc.frequency.value = frequency;

    gain.gain.value = index === 0 ? 0.20 : 0.055;

    osc.connect(gain);
    gain.connect(state!.pad);
    osc.start();

    return osc;
  });

  const noise = makeNoise(ctx);
  noise.connect(state.wind);
  noise.start();
  state.noise = noise;

  // Original glass/space motif. It is intentionally not a quotation or
  // imitation of any existing film score.
  glassTone(ctx, state.master, 220, t + 0.10, 3.8, 0.038);
  glassTone(ctx, state.master, 330, t + 2.8, 4.6, 0.028);
  glassTone(ctx, state.master, 440, t + 5.5, 4.8, 0.024);
}

export function setReentryAudioFlight(
  progress: number,
  heat: number,
  outcome: ReentryOutcome | undefined,
): void {
  if (!state) return;

  const ctx = state.ctx;
  const t = now(ctx);

  const atmospheric = Math.max(
    0.0001,
    Math.min(0.22, heat * 0.20),
  );

  state.wind.gain.setTargetAtTime(
    atmospheric,
    t,
    0.07,
  );

  state.windFilter.frequency.setTargetAtTime(
    700 + heat * 2400,
    t,
    0.08,
  );

  const padLevel =
    outcome === "BURN" && progress > 0.74
      ? 0.065
      : 0.12;

  state.pad.gain.setTargetAtTime(
    padLevel,
    t,
    0.15,
  );
}

export function finishReentryAudio(
  outcome: ReentryOutcome,
): void {
  if (!state) return;

  const ctx = state.ctx;
  const t = now(ctx);

  state.wind.gain.cancelScheduledValues(t);
  state.wind.gain.setTargetAtTime(0.0001, t, 0.08);

  state.pad.gain.cancelScheduledValues(t);
  state.pad.gain.setTargetAtTime(0.0001, t + 0.10, 0.35);

  if (outcome === "EARTH_REACHED") {
    glassTone(ctx, state.master, 330, t + 0.10, 3.0, 0.050);
    glassTone(ctx, state.master, 495, t + 0.45, 3.4, 0.040);
    glassTone(ctx, state.master, 660, t + 0.80, 3.8, 0.028);
  } else if (outcome === "BURN") {
    glassTone(ctx, state.master, 210, t + 0.04, 1.1, 0.055);
    glassTone(ctx, state.master, 148, t + 0.22, 2.2, 0.036);
  } else if (outcome === "BREAK") {
    glassTone(ctx, state.master, 260, t + 0.04, 0.65, 0.052);
    glassTone(ctx, state.master, 196, t + 0.14, 1.2, 0.034);
  } else {
    glassTone(ctx, state.master, 392, t + 0.08, 2.0, 0.033);
  }

  clearResultTimer();

  if (typeof window !== "undefined") {
    resultTimer = window.setTimeout(() => {
      if (!state) return;

      const end = state.ctx.currentTime;
      state.master.gain.setTargetAtTime(
        0.0001,
        end,
        0.45,
      );
    }, 2200);
  }
}

export function stopReentryAudio(): void {
  clearResultTimer();

  if (!state) return;

  const ctx = state.ctx;
  const t = now(ctx);

  state.master.gain.cancelScheduledValues(t);
  state.master.gain.setTargetAtTime(0.0001, t, 0.08);

  state.pad.gain.cancelScheduledValues(t);
  state.pad.gain.setTargetAtTime(0.0001, t, 0.08);

  state.wind.gain.cancelScheduledValues(t);
  state.wind.gain.setTargetAtTime(0.0001, t, 0.06);

  stopNodes();
}

