export const REENTRY_PHYSICS_VERSION = "reentry-physics-v1.1";

export const EARTH_RADIUS_M = 6_371_000;
export const EARTH_MU = 3.986004418e14;

export const INITIAL_ALTITUDE_M = 120_000;

export const DT = 0.02;
export const MAX_SIM_TIME_S = 1800;
export const MAX_STEPS = Math.ceil(MAX_SIM_TIME_S / DT);

export const FRAME_RECORD_INTERVAL_S = 0.15;

/** Shallow trajectories that never engage the atmosphere. */
export const SKIP_NO_ENTRY_TIME_S = 240;
export const SKIP_NO_ENTRY_ALTITUDE_M = 108_000;

export const ATMOSPHERE_ENTRY_ALTITUDE_M = 100_000;
export const SKIP_ALTITUDE_M = 110_000;
export const SKIP_MIN_SPEED_MPS = 5_500;

export const HEAT_COEFFICIENT = 1.83e-4;

export const VEHICLE = {
  massKg: 9000,
  referenceAreaM2: 15,
  dragCoefficient: 1.25,
  liftCoefficient: 0.15,
  noseRadiusM: 1.0,
  /** Set from measured max Q: corridor ~32–42 kPa; deep fast peaks higher in dense air. */
  structuralLimitPa: 38_800,
};

/** Base thermal limits before environment scale. */
export const THERMAL_LIMITS = {
  /** Shallow success ~1.44e6; steep burn ~2.5–3.6e6 */
  heatFluxWm2: 1.905e6,
  heatLoadJm2: 1.12e8,
};

export const DAMAGE_RATES = {
  thermalFlux: 0.162,
  thermalLoad: 0.068,
  structural: 0.36,
};

/**
 * Empirical structural-load calibration for gameplay.
 * This is not a physical law. It weights dynamic-pressure damage so dense,
 * low-altitude air fails the airframe before high-altitude heating does.
 * Tuned for reentry-physics-v1.1 — values stay fixed unless a balance pass changes them.
 */
export const STRUCTURAL_DEPTH = {
  highAltitudeM: 78_000,
  lowAltitudeM: 28_000,
  factorHigh: 0.18,
  factorLow: 1.35,
};
