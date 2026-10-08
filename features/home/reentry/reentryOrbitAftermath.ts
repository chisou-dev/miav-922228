import type { ReentryFrame } from "./reentryTypes";

const MU = 3.986004418e14;
const EARTH_RADIUS_M = 6_371_000;

export type OrbitState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type OrbitPoint = {
  x: number;
  y: number;
  angle: number;
};

function accel(
  x: number,
  y: number,
): [number, number] {
  const r2 = x * x + y * y;
  const r = Math.sqrt(r2);

  const scale =
    -MU / (r2 * r);

  return [
    x * scale,
    y * scale,
  ];
}

function midpointStep(
  s: OrbitState,
  dt: number,
): OrbitState {
  const [ax1, ay1] =
    accel(s.x, s.y);

  const mx =
    s.x + s.vx * dt * 0.5;
  const my =
    s.y + s.vy * dt * 0.5;

  const mvx =
    s.vx + ax1 * dt * 0.5;
  const mvy =
    s.vy + ay1 * dt * 0.5;

  const [ax2, ay2] =
    accel(mx, my);

  return {
    x: s.x + mvx * dt,
    y: s.y + mvy * dt,
    vx: s.vx + ax2 * dt,
    vy: s.vy + ay2 * dt,
  };
}

export function frameToOrbitState(
  frame: {
    r: number;
    theta: number;
    v: number;
    gamma: number;
  },
): OrbitState {
  const erx = Math.cos(frame.theta);
  const ery = Math.sin(frame.theta);

  const etx = -Math.sin(frame.theta);
  const ety = Math.cos(frame.theta);

  const radialV =
    frame.v * Math.sin(frame.gamma);

  const tangentialV =
    frame.v * Math.cos(frame.gamma);

  return {
    x: frame.r * erx,
    y: frame.r * ery,
    vx:
      radialV * erx +
      tangentialV * etx,
    vy:
      radialV * ery +
      tangentialV * ety,
  };
}

/**
 * Reconstruct planar r/theta/v/gamma from recorded frames.
 * Physics files are not modified; this uses altitude, downrange and speed.
 */
export function orbitStateFromFrames(
  frames: ReentryFrame[],
): OrbitState | null {
  if (frames.length < 2) return null;

  const b = frames[frames.length - 1];
  const a = frames[frames.length - 2];
  const dt = Math.max(1e-3, b.t - a.t);
  const r = EARTH_RADIUS_M + b.altitudeM;
  const theta = b.x / EARTH_RADIUS_M;
  const v = Math.max(1, b.speedMps);
  const drdt = (b.altitudeM - a.altitudeM) / dt;
  const sinG = Math.min(1, Math.max(-1, drdt / v));
  const gamma = Math.asin(sinG);

  return frameToOrbitState({
    r,
    theta,
    v,
    gamma,
  });
}

export function buildOrbitAftermath(
  initial: OrbitState,
): OrbitPoint[] {
  const points: OrbitPoint[] = [];

  let s = initial;

  const initialAngle =
    Math.atan2(s.y, s.x);

  let previousAngle =
    initialAngle;

  let accumulatedAngle = 0;

  const dt = 4;

  const maxSteps = Math.floor(
    (2.5 * 60 * 60) / dt,
  );

  for (
    let i = 0;
    i < maxSteps;
    i++
  ) {
    s = midpointStep(s, dt);

    const radius =
      Math.hypot(s.x, s.y);

    if (
      !Number.isFinite(radius) ||
      radius <= EARTH_RADIUS_M
    ) {
      break;
    }

    const angle =
      Math.atan2(s.y, s.x);

    let da =
      angle - previousAngle;

    while (da > Math.PI) {
      da -= Math.PI * 2;
    }

    while (da < -Math.PI) {
      da += Math.PI * 2;
    }

    accumulatedAngle += Math.abs(da);
    previousAngle = angle;

    points.push({
      x: s.x,
      y: s.y,
      angle: Math.atan2(
        s.vy,
        s.vx,
      ),
    });

    const halfOrbit =
      accumulatedAngle >= Math.PI;

    const fullOrbit =
      accumulatedAngle >= Math.PI * 2;

    const speed2 =
      s.vx * s.vx +
      s.vy * s.vy;

    const specificEnergy =
      speed2 * 0.5 -
      MU / radius;

    const bound =
      specificEnergy < 0;

    if (
      (!bound && halfOrbit) ||
      (bound && fullOrbit)
    ) {
      break;
    }
  }

  return points;
}

export function sampleOrbitPoint(
  points: OrbitPoint[],
  t: number,
): OrbitPoint | null {
  if (points.length === 0) return null;
  const scaled = Math.min(1, Math.max(0, t)) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled));
  const u = points.length === 1 ? 0 : scaled - i;
  const a = points[Math.max(0, i)];
  const b = points[Math.min(points.length - 1, i + 1)];
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    angle: a.angle + (b.angle - a.angle) * u,
  };
}

export function projectOrbitPoint(
  point: OrbitPoint,
  w: number,
  h: number,
): { x: number; y: number; angle: number } {
  const minSide = Math.min(w, h);
  const scale = minSide / (EARTH_RADIUS_M * 8.4);
  return {
    x: w * 0.5 + point.x * scale,
    y: h * 0.5 - point.y * scale,
    angle: -point.angle + Math.PI * 0.5,
  };
}
