/** Presentation-only tuning (physics unchanged). */

export const VISUAL = {
  earthReadyOffsetY: -0.44,
  earthReadyScale: 0.9,
  atmosphereScale: 1.012,
  atmosphereRimAlpha: 0.34,
  starCount: 68,
  readyCamera: { x: 0.01, y: 0.54, z: 2.38 },
  vehicleHullScale: 0.042,
  cockpitIntroEndPlayback: 0.14,
  cockpitOutroStartPlayback: 0.82,
  trailAlphaScale: 0.48,
  maxDprDesktop: 1.65,
  maxDprMobile: 1.4,
  mobileBreakpointPx: 700,
} as const;
