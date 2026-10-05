import { mixU32, u32ToUnit } from "./seededRandom";
import type { ReentryFrame, ReentryResult } from "./reentryTypes";

/** Presentation-only stretch so 120 km reads above the limb. Physics frames stay in metres. */
const EARTH_RADIUS_M = 6_371_000;
const VISUAL_ALTITUDE_GAIN = 2.7;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface HeatTint {
  r: number;
  g: number;
  b: number;
  glow: number;
}

export function visualUnit(seed: number, a: number, b: number): number {
  return u32ToUnit(mixU32(seed, a, b, 0x51e7));
}

export function sampleFrame(
  frames: ReentryFrame[],
  progress: number,
): ReentryFrame {
  if (frames.length === 0) {
    return {
      t: 0,
      altitudeM: 120_000,
      speedMps: 7500,
      x: 0,
      y: 120_000,
      z: 0,
      heatFluxWm2: 0,
      heatLoadJm2: 0,
      dynamicPressurePa: 0,
      integrity: 1,
    };
  }
  const scaled = Math.min(1, Math.max(0, progress)) * (frames.length - 1);
  const i = Math.min(frames.length - 2, Math.floor(scaled));
  const t = frames.length === 1 ? 0 : scaled - i;
  const a = frames[Math.max(0, i)];
  const b = frames[Math.min(frames.length - 1, i + 1)];
  const lerp = (p: number, q: number) => p + (q - p) * t;
  return {
    t: lerp(a.t, b.t),
    altitudeM: lerp(a.altitudeM, b.altitudeM),
    speedMps: lerp(a.speedMps, b.speedMps),
    x: lerp(a.x, b.x),
    y: lerp(a.altitudeM, b.altitudeM),
    z: 0,
    heatFluxWm2: lerp(a.heatFluxWm2, b.heatFluxWm2),
    heatLoadJm2: lerp(a.heatLoadJm2, b.heatLoadJm2),
    dynamicPressurePa: lerp(a.dynamicPressurePa, b.dynamicPressurePa),
    integrity: lerp(a.integrity, b.integrity),
  };
}

/** Sphere position from downrange (x) and altitude (y). z stays 0. */
export function frameToWorld(frame: ReentryFrame): Vec3 {
  const theta = frame.x / EARTH_RADIUS_M;
  const radius = 1 + (frame.y / EARTH_RADIUS_M) * VISUAL_ALTITUDE_GAIN;
  return {
    x: Math.sin(theta) * radius,
    y: Math.cos(theta) * radius,
    z: 0,
  };
}

export function heatTint(heatFluxWm2: number): HeatTint {
  const glow = Math.min(1, Math.max(0, heatFluxWm2 / 2.4e6));
  const stops: { t: number; r: number; g: number; b: number }[] = [
    { t: 0, r: 0.86, g: 0.9, b: 0.93 },
    { t: 0.18, r: 0.78, g: 0.88, b: 0.96 },
    { t: 0.42, r: 0.96, g: 0.9, b: 0.72 },
    { t: 0.68, r: 0.95, g: 0.55, b: 0.28 },
    { t: 1, r: 0.72, g: 0.18, b: 0.08 },
  ];
  let i = 0;
  while (i < stops.length - 2 && glow > stops[i + 1].t) i++;
  const a = stops[i];
  const b = stops[i + 1];
  const span = Math.max(1e-4, b.t - a.t);
  const u = Math.min(1, Math.max(0, (glow - a.t) / span));
  return {
    r: a.r + (b.r - a.r) * u,
    g: a.g + (b.g - a.g) * u,
    b: a.b + (b.b - a.b) * u,
    glow,
  };
}

/** rho proxy from q = ½ rho v². Visual only. */
export function densityProxy(frame: ReentryFrame): number {
  const v = Math.max(frame.speedMps, 1);
  return Math.max(0, (2 * frame.dynamicPressurePa) / (v * v));
}

export function trailIntensity(frame: ReentryFrame): number {
  const dense = Math.min(1, densityProxy(frame) / 0.02);
  const fast = Math.min(1, frame.speedMps / 8000);
  return Math.min(1, dense * fast * 0.35 + heatTint(frame.heatFluxWm2).glow);
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function restFrame(result: ReentryResult | null): ReentryFrame {
  if (result && result.frames.length > 0) return result.frames[0];
  return sampleFrame([], 0);
}
