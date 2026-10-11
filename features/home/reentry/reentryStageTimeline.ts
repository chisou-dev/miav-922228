/**
 * Legacy/default constants are kept for compatibility with old imports.
 * v20 uses the POWER-aware helpers below for actual Stage 1 playback.
 */
export const SPACE_INBOUND_DURATION_MS = 7000;
export const SPACE_MISS_FLYBY_MS = 6200;
export const SPACE_MISS_DEPART_MS = 1500;
export const SPACE_MISS_DURATION_MS =
  SPACE_MISS_FLYBY_MS + SPACE_MISS_DEPART_MS;

/*
 * Success gets a full epilogue:
 * touchdown -> hatch -> alien -> capsule -> escape craft -> STAGE 1 CLEAR
 * -> quiet final sea/sky with the original craft sinking.
 */
export const ATMOSPHERE_SUCCESS_MS = 28_000;
export const ATMOSPHERE_FAILURE_MS = 12000;
export const FAILURE_HOLD_MS = 850;

export const ATMOSPHERE_SURVIVE_S = 3;
export const FAILURE_MAX_SURVIVE_S = 10;
export const DESTRUCTION_BURST_S = 1.2;

export const SUCCESS_LANDING_START_S = 11;
export const SUCCESS_LANDING_END_S = 15;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep01(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * SPACE travel:
 * LOW POWER  -> about 10 s to the atmospheric handoff
 * HIGH POWER -> about 1.8 s (roughly the current fastest visual speed)
 */
export function spaceInboundDurationMs(powerNorm: number): number {
  const p = smoothstep01(powerNorm);
  return Math.round(mix(10_000, 1_800, p));
}

/**
 * A miss still needs time after closest approach for gravity to bend the
 * trajectory and for both Earth and craft to recede.
 */
export function spaceMissDurationMs(powerNorm: number): number {
  return spaceInboundDurationMs(powerNorm) + 2_600;
}

/**
 * Time used to move from black SPACE into the deep blue atmospheric camera.
 * LOW POWER takes longer; HIGH POWER crosses the upper atmosphere quickly.
 */
export function atmosphereTransitionDurationS(powerNorm: number): number {
  const p = smoothstep01(powerNorm);
  return mix(5, 2, p);
}

export function atmosphereElapsedS(
  playback: number,
  spaceShare: number,
  inboundMs = SPACE_INBOUND_DURATION_MS,
): number {
  if (spaceShare >= 0.999 || playback <= spaceShare) return 0;
  const totalMs = inboundMs / Math.max(1e-4, spaceShare);
  return ((playback - spaceShare) * totalMs) / 1000;
}

export function failureCloseness01(
  minimumAltitudeM: number | undefined,
  outcome: string | undefined,
): number {
  if (outcome !== "BURN" && outcome !== "BREAK") return 1;
  if (
    minimumAltitudeM === undefined ||
    !Number.isFinite(minimumAltitudeM)
  ) {
    return 0;
  }

  return smoothstep01((88_000 - minimumAltitudeM) / 84_000);
}

/**
 * v20 failure timing.
 *
 * The craft cannot break on the visible atmospheric rim.
 *
 * HIGH POWER:
 *   about 2 s to cross the blue upper layer
 *   + at least 1 s deeper inside
 *   = earliest destruction ~3 s
 *
 * LOW POWER:
 *   about 5 s through the upper layer
 *   + up to 5 s deeper inside
 *   = destruction can wait until ~10 s
 *
 * A run that gets closer to success survives longer before final breakup.
 */

export function failureDestructionStartS(

  minimumAltitudeM: number | undefined,

  outcome: string | undefined,

  powerNorm = 0.5,

): number {

  if (

    outcome !== "BURN" &&

    outcome !== "BREAK"

  ) {

    return FAILURE_MAX_SURVIVE_S;

  }



  const p =

    smoothstep01(powerNorm);



  const crossingS =

    atmosphereTransitionDurationS(

      powerNorm,

    );



  const closeness =

    failureCloseness01(

      minimumAltitudeM,

      outcome,

    );



  const absoluteMinimumS = 5.0;



  const powerBaseS =

    mix(

      8.2,

      5.0,

      p,

    );



  const closenessBonusS =

    closeness *

    mix(

      1.8,

      3.1,

      1 - p,

    );



  return Math.min(

    FAILURE_MAX_SURVIVE_S,

    Math.max(

      absoluteMinimumS,

      crossingS + 2.25,

      powerBaseS +

        closenessBonusS,

    ),

  );

}

export function atmosphereFailureDurationMs(
  minimumAltitudeM: number | undefined,
  outcome: string | undefined,
  powerNorm: number,
): number {
  const destructionStartS = failureDestructionStartS(
    minimumAltitudeM,
    outcome,
    powerNorm,
  );

  return Math.round(
    (destructionStartS + DESTRUCTION_BURST_S + 0.55) * 1000,
  );
}

export function destructionAmountFromEntryS(
  timeSinceAtmosphereEntryS: number,
  outcome: string | undefined,
  minimumAltitudeM?: number,
  powerNorm = 0.5,
): number {
  if (outcome !== "BURN" && outcome !== "BREAK") return 0;

  const start = failureDestructionStartS(
    minimumAltitudeM,
    outcome,
    powerNorm,
  );

  if (timeSinceAtmosphereEntryS < start) return 0;

  return clamp01(
    (timeSinceAtmosphereEntryS - start) /
      DESTRUCTION_BURST_S,
  );
}

export function successLandingT(
  timeSinceAtmosphereEntryS: number,
): number {
  return clamp01(
    (timeSinceAtmosphereEntryS - SUCCESS_LANDING_START_S) /
      (SUCCESS_LANDING_END_S - SUCCESS_LANDING_START_S),
  );
}
