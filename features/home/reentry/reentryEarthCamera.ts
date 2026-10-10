import { mixNum, smoothstep01 } from "./reentryVisualCausality";

export type StageEarthView = {
  x: number;
  y: number;
  r: number;
};

/** Idle / launch: lower-left, inset so stars and craft motion stay readable. */
export function launchEarthView(w: number, h: number): StageEarthView {
  const minDim = Math.min(w, h);
  return {
    x: w * 0.20,
    y: h * 0.74,
    r: minDim * 0.10,
  };
}

export function cinematicEarthView({
  w,
  h,
  idle,
  miss,
  travelT,
  spaceT,
}: {
  w: number;
  h: number;
  idle: boolean;
  miss: boolean;
  travelT: number;
  spaceT: number;
}): StageEarthView {
  const start = launchEarthView(w, h);
  if (idle) return start;

  if (miss) {
    const outbound01 = smoothstep01((spaceT - 0.48) / 0.52);
    const rClose = start.r * 1.08;
    const minDim = Math.min(w, h);
    return {
      x: mixNum(start.x, start.x + w * 0.02, outbound01),
      y: mixNum(start.y, start.y - h * 0.015, outbound01),
      r: mixNum(
        rClose,
        Math.max(minDim * 0.07, rClose * 0.48),
        outbound01,
      ),
    };
  }

  const grow = smoothstep01(travelT);
  const late = smoothstep01((travelT - 0.88) / 0.12);
  return {
    x: mixNum(start.x, start.x + w * 0.03, late),
    y: mixNum(start.y, start.y - h * 0.02, late),
    r: start.r * mixNum(1, 1.22, grow) * mixNum(1, 1.18, late),
  };
}

export function earthGrowthRatioAtApproach(travelT: number): number {
  const grow = smoothstep01(travelT);
  const late = smoothstep01((travelT - 0.88) / 0.12);
  return mixNum(1, 1.22, grow) * mixNum(1, 1.18, late);
}
