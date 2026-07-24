/** Stable 32-bit hash for staggering star animations. */
export function hashPlaceId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type StarMotion = {
  breatheDurationSec: number;
  breatheDelaySec: number;
  colorDurationSec: number;
  colorDelaySec: number;
};

/** Per-star breathe + color timing so markers don't pulse in sync. */
export function starMotionForId(locationId: string): StarMotion {
  const h = hashPlaceId(locationId);
  const a = h % 1000;
  const b = Math.floor(h / 1000) % 1000;
  const c = Math.floor(h / 1_000_000) % 1000;
  const d = Math.floor(h / 1_000_000_000) % 1000;

  // Breathe: ~2.2s–5.0s, start offset across that period
  const breatheDurationSec = 2.2 + (a / 999) * 2.8;
  const breatheDelaySec = -((b / 999) * breatheDurationSec);

  // Color cycle: ~12s–28s, independent phase
  const colorDurationSec = 12 + (c / 999) * 16;
  const colorDelaySec = -((d / 999) * colorDurationSec);

  return {
    breatheDurationSec,
    breatheDelaySec,
    colorDurationSec,
    colorDelaySec,
  };
}
