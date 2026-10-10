export type Vec2 = {
  x: number;
  y: number;
};

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

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function normalized(v: Vec2): Vec2 {
  const len = Math.max(1e-9, length(v));
  return {
    x: v.x / len,
    y: v.y / len,
  };
}

function perpendicular(v: Vec2): Vec2 {
  return {
    x: -v.y,
    y: v.x,
  };
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

export function spaceTravelT(
  spaceT: number,
  powerNorm: number,
  miss: boolean,
): number {
  const t = clamp01(spaceT);

  if (miss) return t;

  const exp =
    mixNum(
      1.30,
      0.68,
      clamp01(powerNorm),
    );

  return Math.pow(t, exp);
}

/** Legacy helper for old verifier/dev code. */
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

  const targetDistance =
    Math.hypot(
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

export function headingHazeEntryTarget(
  launchPoint: Vec2,
  earth: { x: number; y: number; r: number },
  atmosphereThicknessPx: number,
  headingRad: number,
): Vec2 {
  const radius = earth.r + atmosphereThicknessPx;

  const dx = Math.cos(headingRad);
  const dy = Math.sin(headingRad);

  const fx = launchPoint.x - earth.x;
  const fy = launchPoint.y - earth.y;

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const disc = b * b - 4 * c;

  if (disc >= 0) {
    const root = Math.sqrt(disc);
    const t0 = (-b - root) / 2;
    const t1 = (-b + root) / 2;
    const candidates =
      [t0, t1]
        .filter((t) => t > 0)
        .sort((a, b2) => a - b2);

    if (candidates.length > 0) {
      const t = candidates[0];
      return {
        x: launchPoint.x + dx * t,
        y: launchPoint.y + dy * t,
      };
    }
  }

  return hazeEntryTarget(
    launchPoint,
    earth,
    atmosphereThicknessPx,
  );
}

function axisScale(
  terminalComponent: number,
  targetComponent: number,
  fallback: number,
): number {
  if (Math.abs(terminalComponent) > 1) {
    const candidate =
      targetComponent / terminalComponent;

    if (Number.isFinite(candidate) && candidate !== 0) {
      return candidate;
    }
  }

  return fallback;
}

/**
 * Selected launch heading is the forward basis.
 * Gravity is the only source of cross-track curvature.
 * There is no renderer-side steering blend toward Earth.
 */
export function inboundGravityScreenPose({
  currentPosition,
  currentVelocity,
  initialPosition,
  initialVelocity,
  terminalPosition,
  launchPoint,
  entryTargetPoint,
  launchHeading,
}: {
  currentPosition: Vec2;
  currentVelocity: Vec2;
  initialPosition: Vec2;
  initialVelocity: Vec2;
  terminalPosition: Vec2;
  launchPoint: Vec2;
  entryTargetPoint: Vec2;
  launchHeading: number;
}): {
  x: number;
  y: number;
  angle: number;
} {
  const worldForward =
    normalized(initialVelocity);

  const worldSide =
    perpendicular(worldForward);

  const screenForward = {
    x: Math.cos(launchHeading),
    y: Math.sin(launchHeading),
  };

  const screenSide =
    perpendicular(screenForward);

  const terminalDelta = {
    x: terminalPosition.x - initialPosition.x,
    y: terminalPosition.y - initialPosition.y,
  };

  const targetDelta = {
    x: entryTargetPoint.x - launchPoint.x,
    y: entryTargetPoint.y - launchPoint.y,
  };

  const terminalForward =
    dot(terminalDelta, worldForward);

  const terminalSide =
    dot(terminalDelta, worldSide);

  const targetForward =
    dot(targetDelta, screenForward);

  const targetSide =
    dot(targetDelta, screenSide);

  const worldTravel =
    Math.max(1, length(terminalDelta));

  const screenTravel =
    Math.max(1, length(targetDelta));

  const fallbackScale =
    screenTravel / worldTravel;

  const forwardScale =
    axisScale(
      terminalForward,
      targetForward,
      fallbackScale,
    );

  const sideScale =
    axisScale(
      terminalSide,
      targetSide,
      forwardScale,
    );

  const delta = {
    x: currentPosition.x - initialPosition.x,
    y: currentPosition.y - initialPosition.y,
  };

  const along = dot(delta, worldForward);
  const across = dot(delta, worldSide);

  const x =
    launchPoint.x +
    screenForward.x * along * forwardScale +
    screenSide.x * across * sideScale;

  const y =
    launchPoint.y +
    screenForward.y * along * forwardScale +
    screenSide.y * across * sideScale;

  const velocityForward =
    dot(currentVelocity, worldForward);

  const velocitySide =
    dot(currentVelocity, worldSide);

  const screenVx =
    screenForward.x * velocityForward * forwardScale +
    screenSide.x * velocitySide * sideScale;

  const screenVy =
    screenForward.y * velocityForward * forwardScale +
    screenSide.y * velocitySide * sideScale;

  return {
    x,
    y,
    angle: Math.atan2(screenVy, screenVx),
  };
}

export function atmosphereThicknessPx(earthR: number): number {
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
  const dx1 = next.x - current.x;
  const dy1 = next.y - current.y;

  if (Math.hypot(dx1, dy1) >= 0.25) {
    return Math.atan2(dy1, dx1);
  }

  const dx0 = current.x - prev.x;
  const dy0 = current.y - prev.y;

  if (Math.hypot(dx0, dy0) >= 0.25) {
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
    if (points[i].altitudeM < points[best].altitudeM) {
      best = i;
    }
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

  if (periT < 0.12 || periT > 0.9) return t;

  if (t < 0.48) {
    return periT * (t / 0.48);
  }

  return periT + (1 - periT) * ((t - 0.48) / 0.52);
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

  return screen / Math.max(world, 1e3);
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
      (current.x - first.x) * scale,
    y:
      launchPoint.y -
      (current.y - first.y) * scale,
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
    Math.max(1e-4, spaceShare);

  return (
    ((playback - startPlayback) * totalMs) /
    1000
  );
}
