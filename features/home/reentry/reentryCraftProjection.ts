import { directionNormToEntryAngleDeg } from "./reentryLaunchInput";
import { playbackToFrameProgress } from "./reentryPlayback";
import type {
  ReentryFrame,
  ReentryOutcome,
  ReentryResult,
} from "./reentryTypes";
import { sampleFrame } from "./reentryVisual";

export type Point = { x: number; y: number };

/** Screen-normalized idle craft center. Independent of canvas pixel size. */
export const LAUNCH_ANCHOR_NX = 0.8;
export const LAUNCH_ANCHOR_NY = 0.15;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerpAngle(from: number, to: number, t: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

export function launchAnchorPx(w: number, h: number): Point {
  return { x: w * LAUNCH_ANCHOR_NX, y: h * LAUNCH_ANCHOR_NY };
}

export function idleHeadingScreen(angleNorm: number): Point {
  const entryAngleDeg = directionNormToEntryAngleDeg(angleNorm);
  const gamma = (-entryAngleDeg * Math.PI) / 180;
  const tangent = { x: -0.86, y: 0.22 };
  const earthward = { x: -0.28, y: 0.96 };

  return {
    x:
      Math.cos(gamma) * tangent.x +
      (-Math.sin(gamma)) * earthward.x,
    y:
      Math.cos(gamma) * tangent.y +
      (-Math.sin(gamma)) * earthward.y,
  };
}

export function projectPhysicsFrame(
  frame: ReentryFrame,
  initialAltitudeM: number,
  w: number,
  h: number,
): Point {
  const minSide = Math.min(w, h);
  const start = launchAnchorPx(w, h);

  const tangent = { x: -0.86, y: 0.22 };
  const earthward = { x: -0.28, y: 0.96 };

  const downrangePx = (frame.x / 4_200_000) * minSide * 0.95;
  const descentPx =
    ((initialAltitudeM - frame.altitudeM) / 180_000) * minSide * 0.48;

  return {
    x: start.x + tangent.x * downrangePx + earthward.x * descentPx,
    y: start.y + tangent.y * downrangePx + earthward.y * descentPx,
  };
}

export function craftPose(
  playback: number,
  outcome: ReentryOutcome | undefined,
  angleNorm: number,
  idle: boolean,
  heat: number,
  seed: number,
  result: ReentryResult | null,
  currentFrame: ReentryFrame,
  w: number,
  h: number,
): { x: number; y: number; angle: number } {
  const launchAnchor = launchAnchorPx(w, h);
  const idleHeading = idleHeadingScreen(angleNorm);
  const idleAngle = Math.atan2(idleHeading.y, idleHeading.x);

  const initialAltitudeM =
    result?.frames[0]?.altitudeM ??
    currentFrame.altitudeM ??
    160_000;

  if (idle || !result || result.frames.length < 2) {
    return {
      ...launchAnchor,
      angle: idleAngle,
    };
  }

  const frame0 = result.frames[0];
  const projectedOrigin = projectPhysicsFrame(
    frame0,
    initialAltitudeM,
    w,
    h,
  );
  const p = projectPhysicsFrame(
    currentFrame,
    initialAltitudeM,
    w,
    h,
  );

  const x = launchAnchor.x + (p.x - projectedOrigin.x);
  const y = launchAnchor.y + (p.y - projectedOrigin.y);

  const nextPlayback = Math.min(1, playback + 0.012);
  const nextFrame = sampleFrame(
    result.frames,
    playbackToFrameProgress(nextPlayback, outcome ?? result.outcome),
  );
  const q = projectPhysicsFrame(nextFrame, initialAltitudeM, w, h);

  let dx = q.x - p.x;
  let dy = q.y - p.y;

  if (Math.hypot(dx, dy) < 0.25) {
    const previousPlayback = Math.max(0, playback - 0.024);
    const previousFrame = sampleFrame(
      result.frames,
      playbackToFrameProgress(previousPlayback, outcome ?? result.outcome),
    );
    const previousPoint = projectPhysicsFrame(
      previousFrame,
      initialAltitudeM,
      w,
      h,
    );

    dx = p.x - previousPoint.x;
    dy = p.y - previousPoint.y;
  }

  if (Math.hypot(dx, dy) < 0.25) {
    dx = idleHeading.x;
    dy = idleHeading.y;
  }

  const physicsAngle = Math.atan2(dy, dx);
  const headingBlend = smoothstep(playback / 0.14);
  let angle = lerpAngle(idleAngle, physicsAngle, headingBlend);

  const positionShakePx =
    playback <= 0.002
      ? 0
      : Math.min(1.6, heat * 1.2);
  const angleShakeRad = heat * 0.006;

  const jitterX =
    Math.sin(playback * 97 + seed * 0.00001) * positionShakePx;
  const jitterY =
    Math.sin(playback * 131 + seed * 0.000013 + 1.7) * positionShakePx;
  angle +=
    Math.sin(playback * 109 + seed * 0.000009 + 0.4) * angleShakeRad;

  return {
    x: x + jitterX,
    y: y + jitterY,
    angle,
  };
}

export function launchContinuityErrorPx(
  angleNorm: number,
  result: ReentryResult,
  w: number,
  h: number,
): number {
  const rest = result.frames[0];
  const idle = craftPose(
    0,
    undefined,
    angleNorm,
    true,
    0,
    result.seed,
    result,
    rest,
    w,
    h,
  );
  const flight = craftPose(
    0,
    result.outcome,
    angleNorm,
    false,
    0,
    result.seed,
    result,
    rest,
    w,
    h,
  );
  return Math.hypot(flight.x - idle.x, flight.y - idle.y);
}
