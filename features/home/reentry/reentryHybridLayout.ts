import {
  cameraMix,
  cockpitStress,
  playbackToFrameProgress,
  presentationHeatGlow,
} from "./reentryPlayback";
import type { ReentryOutcome, ReentryPhase } from "./reentryTypes";
import { heatTint, restFrame, sampleFrame, type HeatTint } from "./reentryVisual";
import type { ReentryResult } from "./reentryTypes";
import { REENTRY_ART } from "./reentryArtPresentation";
import {
  earthBackgroundPan,
  earthBackgroundScale,
} from "./reentryEarthPresentation";
import {
  REENTRY_SCENE,
  craftEarthTravelT,
  craftPositionPercent,
} from "./reentrySceneLayout";
import { vehicleStageRotationDeg } from "./reentryVehiclePresentation";

export interface HybridLayerStyle {
  background: {
    transform: string;
    filter: string;
  };
  vehicle: {
    left: string;
    top: string;
    transform: string;
    opacity: number;
    filter: string;
  };
  cockpit: {
    opacity: number;
  };
  heatWindow: {
    opacity: number;
    background: string;
  };
  tint: HeatTint;
  stress: number;
  mix: ReturnType<typeof cameraMix>;
  playback: number;
  frameProgress: number;
  interior: number;
  heatGlow: number;
}

export function computeHybridLayers(input: {
  phase: ReentryPhase;
  result: ReentryResult | null;
  flightProgress: number;
  variant: "preview" | "stage";
  angleNorm?: number;
}): HybridLayerStyle {
  const playback =
    input.phase === "result"
      ? 1
      : input.phase === "flight"
        ? input.flightProgress
        : 0;
  const outcome: ReentryOutcome | undefined = input.result?.outcome;
  const frameProgress =
    input.result && (input.phase === "flight" || input.phase === "result")
      ? playbackToFrameProgress(playback, outcome ?? "BURN")
      : 0;
  const frame =
    input.result && (input.phase === "flight" || input.phase === "result")
      ? sampleFrame(input.result.frames, frameProgress)
      : restFrame(input.result);
  const baseTint = heatTint(frame.heatFluxWm2);
  const presGlow = presentationHeatGlow(
    frame.heatFluxWm2,
    playback,
    outcome ?? "BURN",
  );
  const tint: HeatTint = {
    ...baseTint,
    glow: Math.min(1, baseTint.glow * 0.35 + presGlow * 0.65),
  };
  const stress = cockpitStress(
    frame.integrity,
    frame.dynamicPressurePa,
    playback,
    outcome ?? "BURN",
  );
  const mix = cameraMix(playback, outcome ?? "BURN");
  const interior = mix.interior;

  const idle = input.phase === "power" || input.phase === "angle";
  const angleNorm = input.angleNorm ?? 0.5;
  const isPreview = input.variant === "preview";
  const earthScale = earthBackgroundScale({
    phase: input.phase,
    playback,
    outcome,
    interior,
    idle,
    isPreview,
  });
  const pan = earthBackgroundPan(
    earthScale,
    playback,
    idle,
    interior,
    isPreview,
  );
  const bgBright =
    (isPreview
      ? REENTRY_ART.background.preview.brightness
      : REENTRY_ART.background.stage.brightness) +
    (idle ? 0 : tint.glow * REENTRY_ART.background.flight.brightnessHeatGain * mix.exterior);

  const travelT = idle ? 0 : craftEarthTravelT(playback, mix.exterior);

  const wobble =
    Math.sin(performance.now() * 0.06) *
    stress *
    (outcome === "BREAK" ? 3.5 : 1.2);
  const vehArt =
    input.variant === "preview"
      ? REENTRY_ART.vehicle.preview
      : REENTRY_ART.vehicle.stage;

  const pos = idle
    ? { x: REENTRY_SCENE.craft.x, y: REENTRY_SCENE.craft.y }
    : craftPositionPercent(travelT, input.variant);

  const vehicleX = pos.x + wobble * 0.15;
  const vehicleY = pos.y + wobble * 0.12;
  const vehicleScale =
    vehArt.baseScale * (idle ? 1 : 1 + tint.glow * 0.04 * mix.exterior);
  const flightWobble = idle ? 0 : playback * 1.5 + wobble * 0.4;
  const vehicleRot = vehicleStageRotationDeg(
    input.variant,
    angleNorm,
    flightWobble,
  );

  const breaking =
    outcome === "BREAK" &&
    mix.exterior > 0.32 &&
    (playback > 0.76 || frame.integrity < 0.38);
  let vehicleOpacity =
    mix.exterior *
    (outcome === "BURN" && playback > 0.84
      ? Math.max(0, 1 - (playback - 0.84) / 0.14)
      : 1);
  if (breaking) {
    vehicleOpacity *= Math.max(0, 1 - (playback - 0.72) / 0.12);
  }
  if (outcome === "SKIP" && playback > 0.64) {
    const retreat = (playback - 0.64) / 0.3;
    vehicleOpacity *= 0.7 + 0.3 * Math.max(0, 1 - retreat);
  }
  if (outcome === "EARTH_REACHED" && playback > 0.78 && mix.exterior > 0.4) {
    vehicleOpacity *= Math.max(0.15, 1 - (playback - 0.78) / 0.18);
  }
  if (interior > 0.55) {
    vehicleOpacity *= 1 - interior * 0.88;
  }

  const cockpitOpacity = mix.interior * (input.variant === "stage" ? 1 : 0.92);
  const heatAlpha = tint.glow * mix.interior * 0.55;
  const heatBg = `radial-gradient(ellipse 85% 70% at 50% 42%, rgba(${Math.round(
    tint.r * 255,
  )},${Math.round(tint.g * 255)},${Math.round(tint.b * 255)},${heatAlpha}) 0%, rgba(255,200,120,${
    heatAlpha * 0.35
  }) 42%, transparent 72%)`;

  return {
    background: {
      transform: `translate(${pan.x}%, ${pan.y}%) scale(${earthScale})`,
      filter: `brightness(${bgBright})`,
    },
    vehicle: {
      left: `${vehicleX}%`,
      top: `${vehicleY}%`,
      transform: `translate(-50%, -50%) rotate(${vehicleRot}deg) scale(${vehicleScale})`,
      opacity: vehicleOpacity,
      filter:
        tint.glow > 0.08
          ? `drop-shadow(0 0 ${
              8 +
              tint.glow * REENTRY_ART.vehicle.heatGlowDropShadowMaxPx
            }px rgba(${tint.r},${tint.g},${tint.b},${
              0.35 + tint.glow * 0.45
            }))`
          : idle
            ? REENTRY_ART.vehicle.idleRimShadow
            : "none",
    },
    cockpit: { opacity: cockpitOpacity },
    heatWindow: { opacity: heatAlpha, background: heatBg },
    tint,
    stress,
    mix,
    playback,
    frameProgress,
    interior,
    heatGlow: tint.glow,
  };
}
