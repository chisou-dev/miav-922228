import type { ReentryArtVariant } from "./reentryArtPresentation";
import { anglePresentationOffsetDeg } from "./reentryLaunchInput";

/** Percent coordinates within the stage (0–100). Earth = destination, craft = start. */
export const REENTRY_SCENE = {
  earth: { x: 24, y: 74 },
  craft: { x: 73, y: 22 },
  hintText: "Lock power, set angle, launch",
  /** Pointer hit radius around craft anchor (fraction of min stage dimension). */
  craftHitRadiusFactor: 0.14,
  /** Tune when swapping vehicle art (nose is up in `stage1-vehicle.webp`). */
  /** Global nose trim after swapping `stage1-vehicle.webp` (visual, not physics). */
  craftNoseRotationOffsetDeg: -6,
} as const;

/** Sprite nose points up at 0° in asset space; rotate to fly toward Earth. */
export function craftBaseNoseRotationDeg(): number {
  const { earth, craft } = REENTRY_SCENE;
  const rad = Math.atan2(earth.y - craft.y, earth.x - craft.x);
  return (rad * 180) / Math.PI + 90 + REENTRY_SCENE.craftNoseRotationOffsetDeg;
}

export function craftNoseRotationDeg(angleNorm: number, flightWobbleDeg = 0): number {
  return (
    craftBaseNoseRotationDeg() +
    anglePresentationOffsetDeg(angleNorm) +
    flightWobbleDeg
  );
}

export function craftHitRadiusPx(rect: DOMRect): number {
  return Math.min(rect.width, rect.height) * REENTRY_SCENE.craftHitRadiusFactor;
}

export function isPointerOnCraft(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): boolean {
  const craft = craftAnchorClient(rect);
  const r = craftHitRadiusPx(rect);
  return Math.hypot(clientX - craft.x, clientY - craft.y) <= r;
}

export function craftAnchorClient(rect: DOMRect): { x: number; y: number } {
  return {
    x: rect.left + (rect.width * REENTRY_SCENE.craft.x) / 100,
    y: rect.top + (rect.height * REENTRY_SCENE.craft.y) / 100,
  };
}

export function anchorToPercent(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

/** Exterior flight progress along craft → Earth (presentation only). */
export function craftEarthTravelT(
  playback: number,
  exterior: number,
): number {
  const t = Math.min(1, Math.max(0, playback));
  const eased = t * t * (3 - 2 * t);
  return eased * exterior;
}

export function craftPositionPercent(
  travelT: number,
  variant: ReentryArtVariant,
): { x: number; y: number } {
  const boost = variant === "stage" ? 0 : -1;
  const cx = REENTRY_SCENE.craft.x + boost;
  const cy = REENTRY_SCENE.craft.y + boost * 0.5;
  return {
    x: cx + (REENTRY_SCENE.earth.x - cx) * travelT,
    y: cy + (REENTRY_SCENE.earth.y - cy) * travelT,
  };
}

export type FlightMilestone = "SPACE" | "ENTRY" | "HEAT" | "EARTH";

const MILESTONES: FlightMilestone[] = ["SPACE", "ENTRY", "HEAT", "EARTH"];

export function flightMilestone(
  playback: number,
  interior: number,
  heatGlow: number,
): FlightMilestone {
  if (playback < 0.17) return "SPACE";
  if (playback < 0.42 || interior < 0.55) return "ENTRY";
  if (playback < 0.74 && heatGlow < 0.55) return "HEAT";
  return "EARTH";
}

export function milestoneLabels(): readonly FlightMilestone[] {
  return MILESTONES;
}
