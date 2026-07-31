/**
 * MIAV Games — shared procedural sound library.
 * Web Audio API only. No mp3 / wav / ogg.
 *
 * Games: use AudioManager only (playBgm / stopBgm / playSe).
 * Do not touch AudioContext or BGM timers from game code.
 */

export {
  disposeSoundEngine,
  ensureAudioReady,
  getAudioContext,
  isSoundMuted,
  muteBgmImmediate,
  noteToFrequency,
  setSoundMuted,
  unlockAudio,
  unmuteBgm,
} from "@/features/audio/soundEngine";

export {
  AudioManager,
  Bit8Audio,
  MiavSound,
  type BgmState,
  type GameAudioState,
  type SeId,
} from "@/features/audio/AudioManager";

export { createButtonClick, createHover } from "@/features/audio/ui";

export {
  createBinaryBoot,
  createBlockRotate,
  createBlockSnap,
  createDecoded,
  createFail,
  createFirework,
  createNewRecord,
  createStageClear,
  createStageStart,
} from "@/features/audio/game";

export { createVictoryJingle } from "@/features/audio/victory";

export {
  createGameLoop,
  getActiveGameLoop,
  setActiveGameLoop,
  stopActiveGameLoop,
  bpmForLevel,
  type GameLoopHandle,
} from "@/features/audio/ambient";

/** @deprecated Prefer AudioManager.setSuppressed */
export { isBgmSuppressed, suppressBgm } from "@/features/audio/bgmControl";

import { AudioManager, type SeId } from "@/features/audio/AudioManager";
import { isSoundMuted } from "@/features/audio/soundEngine";

/** @deprecated Prefer SeId + AudioManager.playSe */
export type SfxId =
  | "snap"
  | "complete"
  | "level_up"
  | "firework"
  | "button"
  | "reject";

/** @deprecated Prefer AudioManager.getInstance().playSe */
export async function playSfx(id: SfxId) {
  if (isSoundMuted()) return;
  const map: Record<SfxId, SeId> = {
    snap: "snap",
    complete: "complete",
    level_up: "level_up",
    firework: "firework",
    button: "button",
    reject: "reject",
  };
  await AudioManager.getInstance().playSe(map[id]);
}

/** @deprecated Use AudioManager */
export const Audio = AudioManager;

/** @deprecated Use createGameLoop(). */
export { createGameLoop as getProceduralBgm } from "@/features/audio/ambient";

/** @deprecated Use createGameLoop(). */
export { createGameLoop as ProceduralBgm } from "@/features/audio/ambient";
