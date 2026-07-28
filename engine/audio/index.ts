/**
 * @deprecated Import from `@/features/audio` instead.
 */
export {
  Bit8Audio,
  createGameLoop,
  createVictoryJingle,
  MiavSound,
  playSfx,
  unlockAudio,
  type GameLoopHandle,
  type SfxId,
} from "@/features/audio";

/** @deprecated Use createGameLoop from `@/features/audio`. */
export { createGameLoop as getProceduralBgm } from "@/features/audio";

/** @deprecated Use createGameLoop from `@/features/audio`. */
export { createGameLoop as ProceduralBgm } from "@/features/audio";

/** @deprecated Use MiavSound / disposeSoundEngine. */
export function disposeProceduralBgm() {
  // no-op — active loop is stopped via MiavSound.stopBgm()
}
