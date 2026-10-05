/**
 * Development / reference only — production play uses `reentryPhysics.simulateReentry`.
 * TEMPORARY MOCK — kept for offline outcome smoke tests without integrating the solver.
 */
import type {
  ReentryFrame,
  ReentryInput,
  ReentryMetrics,
  ReentryOutcome,
  ReentryResult,
  ReentrySimulator,
} from "./reentryTypes";

export const MOCK_REENTRY_SIMULATION_VERSION = "mock-0.1.0";

const FRAME_COUNT = 120;

function mixU32(seed: number, a: number, b: number, c: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ a, 0x9e3779b9);
  h = Math.imul(h ^ b, 0x85ebca6b);
  h = Math.imul(h ^ c, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function pickOutcome(seed: number, input: ReentryInput): ReentryOutcome {
  const bucket = mixU32(
    seed,
    Math.round(input.entryAngleDeg * 1_000),
    Math.round(input.headingDeg),
    Math.round(input.initialSpeedMps),
  );
  const outcomes: ReentryOutcome[] = [
    "SKIP",
    "BURN",
    "BREAK",
    "EARTH_REACHED",
  ];
  return outcomes[bucket % outcomes.length];
}

function buildFrames(
  outcome: ReentryOutcome,
  input: ReentryInput,
  seed: number,
): ReentryFrame[] {
  const frames: ReentryFrame[] = [];
  const headingRad = (input.headingDeg * Math.PI) / 180;
  const lateral = Math.cos(headingRad) * 0.35;
  const depth = Math.sin(headingRad) * 0.15;

  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = i / (FRAME_COUNT - 1);
    const wobble =
      (mixU32(seed, i, 1, 2) % 1000) / 1000 * 0.04 - 0.02;

    let x = lateral * t;
    let y = 0.82 - t * 0.55 + depth * t;
    let altitudeM = 120_000 * (1 - t) + 40_000;
    let integrity = 1;
    let heatFlux = 2e5 * Math.sin(Math.PI * t);

    switch (outcome) {
      case "SKIP":
        if (t > 0.55) {
          y -= (t - 0.55) * 0.9;
          altitudeM = 90_000 + (t - 0.55) * 200_000;
        }
        heatFlux *= 0.35;
        break;
      case "BURN":
        heatFlux *= 1.4 + t;
        integrity = Math.max(0, 1 - t * 1.15);
        break;
      case "BREAK":
        integrity = t > 0.42 ? 0 : 1 - t * 0.5;
        x += wobble + (t > 0.42 ? (t - 0.42) * 0.25 : 0);
        break;
      case "EARTH_REACHED":
        y = 0.82 - t * 0.95;
        altitudeM = Math.max(0, 80_000 * (1 - t));
        heatFlux *= 0.85;
        break;
    }

    frames.push({
      t,
      altitudeM,
      speedMps: input.initialSpeedMps * (1 - t * 0.35),
      x,
      y,
      z: wobble,
      heatFluxWm2: heatFlux,
      heatLoadJm2: heatFlux * t * 12,
      dynamicPressurePa: 3_000 + t * 18_000,
      integrity,
    });
  }

  return frames;
}

function buildMetrics(
  outcome: ReentryOutcome,
  input: ReentryInput,
  frames: ReentryFrame[],
): ReentryMetrics {
  const maxHeat = frames.reduce(
    (m, f) => Math.max(m, f.heatFluxWm2),
    0,
  );
  const minAlt = frames.reduce(
    (m, f) => Math.min(m, f.altitudeM),
    frames[0]?.altitudeM ?? 0,
  );
  const last = frames[frames.length - 1];
  return {
    maxHeatFluxWm2: maxHeat,
    totalHeatLoadJm2: last?.heatLoadJm2 ?? 0,
    maxDynamicPressurePa: frames.reduce(
      (m, f) => Math.max(m, f.dynamicPressurePa),
      0,
    ),
    minimumAltitudeM: minAlt,
    finalSpeedMps: last?.speedMps ?? input.initialSpeedMps,
    remainingIntegrity:
      outcome === "BURN" || outcome === "BREAK"
        ? 0
        : last?.integrity ?? 1,
    remainingStructuralIntegrity:
      outcome === "BREAK" ? 0 : last?.integrity ?? 1,
    remainingThermalIntegrity:
      outcome === "BURN" ? 0 : last?.integrity ?? 1,
  };
}

/** TEMPORARY MOCK — replace with physics engine. */
export const simulateReentry: ReentrySimulator = (
  input: ReentryInput,
): ReentryResult => {
  const outcome = pickOutcome(input.seed, input);
  const frames = buildFrames(outcome, input, input.seed);
  return {
    version: MOCK_REENTRY_SIMULATION_VERSION,
    seed: input.seed,
    outcome,
    frames,
    metrics: buildMetrics(outcome, input, frames),
  };
};
