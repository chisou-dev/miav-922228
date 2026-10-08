"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ReentryHybridStage } from "./ReentryHybridStage";
import { ReentryLaunchControls } from "./ReentryLaunchControls";
import { ReentryShellProvider } from "./reentryShellContext";
import { useBodyScrollLock } from "./useBodyScrollLock";
import { useReentryGame } from "./useReentryGame";
import { REENTRY_ART } from "./reentryArtPresentation";
import { REENTRY_SCENE } from "./reentrySceneLayout";
import { preloadReentryPreviewAssets } from "./reentryAssets";

const actionClass =
  "text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:text-[var(--foreground)]";

function devPresetRequiresExpand(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const raw = new URLSearchParams(window.location.search).get("reentryPreset");
  return !!raw && raw.toLowerCase() !== "ready";
}

const previewDrawState = {
  phase: "power" as const,
  result: null,
  flightProgress: 0,
  angleNorm: 0.5,
  seed: 0,
};

const FS_HINT_KEY = "miav_reentry_fs_hint_v2";

export function ReentryExperience({ heroCopy }: { heroCopy: ReactNode }) {
  const [expanded, setExpanded] = useState(() =>
    typeof window !== "undefined" && devPresetRequiresExpand(),
  );
  const [showFsHint, setShowFsHint] = useState(() => {
    if (typeof window === "undefined" || !devPresetRequiresExpand()) {
      return false;
    }
    try {
      return !sessionStorage.getItem(FS_HINT_KEY);
    } catch {
      return true;
    }
  });
  const [showIntroPulse, setShowIntroPulse] = useState(() => {
    if (typeof window === "undefined" || !devPresetRequiresExpand()) {
      return false;
    }
    try {
      return !sessionStorage.getItem(FS_HINT_KEY);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    void preloadReentryPreviewAssets();
  }, []);

  const onFlightStart = useCallback(() => {
    setExpanded(true);
  }, []);

  const {
    phase,
    seed,
    powerOscillator,
    lockedPowerNorm,
    angleNorm,
    result,
    flightProgress,
    surfaceRef,
    lockPower,
    launch,
    nudgeAngle,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    retry,
  } = useReentryGame({ onFlightStart });

  useBodyScrollLock(expanded);

  const fullscreenState = {
    phase,
    result,
    flightProgress,
    angleNorm,
    seed,
  };

  const angleAdjusting = expanded && phase === "angle";
  const showEffects =
    expanded && (phase === "flight" || phase === "result");

  const openExpanded = useCallback(() => {
    setExpanded(true);
    void preloadReentryPreviewAssets();
    try {
      if (!sessionStorage.getItem(FS_HINT_KEY)) {
        setShowFsHint(true);
        setShowIntroPulse(true);
      }
    } catch {
      setShowFsHint(true);
      setShowIntroPulse(true);
    }
  }, []);

  useEffect(() => {
    if (!showFsHint) return;
    const t = window.setTimeout(() => setShowFsHint(false), 5000);
    return () => window.clearTimeout(t);
  }, [showFsHint]);

  const dismissFsHints = useCallback(() => {
    setShowFsHint(false);
    setShowIntroPulse(false);
    try {
      sessionStorage.setItem(FS_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const closeSession = useCallback(() => {
    retry();
    setExpanded(false);
  }, [retry]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      dismissFsHints();
      onPointerDown(event);
    },
    [dismissFsHints, onPointerDown],
  );

  const surfaceHandlers = expanded
    ? {
        onPointerDown: handlePointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
      }
    : {};

  return (
    <ReentryShellProvider openStage={openExpanded}>
      <section
        aria-label="MIAV Stage 1 — atmospheric reentry"
        className="scroll-mt-24"
      >
        <div
          className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-10 xl:gap-14"
        >
          <div className="min-w-0">{heroCopy}</div>

          <div className="hidden min-w-0 lg:flex lg:justify-end">
            <div
              className={`relative ${REENTRY_ART.desktopPreviewFrameClass} ${REENTRY_ART.desktopPreviewChromeClass}`}
            >
              <ReentryHybridStage
                state={previewDrawState}
                variant="preview"
                showEffects={false}
                showCockpitAssets={false}
                showGuides={false}
                showStars
              />
              <button
                type="button"
                onClick={openExpanded}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-sm text-[0.95rem] leading-none text-[var(--foreground-muted)] transition-colors hover:bg-[var(--line)]/30 hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--foreground-muted)]"
                aria-label="Open atmospheric reentry in fullscreen"
                title="Expand"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>
      </section>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-[#020304]"
          role="dialog"
          aria-modal="true"
          aria-label="MIAV reentry stage"
        >
          <div
            ref={surfaceRef}
            className={`${REENTRY_ART.fullscreenStageClass} touch-none select-none`}
            style={{ touchAction: angleAdjusting ? "none" : "auto" }}
            {...surfaceHandlers}
            role="application"
          >
            <ReentryHybridStage
              state={fullscreenState}
              variant="stage"
              showEffects={showEffects}
              showCockpitAssets={false}
              showGuides
              showStars
              showIntroPulse={showIntroPulse && phase === "power"}
            />

            <ReentryLaunchControls
              phase={phase}
              powerOscillator={powerOscillator}
              lockedPowerNorm={lockedPowerNorm}
              onLockPower={() => {
                dismissFsHints();
                lockPower();
              }}
              onLaunch={launch}
              onNudgeAngle={nudgeAngle}
            />

            {showFsHint && phase === "power" && (
              <p
                className="pointer-events-none absolute inset-x-0 bottom-[26%] z-[3] text-center text-[0.62rem] tracking-[0.14em] text-[var(--foreground-muted)] transition-opacity duration-700 sm:text-[0.68rem] opacity-80"
              >
                {REENTRY_SCENE.hintText}
              </p>
            )}

            {phase === "result" && (
              <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-8">
                <button type="button" onClick={retry} className={actionClass}>
                  Retry
                </button>
                <button type="button" onClick={closeSession} className={actionClass}>
                  Close
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={closeSession}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center text-lg leading-none text-[var(--foreground-muted)] opacity-80 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground-muted)]"
              aria-label="Close reentry"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </ReentryShellProvider>
  );
}
