import {
  ensureAudioReady,
  getAudioContext,
  isSoundMuted,
  muteBgmImmediate,
  noteToFrequency,
  scheduleNoiseBurst,
  scheduleTone,
  SE_GAIN,
  unmuteBgm,
} from "@/features/audio/soundEngine";

const BGM_MELODY_GAIN = SE_GAIN * 0.72;
const BGM_BASS_GAIN = SE_GAIN * 0.9;
const BGM_NOISE_GAIN = SE_GAIN * 0.22;

/**
 * Discrete tempo bands by level — always the same for a given range,
 * so returning from L20 to L1 restores the slow band (no leftover speed).
 *
 * 1–5 → 96 · 6–10 → 104 · 11–15 → 112 · 16–20 → 120
 */
export function bpmForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  if (n <= 5) return 96;
  if (n <= 10) return 104;
  if (n <= 15) return 112;
  if (n <= 20) return 120;
  return 124;
}

const MELODY: [string, number][] = [
  ["C5", 0.125],
  ["E5", 0.125],
  ["G5", 0.125],
  ["E5", 0.125],
  ["D5", 0.125],
  ["F5", 0.125],
  ["A5", 0.125],
  ["F5", 0.125],
  ["E5", 0.125],
  ["G5", 0.125],
  ["C6", 0.125],
  ["G5", 0.125],
  ["A5", 0.125],
  ["G5", 0.125],
  ["E5", 0.125],
  ["C5", 0.125],
];

const BASS = [
  "C2", "C2", "C2", "C2",
  "A1", "A1", "A1", "A1",
  "F1", "F1", "F1", "F1",
  "G1", "G1", "G1", "G1",
];

export type GameLoopHandle = {
  start: () => Promise<void>;
  stop: () => void;
  setStage: (stage: number) => void;
  setMuted: (muted: boolean) => void;
};

/**
 * Procedural loop BGM — melody fixed, BPM by level band.
 * start() is abort-safe: stop() during unlock will not revive timers.
 */
export function createGameLoop(initialStage = 1): GameLoopHandle {
  let stage = Math.max(1, initialStage);
  let melodyIndex = 0;
  let bassIndex = 0;
  let beatTimer: number | null = null;
  let bassTimer: number | null = null;
  let noiseTimer: number | null = null;
  let running = false;
  let startEpoch = 0;
  let loopMuted = isSoundMuted();

  const bpm = () => bpmForLevel(stage);
  const eighthSec = () => 60 / bpm() / 2;
  const quarterSec = () => 60 / bpm();

  const tickMelody = () => {
    if (!running || loopMuted || isSoundMuted()) return;
    const [note, dur] = MELODY[melodyIndex];
    scheduleTone({
      type: "square",
      freq: noteToFrequency(note),
      duration: dur * eighthSec(),
      gain: BGM_MELODY_GAIN,
      route: "bgm",
    });
    melodyIndex = (melodyIndex + 1) % MELODY.length;
  };

  const tickBass = () => {
    if (!running || loopMuted || isSoundMuted()) return;
    const note = BASS[bassIndex];
    scheduleTone({
      type: "triangle",
      freq: noteToFrequency(note),
      duration: quarterSec() * 0.95,
      gain: BGM_BASS_GAIN,
      route: "bgm",
    });
    bassIndex = (bassIndex + 1) % BASS.length;
  };

  const tickNoise = () => {
    if (!running || loopMuted || isSoundMuted()) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    scheduleNoiseBurst(ctx.currentTime, 0.025, BGM_NOISE_GAIN, 2000, "bgm");
  };

  const clearTimers = () => {
    if (beatTimer != null) window.clearInterval(beatTimer);
    if (bassTimer != null) window.clearInterval(bassTimer);
    if (noiseTimer != null) window.clearInterval(noiseTimer);
    beatTimer = null;
    bassTimer = null;
    noiseTimer = null;
  };

  const armTimers = () => {
    clearTimers();
    if (!running) return;
    const eighthMs = eighthSec() * 1000;
    const quarterMs = quarterSec() * 1000;
    tickMelody();
    tickBass();
    beatTimer = window.setInterval(tickMelody, eighthMs);
    bassTimer = window.setInterval(tickBass, quarterMs);
    if (stage >= 16) {
      noiseTimer = window.setInterval(tickNoise, quarterMs * 2);
    }
  };

  const handle: GameLoopHandle = {
    async start() {
      const epoch = ++startEpoch;
      running = true;
      await ensureAudioReady();
      // stop() or a newer start() ran while we awaited unlock
      if (epoch !== startEpoch || !running || activeLoop !== handle) {
        clearTimers();
        return;
      }
      melodyIndex = 0;
      bassIndex = 0;
      unmuteBgm();
      armTimers();
    },
    stop() {
      startEpoch += 1;
      running = false;
      clearTimers();
    },
    setStage(nextStage: number) {
      const next = Math.max(1, nextStage);
      const bandChanged = bpmForLevel(stage) !== bpmForLevel(next);
      stage = next;
      if (running) {
        if (bandChanged) {
          melodyIndex = 0;
          bassIndex = 0;
        }
        armTimers();
      }
    },
    setMuted(muted: boolean) {
      loopMuted = muted;
    },
  };

  return handle;
}

let activeLoop: GameLoopHandle | null = null;

export function getActiveGameLoop() {
  return activeLoop;
}

export function setActiveGameLoop(loop: GameLoopHandle | null) {
  if (activeLoop === loop) return;
  activeLoop?.stop();
  activeLoop = loop;
}

export function stopActiveGameLoop() {
  activeLoop?.stop();
  activeLoop = null;
  muteBgmImmediate();
}
