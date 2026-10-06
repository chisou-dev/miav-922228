import type { ReentryInput } from "./reentryTypes";
import { lerpFromUnit, mixU32, u32ToUnit } from "./seededRandom";

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function headingFromSeed(seed: number): number {
  const h = mixU32(seed, 0x101, 0x202, 0x303);
  return lerpFromUnit(u32ToUnit(h), 0, 360);
}

/** Power + angle UI → physics v1.1 input (same ranges as drag aim). */
export function mapLaunchToInput(
  powerNorm: number,
  angleNorm: number,
  seed: number,
): ReentryInput {
  const initialSpeedMps = 7000 + smoothstep(powerNorm) * 2000;
  const entryAngleDeg = 0.5 + smoothstep(angleNorm) * (16 - 0.5);
  return {
    entryAngleDeg,
    headingDeg: headingFromSeed(seed),
    initialSpeedMps,
    seed,
  };
}

/** Presentation-only nose tilt (shallow ↔ steep toward Earth). */
export function anglePresentationOffsetDeg(angleNorm: number): number {
  return (angleNorm - 0.5) * 12;
}
