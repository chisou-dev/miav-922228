import type { ReentryInput } from "./reentryTypes";
import { lerpFromUnit, mixU32, u32ToUnit } from "./seededRandom";

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function wrap01(value: number): number {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

export function headingFromSeed(seed: number): number {
  const h = mixU32(seed, 0x101, 0x202, 0x303);
  return lerpFromUnit(u32ToUnit(h), 0, 360);
}

/**
 * Direction UI is a full turn in the current 2D orbital plane.
 *
 * 0.5 is the familiar nominal ~3° reentry attitude.
 * Rotating away from that point can point the craft upward, backward, or
 * steeply Earthward. The core physics already integrates gravity, so a craft
 * that misses Earth is no longer visually/autonomously corrected toward it.
 */
export function directionNormToEntryAngleDeg(directionNorm: number): number {
  const n = wrap01(directionNorm);
  const signedTurnDeg = (n - 0.5) * 360;
  return 3 + signedTurnDeg;
}

export function directionNormToHeadingDeg(directionNorm: number): number {
  return wrap01(directionNorm) * 360;
}

export function mapLaunchToInput(
  powerNorm: number,
  angleNorm: number,
  seed: number,
): ReentryInput {
  const initialSpeedMps = 7000 + smoothstep(powerNorm) * 2000;
  const entryAngleDeg = directionNormToEntryAngleDeg(angleNorm);

  return {
    entryAngleDeg,
    headingDeg: directionNormToHeadingDeg(angleNorm),
    initialSpeedMps,
    seed,
  };
}

/** Kept for any legacy preview code. Full-circle presentation in v6. */
export function anglePresentationOffsetDeg(angleNorm: number): number {
  return (wrap01(angleNorm) - 0.5) * 360;
}

