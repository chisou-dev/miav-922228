import type { ReentryOutcome, ReentryPhase } from "./reentryTypes";
import { REENTRY_ART } from "./reentryArtPresentation";

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Earth apparent size via background zoom (presentation only). */
export function earthBackgroundScale(input: {
  phase: ReentryPhase;
  playback: number;
  outcome: ReentryOutcome | undefined;
  interior: number;
  idle: boolean;
  isPreview: boolean;
}): number {
  const { distant, near } = REENTRY_ART.background.earthScale;
  if (input.isPreview || input.idle) return distant;

  let approach = smoothstep(input.playback / 0.78);
  if (input.interior > 0.35) {
    approach = Math.max(approach, 0.62 + input.interior * 0.32);
  }

  let scale = distant + approach * (near - distant);

  if (input.outcome === "SKIP" && input.playback > 0.64) {
    const retreat = smoothstep((input.playback - 0.64) / 0.3);
    scale += (distant - scale) * retreat * 0.9;
  }

  if (input.phase === "result" && input.outcome === "SKIP") {
    scale = distant + (scale - distant) * 0.25;
  }

  return scale;
}

export function earthBackgroundPan(
  scale: number,
  playback: number,
  idle: boolean,
  interior: number,
  isPreview: boolean,
): { x: number; y: number } {
  const base = isPreview
    ? REENTRY_ART.background.preview
    : REENTRY_ART.background.stage;
  const { distant, near } = REENTRY_ART.background.earthScale;
  const approach = clamp01((scale - distant) / (near - distant + 1e-6));
  if (idle || isPreview) {
    return { x: base.offsetXPercent, y: base.offsetYPercent };
  }
  const fly = REENTRY_ART.background.flight;
  return {
    x:
      base.offsetXPercent +
      approach * 6 -
      playback * fly.panXFactor * 0.08 * (1 - interior),
    y:
      base.offsetYPercent -
      approach * 16 +
      playback * fly.panYFactor * 0.15 * (1 - interior),
  };
}
