import { mapLaunchToInput } from "./reentryLaunchInput";
import { REENTRY_PHYSICS_VERSION } from "./reentryConstants";
import { simulateReentry } from "./reentryPhysics";
import { flightDurationMs } from "./reentryPlayback";
import {
  ATMOSPHERE_FAILURE_MS,
  ATMOSPHERE_SUCCESS_MS,
  FAILURE_HOLD_MS,
  SPACE_INBOUND_DURATION_MS,
  SPACE_MISS_DURATION_MS,
} from "./reentryStageTimeline";
import {
  launchSpaceApproach,
  type SpaceApproachResult,
} from "./reentrySpaceApproach";
import type { ReentryPlayRecord, ReentryResult } from "./reentryTypes";

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
): { durationMs: number; spaceShare: number } {
  if (space.kind === "SPACE_MISS") {
    return {
      durationMs: SPACE_MISS_DURATION_MS,
      spaceShare: 1,
    };
  }

  const atmosphereMs =
    result.outcome === "EARTH_REACHED"
      ? ATMOSPHERE_SUCCESS_MS
      : result.outcome === "BURN" || result.outcome === "BREAK"
        ? ATMOSPHERE_FAILURE_MS
        : flightDurationMs(result.outcome);
  const hold =
    result.outcome === "BURN" || result.outcome === "BREAK"
      ? FAILURE_HOLD_MS
      : 0;
  const durationMs = SPACE_INBOUND_DURATION_MS + atmosphereMs + hold;
  return {
    durationMs,
    spaceShare: SPACE_INBOUND_DURATION_MS / durationMs,
  };
}

export function runStage1Launch(
  powerNorm: number,
  angleNorm: number,
  seed: number,
): Stage1Launch {
  const input = mapLaunchToInput(powerNorm, angleNorm, seed);
  const space = launchSpaceApproach(input.initialSpeedMps, angleNorm);

  if (space.kind === "SPACE_MISS") {
    const result = skipOnlyResult(seed);
    const timing = durationForStage1(space, result);
    return {
      space,
      result,
      record: {
        input,
        seed,
        version: result.version,
        spaceApproach: space,
        spaceShare: timing.spaceShare,
      },
      ...timing,
    };
  }

  const entryAngleDeg = Math.abs(
    (space.entry.gammaRad * 180) / Math.PI,
  );
  const result = simulateReentry({
    ...input,
    initialSpeedMps: space.entry.speedMps,
    entryAngleDeg,
  });
  const timing = durationForStage1(space, result);
  return {
    space,
    result,
    record: {
      input: {
        ...input,
        initialSpeedMps: space.entry.speedMps,
        entryAngleDeg,
      },
      seed,
      version: result.version,
      spaceApproach: space,
      spaceShare: timing.spaceShare,
    },
    ...timing,
  };
}
