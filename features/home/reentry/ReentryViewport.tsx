"use client";

import { useCallback, useEffect, useState } from "react";
import { ReentryErrorBoundary } from "./ReentryErrorBoundary";
import { ReentryScene } from "./ReentryScene";
import type { ReentryDrawState } from "./reentryWebgl";

type WebGLView = typeof import("./ReentryWebGLView").ReentryWebGLView;

function canUseWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

export function ReentryViewport(state: ReentryDrawState) {
  const [mode, setMode] = useState<"boot" | "webgl" | "canvas">("boot");
  const [View, setView] = useState<WebGLView | null>(null);
  const useCanvas = useCallback(() => setMode("canvas"), []);

  useEffect(() => {
    let live = true;
    if (!canUseWebGL2()) {
      Promise.resolve().then(() => {
        if (live) setMode("canvas");
      });
      return;
    }
    import("./ReentryWebGLView")
      .then((mod) => {
        if (!live) return;
        setView(() => mod.ReentryWebGLView);
        setMode("webgl");
      })
      .catch(() => {
        if (live) setMode("canvas");
      });
    return () => {
      live = false;
    };
  }, []);

  if (mode !== "webgl" || !View) {
    if (state.hybridMode) {
      return null;
    }
    if (mode === "canvas") {
      return (
        <ReentryScene
          phase={state.phase}
          aimingPull={state.aimingPull}
          result={state.result}
          flightProgress={state.flightProgress}
        />
      );
    }
    return <div className="absolute inset-0 bg-[#070b10]" />;
  }

  return (
    <ReentryErrorBoundary
      fallback={
        <ReentryScene
          phase={state.phase}
          aimingPull={state.aimingPull}
          result={state.result}
          flightProgress={state.flightProgress}
        />
      }
    >
      <View {...state} onUnavailable={useCanvas} />
    </ReentryErrorBoundary>
  );
}
