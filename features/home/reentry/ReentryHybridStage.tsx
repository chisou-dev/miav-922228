"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ReentryAssetImage } from "./ReentryAssetImage";
import { REENTRY_ART } from "./reentryArtPresentation";
import { computeHybridLayers } from "./reentryHybridLayout";
import {
  preloadReentryCockpitAsset,
  preloadReentryPreviewAssets,
} from "./reentryAssets";
import { ReentrySceneOverlay } from "./ReentrySceneOverlay";
import { ReentryViewport } from "./ReentryViewport";
import type { ReentryDrawState } from "./reentryWebgl";

const STAR_SEEDS = [
  [12, 18], [28, 8], [44, 22], [62, 12], [78, 28], [88, 14],
  [18, 42], [35, 55], [55, 38], [72, 48], [92, 62], [8, 68],
  [22, 82], [48, 72], [66, 88], [84, 76],
];

export function ReentryHybridStage({
  state,
  variant,
  showEffects,
  showCockpitAssets,
  showGuides = true,
  showStars = false,
  showIntroPulse = false,
  className,
}: {
  state: ReentryDrawState;
  variant: "preview" | "stage";
  showEffects: boolean;
  showCockpitAssets: boolean;
  showGuides?: boolean;
  showStars?: boolean;
  showIntroPulse?: boolean;
  className?: string;
}) {
  const [motionTick, setMotionTick] = useState(0);
  useEffect(() => {
    if (state.phase !== "flight" && state.phase !== "result") return;
    let id = 0;
    const loop = () => {
      setMotionTick((n) => n + 1);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [state.phase]);

  const layers = computeHybridLayers({
    phase: state.phase,
    result: state.result,
    flightProgress: state.flightProgress,
    variant,
  });
  void motionTick;

  useEffect(() => {
    if (variant === "preview") {
      void preloadReentryPreviewAssets();
    }
  }, [variant]);

  useEffect(() => {
    if (showCockpitAssets) void preloadReentryCockpitAsset();
  }, [showCockpitAssets]);

  const vehWidth =
    variant === "preview"
      ? REENTRY_ART.vehicle.preview.widthClamp
      : REENTRY_ART.vehicle.stage.widthClamp;

  const bleed = REENTRY_ART.background.bleedPercent;
  const drawState: ReentryDrawState = {
    ...state,
    hybridMode: showEffects,
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#020304] ${className ?? ""}`}
      style={
        {
          "--reentry-bg-scale": layers.background.transform,
          "--reentry-bg-brightness": layers.background.filter,
        } as CSSProperties
      }
    >
      <div
        className="absolute transition-transform duration-300 will-change-transform"
        style={{
          inset: `-${bleed}%`,
          transform: layers.background.transform,
          filter: layers.background.filter,
        }}
      >
        <ReentryAssetImage
          asset="spaceEarth"
          alt=""
          className="h-full w-full"
          style={{
            objectFit: REENTRY_ART.background.objectFit,
            objectPosition: REENTRY_ART.background.objectPosition,
          }}
          loading={variant === "preview" ? "eager" : "lazy"}
        />
      </div>

      {showStars && (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          {STAR_SEEDS.map(([x, y], i) => (
            <span
              key={i}
              className="absolute h-px w-px rounded-full bg-white/35"
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          ))}
        </div>
      )}

      <ReentrySceneOverlay
        phase={state.phase}
        aimingPull={state.aimingPull}
        flightProgress={state.flightProgress}
        interior={layers.interior}
        variant={variant}
        showGuides={showGuides}
        showIntroPulse={showIntroPulse}
      />

      <div
        className="pointer-events-none absolute z-[1] h-full origin-center transition-opacity duration-200"
        style={{
          left: layers.vehicle.left,
          top: layers.vehicle.top,
          width: vehWidth,
          transform: layers.vehicle.transform,
          opacity: layers.vehicle.opacity,
          filter: layers.vehicle.filter,
        }}
      >
        <ReentryAssetImage
          asset="vehicle"
          alt=""
          className="h-full w-full object-contain"
          loading={variant === "preview" ? "eager" : "lazy"}
        />
      </div>

      {showCockpitAssets && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{ opacity: layers.cockpit.opacity }}
        >
          <ReentryAssetImage
            asset="cockpit"
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: "50% 50%" }}
            loading="lazy"
          />
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{
              opacity: layers.heatWindow.opacity,
              background: layers.heatWindow.background,
            }}
            aria-hidden
          />
        </div>
      )}

      {showEffects && <ReentryViewport {...drawState} />}
    </div>
  );
}
