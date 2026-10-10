import { wrap01 } from "./reentryLaunchInput";

const EARTH_RADIUS_M = 6_371_000;
const MU = 3.986004418e14;

export const ATMOSPHERE_HANDOFF_ALTITUDE_M = 120_000;
export const SPACE_START_ALTITUDE_M = 2_000_000;

export type Vec2 = {
  x: number;
  y: number;
};

export type SpaceState = {
  position: Vec2;
  velocity: Vec2;
  elapsedS: number;
};

export type SpaceApproachPoint = {
  state: SpaceState;
  altitudeM: number;
  screenHeadingRad: number;
};

export type SpaceEntry = {
  speedMps: number;
  gammaRad: number;
  state: SpaceState;
};

export type SpaceApproachResult =
  | {
      kind: "ATMOSPHERE_ENTRY";
      points: SpaceApproachPoint[];
      entry: SpaceEntry;
    }
  | {
      kind: "SPACE_MISS";
      points: SpaceApproachPoint[];
    };

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function normalize(v: Vec2): Vec2 {
  const l = Math.max(1e-9, length(v));
  return {
    x: v.x / l,
    y: v.y / l,
  };
}

function acceleration(
  position: Vec2,
): Vec2 {
  const r = length(position);
  const scale =
    -MU / (r * r * r);

  return {
    x: position.x * scale,
    y: position.y * scale,
  };
}

function midpointStep(
  state: SpaceState,
  dt: number,
): SpaceState {
  const a1 =
    acceleration(state.position);

  const midPosition = {
    x:
      state.position.x +
      state.velocity.x * dt * 0.5,
    y:
      state.position.y +
      state.velocity.y * dt * 0.5,
  };

  const midVelocity = {
    x:
      state.velocity.x +
      a1.x * dt * 0.5,
    y:
      state.velocity.y +
      a1.y * dt * 0.5,
  };

  const a2 =
    acceleration(midPosition);

  return {
    position: {
      x:
        state.position.x +
        midVelocity.x * dt,
      y:
        state.position.y +
        midVelocity.y * dt,
    },
    velocity: {
      x:
        state.velocity.x +
        a2.x * dt,
      y:
        state.velocity.y +
        a2.y * dt,
    },
    elapsedS:
      state.elapsedS + dt,
  };
}

function altitudeM(
  state: SpaceState,
): number {
  return (
    length(state.position) -
    EARTH_RADIUS_M
  );
}

function radialVelocity(
  state: SpaceState,
): number {
  const er =
    normalize(state.position);

  return (
    state.velocity.x * er.x +
    state.velocity.y * er.y
  );
}

function gammaRad(
  state: SpaceState,
): number {
  const er =
    normalize(state.position);

  const et = {
    x: -er.y,
    y: er.x,
  };

  const vr =
    state.velocity.x * er.x +
    state.velocity.y * er.y;

  const vt =
    state.velocity.x * et.x +
    state.velocity.y * et.y;

  return Math.atan2(
    vr,
    Math.abs(vt),
  );
}

export function canvasHeadingFromWorld(
  velocity: Vec2,
): number {
  return Math.atan2(-velocity.y, velocity.x);
}

export function directionNormToScreenHeadingRad(
  directionNorm: number,
): number {
  const n =
    ((directionNorm % 1) + 1) % 1;

  return (
    -Math.PI / 2 +
    n * Math.PI * 2
  );
}

export function makeInitialSpaceState(
  speedMps: number,
  headingWorldRad: number,
  startRadialAngleRad: number,
): SpaceState {
  const r =
    EARTH_RADIUS_M +
    SPACE_START_ALTITUDE_M;

  const position = {
    x:
      Math.cos(startRadialAngleRad) *
      r,
    y:
      Math.sin(startRadialAngleRad) *
      r,
  };

  return {
    position,
    velocity: {
      x:
        Math.cos(headingWorldRad) *
        speedMps,
      y:
        Math.sin(headingWorldRad) *
        speedMps,
    },
    elapsedS: 0,
  };
}

export function simulateSpaceApproach(
  initial: SpaceState,
): SpaceApproachResult {
  const points: SpaceApproachPoint[] = [];

  let state = initial;

  const startAngle =
    Math.atan2(
      initial.position.y,
      initial.position.x,
    );

  let previousAngle =
    startAngle;

  let accumulatedAngle = 0;

  const dt = 1;

  const maxSteps =
    Math.floor(
      (2.5 * 60 * 60) / dt,
    );

  points.push({
    state,
    altitudeM: altitudeM(state),
    screenHeadingRad: canvasHeadingFromWorld(state.velocity),
  });

  for (
    let i = 0;
    i < maxSteps;
    i++
  ) {
    state =
      midpointStep(state, dt);

    const alt =
      altitudeM(state);

    const angle =
      Math.atan2(
        state.position.y,
        state.position.x,
      );

    let da =
      angle - previousAngle;

    while (da > Math.PI) {
      da -= Math.PI * 2;
    }

    while (da < -Math.PI) {
      da += Math.PI * 2;
    }

    accumulatedAngle +=
      Math.abs(da);

    previousAngle = angle;

    if (
      i % 2 === 0 ||
      alt <=
        ATMOSPHERE_HANDOFF_ALTITUDE_M +
          60_000
    ) {
      points.push({
        state,
        altitudeM: alt,
        screenHeadingRad:
          canvasHeadingFromWorld(state.velocity),
      });
    }

    if (
      alt <=
        ATMOSPHERE_HANDOFF_ALTITUDE_M &&
      radialVelocity(state) < 0
    ) {
      return {
        kind: "ATMOSPHERE_ENTRY",
        points,
        entry: {
          speedMps:
            length(state.velocity),
          gammaRad:
            gammaRad(state),
          state,
        },
      };
    }

    const radial = radialVelocity(state);
    const departed =
      radial > 0 &&
      alt > SPACE_START_ALTITUDE_M * 1.35;

    if (accumulatedAngle >= Math.PI * 0.95 && departed) {
      return {
        kind: "SPACE_MISS",
        points,
      };
    }

    if (
      state.elapsedS > 120 &&
      departed &&
      alt > SPACE_START_ALTITUDE_M * 1.8 &&
      accumulatedAngle > Math.PI * 0.18
    ) {
      return {
        kind: "SPACE_MISS",
        points,
      };
    }

    if (
      !Number.isFinite(alt)
    ) {
      break;
    }
  }

  return {
    kind: "SPACE_MISS",
    points,
  };
}

export function launchSpaceApproach(
  speedMps: number,
  directionNorm: number,
): SpaceApproachResult {
  const screenHeading =
    directionNormToScreenHeadingRad(wrap01(directionNorm));
  const worldHeading = -screenHeading;
  const startRadial = Math.PI / 4;
  return simulateSpaceApproach(
    makeInitialSpaceState(speedMps, worldHeading, startRadial),
  );
}

export function sampleSpacePoint(
  points: SpaceApproachPoint[],
  t: number,
): SpaceApproachPoint | null {
  if (points.length === 0) return null;
  const scaled = Math.min(1, Math.max(0, t)) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled));
  const u = points.length === 1 ? 0 : scaled - i;
  const a = points[Math.max(0, i)];
  const b = points[Math.min(points.length - 1, i + 1)];
  const state: SpaceState = {
    position: {
      x: a.state.position.x + (b.state.position.x - a.state.position.x) * u,
      y: a.state.position.y + (b.state.position.y - a.state.position.y) * u,
    },
    velocity: {
      x: a.state.velocity.x + (b.state.velocity.x - a.state.velocity.x) * u,
      y: a.state.velocity.y + (b.state.velocity.y - a.state.velocity.y) * u,
    },
    elapsedS:
      a.state.elapsedS + (b.state.elapsedS - a.state.elapsedS) * u,
  };
  return {
    state,
    altitudeM: a.altitudeM + (b.altitudeM - a.altitudeM) * u,
    screenHeadingRad: canvasHeadingFromWorld(state.velocity),
  };
}

export function maxHeadingJumpDeg(
  points: SpaceApproachPoint[],
): number {
  let maxJump = 0;
  for (let i = 1; i < points.length; i++) {
    let d =
      points[i].screenHeadingRad - points[i - 1].screenHeadingRad;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    maxJump = Math.max(maxJump, Math.abs((d * 180) / Math.PI));
  }
  return maxJump;
}

export function headingDeltaDeg(
  fromRad: number,
  toRad: number,
): number {
  let d = toRad - fromRad;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs((d * 180) / Math.PI);
}

export { radialVelocity };
