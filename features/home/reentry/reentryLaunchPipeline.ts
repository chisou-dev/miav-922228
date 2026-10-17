import {
  mapLaunchToInput,
  spaceGammaToReentryAngleDeg,
  wrap01,
} from "./reentryLaunchInput";
import { REENTRY_PHYSICS_VERSION } from "./reentryConstants";
import { simulateReentry } from "./reentryPhysics";
import { flightDurationMs } from "./reentryPlayback";
import {
  ATMOSPHERE_SUCCESS_MS,
  FAILURE_HOLD_MS,
  SPACE_INBOUND_DURATION_MS,
  SPACE_MISS_DURATION_MS,
  atmosphereFailureDurationMs,
  spaceInboundDurationMs,
  spaceMissDurationMs,
} from "./reentryStageTimeline";
import {
  launchSpaceApproach,
  type SpaceApproachResult,
} from "./reentrySpaceApproach";
import type {
  ReentryPlayRecord,
  ReentryResult,
} from "./reentryTypes";

export {
  FAILURE_HOLD_MS,
  SPACE_INBOUND_DURATION_MS,
  SPACE_MISS_DURATION_MS,
};

function skipOnlyResult(seed: number): ReentryResult {
  return {
    version: REENTRY_PHYSICS_VERSION,
    seed,
    outcome: "SKIP",
    frames: [
      {
        t: 0,
        altitudeM: 2_000_000,
        speedMps: 8000,
        x: 0,
        y: 2_000_000,
        z: 0,
        heatFluxWm2: 0,
        heatLoadJm2: 0,
        dynamicPressurePa: 0,
        integrity: 1,
      },
    ],
    metrics: {
      maxHeatFluxWm2: 0,
      totalHeatLoadJm2: 0,
      maxDynamicPressurePa: 0,
      minimumAltitudeM: 2_000_000,
      finalSpeedMps: 8000,
      remainingIntegrity: 1,
      remainingStructuralIntegrity: 1,
      remainingThermalIntegrity: 1,
    },
  };
}

export type Stage1Launch = {
  space: SpaceApproachResult;
  result: ReentryResult;
  record: ReentryPlayRecord;
  durationMs: number;
  spaceShare: number;
};

export type GuaranteedStage1Clear = {

  launched: Stage1Launch;

  angleNorm: number;

  seed: number;

  powerNorm: number;

};



function clearAssistOffsetsDeg(): number[] {

  const values: number[] = [];

  const seen =

    new Set<string>();

  for (

    let step = 0;

    step <= 18;

    step++

  ) {

    const delta =

      step * 0.25;

    for (const magnitude of [

      3.5 + delta,

      3.5 - delta,

    ]) {

      if (

        magnitude < 1.25 ||

        magnitude > 8

      ) {

        continue;

      }

      for (const sign of [1, -1]) {

        const value =

          sign * magnitude;

        const key =

          value.toFixed(2);

        if (seen.has(key)) {

          continue;

        }

        seen.add(key);

        values.push(value);

      }

    }

  }

  return values;

}



export function findGuaranteedStage1Clear(

  powerNorm: number,

  preferredSeed: number,

  earthBearingScreenRad: number,

  spaceStartAltitudeM: number,

): GuaranteedStage1Clear | null {

  const earthDirectionNorm =

    wrap01(

      (

        earthBearingScreenRad +

        Math.PI / 2

      ) /

        (

          Math.PI * 2

        ),

    );

  const seeds =

    Array.from(

      new Set([

        7,

        19,

        1,

        preferredSeed >>> 0,

      ]),

    );

  const requestedPower =

    Math.min(

      1,

      Math.max(

        0,

        powerNorm,

      ),

    );

  const powers =

    requestedPower === 0.5

      ? [requestedPower]

      : [

          requestedPower,

          0.5,

        ];

  for (const candidatePower of powers) {

    for (const seed of seeds) {

      for (

        const offsetDeg of

        clearAssistOffsetsDeg()

      ) {

        const candidateAngleNorm =

          wrap01(

            earthDirectionNorm +

            offsetDeg / 360,

          );

        const launched =

          runStage1Launch(

            candidatePower,

            candidateAngleNorm,

            seed,

            earthBearingScreenRad,

            spaceStartAltitudeM,

          );

        if (

          launched.space.kind ===

            "ATMOSPHERE_ENTRY" &&

          launched.result.outcome ===

            "EARTH_REACHED"

        ) {

          return {

            launched,

            angleNorm:

              candidateAngleNorm,

            seed,

            powerNorm:

              candidatePower,

          };

        }

      }

    }

  }

  return null;

}



export function durationForStage1(
  space: SpaceApproachResult,
  result: ReentryResult,
  powerNorm = 0.5,
): {
  durationMs: number;
  spaceShare: number;
} {
  if (space.kind === "SPACE_MISS") {
    return {
      durationMs: spaceMissDurationMs(powerNorm),
      spaceShare: 1,
    };
  }

  const inboundMs = spaceInboundDurationMs(powerNorm);

  const atmosphereMs =
    result.outcome === "EARTH_REACHED"
      ? ATMOSPHERE_SUCCESS_MS
      : result.outcome === "BURN" ||
          result.outcome === "BREAK"
        ? atmosphereFailureDurationMs(
            result.metrics.minimumAltitudeM,
            result.outcome,
            powerNorm,
            space.kind === "ATMOSPHERE_ENTRY"
              ? space.entry.gammaRad
              : undefined,
          )
        : flightDurationMs(result.outcome);

  const hold =
    result.outcome === "BURN" ||
    result.outcome === "BREAK"
      ? FAILURE_HOLD_MS
      : 0;

  const durationMs =
    inboundMs +
    atmosphereMs +
    hold;

  return {
    durationMs,
    spaceShare:
      inboundMs /
      Math.max(1, durationMs),
  };
}

/**
 * Stage 1 accessibility aim assist, applied ONCE at launch before SPACE lock.
 * A chosen heading within +/-25 degrees of the visible Earth bearing is
 * compressed into +/-3.5 degrees of its center. The simulator still integrates
 * the actual flight and can BURN/BREAK; this does not force EARTH_REACHED.
 * Beyond this cone the mapping expands smoothly back to the full 360-degree
 * compass so there is no jump at the +/-25-degree boundary.
 */
export function stage1AssistedDirectionNorm(
  angleNorm: number,
  earthBearingScreenRad: number,
): number {
  const chosen = -Math.PI / 2 + wrap01(angleNorm) * Math.PI * 2;
  const delta = Math.atan2(
    Math.sin(chosen - earthBearingScreenRad),
    Math.cos(chosen - earthBearingScreenRad),
  );
  const halfCone = 25 * Math.PI / 180;
  const inner = 3.5 * Math.PI / 180;
  const magnitude = Math.abs(delta);
  const correctedOffset = magnitude <= halfCone
    ? (magnitude / halfCone) * inner
    : inner + ((magnitude - halfCone) / (Math.PI - halfCone)) * (Math.PI - inner);
  const corrected = earthBearingScreenRad + Math.sign(delta) * correctedOffset;
  return wrap01((corrected + Math.PI / 2) / (Math.PI * 2));
}

export function runStage1Launch(
  powerNorm: number,
  angleNorm: number,
  seed: number,
  earthBearingScreenRad?: number,
  spaceStartAltitudeM?: number,
): Stage1Launch {
  const input = mapLaunchToInput(
    powerNorm,
    angleNorm,
    seed,
  );

  const space = launchSpaceApproach(
    input.initialSpeedMps,
    angleNorm,
    earthBearingScreenRad,
    spaceStartAltitudeM,
  );

  if (space.kind === "SPACE_MISS") {
    const result = skipOnlyResult(seed);
    const timing = durationForStage1(
      space,
      result,
      powerNorm,
    );

    return {
      space,
      result,
      record: {
        input,
        seed,
        version: result.version,
        spaceApproach: space,
        spaceShare: timing.spaceShare,
        earthBearingScreenRad,
        spaceStartAltitudeM:
          space.startAltitudeM,
      },
      ...timing,
    };
  }

  /*
   * IMPORTANT v20 handoff:
   *
   * The long cinematic SPACE leg is integrated with real Earth gravity for
   * path curvature. Starting tens of millions of metres away adds several
   * km/s before the atmosphere. Feeding that acquired speed directly into the
   * already-calibrated Physics v1.1 model made almost every run fail.
   *
   * Keep the SPACE geometry's entry gamma, but feed the calibrated POWER speed
   * into the frozen atmospheric solver.
   */
  const entryAngleDeg =
    spaceGammaToReentryAngleDeg(
      space.entry.gammaRad,
      powerNorm,
    );

  const result = simulateReentry({
    ...input,
    initialSpeedMps:
      input.initialSpeedMps,
    entryAngleDeg,
  });

  const timing = durationForStage1(
    space,
    result,
    powerNorm,
  );

  return {
    space,
    result,
    record: {
      input: {
        ...input,
        initialSpeedMps:
          input.initialSpeedMps,
        entryAngleDeg,
      },
      seed,
      version: result.version,
      spaceApproach: space,
      spaceShare: timing.spaceShare,
      earthBearingScreenRad,
      spaceStartAltitudeM:
        space.startAltitudeM,
    },
    ...timing,
  };
}
