import {
  ensureAudioReady,
  getAudioContext,
  noteToFrequency,
  scheduleTone,
  SE_GAIN,
  waitMs,
} from "@/features/audio/soundEngine";

const VICTORY_GAIN = SE_GAIN * 0.55;
const SPARKLE_GAIN = SE_GAIN * 0.35;
const TOTAL_MS = 1500;

/**
 * ~1.5s Victory Jingle — Do Mi So Si Do (last note held).
 */
export async function createVictoryJingle(): Promise<void> {
  await ensureAudioReady();
  const ctx = getAudioContext();
  if (!ctx) return;

  const t0 = ctx.currentTime;

  const victory = [
    { note: "C5", at: 0, dur: 0.12 },
    { note: "E5", at: 0.14, dur: 0.12 },
    { note: "G5", at: 0.28, dur: 0.12 },
    { note: "B5", at: 0.42, dur: 0.12 },
    { note: "C6", at: 0.56, dur: 0.32 },
  ];
  for (const step of victory) {
    scheduleTone({
      type: "square",
      freq: noteToFrequency(step.note),
      duration: step.dur,
      gain: VICTORY_GAIN,
      when: t0 + step.at,
    });
    scheduleTone({
      type: "triangle",
      freq: noteToFrequency(step.note) * 0.5,
      duration: step.dur * 1.05,
      gain: VICTORY_GAIN * 0.55,
      when: t0 + step.at,
    });
  }

  ["E7", "G7", "B7", "C8"].forEach((note, i) => {
    scheduleTone({
      type: "square",
      freq: noteToFrequency(note),
      duration: 0.08,
      gain: SPARKLE_GAIN,
      when: t0 + 0.95 + i * 0.05,
      attack: 0.002,
    });
  });

  await waitMs(TOTAL_MS);
}
