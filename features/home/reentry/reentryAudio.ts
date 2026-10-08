import type { ReentryOutcome } from "./reentryTypes";

type AudioState = {
  ctx: AudioContext;
  master: GainNode;
  spacePad: GainNode;
  rumble: GainNode;
  hiss: GainNode;
  rumbleFilter: BiquadFilterNode;
  hissFilter: BiquadFilterNode;
  oscillators: OscillatorNode[];
  noiseSources: AudioBufferSourceNode[];
};

let state: AudioState | null = null;
let spacePingTimer: number | null = null;
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

  const spacePad = ctx.createGain();
  spacePad.gain.value = 0.0001;
  spacePad.connect(master);

  const rumble = ctx.createGain();
  rumble.gain.value = 0.0001;

  const hiss = ctx.createGain();
  hiss.gain.value = 0.0001;

  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 240;
  rumbleFilter.Q.value = 0.75;

  const hissFilter = ctx.createBiquadFilter();
  hissFilter.type = "bandpass";
  hissFilter.frequency.value = 1500;
  hissFilter.Q.value = 0.65;

  rumble.connect(rumbleFilter);
  rumbleFilter.connect(master);

  hiss.connect(hissFilter);
  hissFilter.connect(master);

  state = {
    ctx,
    master,
    spacePad,
    rumble,
    hiss,
    rumbleFilter,
    hissFilter,
    oscillators: [],
    noiseSources: [],
  };

  return ctx;
}

function clearSpacePingTimer(): void {
  if (
    spacePingTimer !== null &&
    typeof window !== "undefined"
  ) {
    window.clearTimeout(
      spacePingTimer,
    );
  }

  spacePingTimer = null;
}

function clearTimers(): void {
  if (typeof window === "undefined") return;

  clearSpacePingTimer();

  if (resultTimer !== null) {
    window.clearTimeout(resultTimer);
    resultTimer = null;
  }
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

  for (const source of state.noiseSources) {
    try {
      source.stop();
    } catch {
      // already stopped
    }
  }
  state.noiseSources = [];
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
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function glassPing(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  at: number,
  duration: number,
  peak: number,
): void {
  const fundamental = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const fundamentalGain = ctx.createGain();
  const overtoneGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  fundamental.type = "sine";
  fundamental.frequency.value = frequency;

  overtone.type = "sine";
  overtone.frequency.value = frequency * 1.997;

  filter.type = "highshelf";
  filter.frequency.value = 3000;
  filter.gain.value = -5;

  fundamentalGain.gain.setValueAtTime(0.0001, at);
  fundamentalGain.gain.exponentialRampToValueAtTime(
    peak,
    at + 0.025,
  );
  fundamentalGain.gain.exponentialRampToValueAtTime(
    0.0001,
    at + duration,
  );

  overtoneGain.gain.setValueAtTime(0.0001, at);
  overtoneGain.gain.exponentialRampToValueAtTime(
    peak * 0.14,
    at + 0.018,
  );
  overtoneGain.gain.exponentialRampToValueAtTime(
    0.0001,
    at + duration * 0.70,
  );

  fundamental.connect(fundamentalGain);
  overtone.connect(overtoneGain);
  fundamentalGain.connect(filter);
  overtoneGain.connect(filter);
  filter.connect(destination);

  fundamental.start(at);
  overtone.start(at);
  fundamental.stop(at + duration + 0.05);
  overtone.stop(at + duration + 0.05);
}

function scheduleSpacePings(): void {
  if (
    !state ||
    typeof window === "undefined"
  ) {
    return;
  }

  if (spacePingTimer !== null) {
    return;
  }

  const play = () => {
    if (!state) {
      clearSpacePingTimer();
      return;
    }

    const ctx = state.ctx;
    const t = ctx.currentTime;

    glassPing(
      ctx,
      state.master,
      1320,
      t,
      2.6,
      0.017,
    );

    glassPing(
      ctx,
      state.master,
      990,
      t + 0.44,
      2.2,
      0.008,
    );

    spacePingTimer =
      window.setTimeout(() => {
        spacePingTimer = null;
        play();
      }, 6400);
  };

  play();
}

export function playPowerLockTone(): void {
  const ctx = getContext();
  if (!ctx || !state) return;

  void ctx.resume();
  glassPing(ctx, state.master, 720, ctx.currentTime, 0.45, 0.032);
}

export function playDirectionTick(direction: number): void {
  const ctx = getContext();
  if (!ctx || !state) return;

  void ctx.resume();
  glassPing(
    ctx,
    state.master,
    direction < 0 ? 900 : 610,
    ctx.currentTime,
    0.32,
    0.022,
  );
}

export function startReentryAmbience(): void {
  const ctx = getContext();
  if (!ctx || !state) return;

  void ctx.resume();

  const t = ctx.currentTime;

  state.master.gain.setTargetAtTime(0.32, t, 0.35);
  state.spacePad.gain.setTargetAtTime(0.048, t, 0.45);

  if (state.oscillators.length === 0) {
    const lowFrequencies = [41.2, 61.8, 82.4];

    state.oscillators = lowFrequencies.map((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = index === 0 ? "sine" : "triangle";
      osc.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.10 : 0.028;

      osc.connect(gain);
      gain.connect(state!.spacePad);
      osc.start();

      return osc;
    });
  }

  if (state.noiseSources.length === 0) {
    const rumbleNoise = makeNoise(ctx);
    rumbleNoise.connect(state.rumble);
    rumbleNoise.start();

    const hissNoise = makeNoise(ctx);
    hissNoise.connect(state.hiss);
    hissNoise.start();

    state.noiseSources = [rumbleNoise, hissNoise];
  }

  scheduleSpacePings();
}

export function startReentryAudio(): void {
  startReentryAmbience();
}

export function setReentryAudioFlight(
  progress: number,
  heat: number,
  outcome: ReentryOutcome | undefined,
): void {
  if (!state) return;

  const ctx = state.ctx;
  const t = ctx.currentTime;

  // Space remains almost silent. Atmospheric sound arrives only with heat.
  const atmospheric = Math.max(0, Math.min(1, heat));

  state.rumble.gain.setTargetAtTime(
    0.0001 + atmospheric * atmospheric * 0.26,
    t,
    0.10,
  );

  state.hiss.gain.setTargetAtTime(
    0.0001 + atmospheric * 0.14,
    t,
    0.08,
  );

  state.rumbleFilter.frequency.setTargetAtTime(
    170 + atmospheric * 260,
    t,
    0.10,
  );

  state.hissFilter.frequency.setTargetAtTime(
    950 + atmospheric * 1500,
    t,
    0.09,
  );

  // Beacon fades away as the atmosphere gets loud.
  state.spacePad.gain.setTargetAtTime(
    0.048 * (1 - atmospheric * 0.75),
    t,
    0.20,
  );

  if (
    outcome === "BURN" &&
    progress > 0.76
  ) {
    state.rumble.gain.setTargetAtTime(0.34, t, 0.07);
  }
}

export function finishReentryAudio(
  outcome: ReentryOutcome,
): void {
  if (!state) return;

  clearTimers();

  const ctx = state.ctx;
  const t = ctx.currentTime;

  state.rumble.gain.setTargetAtTime(0.0001, t, 0.10);
  state.hiss.gain.setTargetAtTime(0.0001, t, 0.08);
  state.spacePad.gain.setTargetAtTime(0.0001, t + 0.08, 0.35);

  if (outcome === "EARTH_REACHED") {
    glassPing(ctx, state.master, 330, t + 0.08, 2.7, 0.040);
    glassPing(ctx, state.master, 495, t + 0.42, 3.1, 0.030);
    glassPing(ctx, state.master, 660, t + 0.78, 3.5, 0.020);
  } else if (outcome === "BURN") {
    glassPing(ctx, state.master, 196, t + 0.03, 0.9, 0.045);
    glassPing(ctx, state.master, 130, t + 0.18, 1.7, 0.026);
  } else if (outcome === "BREAK") {
    glassPing(ctx, state.master, 240, t + 0.03, 0.55, 0.042);
    glassPing(ctx, state.master, 164, t + 0.14, 1.0, 0.026);
  } else {
    glassPing(ctx, state.master, 392, t + 0.08, 1.9, 0.024);
  }

  if (typeof window !== "undefined") {
    resultTimer = window.setTimeout(() => {
      if (!state) return;
      const end = state.ctx.currentTime;
      state.master.gain.setTargetAtTime(0.0001, end, 0.42);
    }, 2200);
  }
}

export function stopReentryAudio(): void {
  clearTimers();

  if (!state) return;

  const t = state.ctx.currentTime;

  state.master.gain.setTargetAtTime(0.0001, t, 0.08);
  state.spacePad.gain.setTargetAtTime(0.0001, t, 0.08);
  state.rumble.gain.setTargetAtTime(0.0001, t, 0.06);
  state.hiss.gain.setTargetAtTime(0.0001, t, 0.06);

  stopNodes();
}

