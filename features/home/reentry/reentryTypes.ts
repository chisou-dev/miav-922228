export type ReentryPhase = "power" | "angle" | "flight" | "result";

export type ReentryOutcome =
  | "SKIP"
  | "BURN"
  | "BREAK"
  | "EARTH_REACHED";

export interface ReentryInput {
  entryAngleDeg: number;
  headingDeg: number;
  initialSpeedMps: number;
  seed: number;
}

export interface ReentryFrame {
  t: number;
  altitudeM: number;
  speedMps: number;
  x: number;
  y: number;
  z: number;
  heatFluxWm2: number;
  heatLoadJm2: number;
  dynamicPressurePa: number;
  integrity: number;
}

export interface ReentryMetrics {
  maxHeatFluxWm2: number;
  totalHeatLoadJm2: number;
  maxDynamicPressurePa: number;
  minimumAltitudeM: number;
  finalSpeedMps: number;
  /** min(structural, thermal) — legacy summary */
  remainingIntegrity: number;
  remainingStructuralIntegrity: number;
  remainingThermalIntegrity: number;
}

export interface ReentryResult {
  version: string;
  seed: number;
  outcome: ReentryOutcome;
  frames: ReentryFrame[];
  metrics: ReentryMetrics;
}

/** Play record sufficient to reproduce a run when simulation is swapped in. */
export interface ReentryPlayRecord {
  input: ReentryInput;
  seed: number;
  version: string;
  spaceApproach?: import("./reentrySpaceApproach").SpaceApproachResult;
  spaceShare?: number;
  /** Screen bearing from the launch craft toward the rendered Earth at launch. */
  earthBearingScreenRad?: number;
  /** SPACE start altitude chosen to match visible Earth angular size. */
  spaceStartAltitudeM?: number;
}

export type ReentrySimulator = (input: ReentryInput) => ReentryResult;
