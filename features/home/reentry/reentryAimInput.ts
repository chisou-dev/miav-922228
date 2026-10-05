import type { ReentryInput } from "./reentryTypes";
import { lerpFromUnit, mixU32, u32ToUnit } from "./seededRandom";

export interface AimingPull {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/** Screen-space unit vector toward Earth (craft top-right → earth bottom-left). */
const EARTH_UX = -1 / Math.SQRT2;
const EARTH_UY = 1 / Math.SQRT2;

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function headingFromSeed(seed: number): number {
  const h = mixU32(seed, 0x101, 0x202, 0x303);
  return lerpFromUnit(u32ToUnit(h), 0, 360);
}

/** Drag from craft anchor: direction → entry angle, length → speed (physics v1.1). */
export function mapPullToInput(
  pull: AimingPull,
  seed: number,
  width: number,
  height: number,
): ReentryInput {
  const dx = pull.currentX - pull.startX;
  const dy = pull.currentY - pull.startY;
  const length = Math.hypot(dx, dy);
  const maxLength = Math.min(width, height) * 0.38;
  const speedNorm = smoothstep(length / maxLength);
  const initialSpeedMps = 7000 + speedNorm * 2000;

  const towardLeft = Math.max(0, -dx);
  const towardDown = Math.max(0, dy);
  const pullAngleRad = Math.atan2(towardDown, towardLeft + 1e-6);
  const maxPitchRad = (Math.PI / 2) * 0.92;
  const angleNorm = Math.min(1, pullAngleRad / maxPitchRad);
  const entryAngleDeg = 0.5 + angleNorm * (16 - 0.5);

  return {
    entryAngleDeg,
    headingDeg: headingFromSeed(seed),
    initialSpeedMps,
    seed,
  };
}

/** Must drag generally toward Earth (not away). */
export function pullTowardEarthPx(pull: AimingPull): number {
  const dx = pull.currentX - pull.startX;
  const dy = pull.currentY - pull.startY;
  return dx * EARTH_UX + dy * EARTH_UY;
}
