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
    // Bigger and easier-to-aim visible target (about 2.4x the old 0.105 view).
    r: minDim * 0.255,
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
    /*
     * Keep the reference Earth fixed during a miss.
     * The craft now supplies the smooth flyby / departure motion, avoiding a
     * second camera-speed cue that made the pass feel slow-then-fast.
     */

    return start;
  }

  void travelT;
  void spaceT;
  return start;
}

export function earthGrowthRatioAtApproach(
  travelT: number,
): number {
  void travelT;
  return 1;
}
