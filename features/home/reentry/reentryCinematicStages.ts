export type ReentryCinematicStage =
  | "SPACE"
  | "ATMOSPHERE"
  | "SURFACE";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export type ReentryStageMix = {
  stage: ReentryCinematicStage;
  space: number;
  atmosphere: number;
  surface: number;
  blueLimb: number;
  stars: number;
};

/**
 * Presentation only.
 * This never changes trajectory or physics.
 */
export function reentryStageMix(
  altitudeM: number,
): ReentryStageMix {
  const atmosphere = smoothstep(
    (105_000 - altitudeM) / 45_000,
  );

  const surface = smoothstep(
    (24_000 - altitudeM) / 18_000,
  );

  const space = 1 - atmosphere;

  const blueLimb = smoothstep(
    (112_000 - altitudeM) / 34_000,
  );

  const stars =
    1 - smoothstep(
      (92_000 - altitudeM) / 28_000,
    );

  const stage: ReentryCinematicStage =
    altitudeM <= 24_000
      ? "SURFACE"
      : altitudeM <= 105_000
        ? "ATMOSPHERE"
        : "SPACE";

  return {
    stage,
    space,
    atmosphere,
    surface,
    blueLimb,
    stars,
  };
}

export function burnDestructionAmount(
  playback: number,
  altitudeM: number,
  outcome: string | undefined,
): number {
  if (outcome !== "BURN") return 0;

  const altitudeAmount = smoothstep(
    (46_000 - altitudeM) / 16_000,
  );

  const terminalAmount = smoothstep(
    (playback - 0.88) / 0.12,
  );

  return Math.max(
    altitudeAmount,
    terminalAmount,
  );
}

export function visualAtmosphereGate(
  craftX: number,
  craftY: number,
  horizonY: number,
  h: number,
): number {
  const band = Math.max(
    24,
    h * 0.065,
  );

  return 1 - smoothstep(
    Math.max(
      0,
      horizonY - craftY,
    ) / band,
  );
}
