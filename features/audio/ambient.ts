import {
  ensureAudioReady,
  getAudioContext,
  isSoundMuted,
  noteToFrequency,
  scheduleNoiseBurst,
  scheduleTone,
} from "@/features/audio/soundEngine";

const BASE_BPM = 96;

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
 * Procedural loop BGM — melody fixed, BPM scales with stage only.
 * Square + Triangle + occasional noise. No audio files.
 */
export function createGameLoop(initialStage = 1): GameLoopHandle {
  let stage = Math.max(1, initialStage);
  let melodyIndex = 0;
  let bassIndex = 0;
  let beatTimer: number | null = null;
  let bassTimer: number | null = null;
  let noiseTimer: number | null = null;
  let running = false;
  let loopMuted = isSoundMuted();

  const bpm = () => Math.min(168, BASE_BPM + stage * 3);

  const eighthSec = () => 60 / bpm() / 2;
  const quarterSec = () => 60 / bpm();

  const tickMelody = () => {
    if (loopMuted || isSoundMuted()) return;
    const [note, dur] = MELODY[melodyIndex];
    scheduleTone({
      type: "square",
      freq: noteToFrequency(note),
      duration: dur * eighthSec(),
      gain: 0.04,
    });
    melodyIndex = (melodyIndex + 1) % MELODY.length;
  };

  const tickBass = () => {
    if (loopMuted || isSoundMuted()) return;
    const note = BASS[bassIndex];
    scheduleTone({
      type: "triangle",
      freq: noteToFrequency(note),
      duration: quarterSec() * 0.95,
      gain: 0.05,
    });
    bassIndex = (bassIndex + 1) % BASS.length;
  };

  const tickNoise = () => {
    if (loopMuted || isSoundMuted()) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    scheduleNoiseBurst(ctx.currentTime, 0.025, 0.012, 2000);
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
    if (stage >= 15) {
      noiseTimer = window.setInterval(tickNoise, quarterMs * 2);
    }
  };

  return {
    async start() {
      await ensureAudioReady();
      running = true;
      melodyIndex = 0;
      bassIndex = 0;
      armTimers();
    },
    stop() {
      running = false;
      clearTimers();
    },
    setStage(nextStage: number) {
      stage = Math.max(1, nextStage);
      if (running) armTimers();
    },
    setMuted(muted: boolean) {
      loopMuted = muted;
    },
  };
}

let activeLoop: GameLoopHandle | null = null;

export function getActiveGameLoop() {
  return activeLoop;
}

export function setActiveGameLoop(loop: GameLoopHandle | null) {
  activeLoop?.stop();
  activeLoop = loop;
}

export function stopActiveGameLoop() {
  activeLoop?.stop();
  activeLoop = null;
}
