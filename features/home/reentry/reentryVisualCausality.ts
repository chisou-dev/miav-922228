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

function lerpAngle(from: number, to: number, t: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * clamp01(t);
}

export function spaceApproach01(
  altitudeM: number,
  handoffM: number,
  startM: number,
): number {
  return clamp01(
    1 -
      (altitudeM - handoffM) /
        (startM - handoffM),
  );
}

/**
 * Monotonic wall-clock travel.
 * Higher POWER visibly reaches Earth faster during the early approach,
 * but all valid inbound runs still arrive at the visual haze at t=1.
 */
export function spaceTravelT(
  spaceT: number,
  powerNorm: number,
  miss: boolean,
): number {
  const t = clamp01(spaceT);

  if (miss) {
    return t;
  }

  const exp = mixNum(
    1.32,
    0.66,
    clamp01(powerNorm),
  );

  return Math.pow(t, exp);
}

/**
 * Legacy helper kept for compatibility.
 */
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

  if (rawLen < 1e-6) {
    return launchPoint;
  }

  const ux = rawDx / rawLen;
  const uy = rawDy / rawLen;

  const targetDistance = Math.hypot(
    entryTargetPoint.x - launchPoint.x,
    entryTargetPoint.y - launchPoint.y,
  );

  const screenTravel =
    targetDistance * clamp01(approach01);

  return {
    x: launchPoint.x + ux * screenTravel,
    y: launchPoint.y - uy * screenTravel,
  };
}

/**
 * v17 inbound visual mapping.
 *
 * The previous presentation projected the current world displacement along
 * its own ray. That meant a physically valid ATMOSPHERE_ENTRY could still
 * visually miss the rendered Earth/haze. The game then reached a BREAK/BURN
 * result while the craft was visibly still in space.
 *
 * This maps the real gravity path onto a screen-space chord from the launch
 * anchor to the actual visible haze contact point.
 *
 * Properties:
 * - t=0 is exactly the launch anchor.
 * - t=1 is exactly the haze contact target.
 * - the real gravity path's cross-track curvature is retained.
 * - the craft heading is derived from the transformed physical velocity.
 * - the first frames preserve the player's selected launch heading.
 */
export function inboundGravityScreenPose({
  currentPosition,
  currentVelocity,
  initialPosition,
  terminalPosition,
  launchPoint,
  entryTargetPoint,
  travelT,
  launchHeading,
}: {
  currentPosition: Vec2;
  currentVelocity: Vec2;
  initialPosition: Vec2;
  terminalPosition: Vec2;
  launchPoint: Vec2;
  entryTargetPoint: Vec2;
  travelT: number;
  launchHeading: number;
}): {
  x: number;
  y: number;
  angle: number;
} {
  const t = clamp01(travelT);

  const worldDx =
    terminalPosition.x - initialPosition.x;
  const worldDy =
    terminalPosition.y - initialPosition.y;
  const worldLen =
    Math.max(1, Math.hypot(worldDx, worldDy));

  const worldTx = worldDx / worldLen;
  const worldTy = worldDy / worldLen;
  const worldNx = -worldTy;
  const worldNy = worldTx;

  const screenDx =
    entryTargetPoint.x - launchPoint.x;
  const screenDy =
    entryTargetPoint.y - launchPoint.y;
  const screenLen =
    Math.max(1, Math.hypot(screenDx, screenDy));

  const screenTx = screenDx / screenLen;
  const screenTy = screenDy / screenLen;
  const screenNx = -screenTy;
  const screenNy = screenTx;

  const currentDx =
    currentPosition.x - initialPosition.x;
  const currentDy =
    currentPosition.y - initialPosition.y;

  const crossMeters =
    currentDx * worldNx +
    currentDy * worldNy;

  const pxPerMeter =
    screenLen / worldLen;

  /*
   * Keep some real gravity curvature, but taper cross-track displacement near
   * contact so the visual path is guaranteed to meet the rendered haze.
   */
  const contactStraighten =
    1 -
    smoothstep01(
      (t - 0.78) / 0.22,
    ) *
      0.72;

  const crossPx =
    crossMeters *
    pxPerMeter *
    0.48 *
    contactStraighten;

  const x =
    launchPoint.x +
    screenDx * t +
    screenNx * crossPx;

  const y =
    launchPoint.y +
    screenDy * t +
    screenNy * crossPx;

  const velocityAlong =
    currentVelocity.x * worldTx +
    currentVelocity.y * worldTy;

  const velocityCross =
    currentVelocity.x * worldNx +
    currentVelocity.y * worldNy;

  const screenVx =
    screenTx * velocityAlong +
    screenNx * velocityCross * 0.48;

  const screenVy =
    screenTy * velocityAlong +
    screenNy * velocityCross * 0.48;

  const mappedHeading =
    Math.atan2(screenVy, screenVx);

  const headingBlend =
    smoothstep01(t / 0.16);

  return {
    x,
    y,
    angle: lerpAngle(
      launchHeading,
      mappedHeading,
      headingBlend,
    ),
  };
}

export function hazeEntryTarget(
  launchPoint: Vec2,
  earth: {
    x: number;
    y: number;
    r: number;
  },
  atmosphereThicknessPx: number,
): Vec2 {
  const dx =
    earth.x - launchPoint.x;
  const dy =
    earth.y - launchPoint.y;

  const dist =
    Math.max(1e-6, Math.hypot(dx, dy));

  const reach =
    earth.r + atmosphereThicknessPx;

  return {
    x:
      earth.x -
      (dx / dist) * reach,
    y:
      earth.y -
      (dy / dist) * reach,
  };
}

export function atmosphereThicknessPx(
  earthR: number,
): number {
  return Math.max(
    18,
    Math.min(74, earthR * 0.055),
  );
}

export function signedDistanceToAtmospherePx(
  craftX: number,
  craftY: number,
  earthX: number,
  earthY: number,
  earthR: number,
  thicknessPx: number,
): number {
  return (
    Math.hypot(
      craftX - earthX,
      craftY - earthY,
    ) -
    (earthR + thicknessPx)
  );
}

export function tangentAngleFromPoints(
  prev: Vec2,
  current: Vec2,
  next: Vec2,
  fallback: number,
): number {
  const dx1 =
    next.x - current.x;
  const dy1 =
    next.y - current.y;

  if (
    Math.hypot(dx1, dy1) >= 0.25
  ) {
    return Math.atan2(dy1, dx1);
  }

  const dx0 =
    current.x - prev.x;
  const dy0 =
    current.y - prev.y;

  if (
    Math.hypot(dx0, dy0) >= 0.25
  ) {
    return Math.atan2(dy0, dx0);
  }

  return fallback;
}

export function clampHeadingJump(
  from: number,
  to: number,
  maxDeg = 8,
): number {
  let delta = to - from;

  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }

  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }

  const max =
    (maxDeg * Math.PI) / 180;

  if (delta > max) {
    delta = max;
  }

  if (delta < -max) {
    delta = -max;
  }

  return from + delta;
}

export function closestApproachIndex(
  points: {
    altitudeM: number;
  }[],
): number {
  let best = 0;

  for (
    let i = 1;
    i < points.length;
    i++
  ) {
    if (
      points[i].altitudeM <
      points[best].altitudeM
    ) {
      best = i;
    }
  }

  return best;
}

/**
 * SPACE_MISS playback mapping.
 * Closest approach occurs near 48% of the visible flyby.
 */
export function missPlaybackToPathT(
  spaceT: number,
  periIndex: number,
  pointCount: number,
): number {
  const t = clamp01(spaceT);

  const last =
    Math.max(1, pointCount - 1);

  const periT =
    periIndex / last;

  if (
    periT < 0.12 ||
    periT > 0.9
  ) {
    return t;
  }

  if (t < 0.48) {
    return (
      periT *
      (t / 0.48)
    );
  }

  return (
    periT +
    (1 - periT) *
      ((t - 0.48) / 0.52)
  );
}

export function gravityPathScalePx(
  first: Vec2,
  peri: Vec2,
  launchPoint: Vec2,
  periScreen: Vec2,
): number {
  const world =
    Math.hypot(
      peri.x - first.x,
      peri.y - first.y,
    );

  const screen =
    Math.hypot(
      periScreen.x - launchPoint.x,
      periScreen.y - launchPoint.y,
    );

  return (
    screen /
    Math.max(world, 1e3)
  );
}

export function gravityScreenPosition(
  current: Vec2,
  first: Vec2,
  launchPoint: Vec2,
  scale: number,
): Vec2 {
  return {
    x:
      launchPoint.x +
      (current.x - first.x) *
        scale,
    y:
      launchPoint.y -
      (current.y - first.y) *
        scale,
  };
}

export function elapsedSincePlaybackS(
  playback: number,
  startPlayback: number,
  spaceShare: number,
  inboundMs: number,
): number {
  if (
    startPlayback >= 0.999 ||
    playback <= startPlayback
  ) {
    return 0;
  }

  const totalMs =
    inboundMs /
    Math.max(
      1e-4,
      spaceShare,
    );

  return (
    ((playback - startPlayback) *
      totalMs) /
    1000
  );
}
