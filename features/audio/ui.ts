import {
  ensureAudioReady,
  noteToFrequency,
  scheduleTone,
  SE_GAIN,
} from "@/features/audio/soundEngine";

/** Short electronic button click. */
export async function createButtonClick() {
  await ensureAudioReady();
  scheduleTone({
    type: "square",
    freq: noteToFrequency("G4"),
    duration: 0.05,
    gain: SE_GAIN * 0.75,
  });
}

/** Subtle hover blip. */
export async function createHover() {
  await ensureAudioReady();
  scheduleTone({
    type: "square",
    freq: noteToFrequency("C6"),
    duration: 0.025,
    gain: SE_GAIN * 0.18,
    attack: 0.002,
  });
}
