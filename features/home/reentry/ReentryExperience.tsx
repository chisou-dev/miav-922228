"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ReentryFullscreenPortal } from "./ReentryFullscreenPortal";
import { ReentryHybridStage } from "./ReentryHybridStage";
import { ReentryStage2Prototype } from "./ReentryStage2Prototype";
import { ReentryLaunchControls } from "./ReentryLaunchControls";
import { ReentryShellProvider } from "./reentryShellContext";
import { useBodyScrollLock } from "./useBodyScrollLock";
import { useNearbySuccess } from "./useNearbySuccess";
import { useReentryGame } from "./useReentryGame";
import { REENTRY_ART } from "./reentryArtPresentation";
import { REENTRY_SCENE } from "./reentrySceneLayout";
import { preloadReentryPreviewAssets } from "./reentryAssets";
import { shouldShowNearbySuccess } from "./reentryNearbySuccess";
import type { ReentryOutcome } from "./reentryTypes";
import { getReentryUserVolume, startReentryAmbience, stopReentryAudio } from "./reentryAudio";
import { startStage2CabinAudio } from "./reentryStage2CabinAudio";
import { ReentryAudioControl } from "./ReentryAudioControl";
import { GalaxyOrb } from "../galaxy/GalaxyOrb";

const actionClass =
  "text-[0.72rem] tracking-[0.16em] text-white/85 underline decoration-white/35 underline-offset-[0.45em] transition-colors duration-300 hover:text-white";

function headingDegrees(angleNorm: number): string {
  const wrapped =
    ((angleNorm % 1) + 1) % 1;

  const deg =
    Math.round(
      wrapped * 3600,
    ) / 10;

  return (
    deg >= 360
      ? 0
      : deg
  ).toFixed(1);
}

function resultTitle(outcome: ReentryOutcome): string {
  return outcome === "EARTH_REACHED" ? "EARTH REACHED" : outcome;
}

function devPresetRequiresExpand(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const raw = new URLSearchParams(window.location.search).get("reentryPreset");
  return !!raw && raw.toLowerCase() !== "ready";
}

const previewDrawState = {
  phase: "power" as const,
  result: null,
  flightProgress: 0,
  angleNorm: 0.8,
  seed: 0,
};

const FS_HINT_KEY = "miav_reentry_fs_hint_v2";

export function ReentryExperience({ heroCopy }: { heroCopy: ReactNode }) {
  const [expanded, setExpanded] = useState(() =>
    typeof window !== "undefined" && devPresetRequiresExpand(),
  );
  const [clearAssist, setClearAssist] = useState(false);
  const [showStage2Notice, setShowStage2Notice] = useState(false);
  const miavTitleTapRef = useRef<{
    count: number;
    lastAt: number;
    closeTimer: number | null;
  }>({
    count: 0,
    lastAt: 0,
    closeTimer: null,
  });
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
    playRecord,
    flightProgress,
    flightProgressRef,
    spaceApproach,
    spaceShare,
    surfaceRef,
    lockPower,
    launch,
    nudgeAngle,
    retry,
  } = useReentryGame({
    onFlightStart,
    guaranteedClear: clearAssist,
  });

  const nearbySuccess = useNearbySuccess({
    enabled:
      expanded &&
      phase === "result" &&
      shouldShowNearbySuccess(result?.outcome) &&
      spaceApproach?.kind !== "SPACE_MISS",
    outcome: result?.outcome,
    powerNorm: lockedPowerNorm,
    angleNorm,
    earthBearingScreenRad:
      playRecord?.earthBearingScreenRad,
    spaceStartAltitudeM: playRecord?.spaceStartAltitudeM,
  });

  useBodyScrollLock(expanded);

  const fullscreenState = {
    phase,
    result,
    flightProgress,
    angleNorm,
    seed,
    spaceApproach,
    spaceShare,
    powerNorm: lockedPowerNorm ?? 0.5,
  };

  const showEffects =
    expanded && (phase === "flight" || phase === "result");

  const openExpanded = useCallback(() => {
    startReentryAmbience();
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
    stopReentryAudio();
    retry();
    setShowStage2Notice(false);
    setClearAssist(false);
    setExpanded(false);
  }, [retry]);

  const handleMiavTitleTap = useCallback(() => {
    const now =
      performance.now();

    const tap =
      miavTitleTapRef.current;

    if (
      now - tap.lastAt >
      700
    ) {
      tap.count = 0;
    }

    tap.lastAt = now;
    tap.count += 1;

    if (
      tap.closeTimer !== null
    ) {
      window.clearTimeout(
        tap.closeTimer,
      );
      tap.closeTimer = null;
    }

    if (tap.count >= 3) {
      tap.count = 0;

      setClearAssist(
        (value) => !value,
      );

      return;
    }

    tap.closeTimer =
      window.setTimeout(() => {
        tap.count = 0;
        tap.closeTimer = null;
        closeSession();
      }, 700);
  }, [closeSession]);

  useEffect(
    () => () => {
      const timer =
        miavTitleTapRef.current
          .closeTimer;

      if (timer !== null) {
        window.clearTimeout(
          timer,
        );
      }
    },
    [],
  );

  return (
    <ReentryShellProvider openStage={openExpanded}>
      <section
        aria-label="MIAV Stage 1 — atmospheric reentry"
        className="relative scroll-mt-24"
      >
        <GalaxyOrb />
        <div
          className="relative z-[1] grid items-center gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-10 xl:gap-14"
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
        <ReentryFullscreenPortal>
        <div
          className="fixed inset-0 z-[9999] bg-[#020304]"
          role="dialog"
          aria-modal="true"
          aria-label="MIAV reentry stage"
        >
          <button
            type="button"
            onClick={handleMiavTitleTap}
            className="absolute left-5 top-5 z-50 rounded-sm border border-white/15 bg-black/35 px-4 py-2 text-[0.72rem] font-medium tracking-[0.20em] text-white/85 backdrop-blur-sm transition-colors hover:bg-black/55 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Return to MIAV-922228 home. Triple tap toggles hidden clear assist."
          >
            MIAV-922228
          </button>
          <ReentryAudioControl />
          <div
            ref={surfaceRef}
            className={`${REENTRY_ART.fullscreenStageClass} touch-none select-none`}
            role="application"
          >
            {!showStage2Notice && (<>
            <ReentryHybridStage
              state={fullscreenState}
              playbackProgressRef={flightProgressRef}
              variant="stage"
              showEffects={showEffects}
              showCockpitAssets={false}
              showGuides
              showStars
              showIntroPulse={showIntroPulse && phase === "power"}
              assistMode={clearAssist}
            />

            <ReentryLaunchControls
              phase={phase}
              powerOscillator={powerOscillator}
              lockedPowerNorm={lockedPowerNorm}
              angleNorm={angleNorm}
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
            </>)}
          </div>
          {phase === "result" &&
            result &&
            result.outcome !== "EARTH_REACHED" && (
              <div
                className="pointer-events-none absolute left-5 top-[6.5rem] z-[75] border-l border-cyan-100/25 bg-black/10 py-1 pl-3 pr-2 font-mono text-[0.58rem] uppercase tracking-[0.20em] text-cyan-50/70 backdrop-blur-[1px] sm:left-7 sm:top-[7rem] sm:text-[0.64rem]"
                aria-label="Stage 1 flight telemetry"
              >
                <div className="text-cyan-50/90">
                  {spaceApproach?.kind === "SPACE_MISS"
                    ? "ENTRY SUCCESS 0.0%"
                    : nearbySuccess
                      ? `ENTRY SUCCESS ${nearbySuccess.percent.toFixed(1)}%`
                      : "ENTRY SUCCESS --.-%"}
                </div>

                <div className="mt-1 text-cyan-50/55">
                  POWER{" "}
                  {Math.round(
                    (lockedPowerNorm ?? 0) * 100,
                  )}
                  %
                </div>

                <div className="mt-1 text-cyan-50/55">
                  HEADING{" "}
                  {headingDegrees(
                    angleNorm,
                  ).padStart(5, "0")}
                  °
                </div>

                {spaceApproach?.kind === "SPACE_MISS" && (
                  <div className="mt-1 text-cyan-100/35">
                    MISSED ATMOSPHERE
                  </div>
                )}
              </div>
            )}

          {/* The flight reaches result only at the escape timeline endpoint. */}
          {!showStage2Notice && phase === "result" && result &&
            (result.outcome !== "EARTH_REACHED" || flightProgress >= 1) && (
            result.outcome === "EARTH_REACHED" ? (
              <div
                className="pointer-events-auto absolute inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-3 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-5 text-center"
                role="region"
                aria-label="Stage 1 clear controls"
              >
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      stopReentryAudio();
                      // This click is the browser's audio-unlock gesture.
                      startStage2CabinAudio(getReentryUserVolume());
                      setShowStage2Notice(true);
                    }}
                    className="rounded-sm border border-cyan-100/50 bg-[#061626]/75 px-5 py-2 text-[0.82rem] tracking-[0.20em] text-white shadow-[0_0_18px_rgba(120,208,250,0.13)] backdrop-blur-sm transition-colors hover:border-cyan-50 hover:bg-[#143148] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                    aria-label="Stage 2 preview"
                  >
                    STAGE 2
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStage2Notice(false);
                      startReentryAmbience();
                      retry();
                    }}
                    className="rounded-sm bg-black/20 px-2 py-1 text-[0.72rem] tracking-[0.16em] text-white/75 underline decoration-white/30 underline-offset-[0.45em] backdrop-blur-[2px] transition-colors duration-300 hover:text-white"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={closeSession}
                    className="rounded-sm bg-black/20 px-2 py-1 text-[0.72rem] tracking-[0.16em] text-white/75 underline decoration-white/30 underline-offset-[0.45em] backdrop-blur-[2px] transition-colors duration-300 hover:text-white"
                  >
                    Close
                  </button>
                </div>

              </div>
            ) : (
              <div
                className="pointer-events-auto absolute inset-x-0 bottom-0 z-[80] border-t border-white/10 bg-[#05070a]/95 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] text-center"
                role="region"
                aria-label="Reentry result"
              >
                <p className="text-[0.82rem] font-semibold tracking-[0.18em] text-white sm:text-[0.95rem]">
                  {resultTitle(result.outcome)}
                </p>

                <div className="mt-3 flex justify-center gap-8">
                  <button
                    type="button"
                    onClick={() => {
                      startReentryAmbience();
                      retry();
                    }}
                    className={actionClass}
                  >
                    Retry
                  </button>

                  <button
                    type="button"
                    onClick={closeSession}
                    className={actionClass}
                  >
                    Close
                  </button>
                </div>
              </div>
            )
          )}
          {showStage2Notice && (
            <ReentryStage2Prototype
              onClose={() => setShowStage2Notice(false)}
              onExitHome={closeSession}
            />
          )}
        </div>
        </ReentryFullscreenPortal>
      )}
    </ReentryShellProvider>
  );
}
