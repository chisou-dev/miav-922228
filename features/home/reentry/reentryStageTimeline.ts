/**
 * Presentation-only Stage 1 v13 wall-clock staging.
 * Does not change Physics v1.1.
 */

export const SPACE_INBOUND_DURATION_MS = 7000;
export const SPACE_MISS_FLYBY_MS = 6200;
export const SPACE_MISS_DEPART_MS = 1500;
export const SPACE_MISS_DURATION_MS = SPACE_MISS_FLYBY_MS + SPACE_MISS_DEPART_MS;
export const ATMOSPHERE_SUCCESS_MS = 18000;
export const ATMOSPHERE_FAILURE_MS = 10000;
export const FAILURE_HOLD_MS = 2200;

export const ATMOSPHERE_SURVIVE_S = 3;
export const DESTRUCTION_WINDOW_S = 7;
export const SUCCESS_LANDING_START_S = 11;
export const SUCCESS_LANDING_END_S = 15;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function atmosphereElapsedS(
  playback: number,
  spaceShare: number,
  inboundMs = SPACE_INBOUND_DURATION_MS,
): number {
  if (spaceShare >= 0.999 || playback <= spaceShare) return 0;
  const totalMs = inboundMs / Math.max(1e-4, spaceShare);
  return ((playback - spaceShare) * totalMs) / 1000;
}

export function destructionAmountFromEntryS(
  timeSinceAtmosphereEntryS: number,
  outcome: string | undefined,
): number {
  if (outcome !== "BURN" && outcome !== "BREAK") return 0;
  if (timeSinceAtmosphereEntryS < ATMOSPHERE_SURVIVE_S) return 0;
  return clamp01(
    (timeSinceAtmosphereEntryS - ATMOSPHERE_SURVIVE_S) / DESTRUCTION_WINDOW_S,
  );
}

export function successLandingT(timeSinceAtmosphereEntryS: number): number {
  return clamp01(
    (timeSinceAtmosphereEntryS - SUCCESS_LANDING_START_S) /
      (SUCCESS_LANDING_END_S - SUCCESS_LANDING_START_S),
  );
}
