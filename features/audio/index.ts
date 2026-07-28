/**
 * MIAV Games — shared procedural sound library.
 * Web Audio API only. No mp3 / wav / ogg.
 *
 * @example
 * import { createVictoryJingle, createBlockSnap } from "@/features/audio";
 * await createBlockSnap();
 */

export {
  disposeSoundEngine,
  ensureAudioReady,
  getAudioContext,
  isSoundMuted,
  noteToFrequency,
  setSoundMuted,
  unlockAudio,
} from "@/features/audio/soundEngine";

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
  type GameLoopHandle,
} from "@/features/audio/ambient";

import {
  createGameLoop,
  getActiveGameLoop,
  setActiveGameLoop,
  stopActiveGameLoop,
} from "@/features/audio/ambient";
import {
  createBlockRotate,
  createBlockSnap,
  createFail,
  createFirework,
  createNewRecord,
  createStageClear,
} from "@/features/audio/game";
import {
  createButtonClick,
} from "@/features/audio/ui";
import {
  disposeSoundEngine,
  ensureAudioReady,
  isSoundMuted,
  setSoundMuted,
} from "@/features/audio/soundEngine";
import { createVictoryJingle } from "@/features/audio/victory";

/** @deprecated Prefer named create* functions from `@/features/audio`. */
export type SfxId =
  | "snap"
  | "complete"
  | "level_up"
  | "firework"
  | "button"
  | "reject";

/** @deprecated Prefer named create* functions. */
export async function playSfx(id: SfxId) {
  if (isSoundMuted()) return;
  switch (id) {
    case "snap":
      await createBlockSnap();
      break;
    case "reject":
      await createFail();
      break;
    case "complete":
      await createStageClear();
      break;
    case "level_up":
      await createNewRecord();
      break;
    case "firework":
      await createFirework();
      break;
    case "button":
      await createButtonClick();
      break;
    default:
      break;
  }
}

/** Singleton facade — mute state + BGM lifecycle for game screens. */
export class MiavSound {
  private static instance: MiavSound | null = null;

  static getInstance() {
    if (!MiavSound.instance) MiavSound.instance = new MiavSound();
    return MiavSound.instance;
  }

  isMuted() {
    return isSoundMuted();
  }

  setMuted(muted: boolean) {
    setSoundMuted(muted);
    getActiveGameLoop()?.setMuted(muted);
  }

  async unlock() {
    await ensureAudioReady();
  }

  async button() {
    await createButtonClick();
  }

  async snap() {
    await createBlockSnap();
  }

  async rotate() {
    await createBlockRotate();
  }

  async fail() {
    await createFail();
  }

  async firework() {
    await createFirework();
  }

  async victory() {
    await createVictoryJingle();
  }

  /** @deprecated Use named create* functions or specific helpers. */
  async play(id: SfxId) {
    await playSfx(id);
  }

  /** @deprecated Use victory() or createVictoryJingle(). */
  async playVictory() {
    await this.victory();
  }

  async startBgm(stage = 1) {
    if (isSoundMuted()) return;
    const loop = createGameLoop(stage);
    setActiveGameLoop(loop);
    await loop.start();
  }

  setBgmStage(stage: number) {
    getActiveGameLoop()?.setStage(stage);
  }

  stopBgm() {
    stopActiveGameLoop();
  }

  dispose() {
    this.stopBgm();
    disposeSoundEngine();
  }
}

/** @deprecated Use MiavSound */
export const Bit8Audio = MiavSound;

/** @deprecated Use MiavSound */
export const Audio = MiavSound;

/** @deprecated Use createGameLoop(). */
export { createGameLoop as getProceduralBgm } from "@/features/audio/ambient";

/** @deprecated Use createGameLoop(). */
export { createGameLoop as ProceduralBgm } from "@/features/audio/ambient";
