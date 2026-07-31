/**
 * @deprecated Prefer AudioManager.setSuppressed / isSuppressed.
 * Kept as thin wrappers for existing call sites.
 */
import { AudioManager } from "@/features/audio/AudioManager";

export function suppressBgm(value: boolean) {
  AudioManager.getInstance().setSuppressed(value);
}

export function isBgmSuppressed() {
  return AudioManager.getInstance().isSuppressed();
}
