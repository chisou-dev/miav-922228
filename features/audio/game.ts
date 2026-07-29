import {
  ensureAudioReady,
  noteToFrequency,
  now,
  scheduleNoiseBurst,
  scheduleTone,
  SE_GAIN,
  waitMs,
} from "@/features/audio/soundEngine";

/** Block fits — 「カチッ」 ~60ms */
export async function createBlockSnap() {
  await ensureAudioReady();
  const t0 = now();
  scheduleNoiseBurst(t0, 0.018, SE_GAIN * 0.32, 1800);
  scheduleTone({
    type: "square",
    freq: noteToFrequency("E5"),
    duration: 0.06,
    gain: SE_GAIN,
    when: t0,
  });
}

/** Block rotation — quick binary sweep. */
export async function createBlockRotate() {
  await ensureAudioReady();
  const t0 = now();
  scheduleTone({
    type: "square",
    freq: noteToFrequency("A4"),
    duration: 0.04,
    gain: SE_GAIN * 0.7,
    when: t0,
  });
  scheduleTone({
    type: "square",
    freq: noteToFrequency("D5"),
    duration: 0.05,
    gain: SE_GAIN * 0.65,
    when: t0 + 0.035,
  });
}

/** Decoded display — ピッ ピッ ピー (~0.4s) */
export async function createDecoded() {
  await ensureAudioReady();
  const t0 = now();
  scheduleTone({
    type: "square",
    freq: noteToFrequency("E6"),
    duration: 0.06,
    gain: SE_GAIN * 0.85,
    when: t0,
  });
  scheduleTone({
    type: "square",
    freq: noteToFrequency("G6"),
    duration: 0.06,
    gain: SE_GAIN * 0.85,
    when: t0 + 0.12,
  });
  scheduleTone({
    type: "square",
    freq: noteToFrequency("B6"),
    duration: 0.12,
    gain: SE_GAIN * 0.9,
    when: t0 + 0.24,
  });
  await waitMs(400);
}

/** Firework sparkle — short high bursts. */
export async function createFirework() {
  await ensureAudioReady();
  const t0 = now();
  scheduleNoiseBurst(t0, 0.05, SE_GAIN * 0.28, 900);
  ["A5", "C6", "E6", "G6"].forEach((note, i) => {
    scheduleTone({
      type: "square",
      freq: noteToFrequency(note),
      duration: 0.07,
      gain: SE_GAIN * 0.45,
      when: t0 + i * 0.04,
      attack: 0.002,
    });
  });
  await waitMs(320);
}

/** Failure — low electronic tone. */
export async function createFail() {
  await ensureAudioReady();
  const t0 = now();
  scheduleTone({
    type: "square",
    freq: noteToFrequency("A3"),
    duration: 0.12,
    gain: SE_GAIN * 0.85,
    when: t0,
  });
  scheduleTone({
    type: "triangle",
    freq: noteToFrequency("E3"),
    duration: 0.14,
    gain: SE_GAIN * 0.7,
    when: t0 + 0.02,
  });
}

/** Stage start — short boot chirp. */
export async function createStageStart() {
  await ensureAudioReady();
  const t0 = now();
  scheduleTone({
    type: "square",
    freq: noteToFrequency("C5"),
    duration: 0.06,
    gain: SE_GAIN * 0.8,
    when: t0,
  });
  scheduleTone({
    type: "triangle",
    freq: noteToFrequency("G4"),
    duration: 0.08,
    gain: SE_GAIN * 0.55,
    when: t0 + 0.05,
  });
}

/** Stage clear — shorter than Victory. */
export async function createStageClear() {
  await ensureAudioReady();
  const t0 = now();
  const steps = [
    { note: "C5", at: 0, dur: 0.1 },
    { note: "E5", at: 0.12, dur: 0.1 },
    { note: "G5", at: 0.24, dur: 0.14 },
  ];
  for (const s of steps) {
    scheduleTone({
      type: "square",
      freq: noteToFrequency(s.note),
      duration: s.dur,
      gain: SE_GAIN * 0.55,
      when: t0 + s.at,
    });
  }
  await waitMs(450);
}

/** New record — cheerful ascending blips. */
export async function createNewRecord() {
  await ensureAudioReady();
  const t0 = now();
  ["C5", "E5", "G5", "C6"].forEach((note, i) => {
    scheduleTone({
      type: "square",
      freq: noteToFrequency(note),
      duration: 0.08,
      gain: SE_GAIN * 0.65,
      when: t0 + i * 0.09,
    });
  });
  await waitMs(450);
}

/** Game boot — AI startup ピッ ピッ ピー */
export async function createBinaryBoot() {
  await ensureAudioReady();
  const t0 = now();
  scheduleTone({
    type: "square",
    freq: noteToFrequency("G5"),
    duration: 0.05,
    gain: SE_GAIN * 0.75,
    when: t0,
  });
  scheduleTone({
    type: "square",
    freq: noteToFrequency("B5"),
    duration: 0.05,
    gain: SE_GAIN * 0.75,
    when: t0 + 0.1,
  });
  scheduleTone({
    type: "square",
    freq: noteToFrequency("E6"),
    duration: 0.1,
    gain: SE_GAIN * 0.8,
    when: t0 + 0.2,
  });
  await waitMs(350);
}
