"use client";

import { useEffect } from "react";
import { ReentryPresentationCanvas } from "./ReentryPresentationCanvas";
import {
  preloadReentryCockpitAsset,
  preloadReentryPreviewAssets,
} from "./reentryAssets";
import type { ReentryDrawState } from "./reentryWebgl";

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
  useEffect(() => {
    if (variant === "preview") {
      void preloadReentryPreviewAssets();
    }
  }, [variant]);

  useEffect(() => {
    if (showCockpitAssets) void preloadReentryCockpitAsset();
  }, [showCockpitAssets]);

  void showEffects;
  void showGuides;
  void showStars;
  void showIntroPulse;

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#020304] ${className ?? ""}`}
    >
      <ReentryPresentationCanvas
        phase={state.phase}
        result={state.result}
        flightProgress={state.flightProgress}
        angleNorm={state.angleNorm ?? 0.5}
        variant={variant}
      />
    </div>
  );
}
