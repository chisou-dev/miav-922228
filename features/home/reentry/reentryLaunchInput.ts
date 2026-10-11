import type { ReentryInput } from "./reentryTypes";
import { lerpFromUnit, mixU32, u32ToUnit } from "./seededRandom";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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
 * The POWER bar must remain winnable across its range.
 *
 * Physics v1.1's viable entry-speed corridor is intentionally narrow.
 * POWER therefore changes the cinematic travel time very strongly, while
 * the physical atmospheric entry speed stays in the calibrated v1.1 band.
 *
 * This keeps low, medium, and high POWER all capable of success while the
 * player still clearly sees low POWER travel slowly and high POWER quickly.
 */
export function reentrySpeedFromPower(powerNorm: number): number {
  return 7000 + smoothstep(powerNorm) * 300;
}

/**
 * Direction UI remains a complete turn.
 */
export function directionNormToEntryAngleDeg(directionNorm: number): number {
  const n = wrap01(directionNorm);
  const signedTurnDeg = (n - 0.5) * 360;
  return 3 + signedTurnDeg;
}

export function directionNormToHeadingDeg(directionNorm: number): number {
  return wrap01(directionNorm) * 360;
}

/**
 * Convert the actual SPACE fly-in geometry to the angle expected by the
 * frozen reentry physics model.
 *
 * Important:
 * - We keep the *variation* in physical fly-in angle, so every approach does
 *   not enter with the same attitude.
 * - We do not feed the ~12 km/s speed gained by the long cinematic fall into
 *   the calibrated v1.1 atmosphere solver. That was causing near-universal
 *   BURN/BREAK and 0% nearby results.
 * - Higher POWER shifts the useful direction slightly, so POWER and DIRECTION
 *   remain a coupled puzzle rather than independent decorations.
 */
export function spaceGammaToReentryAngleDeg(
  gammaRad: number,
  powerNorm: number,
): number {
  const gammaDeg = Math.abs((gammaRad * 180) / Math.PI);
  const power = smoothstep(powerNorm);

  return clamp(
    0.55 + gammaDeg * 0.082 - power * 0.30,
    0.5,
    16,
  );
}

export function mapLaunchToInput(
  powerNorm: number,
  angleNorm: number,
  seed: number,
): ReentryInput {
  const initialSpeedMps = reentrySpeedFromPower(powerNorm);
  const entryAngleDeg = directionNormToEntryAngleDeg(angleNorm);

  return {
    entryAngleDeg,
    headingDeg: directionNormToHeadingDeg(angleNorm),
    initialSpeedMps,
    seed,
  };
}

/** Kept for legacy preview code. Full-circle presentation. */
export function anglePresentationOffsetDeg(angleNorm: number): number {
  return (wrap01(angleNorm) - 0.5) * 360;
}
