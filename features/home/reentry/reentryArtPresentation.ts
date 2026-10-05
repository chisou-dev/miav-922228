/**
 * Presentation-only tuning for Stage 1 static art.
 * Swap files under `public/reentry/*.webp` — do not change physics for art.
 */

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
    objectPosition: "24% 92%",
    earthScale: {
      distant: 0.5,
      near: 1.34,
    },
    objectFit: "cover" as const,
    bleedPercent: 8,
    preview: {
      scale: 0.86,
      offsetXPercent: 5,
      offsetYPercent: 3,
      brightness: 0.96,
    },
    stage: {
      scale: 0.5,
      offsetXPercent: 2,
      offsetYPercent: 6,
      brightness: 0.94,
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
      baseScale: 0.48,
      widthClamp: "min(40%, 5.5rem)",
    },
    stage: {
      baseScale: 0.66,
      widthClamp: "min(36%, 9rem)",
    },
    heatGlowDropShadowMaxPx: 22,
  },

  mobileTeaser: {
    buttonClass: "h-14 w-14",
    vehicleClass: "h-9 w-9",
  },
} as const;

export type ReentryArtVariant = "preview" | "stage";
