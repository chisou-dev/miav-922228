import {
  mapLaunchToInput,
  spaceGammaToReentryAngleDeg,
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
