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

export function spaceApproach01(altitudeM: number, handoffM: number, startM: number): number {
  return clamp01(1 - (altitudeM - handoffM) / (startM - handoffM));
}

/** Monotonic screen travel. Higher power reaches the limb sooner, never stalls. */
export function spaceTravelT(
  spaceT: number,
  powerNorm: number,
  miss: boolean,
): number {
  const t = clamp01(spaceT);
  if (miss) return t;
  const exp = mixNum(1.32, 0.66, clamp01(powerNorm));
  return Math.pow(t, exp);
}

export function spaceCraftScreenPosition(
  current: Vec2,
  initial: Vec2,
  launchPoint: Vec2,
  entryTargetPoint: Vec2,
  approach01: number,
): Vec2 {
  const rawDx = current.x - initial.x;
  const rawDy = current.y - initial.y;
  const rawLen = Math.hypot(rawDx, rawDy);
  if (rawLen < 1e-6) return launchPoint;

  const ux = rawDx / rawLen;
  const uy = rawDy / rawLen;
  const targetDistance = Math.hypot(
    entryTargetPoint.x - launchPoint.x,
    entryTargetPoint.y - launchPoint.y,
  );
  const screenTravel = targetDistance * clamp01(approach01);

  return {
    x: launchPoint.x + ux * screenTravel,
    y: launchPoint.y - uy * screenTravel,
  };
}

export function hazeEntryTarget(
  launchPoint: Vec2,
  earth: { x: number; y: number; r: number },
  atmosphereThicknessPx: number,
): Vec2 {
  const dx = earth.x - launchPoint.x;
  const dy = earth.y - launchPoint.y;
  const dist = Math.max(1e-6, Math.hypot(dx, dy));
  const reach = earth.r + atmosphereThicknessPx;
  return {
    x: earth.x - (dx / dist) * reach,
    y: earth.y - (dy / dist) * reach,
  };
}

export function atmosphereThicknessPx(earthR: number): number {
  return Math.max(18, Math.min(74, earthR * 0.055));
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

export function tangentAngleFromPoints(
  prev: Vec2,
  current: Vec2,
  next: Vec2,
  fallback: number,
): number {
  const dx1 = next.x - current.x;
  const dy1 = next.y - current.y;
  if (Math.hypot(dx1, dy1) >= 0.25) return Math.atan2(dy1, dx1);
  const dx0 = current.x - prev.x;
  const dy0 = current.y - prev.y;
  if (Math.hypot(dx0, dy0) >= 0.25) return Math.atan2(dy0, dx0);
  return fallback;
}

export function clampHeadingJump(from: number, to: number, maxDeg = 8): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const max = (maxDeg * Math.PI) / 180;
  if (delta > max) delta = max;
  if (delta < -max) delta = -max;
  return from + delta;
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
