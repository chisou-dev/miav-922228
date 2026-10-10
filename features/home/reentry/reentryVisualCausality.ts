export type Vec2 = { x: number; y: number };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep01(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function mixNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function normalized(v: Vec2): Vec2 {
  const len = Math.max(1e-9, length(v));
  return { x: v.x / len, y: v.y / len };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function clockwisePerpendicular(v: Vec2): Vec2 {
  return { x: v.y, y: -v.x };
}

export function spaceApproach01(
  altitudeM: number,
  handoffM: number,
  startM: number,
): number {
  return clamp01(1 - (altitudeM - handoffM) / (startM - handoffM));
}

export function spaceTravelT(
  spaceT: number,
  powerNorm: number,
  miss: boolean,
): number {
  const t = clamp01(spaceT);
  if (miss) return t;
  const exp = mixNum(1.30, 0.68, clamp01(powerNorm));
  return Math.pow(t, exp);
}

/**
 * Exact similarity/reflection transform. No target correction.
 * Gravity is the only source of trajectory curvature.
 */
export function similaritySpacePose({
  currentPosition,
  currentVelocity,
  initialPosition,
  earthCenter,
  launchPoint,
  cameraEarthCenter,
  cameraScale = 1,
}: {
  currentPosition: Vec2;
  currentVelocity: Vec2;
  initialPosition: Vec2;
  earthCenter: Vec2;
  launchPoint: Vec2;
  cameraEarthCenter?: Vec2;
  cameraScale?: number;
}): { x: number; y: number; angle: number } {
  const worldRadial = normalized(initialPosition);
  const worldTangential = { x: -worldRadial.y, y: worldRadial.x };
  const screenStartVector = {
    x: launchPoint.x - earthCenter.x,
    y: launchPoint.y - earthCenter.y,
  };
  const screenDistance = Math.max(1, length(screenStartVector));
  const worldDistance = Math.max(1, length(initialPosition));
  const scale = screenDistance / worldDistance;
  const screenRadial = normalized(screenStartVector);
  const screenTangential = clockwisePerpendicular(screenRadial);

  const radialM = dot(currentPosition, worldRadial);
  const tangentialM = dot(currentPosition, worldTangential);

  const baseX =
    earthCenter.x +
    (screenRadial.x * radialM + screenTangential.x * tangentialM) * scale;
  const baseY =
    earthCenter.y +
    (screenRadial.y * radialM + screenTangential.y * tangentialM) * scale;

  const radialV = dot(currentVelocity, worldRadial);
  const tangentialV = dot(currentVelocity, worldTangential);
  const screenVx =
    (screenRadial.x * radialV + screenTangential.x * tangentialV) * scale;
  const screenVy =
    (screenRadial.y * radialV + screenTangential.y * tangentialV) * scale;

  const viewCenter = cameraEarthCenter ?? earthCenter;
  const zoom = Math.max(0.01, cameraScale);

  return {
    x: viewCenter.x + (baseX - earthCenter.x) * zoom,
    y: viewCenter.y + (baseY - earthCenter.y) * zoom,
    angle: Math.atan2(screenVy, screenVx),
  };
}

export function atmosphereThicknessPx(earthR: number): number {
  return Math.max(2.5, Math.min(18, earthR * 0.0205));
}

export function signedDistanceToAtmospherePx(
  craftX: number,
  craftY: number,
  earthX: number,
  earthY: number,
  earthR: number,
  thicknessPx: number,
): number {
  return Math.hypot(craftX - earthX, craftY - earthY) - (earthR + thicknessPx);
}

export function clampHeadingJump(
  from: number,
  to: number,
  maxDeg = 8,
): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const max = (maxDeg * Math.PI) / 180;
  if (delta > max) delta = max;
  if (delta < -max) delta = -max;
  return from + delta;
}

export function closestApproachIndex(
  points: { altitudeM: number }[],
): number {
  let best = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].altitudeM < points[best].altitudeM) best = i;
  }
  return best;
}

export function missPlaybackToPathT(
  spaceT: number,
  periIndex: number,
  pointCount: number,
): number {
  const t = clamp01(spaceT);
  const last = Math.max(1, pointCount - 1);
  const periT = periIndex / last;
  if (periT < 0.08 || periT > 0.92) return t;
  if (t < 0.48) return periT * (t / 0.48);
  return periT + (1 - periT) * ((t - 0.48) / 0.52);
}

export function elapsedSincePlaybackS(
  playback: number,
  startPlayback: number,
  spaceShare: number,
  inboundMs: number,
): number {
  if (startPlayback >= 0.999 || playback <= startPlayback) return 0;
  const totalMs = inboundMs / Math.max(1e-4, spaceShare);
  return ((playback - startPlayback) * totalMs) / 1000;
}
