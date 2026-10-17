/**
 * Stage 2: deterministic, entirely separate from Stage 1 reentry physics.
 * 24-degree aim window and 0..1 power input are deliberately uniform.
 *
 * Nose: 0.38 degrees wide; mouth: 0.62 degrees wide. Together they occupy
 * 1/24 of the horizontal aiming window. Accepted power width is 0.24.
 * A uniformly exploratory first attempt therefore clears ~1% of the time:
 * (0.38 + 0.62)/24 * 0.24 = 0.01 exactly.
 *
 * No random "99% failure" is imposed: accurate replayed shots always work.
 */
export const STAGE2_MIN_DEG = -12;
export const STAGE2_MAX_DEG = 12;
export const STAGE2_NOSE_DEG = -1.60;
export const STAGE2_MOUTH_DEG = 0.85;
export const STAGE2_NOSE_HALF_DEG = 0.19;
export const STAGE2_MOUTH_HALF_DEG = 0.31;
export const STAGE2_POWER_MIN = 0.45;
export const STAGE2_POWER_MAX = 0.69;
export const STAGE2_FLIGHT_S = 9.5;
export const STAGE2_ZOOM_STEPS = [1, 2, 4, 8, 16, 32, 64, 128, 167] as const;

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

export function stage2Evaluate(angleDeg: number, power: number): Stage2Outcome {
  if (!Number.isFinite(angleDeg) || !Number.isFinite(power)) return "MISSED";
  const nose = Math.abs(angleDeg - STAGE2_NOSE_DEG) <= STAGE2_NOSE_HALF_DEG;
  const mouth = Math.abs(angleDeg - STAGE2_MOUTH_DEG) <= STAGE2_MOUTH_HALF_DEG;
  const aperture = nose || mouth;
  if (power < STAGE2_POWER_MIN) return "TOO_WEAK";
  if (power > STAGE2_POWER_MAX && aperture) return "TOO_FAST";
  if (power > STAGE2_POWER_MAX) return "MISSED";
  if (nose) return "NOSE";
  if (mouth) return "MOUTH";
  if (angleDeg < -7.4 || angleDeg > 7.8) return "REEF";
  if (angleDeg < -3.7 || angleDeg > 4.5) return "SAND";
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
