/**
 * Presentation-only tuning for Stage 1 static art.
 * Swap files under `public/reentry/*.webp` — do not change physics for art.
 */

/** Presentation flags — cockpit code remains but is not shown when exterior-only. */
export const REENTRY_PRESENTATION = {
  exteriorOnly: true,
} as const;

export const REENTRY_ART = {
  /** Tailwind classes for the desktop right-column preview frame (aspect / max height). */
  desktopPreviewFrameClass:
    "aspect-[4/3] max-h-[min(40vh,20rem)] w-full max-w-[22rem]",

  desktopPreviewChromeClass:
    "overflow-hidden rounded-sm border border-[var(--line)]/55 bg-[#070b10] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",

  /** True fullscreen stage (viewport-filling). */
  fullscreenStageClass: "relative h-full w-full overflow-hidden bg-[#020304]",

  background: {
    /** Distant limb ~20–30% frame width; zoom grows via transform scale. */
    /** Earth limb is composed into the WebP at lower-left; center the stage texture. */
    objectPosition: "50% 50%",
    earthScale: {
      distant: 1,
      near: 1.42,
    },
    objectFit: "cover" as const,
    bleedPercent: 36,
    preview: {
      scale: 0.86,
      offsetXPercent: 5,
      offsetYPercent: 3,
      brightness: 0.96,
    },
    stage: {
      scale: 1,
      offsetXPercent: 0,
      offsetYPercent: 0,
      brightness: 0.92,
    },
    flight: {
      scaleGain: 0,
      panXFactor: 8,
      panYFactor: 3,
      brightnessHeatGain: 0.1,
    },
  },

  vehicle: {
    preview: {
      baseScale: 0.56,
      widthClamp: "min(46%, 6.5rem)",
      rotationOffsetDeg: 0,
    },
    stage: {
      baseScale: 0.88,
      widthClamp: "min(46%, 12.5rem)",
      rotationOffsetDeg: 0,
    },
    teaser: {
      rotationOffsetDeg: 0,
    },
    heatGlowDropShadowMaxPx: 32,
    idleRimShadow:
      "drop-shadow(-3px 6px 10px rgba(0,0,0,0.65)) drop-shadow(0 0 18px rgba(130,175,225,0.28))",
  },

  mobileTeaser: {
    buttonClass: "h-14 w-14",
    vehicleClass: "h-11 w-11",
  },
} as const;

export type ReentryArtVariant = "preview" | "stage";
