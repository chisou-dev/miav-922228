import {
  mixNum,
  smoothstep01,
} from "./reentryVisualCausality";

export type StageEarthView = {
  x: number;
  y: number;
  r: number;
};

/**
 * SPACE composition.
 *
 * Earth is deliberately inset from the lower-left corner so the player can
 * read both the ship's path and the black space behind it.
 */
export function launchEarthView(
  w: number,
  h: number,
): StageEarthView {
  const minDim =
    Math.min(w, h);

  return {
    x: w * 0.22,
    y: h * 0.72,
    r: minDim * 0.105,
  };
}

/**
 * During SPACE, Earth is almost a fixed reference object.
 *
 * The old camera enlarged Earth while the craft barely moved, which made
 * Earth feel like the moving subject. v17 removes that effect.
 *
 * Inbound:
 * - Earth stays essentially fixed.
 * - craft supplies the visible closing movement.
 * - atmospheric contact triggers a separate cinematic camera.
 *
 * Miss:
 * - Earth stays stable through closest approach.
 * - only the outbound flyby pulls the camera back and shrinks Earth.
 */
export function cinematicEarthView({
  w,
  h,
  idle,
  miss,
  travelT,
  spaceT,
}: {
  w: number;
  h: number;
  idle: boolean;
  miss: boolean;
  travelT: number;
  spaceT: number;
}): StageEarthView {
  const start =
    launchEarthView(w, h);

  if (idle) {
    return start;
  }

  if (miss) {
    const outbound01 =
      smoothstep01(
        (spaceT - 0.48) /
          0.52,
      );

    return {
      x: mixNum(
        start.x,
        start.x + w * 0.015,
        outbound01,
      ),
      y: mixNum(
        start.y,
        start.y - h * 0.01,
        outbound01,
      ),
      r: mixNum(
        start.r,
        Math.max(
          Math.min(w, h) *
            0.062,
          start.r * 0.54,
        ),
        outbound01,
      ),
    };
  }

  void travelT;
  return start;
}

export function earthGrowthRatioAtApproach(
  travelT: number,
): number {
  void travelT;
  return 1;
}
