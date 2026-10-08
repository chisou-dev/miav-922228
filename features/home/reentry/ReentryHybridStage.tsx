"use client";

import { ReentryPresentationCanvas } from "./ReentryPresentationCanvas";
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
  // Signature is kept stable so the surrounding experience does not need to
  // change.  The v3 presentation is one canvas; old image/WebGL layers are not
  // composited behind it.
  void showEffects;
  void showCockpitAssets;
  void showGuides;
  void showStars;
  void showIntroPulse;

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-black ${className ?? ""}`}
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
