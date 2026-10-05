import type { ReentryOutcome } from "./reentryTypes";

/** Wall-clock flight playback — physics is unchanged. */
export function flightDurationMs(outcome: ReentryOutcome): number {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    if (outcome === "EARTH_REACHED") return 4200;
    return 3600;
  }
  switch (outcome) {
    case "EARTH_REACHED":
      return 9000;
    case "SKIP":
    case "BURN":
    case "BREAK":
    default:
      return 8000;
  }
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Maps wall-clock playback [0,1] → physics frame index progress [0,1].
 * Early timeline is stretched so heating / stress read more gradually on screen.
 */
export function playbackToFrameProgress(
  playback: number,
  outcome: ReentryOutcome,
): number {
  const t = clamp01(playback);
  const earlyShare =
    outcome === "BURN" ? 0.42 : outcome === "BREAK" ? 0.4 : 0.38;
  const midEnd = outcome === "EARTH_REACHED" ? 0.78 : 0.72;
  if (t <= midEnd) {
    return (t / midEnd) * (1 - earlyShare);
  }
  const tail = (t - midEnd) / (1 - midEnd);
  return (1 - earlyShare) + smoothstep(tail) * earlyShare;
}

export interface CameraMix {
  /** 0 = wide exterior, 1 = cockpit interior */
  interior: number;
  exterior: number;
}

/**
 * Exterior → interior → exterior over one flight (playback time, not physics).
 */
export function cameraMix(
  playback: number,
  outcome: ReentryOutcome,
): CameraMix {
  const t = clamp01(playback);
  /** Exterior until Earth reads ~⅓–½ frame, then cockpit. */
  const cockpitIn = 0.45;
  const outroStart =
    outcome === "EARTH_REACHED" ? 0.8 : outcome === "SKIP" ? 0.76 : 0.82;

  let interior = 0;
  if (t > cockpitIn) {
    interior = smoothstep((t - cockpitIn) / 0.14);
  }
  if (t > outroStart - 0.12) {
    const out = smoothstep((t - (outroStart - 0.12)) / 0.12);
    interior *= 1 - out;
  }

  if (outcome === "BURN" && t > 0.88) {
    interior *= 1 - smoothstep((t - 0.88) / 0.08);
  }

  return { interior, exterior: 1 - interior };
}

/** Presentation-only heat readout (does not alter physics). */
export function presentationHeatGlow(
  heatFluxWm2: number,
  playback: number,
  outcome: ReentryOutcome,
): number {
  const raw = Math.min(1, Math.max(0, heatFluxWm2 / 2.4e6));
  const ramp = smoothstep((playback - 0.12) / 0.55);
  let g = raw * (0.35 + 0.65 * ramp);
  if (outcome === "SKIP" && playback > 0.7) {
    g *= 1 - smoothstep((playback - 0.7) / 0.25);
  }
  if (outcome === "EARTH_REACHED" && playback > 0.75) {
    g *= 0.55 + 0.45 * (1 - smoothstep((playback - 0.75) / 0.2));
  }
  return Math.min(1, g);
}

export function cockpitStress(
  integrity: number,
  dynamicPressurePa: number,
  playback: number,
  outcome: ReentryOutcome,
): number {
  const inst = 1 - integrity;
  const q = Math.min(1, dynamicPressurePa / 70_000);
  let s = inst * 0.75 + q * 0.35;
  if (outcome === "BREAK" && playback > 0.55) {
    s += smoothstep((playback - 0.55) / 0.25) * 0.45;
  }
  if (outcome === "SKIP" && playback > 0.65) {
    s *= 1 - smoothstep((playback - 0.65) / 0.3);
  }
  return Math.min(1, s);
}
