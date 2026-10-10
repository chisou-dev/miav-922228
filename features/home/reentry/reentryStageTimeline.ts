export const SPACE_INBOUND_DURATION_MS = 7000;
export const SPACE_MISS_FLYBY_MS = 6200;
export const SPACE_MISS_DEPART_MS = 1500;
export const SPACE_MISS_DURATION_MS = SPACE_MISS_FLYBY_MS + SPACE_MISS_DEPART_MS;

export const ATMOSPHERE_SUCCESS_MS = 18000;
export const ATMOSPHERE_FAILURE_MS = 12000;
export const FAILURE_HOLD_MS = 2200;

export const ATMOSPHERE_SURVIVE_S = 3;
export const FAILURE_MAX_SURVIVE_S = 10;
export const DESTRUCTION_BURST_S = 1.2;

export const SUCCESS_LANDING_START_S = 11;
export const SUCCESS_LANDING_END_S = 15;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep01(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
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

export function failureCloseness01(
  minimumAltitudeM: number | undefined,
  outcome: string | undefined,
): number {
  if (outcome !== "BURN" && outcome !== "BREAK") return 1;
  if (minimumAltitudeM === undefined || !Number.isFinite(minimumAltitudeM)) return 0;
  return smoothstep01((88_000 - minimumAltitudeM) / 84_000);
}

export function failureDestructionStartS(
  minimumAltitudeM: number | undefined,
  outcome: string | undefined,
): number {
  if (outcome !== "BURN" && outcome !== "BREAK") return FAILURE_MAX_SURVIVE_S;
  return (
    ATMOSPHERE_SURVIVE_S +
    (FAILURE_MAX_SURVIVE_S - ATMOSPHERE_SURVIVE_S) *
      failureCloseness01(minimumAltitudeM, outcome)
  );
}

export function destructionAmountFromEntryS(
  timeSinceAtmosphereEntryS: number,
  outcome: string | undefined,
  minimumAltitudeM?: number,
): number {
  if (outcome !== "BURN" && outcome !== "BREAK") return 0;
  const start = failureDestructionStartS(minimumAltitudeM, outcome);
  if (timeSinceAtmosphereEntryS < start) return 0;
  return clamp01((timeSinceAtmosphereEntryS - start) / DESTRUCTION_BURST_S);
}

export function successLandingT(timeSinceAtmosphereEntryS: number): number {
  return clamp01(
    (timeSinceAtmosphereEntryS - SUCCESS_LANDING_START_S) /
      (SUCCESS_LANDING_END_S - SUCCESS_LANDING_START_S),
  );
}
