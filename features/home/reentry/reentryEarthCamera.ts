import {
  mixNum,
  smoothstep01,
  spaceApproach01,
} from "./reentryVisualCausality";

export type StageEarthView = {
  x: number;
  y: number;
  r: number;
};

/** Idle / launch: Earth stays lower-left. */
export function launchEarthView(w: number, h: number): StageEarthView {
  const minDim = Math.min(w, h);
  return {
    x: w * 0.12,
    y: h * 0.86,
    r: minDim * 0.085,
  };
}

export function cinematicEarthView({
  w,
  h,
  idle,
  miss,
  altitudeM,
  spaceT,
  handoffAltitudeM,
  startAltitudeM,
}: {
  w: number;
  h: number;
  idle: boolean;
  miss: boolean;
  altitudeM: number;
  spaceT: number;
  handoffAltitudeM: number;
  startAltitudeM: number;
}): StageEarthView {
  const start = launchEarthView(w, h);
  if (idle) return start;

  const minDim = Math.min(w, h);

  if (miss) {
    const outbound = smoothstep01((spaceT - 0.42) / 0.58);
    return {
      x: mixNum(start.x, w * 0.16, outbound * 0.35),
      y: mixNum(start.y, h * 0.84, outbound * 0.25),
      r: mixNum(start.r, start.r * 0.58, outbound),
    };
  }

  const approach01 = spaceApproach01(
    altitudeM,
    handoffAltitudeM,
    startAltitudeM,
  );
  const close01 = smoothstep01((approach01 - 0.72) / 0.28);
  const earthR =
    minDim *
    mixNum(0.085, 0.105, smoothstep01(approach01 / 0.72)) *
    mixNum(1, 2.35, close01);

  return {
    x: mixNum(w * 0.12, w * 0.18, close01),
    y: mixNum(h * 0.86, h * 0.78, close01),
    r: earthR,
  };
}

export function earthGrowthRatioAtApproach(approach01: number): number {
  const close01 = smoothstep01((approach01 - 0.72) / 0.28);
  const r =
    mixNum(0.085, 0.105, smoothstep01(approach01 / 0.72)) *
    mixNum(1, 2.35, close01);
  return r / 0.085;
}
