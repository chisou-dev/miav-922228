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
  "flex h-12 w-16 items-center justify-center rounded-full border border-[var(--line)]/75 bg-[#070b10]/90 text-[1.7rem] text-[var(--foreground)] transition-colors active:scale-[0.98] hover:border-[var(--foreground-muted)] hover:bg-[#0c1218] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground-muted)]";

const TAP_STEP = 2 / 360; // 2 degrees per tap: fine enough for the success corridor.
const HOLD_STEP = 6 / 360; // long press visibly rotates the craft.
const HOLD_DELAY_MS = 280;
const HOLD_REPEAT_MS = 58;

function headingDeg(
  angleNorm: number,
): number {
  const wrapped =
    ((angleNorm % 1) + 1) % 1;

  return Math.round(
    wrapped * 360,
  ) % 360;
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
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  const stopHold = useCallback(() => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  useEffect(() => stopHold, [stopHold]);

  if (phase === "flight" || phase === "result") return null;

  const stopPropagation = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
  };

  if (phase === "power") {
    const pct = Math.round(powerOscillator * 100);

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
    direction: -1 | 1,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    stopHold();

    // One tap = one small, precise movement.
    onNudgeAngle(direction * TAP_STEP);
    playDirectionTick(direction);

    // Hold = continuous rotation.
    holdTimeoutRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        onNudgeAngle(direction * HOLD_STEP);
      }, HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  const launch = () => {
    onLaunch();
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
          {headingDeg(angleNorm)}°
        </p>
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          className={rotateBtnClass}
          aria-label="Rotate direction left"
          title="Rotate left"
          onPointerDown={(event) =>
            startHold(-1, event)
          }
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={stopHold}
        >
          ↺
        </button>

        <span
          className="text-[0.66rem] tracking-[0.14em] text-[var(--foreground-muted)]"
          aria-hidden
        >
          HOLD
        </span>

        <button
          type="button"
          className={rotateBtnClass}
          aria-label="Rotate direction right"
          title="Rotate right"
          onPointerDown={(event) =>
            startHold(1, event)
          }
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={stopHold}
        >
          ↻
        </button>
      </div>

      <button
        type="button"
        className={`${btnClass} border-[var(--foreground-muted)]/55`}
        disabled={lockedPowerNorm === null}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={launch}
      >
        3 · LAUNCH
      </button>
    </div>
  );
}

