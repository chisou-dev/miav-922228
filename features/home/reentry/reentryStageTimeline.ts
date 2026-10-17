
/**

 * Legacy/default constants kept for compatibility.

 */

export const SPACE_INBOUND_DURATION_MS = 7000;

export const SPACE_MISS_FLYBY_MS = 6200;

export const SPACE_MISS_DEPART_MS = 3800;

export const SPACE_MISS_DURATION_MS =

  SPACE_MISS_FLYBY_MS + SPACE_MISS_DEPART_MS;



// Stage 1 cinematic visual clock, measured from water contact.
// After the craft-top exit, the squid boards the skiff and raises multiple
// tentacles to draw the original hull into its hands through separate filaments.
// It then enters the skiff, the hatch seals / CLEAR stays, and only the skiff departs.
// Physics v1.1 and the 120km handoff remain unchanged.
// The craft completes its descent at 15s. Start the spray just before
// contact (approximately one CSS pixel at normal playback), not 0.85s early.
export const STAGE1_SPLASH_S = 14.98;
export const STAGE1_ABSORB_START_S = 12.0;
export const STAGE1_ABSORB_END_S = 15.4;
export const STAGE1_BOARD_COMPLETE_S = 16.9;
export const STAGE1_CLEAR_HOLD_END_S = 18.7;
export const STAGE1_GLIDE_END_S = 21.2;
export const STAGE1_ESCAPE_EXIT_S = 22.7;
export const STAGE1_EPILOGUE_DURATION_S = STAGE1_ESCAPE_EXIT_S;
export const ATMOSPHERE_SUCCESS_MS = Math.round(
  (STAGE1_SPLASH_S + STAGE1_EPILOGUE_DURATION_S) * 1000,
);

export const ATMOSPHERE_FAILURE_MS = 14_000;

export const FAILURE_HOLD_MS = 850;



export const ATMOSPHERE_SURVIVE_S = 5;

export const FAILURE_MAX_SURVIVE_S = 11.5;

export const DESTRUCTION_BURST_S = 1.25;



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



export function spaceInboundDurationMs(powerNorm: number): number {

  const p = smoothstep01(powerNorm);

  return Math.round(mix(10_000, 1_800, p));

}



export function spaceMissDurationMs(powerNorm: number): number {

  return spaceInboundDurationMs(powerNorm) + 3_800;

}



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



  return smoothstep01((95_000 - minimumAltitudeM) / 92_000);

}



function entrySteepness01(entryGammaRad: number | undefined): number {

  if (

    entryGammaRad === undefined ||

    !Number.isFinite(entryGammaRad)

  ) {

    return 0.5;

  }



  const gamma = Math.abs(entryGammaRad);

  return smoothstep01((gamma - 0.025) / 0.55);

}



export function failureVisualDepth01(

  minimumAltitudeM: number | undefined,

  outcome: string | undefined,

  powerNorm: number,

  entryGammaRad?: number,

): number {

  if (outcome !== "BURN" && outcome !== "BREAK") return 1;



  const p = smoothstep01(powerNorm);

  const steep = entrySteepness01(entryGammaRad);

  const close = failureCloseness01(minimumAltitudeM, outcome);



  return clamp01(

    0.20 +

      close * 0.44 +

      (1 - steep) * 0.23 +

      (1 - p) * 0.13,

  );

}



export function failureDestructionStartS(

  minimumAltitudeM: number | undefined,

  outcome: string | undefined,

  powerNorm = 0.5,

  entryGammaRad?: number,

): number {

  if (outcome !== "BURN" && outcome !== "BREAK") {

    return FAILURE_MAX_SURVIVE_S;

  }



  const depth = failureVisualDepth01(

    minimumAltitudeM,

    outcome,

    powerNorm,

    entryGammaRad,

  );



  const crossingS = atmosphereTransitionDurationS(powerNorm);



  return Math.min(

    FAILURE_MAX_SURVIVE_S,

    Math.max(

      5.5,

      crossingS + 2.6,

      mix(5.5, 11.5, depth),

    ),

  );

}



export function atmosphereFailureDurationMs(

  minimumAltitudeM: number | undefined,

  outcome: string | undefined,

  powerNorm: number,

  entryGammaRad?: number,

): number {

  const destructionStartS = failureDestructionStartS(

    minimumAltitudeM,

    outcome,

    powerNorm,

    entryGammaRad,

  );



  return Math.round(

    (destructionStartS + DESTRUCTION_BURST_S + 0.65) * 1000,

  );

}



export function destructionAmountFromEntryS(

  timeSinceAtmosphereEntryS: number,

  outcome: string | undefined,

  minimumAltitudeM?: number,

  powerNorm = 0.5,

  entryGammaRad?: number,

): number {

  if (outcome !== "BURN" && outcome !== "BREAK") return 0;



  const start = failureDestructionStartS(

    minimumAltitudeM,

    outcome,

    powerNorm,

    entryGammaRad,

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
