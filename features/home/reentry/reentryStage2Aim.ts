/**
 * Stage 2 uses independent 2-axis cockpit aiming and deterministic wind/wave
 * drift; it does not alter the Stage 1 atmospheric simulation.
 * Two small aperture ellipses across a 24° × 12° aim window combined with
 * the 24%-wide accepted power band yield roughly a 1% exploration hit rate.
 * No random failure is imposed: replaying the same wind and shot is stable.
 */
export const STAGE2_MIN_DEG = -12;
export const STAGE2_MAX_DEG = 12;
export const STAGE2_NOSE_DEG = -1.60;
export const STAGE2_MOUTH_DEG = 0.85;
export const STAGE2_NOSE_HALF_DEG = 0.19;
export const STAGE2_MOUTH_HALF_DEG = 0.31;
export const STAGE2_POWER_MIN = 0.45;
export const STAGE2_POWER_MAX = 0.69;
export const STAGE2_FLIGHT_S = 6.5;
export const STAGE2_ZOOM_STEPS = [1, 2, 4, 8, 16, 24, 32] as const;
export const STAGE2_MIN_PITCH_DEG = -6;
export const STAGE2_MAX_PITCH_DEG = 6;
export const STAGE2_NOSE_PITCH_DEG = -1.2;
export const STAGE2_MOUTH_PITCH_DEG = 1.1;

export type Stage2Outcome =
  | "NOSE"
  | "MOUTH"
  | "TOO_WEAK"
  | "TOO_FAST"
  | "REEF"
  | "SAND"
  | "MISSED";

export function stage2Clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The optional pitch and wind offsets are for the Stage 2 two-axis cockpit.
 * Omitted pitch retains backward-compatible horizontal-only evaluation.
 * Wind and wave displacement are deterministic and visible on the monitor;
 * no outcome is randomly rolled at impact.
 */
export function stage2Evaluate(
  angleDeg: number,
  power: number,
  pitchDeg?: number,
  windYawDeg = 0,
  wavePitchDeg = 0,
): Stage2Outcome {
  if (!Number.isFinite(angleDeg) || !Number.isFinite(power) ||
      !Number.isFinite(windYawDeg) || !Number.isFinite(wavePitchDeg) ||
      (pitchDeg !== undefined && !Number.isFinite(pitchDeg))) return "MISSED";
  const yaw = angleDeg + windYawDeg;
  const pitch = (pitchDeg ?? 0) + wavePitchDeg;
  const nose = pitchDeg === undefined
    ? Math.abs(yaw - STAGE2_NOSE_DEG) <= STAGE2_NOSE_HALF_DEG
    : ((yaw - STAGE2_NOSE_DEG) / 0.97) ** 2 +
      ((pitch - STAGE2_NOSE_PITCH_DEG) / 1.10) ** 2 <= 1;
  const mouth = pitchDeg === undefined
    ? Math.abs(yaw - STAGE2_MOUTH_DEG) <= STAGE2_MOUTH_HALF_DEG
    : ((yaw - STAGE2_MOUTH_DEG) / 1.38) ** 2 +
      ((pitch - STAGE2_MOUTH_PITCH_DEG) / 1.40) ** 2 <= 1;
  const aperture = nose || mouth;
  if (power < STAGE2_POWER_MIN) return "TOO_WEAK";
  if (power > STAGE2_POWER_MAX && aperture) return "TOO_FAST";
  if (power > STAGE2_POWER_MAX) return "MISSED";
  if (nose) return "NOSE";
  if (mouth) return "MOUTH";
  if (yaw < -7.4 || yaw > 7.8) return "REEF";
  if (yaw < -3.7 || yaw > 4.5 || pitch > 4.7 || pitch < -4.9) return "SAND";
  return "MISSED";
}

export function stage2AimPoint(angleDeg: number): { x: number; y: number } {
  // Local face coordinates in head-unit space: these tie aim to the visible
  // openings, rather than drawing unrelated crosshairs over the illustration.
  const t = (angleDeg - STAGE2_NOSE_DEG) /
    (STAGE2_MOUTH_DEG - STAGE2_NOSE_DEG);
  return { x: -0.18 + t * 0.18, y: 0.28 + t * 0.42 };
}

export function stage2Message(outcome: Stage2Outcome): string {
  switch (outcome) {
    case "NOSE": return "CLEAR — NASAL ENTRY";
    case "MOUTH": return "CLEAR — ORAL ENTRY";
    case "TOO_WEAK": return "POWER TOO LOW — FELL SHORT";
    case "TOO_FAST": return "OVERPOWERED — PASSED THROUGH";
    case "REEF": return "GAME OVER — ROCK COLLISION";
    case "SAND": return "GAME OVER — BEACH IMPACT";
    default: return "GAME OVER — TARGET MISSED";
  }
}
