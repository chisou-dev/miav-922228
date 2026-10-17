import type { ReentryOutcome } from "./reentryTypes";

type AudioState = {
  ctx: AudioContext;
  master: GainNode;
  spacePad: GainNode;
  rumble: GainNode;
  hiss: GainNode;
  sea: GainNode;
  wind: GainNode;
  splashImpact: GainNode;
  rumbleFilter: BiquadFilterNode;
  hissFilter: BiquadFilterNode;
  seaFilter: BiquadFilterNode;
  windFilter: BiquadFilterNode;
  splashFilter: BiquadFilterNode;
  oscillators: OscillatorNode[];
  noiseSources: AudioBufferSourceNode[];
};

let state: AudioState | null = null;
let spacePingTimer: number | null = null;
let resultTimer: number | null = null;
let stage1ClearCueNodes: OscillatorNode[] = [];
let seaAudioStarted = false;
let lastSeaModulationAt = -1;
let userVolume = 0.82;
const VOLUME_KEY = "miav_reentry_vol_v1";
const MASTER_PEAK = 0.74;

function readStoredVolume(): number {
  if (typeof window === "undefined") return 0.82;
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 0.82;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0.82;
    return Math.min(1, Math.max(0, n));
  } catch {
    return 0.82;
  }
}

userVolume = readStoredVolume();

function applyMasterVolume(timeConstant = 0.08): void {
  if (!state) return;
  const t = state.ctx.currentTime;
  state.master.gain.setTargetAtTime(
    Math.max(0.0001, MASTER_PEAK * userVolume),
    t,
    timeConstant,
  );
}

export function getReentryUserVolume(): number {
  return userVolume;
}

export function setReentryUserVolume(next: number): void {
  userVolume = Math.min(1, Math.max(0, next));
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(VOLUME_KEY, String(userVolume));
    } catch {
      /* ignore */
    }
  }
  applyMasterVolume();
}

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

  // Share the existing looping noise sources with filtered surf, wind and
  // contact impact. No repeated buffers or AudioNodes are created per frame.
  const sea = ctx.createGain();
  sea.gain.value = 0.0001;
  const wind = ctx.createGain();
  wind.gain.value = 0.0001;
  const splashImpact = ctx.createGain();
  splashImpact.gain.value = 0.0001;
  const seaFilter = ctx.createBiquadFilter();
  seaFilter.type = "lowpass";
  seaFilter.frequency.value = 620;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 980;
  windFilter.Q.value = 0.42;
  const splashFilter = ctx.createBiquadFilter();
  splashFilter.type = "bandpass";
  splashFilter.frequency.value = 280;
  splashFilter.Q.value = 0.60;
  seaFilter.connect(sea);
  windFilter.connect(wind);
  splashFilter.connect(splashImpact);
  sea.connect(master);
  wind.connect(master);
  splashImpact.connect(master);

  state = {
    ctx,
    master,
    spacePad,
    rumble,
    hiss,
    sea,
    wind,
    splashImpact,
    rumbleFilter,
    hissFilter,
    seaFilter,
    windFilter,
    splashFilter,
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

function clearResultTimer(): void {
  if (
    resultTimer !== null &&
    typeof window !== "undefined"
  ) {
    window.clearTimeout(resultTimer);
  }

  resultTimer = null;
}

function cancelParamAutomation(
  param: AudioParam,
  at: number,
): void {
  try {
    param.cancelScheduledValues(at);
  } catch {
    // Browser implementation fallback.
  }
}


function clearTimers(): void {
  if (typeof window === "undefined") return;

  clearSpacePingTimer();
  clearResultTimer();
}



function stopStage1ClearCue(): void {

  for (

    const node of

    stage1ClearCueNodes

  ) {

    try {

      node.stop();

    } catch {

      // Already stopped.

    }

  }



  stage1ClearCueNodes = [];

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
      0.045,
    );

    glassPing(
      ctx,
      state.master,
      990,
      t + 0.44,
      2.2,
      0.026,
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

  stopStage1ClearCue();
  seaAudioStarted = false;
  lastSeaModulationAt = -1;

  /*
   * Retry can happen while finishReentryAudio still owns a delayed fade.
   * Cancel that old result fade before rebuilding the live ambience.
   */
  clearResultTimer();

  void ctx.resume();

  const t = ctx.currentTime;

  cancelParamAutomation(
    state.master.gain,
    t,
  );
  cancelParamAutomation(
    state.spacePad.gain,
    t,
  );
  cancelParamAutomation(
    state.rumble.gain,
    t,
  );
  cancelParamAutomation(
    state.hiss.gain,
    t,
  );
  for (const g of [state.sea, state.wind, state.splashImpact]) {
    cancelParamAutomation(g.gain, t);
    g.gain.setTargetAtTime(0.0001, t, 0.04);
  }
  cancelParamAutomation(
    state.rumbleFilter.frequency,
    t,
  );
  cancelParamAutomation(
    state.hissFilter.frequency,
    t,
  );

  applyMasterVolume(0.06);

  state.spacePad.gain.setTargetAtTime(
    0.13,
    t,
    0.22,
  );

  state.rumble.gain.setTargetAtTime(
    0.0001,
    t,
    0.06,
  );

  state.hiss.gain.setTargetAtTime(
    0.0001,
    t,
    0.06,
  );

  state.rumbleFilter.frequency.setTargetAtTime(
    240,
    t,
    0.08,
  );

  state.hissFilter.frequency.setTargetAtTime(
    1500,
    t,
    0.08,
  );

  if (state.oscillators.length === 0) {
    const lowFrequencies = [
      41.2,
      61.8,
      82.4,
    ];

    state.oscillators =
      lowFrequencies.map(
        (
          frequency,
          index,
        ) => {
          const osc =
            ctx.createOscillator();

          const gain =
            ctx.createGain();

          osc.type =
            index === 0
              ? "sine"
              : "triangle";

          osc.frequency.value =
            frequency;

          gain.gain.value =
            index === 0
              ? 0.10
              : 0.028;

          osc.connect(gain);
          gain.connect(
            state!.spacePad,
          );
          osc.start();

          return osc;
        },
      );
  }

  if (state.noiseSources.length === 0) {
    const rumbleNoise =
      makeNoise(ctx);

    rumbleNoise.connect(
      state.rumble,
    );
    rumbleNoise.connect(state.seaFilter);
    rumbleNoise.connect(state.splashFilter);
    rumbleNoise.start();

    const hissNoise =
      makeNoise(ctx);

    hissNoise.connect(
      state.hiss,
    );
    hissNoise.connect(state.windFilter);
    hissNoise.start();

    state.noiseSources = [
      rumbleNoise,
      hissNoise,
    ];
  }

  scheduleSpacePings();
}

/**
 * Cut atmospheric noise at the exact water contact. Splash is a short,
 * one-shot burst; gentle surf and wind remain during the entire epilogue.
 */
export function setReentryAudioOcean(splashAgeS: number): void {
  if (!state) return;
  const t = state.ctx.currentTime;
  if (!seaAudioStarted) {
    seaAudioStarted = true;
    clearSpacePingTimer();
    for (const g of [state.rumble, state.hiss, state.spacePad]) {
      cancelParamAutomation(g.gain, t);
    }
    state.rumble.gain.setTargetAtTime(0.0001, t, 0.035);
    state.hiss.gain.setTargetAtTime(0.0001, t, 0.035);
    state.spacePad.gain.setTargetAtTime(0.012, t, 0.30);
    state.sea.gain.setTargetAtTime(0.092, t, 0.55);
    state.wind.gain.setTargetAtTime(0.018, t, 0.85);
    const impact = state.splashImpact.gain;
    cancelParamAutomation(impact, t);
    impact.setValueAtTime(0.0001, t);
    impact.linearRampToValueAtTime(0.42, t + 0.045);
    impact.exponentialRampToValueAtTime(0.0001, t + 1.75);
  }
  // A four-hertz envelope is sufficient for slow breakers.
  // Avoid scheduling a new WebAudio automation on every canvas frame.
  if (lastSeaModulationAt < 0 || t - lastSeaModulationAt >= 0.25) {
    state.sea.gain.setTargetAtTime(
      0.074 + 0.021 * Math.sin(Math.max(0, splashAgeS) * 1.65),
      t, 0.75,
    );
    lastSeaModulationAt = t;
  }
}

export function startReentryAudio(): void {
  startReentryAmbience();
}

export function setReentryAudioFlight(
  progress: number,
  heat: number,
  outcome: ReentryOutcome | undefined,
  timeSinceEntryS = 0,
  failurePeakS = 10,
  destructionAmount = 0,
  landingT = 0,
): void {
  if (!state) return;
  void progress;

  const ctx = state.ctx;
  const t = ctx.currentTime;
  const burnAge = Math.max(0, timeSinceEntryS - 0.65);
  const targetPeakS =
    outcome === "EARTH_REACHED"
      ? 10
      : Math.max(2.2, failurePeakS - 0.65);
  const age01 = Math.min(1, burnAge / targetPeakS);
  const ageRamp = age01 * age01 * (3 - 2 * age01);

  const successFade =
    outcome === "EARTH_REACHED"
      ? 1 - Math.min(1, Math.max(landingT, (timeSinceEntryS - 10) / 1.2))
      : 1;

  const failureFade =
    outcome === "BURN" || outcome === "BREAK"
      ? 1 - Math.min(0.82, destructionAmount * 0.82)
      : 1;

  const cinematic = Math.max(0, ageRamp * successFade * failureFade);
  const atmospheric = Math.max(
    0,
    Math.min(1, Math.max(heat, cinematic * 0.94)),
  );

  state.rumble.gain.setTargetAtTime(
    0.0001 + atmospheric * atmospheric * 0.33,
    t,
    0.12,
  );
  state.hiss.gain.setTargetAtTime(
    0.0001 + atmospheric * 0.18,
    t,
    0.10,
  );
  state.rumbleFilter.frequency.setTargetAtTime(
    165 + atmospheric * 310,
    t,
    0.13,
  );
  state.hissFilter.frequency.setTargetAtTime(
    900 + atmospheric * 1750,
    t,
    0.11,
  );
  state.spacePad.gain.setTargetAtTime(
    0.048 * (1 - atmospheric * 0.82),
    t,
    0.22,
  );

  if (atmospheric < 0.035) {
    state.rumble.gain.setTargetAtTime(0.0001, t, 0.14);
    state.hiss.gain.setTargetAtTime(0.0001, t, 0.14);
  }
}


/**

 * Stage 1 clear cue:

 *

 * Not a victory fanfare.

 * It should feel unresolved: "we survived, but was that really okay?"

 *

 * The close low frequencies create a slow acoustic beating.

 * Sparse glass tones form a minor-second / tritone-like cluster and never

 * resolve to a major cadence.

 */

export function startStage1ClearAudio(): void {

  const ctx = getContext();



  if (!ctx || !state) {

    return;

  }



  stopStage1ClearCue();

  clearResultTimer();



  void ctx.resume();



  const t =

    ctx.currentTime;



  applyMasterVolume(

    0.08,

  );



  state.rumble.gain.setTargetAtTime(

    0.0001,

    t,

    0.18,

  );



  state.hiss.gain.setTargetAtTime(

    0.0001,

    t,

    0.18,

  );



  state.spacePad.gain.setTargetAtTime(

    0.018,

    t,

    0.5,

  );



  const clusterGain =

    ctx.createGain();



  const lowFilter =

    ctx.createBiquadFilter();



  lowFilter.type =

    "lowpass";



  lowFilter.frequency.value =

    420;



  lowFilter.Q.value =

    0.55;



  clusterGain.gain.setValueAtTime(

    0.0001,

    t,

  );



  clusterGain.gain.exponentialRampToValueAtTime(

    0.050,

    t + 1.15,

  );



  clusterGain.gain.setValueAtTime(

    0.050,

    t + 5.4,

  );



  clusterGain.gain.exponentialRampToValueAtTime(

    0.0001,

    t + 9.2,

  );



  lowFilter.connect(

    clusterGain,

  );



  clusterGain.connect(

    state.master,

  );



  const freqs = [

    55.0,

    58.2,

    82.4,

  ];



  stage1ClearCueNodes =

    freqs.map(

      (

        frequency,

        index,

      ) => {

        const osc =

          ctx.createOscillator();



        const gain =

          ctx.createGain();



        osc.type =

          index === 2

            ? "triangle"

            : "sine";



        osc.frequency.setValueAtTime(

          frequency,

          t,

        );



        osc.detune.setValueAtTime(

          index === 1

            ? 3

            : -2,

          t,

        );



        gain.gain.value =

          index === 0

            ? 0.72

            : index === 1

              ? 0.50

              : 0.20;



        osc.connect(

          gain,

        );



        gain.connect(

          lowFilter,

        );



        osc.start(t);

        osc.stop(

          t + 9.25,

        );



        return osc;

      },

    );



  glassPing(

    ctx,

    state.master,

    261.63,

    t + 0.65,

    4.4,

    0.024,

  );



  glassPing(

    ctx,

    state.master,

    277.18,

    t + 1.05,

    4.9,

    0.018,

  );



  glassPing(

    ctx,

    state.master,

    369.99,

    t + 2.55,

    5.6,

    0.015,

  );



  glassPing(

    ctx,

    state.master,

    392.00,

    t + 4.85,

    4.4,

    0.012,

  );

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
    /*
     * The clear cue already played during the alien escape sequence.
     * Do not add a triumphant result jingle here.
     */
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
      resultTimer = null;

      if (!state) return;

      const end =
        state.ctx.currentTime;

      state.master.gain.setTargetAtTime(
        0.0001,
        end,
        0.42,
      );
    }, 2200);
  }
}

export function stopReentryAudio(): void {
  clearTimers();
  stopStage1ClearCue();

  if (!state) return;

  const t = state.ctx.currentTime;

  state.master.gain.setTargetAtTime(0.0001, t, 0.08);
  state.spacePad.gain.setTargetAtTime(0.0001, t, 0.08);
  state.rumble.gain.setTargetAtTime(0.0001, t, 0.06);
  state.hiss.gain.setTargetAtTime(0.0001, t, 0.06);
  for (const g of [state.sea, state.wind, state.splashImpact]) {
    cancelParamAutomation(g.gain, t);
    g.gain.setTargetAtTime(0.0001, t, 0.06);
  }
  seaAudioStarted = false;
  lastSeaModulationAt = -1;

  stopNodes();
}

