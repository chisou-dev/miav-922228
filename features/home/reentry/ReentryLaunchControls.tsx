"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ReentryPhase } from "./reentryTypes";
import {
  playDirectionTick,
  playPowerLockTone,
} from "./reentryAudio";

const btnClass =
  "rounded-sm border border-[var(--line)]/60 bg-[#070b10]/88 px-5 py-2.5 text-[0.7rem] tracking-[0.15em] text-[var(--foreground)] transition-colors hover:border-[var(--foreground-muted)] hover:bg-[#0c1218] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground-muted)] disabled:opacity-40";

const rotateBtnClass =
  "flex h-14 w-20 touch-manipulation flex-col items-center justify-center rounded-full border border-[var(--line)]/75 bg-[#070b10]/90 text-[var(--foreground)] transition-colors active:scale-[0.98] hover:border-[var(--foreground-muted)] hover:bg-[#0c1218] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground-muted)]";

const COARSE_TAP_DEG = 5;
const COARSE_HOLD_DEG_PER_S = 128;
const FINE_TAP_DEG = 0.1;
const FINE_HOLD_MIN_DEG_PER_S = 0.1;
const FINE_HOLD_MAX_DEG_PER_S = 1;
const FINE_ACCEL_S = 3;
const HOLD_DELAY_MS = 180;

type HoldMode = "coarse" | "fine";

function headingDeg(
  angleNorm: number,
): number {
  const wrapped =
    ((angleNorm % 1) + 1) % 1;

  const deg =
    Math.round(
      wrapped * 3600,
    ) / 10;

  return deg >= 360 ? 0 : deg;
}

export function ReentryLaunchControls({
  phase,
  powerOscillator,
  lockedPowerNorm,
  angleNorm,
  onLockPower,
  onLaunch,
  onNudgeAngle,
}: {
  phase: ReentryPhase;
  powerOscillator: number;
  lockedPowerNorm: number | null;
  angleNorm: number;
  onLockPower: () => void;
  onLaunch: () => void;
  onNudgeAngle: (delta: number) => void;
}) {
  const holdTimeoutRef =
    useRef<number | null>(null);
  const holdRafRef =
    useRef<number | null>(null);
  const holdModeRef =
    useRef<HoldMode | null>(null);
  const holdStartedRef =
    useRef(false);

  const stopHold = useCallback(() => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(
        holdTimeoutRef.current,
      );
      holdTimeoutRef.current = null;
    }

    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(
        holdRafRef.current,
      );
      holdRafRef.current = null;
    }

    holdStartedRef.current = false;
    holdModeRef.current = null;
  }, []);

  useEffect(() => stopHold, [stopHold]);

  if (
    phase === "flight" ||
    phase === "result"
  ) {
    return null;
  }

  const stopPropagation = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
  };

  if (phase === "power") {
    const pct =
      Math.round(
        powerOscillator * 100,
      );

    const lock = () => {
      playPowerLockTone();
      onLockPower();
    };

    return (
      <div
        className="pointer-events-auto absolute inset-x-0 bottom-[12%] z-30 flex flex-col items-center gap-3 px-6"
        role="group"
        aria-label="Power selection"
        onPointerDown={stopPropagation}
      >
        <p className="text-[0.62rem] tracking-[0.16em] text-[var(--foreground-muted)]">
          1 · POWER
        </p>

        <div className="w-full max-w-xs">
          <div className="mb-1 flex items-center justify-between text-[0.55rem] tracking-[0.12em] text-[var(--foreground-muted)]">
            <span>LOW</span>

            <span className="tabular-nums text-white/85">
              {pct}%
            </span>

            <span>HIGH</span>
          </div>

          <button
            type="button"
            onClick={lock}
            className="relative h-5 w-full overflow-visible rounded-full bg-[var(--line)]/35"
            aria-label={`Power meter at ${pct} percent. Tap to lock.`}
          >
            {[0, 25, 50, 75, 100].map(
              (mark) => (
                <span
                  key={mark}
                  className="pointer-events-none absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/25"
                  style={{
                    left:
                      mark === 100
                        ? "calc(100% - 1px)"
                        : `${mark}%`,
                  }}
                />
              ),
            )}

            <span
              className="absolute inset-y-[5px] left-0 rounded-full bg-[var(--foreground-muted)]/45 transition-[width] duration-75"
              style={{
                width: `${pct}%`,
              }}
            />

            <span
              className="absolute top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[var(--foreground)] shadow-[0_0_8px_rgba(220,230,240,0.68)]"
              style={{
                left:
                  `calc(${pct}% - 1px)`,
              }}
            />
          </button>

          <div className="mt-1.5 grid grid-cols-5 text-center text-[0.48rem] tabular-nums text-white/35">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        <button
          type="button"
          className={btnClass}
          onClick={lock}
        >
          LOCK
        </button>
      </div>
    );
  }

  const startHold = (
    mode: HoldMode,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId,
      );
    } catch {
      /* Pointer capture is optional. */
    }

    stopHold();

    holdModeRef.current = mode;
    holdStartedRef.current = false;

    holdTimeoutRef.current =
      window.setTimeout(() => {
        holdStartedRef.current = true;

        playDirectionTick(1);

        const startedAt =
          performance.now();

        let previous =
          startedAt;

        const tick = (
          now: number,
        ) => {
          const dtS =
            Math.min(
              0.05,
              Math.max(
                0,
                (
                  now -
                  previous
                ) /
                  1000,
              ),
            );

          previous = now;

          let rateDegPerS =
            COARSE_HOLD_DEG_PER_S;

          if (mode === "fine") {
            const heldS =
              Math.max(
                0,
                (
                  now -
                  startedAt
                ) /
                  1000,
              );

            const accel =
              Math.min(
                1,
                heldS /
                  FINE_ACCEL_S,
              );

            rateDegPerS =
              FINE_HOLD_MIN_DEG_PER_S +
              (
                FINE_HOLD_MAX_DEG_PER_S -
                FINE_HOLD_MIN_DEG_PER_S
              ) *
                accel;
          }

          onNudgeAngle(
            (
              rateDegPerS *
              dtS
            ) /
              360,
          );

          holdRafRef.current =
            window.requestAnimationFrame(
              tick,
            );
        };

        holdRafRef.current =
          window.requestAnimationFrame(
            tick,
          );
      }, HOLD_DELAY_MS);
  };

  const finishHold = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    const mode =
      holdModeRef.current;

    const wasHolding =
      holdStartedRef.current;

    stopHold();

    if (
      mode &&
      !wasHolding
    ) {
      const tapDeg =
        mode === "coarse"
          ? COARSE_TAP_DEG
          : FINE_TAP_DEG;

      onNudgeAngle(
        tapDeg / 360,
      );

      playDirectionTick(1);
    }
  };

  const cancelHold = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    stopHold();
  };

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-[8%] z-30 flex flex-col items-center gap-3 px-6"
      role="group"
      aria-label="Direction and launch"
      onPointerDown={stopPropagation}
    >
      <div className="text-center">
        <p className="text-[0.62rem] tracking-[0.16em] text-[var(--foreground-muted)]">
          2 · DIRECTION
        </p>

        <p className="mt-1 text-[0.58rem] tabular-nums tracking-[0.13em] text-white/55">
          POWER {Math.round((lockedPowerNorm ?? 0) * 100)}%
          <span className="mx-2 text-white/25">·</span>
          {headingDeg(angleNorm).toFixed(1)}°
        </p>
      </div>

      <div className="flex items-start gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            className={rotateBtnClass}
            aria-label="Rotate clockwise by 5 degrees. Hold for fast clockwise rotation."
            title="Clockwise · 5° tap · about one turn in 3 seconds when held"
            onPointerDown={(event) =>
              startHold(
                "coarse",
                event,
              )
            }
            onPointerUp={finishHold}
            onPointerCancel={cancelHold}
            onPointerLeave={cancelHold}
          >
            <span className="text-[1.35rem] leading-none">
              ↻↻
            </span>
            <span className="mt-1 text-[0.48rem] tabular-nums tracking-[0.08em] text-white/45">
              5°
            </span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            className={rotateBtnClass}
            aria-label="Rotate clockwise by 0.1 degrees. Hold for very slow fine clockwise rotation."
            title="Clockwise fine · 0.1° tap · 0.1–1° per second when held"
            onPointerDown={(event) =>
              startHold(
                "fine",
                event,
              )
            }
            onPointerUp={finishHold}
            onPointerCancel={cancelHold}
            onPointerLeave={cancelHold}
          >
            <span className="text-[1.55rem] leading-none">
              ↻
            </span>
            <span className="mt-1 text-[0.48rem] tabular-nums tracking-[0.08em] text-white/45">
              0.1°
            </span>
          </button>
        </div>
      </div>

      <p className="text-[0.48rem] tracking-[0.10em] text-white/30">
        CLOCKWISE ONLY · HOLD FOR CONTINUOUS ROTATION
      </p>

      <button
        type="button"
        className={`${btnClass} border-[var(--foreground-muted)]/55`}
        disabled={lockedPowerNorm === null}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={onLaunch}
      >
        3 · LAUNCH
      </button>
    </div>
  );
}
