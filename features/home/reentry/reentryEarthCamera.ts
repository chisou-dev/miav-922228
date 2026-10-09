export type StageEarthView = {
  x: number;
  y: number;
  r: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Idle / launch: small Earth anchored lower-left. */
export function launchEarthView(w: number, h: number): StageEarthView {
  const r = Math.min(w, h) * 0.078;
  return {
    x: w * 0.118,
    y: h - r - Math.min(w, h) * 0.046,
    r,
  };
}

export function cinematicEarthView({
  w,
  h,
  idle,
  miss,
  inboundApproach,
  spaceT,
}: {
  w: number;
  h: number;
  idle: boolean;
  miss: boolean;
  inboundApproach: number;
  spaceT: number;
}): StageEarthView {
  const start = launchEarthView(w, h);
  if (idle) return start;

  const minDim = Math.min(w, h);

  if (miss) {
    const t = smoothstep(spaceT);
    return {
      x: mix(start.x, start.x + w * 0.03, t),
      y: mix(start.y, start.y + minDim * 0.02, t),
      r: mix(start.r, start.r * 0.62, t),
    };
  }

  const grow = smoothstep(inboundApproach);
  return {
    x: mix(start.x, w * 0.30, grow),
    y: mix(start.y, h + minDim * 0.22 * grow, grow),
    r: mix(start.r, minDim * 0.94, grow),
  };
}
