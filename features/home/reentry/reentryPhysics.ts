import {
  ATMOSPHERE_ENTRY_ALTITUDE_M,
  DAMAGE_RATES,
  DT,
  EARTH_MU,
  EARTH_RADIUS_M,
  FRAME_RECORD_INTERVAL_S,
  HEAT_COEFFICIENT,
  INITIAL_ALTITUDE_M,
  MAX_STEPS,
  REENTRY_PHYSICS_VERSION,
  SKIP_ALTITUDE_M,
  SKIP_MIN_SPEED_MPS,
  SKIP_NO_ENTRY_ALTITUDE_M,
  SKIP_NO_ENTRY_TIME_S,
  STRUCTURAL_DEPTH,
  THERMAL_LIMITS,
  VEHICLE,
} from "./reentryConstants";
import { resampleReentryFrames } from "./reentryFrameResample";
import { environmentFromSeed } from "./reentryEnvironment";
import type {
  ReentryFrame,
  ReentryInput,
  ReentryMetrics,
  ReentryOutcome,
  ReentryResult,
} from "./reentryTypes";

const ATMOSPHERE_TABLE: readonly { altitudeM: number; rhoKgM3: number }[] = [
  { altitudeM: 0, rhoKgM3: 1.225 },
  { altitudeM: 10_000, rhoKgM3: 0.4135 },
  { altitudeM: 20_000, rhoKgM3: 0.08891 },
  { altitudeM: 30_000, rhoKgM3: 0.01841 },
  { altitudeM: 40_000, rhoKgM3: 0.003996 },
  { altitudeM: 50_000, rhoKgM3: 0.001027 },
  { altitudeM: 60_000, rhoKgM3: 0.0003097 },
  { altitudeM: 70_000, rhoKgM3: 8.283e-5 },
  { altitudeM: 80_000, rhoKgM3: 1.846e-5 },
  { altitudeM: 90_000, rhoKgM3: 3.416e-6 },
  { altitudeM: 100_000, rhoKgM3: 5.606e-7 },
  { altitudeM: 110_000, rhoKgM3: 9.708e-8 },
  { altitudeM: 120_000, rhoKgM3: 2.222e-8 },
];

function assertFinite(label: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`reentry physics: non-finite ${label}`);
  }
}

function atmosphereDensityKgM3(altitudeM: number): number {
  if (altitudeM <= 0) return ATMOSPHERE_TABLE[0].rhoKgM3;
  if (altitudeM >= 120_000) {
    const top = ATMOSPHERE_TABLE[ATMOSPHERE_TABLE.length - 1];
    const scale = Math.exp(-(altitudeM - 120_000) / 25_000);
    return top.rhoKgM3 * scale;
  }

  for (let i = 0; i < ATMOSPHERE_TABLE.length - 1; i++) {
    const low = ATMOSPHERE_TABLE[i];
    const high = ATMOSPHERE_TABLE[i + 1];
    if (altitudeM >= low.altitudeM && altitudeM <= high.altitudeM) {
      const t =
        (altitudeM - low.altitudeM) /
        (high.altitudeM - low.altitudeM);
      const logRho =
        Math.log(low.rhoKgM3) * (1 - t) + Math.log(high.rhoKgM3) * t;
      return Math.exp(logRho);
    }
  }
  return ATMOSPHERE_TABLE[ATMOSPHERE_TABLE.length - 1].rhoKgM3;
}

interface SimState {
  r: number;
  theta: number;
  v: number;
  gamma: number;
}

interface SimDerivatives {
  dr: number;
  dTheta: number;
  dv: number;
  dGamma: number;
}

function gravityAtRadius(r: number): number {
  return EARTH_MU / (r * r);
}

function derivatives(
  state: SimState,
  env: ReturnType<typeof environmentFromSeed>,
): {
  deriv: SimDerivatives;
  altitudeM: number;
  rho: number;
  airSpeedMps: number;
  dragN: number;
  liftN: number;
  dynamicPressurePa: number;
  heatFluxWm2: number;
} {
  const altitudeM = state.r - EARTH_RADIUS_M;
  const rho =
    atmosphereDensityKgM3(altitudeM) * env.densityScale;
  const g = gravityAtRadius(state.r);
  const airSpeedMps = Math.max(0, state.v - env.windAlongTrackMps);
  const q = 0.5 * rho * airSpeedMps * airSpeedMps;
  const dragN =
    q * VEHICLE.dragCoefficient * VEHICLE.referenceAreaM2;
  const liftN =
    q * VEHICLE.liftCoefficient * VEHICLE.referenceAreaM2;

  const heatFluxWm2 =
    HEAT_COEFFICIENT *
    Math.sqrt(rho / VEHICLE.noseRadiusM) *
    Math.pow(airSpeedMps, 3);

  const dv =
    -(dragN / VEHICLE.massKg) - g * Math.sin(state.gamma);
  const dGamma =
    liftN / (VEHICLE.massKg * Math.max(state.v, 1)) +
    (state.v / state.r - g / Math.max(state.v, 1)) *
      Math.cos(state.gamma);

  return {
    deriv: {
      dr: state.v * Math.sin(state.gamma),
      dTheta: (state.v * Math.cos(state.gamma)) / state.r,
      dv,
      dGamma,
    },
    altitudeM,
    rho,
    airSpeedMps,
    dragN,
    liftN,
    dynamicPressurePa: q,
    heatFluxWm2,
  };
}

function rk2Step(
  state: SimState,
  env: ReturnType<typeof environmentFromSeed>,
): SimState {
  const k1 = derivatives(state, env);
  const mid: SimState = {
    r: state.r + k1.deriv.dr * DT * 0.5,
    theta: state.theta + k1.deriv.dTheta * DT * 0.5,
    v: Math.max(0, state.v + k1.deriv.dv * DT * 0.5),
    gamma: state.gamma + k1.deriv.dGamma * DT * 0.5,
  };
  const k2 = derivatives(mid, env);
  return {
    r: state.r + k2.deriv.dr * DT,
    theta: state.theta + k2.deriv.dTheta * DT,
    v: Math.max(0, state.v + k2.deriv.dv * DT),
    gamma: state.gamma + k2.deriv.dGamma * DT,
  };
}

function structuralDepthFactor(altitudeM: number): number {
  const { highAltitudeM, lowAltitudeM, factorHigh, factorLow } =
    STRUCTURAL_DEPTH;
  if (altitudeM >= highAltitudeM) return factorHigh;
  if (altitudeM <= lowAltitudeM) return factorLow;
  const t =
    (highAltitudeM - altitudeM) / (highAltitudeM - lowAltitudeM);
  return factorHigh + t * (factorLow - factorHigh);
}

function timeoutOutcome(
  altitudeM: number,
  verticalSpeedMps: number,
  speedMps: number,
  hasEnteredAtmosphere: boolean,
): ReentryOutcome {
  if (
    hasEnteredAtmosphere &&
    altitudeM > SKIP_ALTITUDE_M &&
    verticalSpeedMps > 0 &&
    speedMps > SKIP_MIN_SPEED_MPS
  ) {
    return "SKIP";
  }
  if (altitudeM > 80_000) return "SKIP";
  return "BREAK";
}

export function simulateReentry(input: ReentryInput): ReentryResult {
  const env = environmentFromSeed(input.seed);
  const gamma0 = (-input.entryAngleDeg * Math.PI) / 180;

  let state: SimState = {
    r: EARTH_RADIUS_M + INITIAL_ALTITUDE_M,
    theta: 0,
    v: input.initialSpeedMps,
    gamma: gamma0,
  };

  let integrity = 1;
  let thermalIntegrity = 1;
  let heatLoadJm2 = 0;
  let hasEnteredAtmosphere = false;
  let outcome: ReentryOutcome | null = null;

  let maxHeatFluxWm2 = 0;
  let maxDynamicPressurePa = 0;
  let minimumAltitudeM = INITIAL_ALTITUDE_M;

  const frames: ReentryFrame[] = [];
  let simTime = 0;
  let nextFrameTime = 0;

  const heatFluxLimit =
    THERMAL_LIMITS.heatFluxWm2 * env.thermalToleranceScale;
  const heatLoadLimit =
    THERMAL_LIMITS.heatLoadJm2 * env.thermalToleranceScale;
  const structuralLimitPa =
    VEHICLE.structuralLimitPa * env.structuralToleranceScale;

  const recordFrame = (
    t: number,
    altitudeM: number,
    speedMps: number,
    downrangeM: number,
    sample: ReturnType<typeof derivatives>,
  ) => {
    frames.push({
      t,
      altitudeM,
      speedMps,
      x: downrangeM,
      y: altitudeM,
      z: 0,
      heatFluxWm2: sample.heatFluxWm2,
      heatLoadJm2,
      dynamicPressurePa: sample.dynamicPressurePa,
      integrity: Math.min(integrity, thermalIntegrity),
    });
  };

  let finalStructuralIntegrity = 1;
  let finalThermalIntegrity = 1;

  recordFrame(
    0,
    INITIAL_ALTITUDE_M,
    state.v,
    0,
    derivatives(state, env),
  );
  nextFrameTime = FRAME_RECORD_INTERVAL_S;

  for (let step = 0; step < MAX_STEPS; step++) {
    const sample = derivatives(state, env);
    const { altitudeM, heatFluxWm2, dynamicPressurePa } = sample;
    const verticalSpeedMps = state.v * Math.sin(state.gamma);
    const downrangeM = state.theta * EARTH_RADIUS_M;

    assertFinite("altitude", altitudeM);
    assertFinite("speed", state.v);
    assertFinite("heatFlux", heatFluxWm2);

    minimumAltitudeM = Math.min(minimumAltitudeM, altitudeM);
    maxHeatFluxWm2 = Math.max(maxHeatFluxWm2, heatFluxWm2);
    maxDynamicPressurePa = Math.max(
      maxDynamicPressurePa,
      dynamicPressurePa,
    );

    heatLoadJm2 += heatFluxWm2 * DT;

    const fluxRatio = heatFluxWm2 / heatFluxLimit;
    if (fluxRatio > 1) {
      thermalIntegrity -=
        Math.pow(fluxRatio - 1, 1.4) *
        DAMAGE_RATES.thermalFlux *
        DT;
    }
    const loadRatio = heatLoadJm2 / heatLoadLimit;
    if (loadRatio > 1) {
      thermalIntegrity -=
        Math.pow(loadRatio - 1, 1.2) *
        DAMAGE_RATES.thermalLoad *
        DT;
    }

    const qRatio = dynamicPressurePa / structuralLimitPa;
    if (qRatio > 1) {
      integrity -=
        Math.pow(qRatio - 1, 1.5) *
        DAMAGE_RATES.structural *
        structuralDepthFactor(altitudeM) *
        DT;
    }

    if (altitudeM < ATMOSPHERE_ENTRY_ALTITUDE_M) {
      hasEnteredAtmosphere = true;
    }

    if (thermalIntegrity <= 0) {
      outcome = "BURN";
      thermalIntegrity = 0;
      finalThermalIntegrity = 0;
      finalStructuralIntegrity = integrity;
      recordFrame(simTime, altitudeM, state.v, downrangeM, sample);
      break;
    }

    if (integrity <= 0) {
      outcome = "BREAK";
      integrity = 0;
      finalStructuralIntegrity = 0;
      finalThermalIntegrity = thermalIntegrity;
      recordFrame(simTime, altitudeM, state.v, downrangeM, sample);
      break;
    }

    if (
      hasEnteredAtmosphere &&
      altitudeM > SKIP_ALTITUDE_M &&
      verticalSpeedMps > 0 &&
      state.v > SKIP_MIN_SPEED_MPS
    ) {
      outcome = "SKIP";
      finalStructuralIntegrity = integrity;
      finalThermalIntegrity = thermalIntegrity;
      recordFrame(simTime, altitudeM, state.v, downrangeM, sample);
      break;
    }

    if (
      simTime >= SKIP_NO_ENTRY_TIME_S &&
      !hasEnteredAtmosphere &&
      altitudeM > SKIP_NO_ENTRY_ALTITUDE_M
    ) {
      outcome = "SKIP";
      finalStructuralIntegrity = integrity;
      finalThermalIntegrity = thermalIntegrity;
      recordFrame(simTime, altitudeM, state.v, downrangeM, sample);
      break;
    }

    if (altitudeM <= 0) {
      finalStructuralIntegrity = integrity;
      finalThermalIntegrity = thermalIntegrity;
      if (integrity > 0 && thermalIntegrity > 0) {
        outcome = "EARTH_REACHED";
      } else {
        outcome = integrity <= 0 ? "BREAK" : "BURN";
      }
      recordFrame(simTime, 0, state.v, downrangeM, sample);
      break;
    }

    state = rk2Step(state, env);
    simTime += DT;

    if (simTime >= nextFrameTime) {
      const post = derivatives(state, env);
      recordFrame(
        simTime,
        post.altitudeM,
        state.v,
        state.theta * EARTH_RADIUS_M,
        post,
      );
      nextFrameTime += FRAME_RECORD_INTERVAL_S;
    }
  }

  if (outcome === null) {
    const sample = derivatives(state, env);
    const verticalSpeedMps = state.v * Math.sin(state.gamma);
    outcome = timeoutOutcome(
      sample.altitudeM,
      verticalSpeedMps,
      state.v,
      hasEnteredAtmosphere,
    );
    finalStructuralIntegrity = integrity;
    finalThermalIntegrity = thermalIntegrity;
    recordFrame(
      simTime,
      sample.altitudeM,
      state.v,
      state.theta * EARTH_RADIUS_M,
      sample,
    );
  }

  if (
    outcome === "SKIP" &&
    finalStructuralIntegrity === 1 &&
    finalThermalIntegrity === 1
  ) {
    finalStructuralIntegrity = integrity;
    finalThermalIntegrity = thermalIntegrity;
  }

  const lastFrame = frames[frames.length - 1];
  const resampledFrames = resampleReentryFrames(frames, input.seed);
  const metrics: ReentryMetrics = {
    maxHeatFluxWm2,
    totalHeatLoadJm2: heatLoadJm2,
    maxDynamicPressurePa,
    minimumAltitudeM,
    finalSpeedMps: lastFrame?.speedMps ?? state.v,
    remainingIntegrity: Math.min(
      finalStructuralIntegrity,
      finalThermalIntegrity,
    ),
    remainingStructuralIntegrity: finalStructuralIntegrity,
    remainingThermalIntegrity: finalThermalIntegrity,
  };

  return {
    version: REENTRY_PHYSICS_VERSION,
    seed: input.seed,
    outcome,
    frames: resampledFrames,
    metrics,
  };
}
