"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runStage1Launch } from "./reentryLaunchPipeline";
import { useReentryDevPreset } from "./useReentryDevPreset";
import type {
  ReentryPhase,
  ReentryPlayRecord,
  ReentryResult,
} from "./reentryTypes";
import type { SpaceApproachResult } from "./reentrySpaceApproach";

const POWER_CYCLE_MS = 4400;
const POWER_STEPS = 52;

function wrap01(value: number): number {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

export function powerOscillatorNorm(now: number, cycleStartMs: number): number {
  const t = ((now - cycleStartMs) % POWER_CYCLE_MS) / POWER_CYCLE_MS;
  const tri = t < 0.5 ? t * 2 : 2 - t * 2;
  const stepped =
    Math.round(tri * (POWER_STEPS - 1)) / (POWER_STEPS - 1);
  return stepped;
}

export function createReentrySeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  }

  return (Date.now() * 2654435761) >>> 0;
}

export function useReentryGame(options?: { onFlightStart?: () => void }) {
  const [phase, setPhase] = useState<ReentryPhase>("power");
  const [seed, setSeed] = useState(() => createReentrySeed());
  const [powerOscillator, setPowerOscillator] = useState(0);
  const [lockedPowerNorm, setLockedPowerNorm] = useState<number | null>(null);

  // 0.5 = nominal reentry direction. Unlike v5, this wraps instead of clamping.
  const [angleNorm, setAngleNorm] = useState(0.5);

  const [result, setResult] = useState<ReentryResult | null>(null);
  const [playRecord, setPlayRecord] =
    useState<ReentryPlayRecord | null>(null);
  const [spaceApproach, setSpaceApproach] =
    useState<SpaceApproachResult | null>(null);
  const [spaceShare, setSpaceShare] = useState(1);
  const [flightProgress, setFlightProgress] = useState(0);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const powerCycleStartRef = useRef(0);
  const flightStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const powerRafRef = useRef<number | null>(null);

  const stopFlightLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    flightStartRef.current = null;
  }, []);

  const stopPowerLoop = useCallback(() => {
    if (powerRafRef.current !== null) {
      cancelAnimationFrame(powerRafRef.current);
      powerRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    powerCycleStartRef.current = performance.now();
  }, []);

  useEffect(
    () => () => {
      stopFlightLoop();
      stopPowerLoop();
    },
    [stopFlightLoop, stopPowerLoop],
  );

  useEffect(() => {
    if (phase !== "power") {
      stopPowerLoop();
      return;
    }

    const tick = (now: number) => {
      setPowerOscillator(
        powerOscillatorNorm(now, powerCycleStartRef.current),
      );
      powerRafRef.current = requestAnimationFrame(tick);
    };

    powerRafRef.current = requestAnimationFrame(tick);
    return () => stopPowerLoop();
  }, [phase, stopPowerLoop]);

  const setSeedState = useCallback((next: number) => setSeed(next), []);

  const beginFlight = useCallback(
    (simResult: ReentryResult, record: ReentryPlayRecord, durationMs?: number) => {
      options?.onFlightStart?.();
      setResult(simResult);
      setPlayRecord(record);
      setSpaceApproach(record.spaceApproach ?? null);
      setSpaceShare(record.spaceShare ?? 1);
      setFlightProgress(0);
      setPhase("flight");
      flightStartRef.current = performance.now();

      const duration = durationMs ?? 12000;
      let hiddenAt: number | null = null;

      const tick = (now: number) => {
        const start = flightStartRef.current;
        if (start === null) return;

        if (typeof document !== "undefined" && document.hidden) {
          if (hiddenAt === null) hiddenAt = now;
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (hiddenAt !== null) {
          flightStartRef.current = start + (now - hiddenAt);
          hiddenAt = null;
        }

        const elapsedStart = flightStartRef.current ?? start;
        const p = Math.min(1, (now - elapsedStart) / duration);

        setFlightProgress(p);

        if (p >= 1) {
          stopFlightLoop();
          setPhase("result");
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [options, stopFlightLoop],
  );

  useReentryDevPreset(surfaceRef, beginFlight, setSeedState);

  const retry = useCallback(() => {
    stopFlightLoop();
    setResult(null);
    setPlayRecord(null);
    setSpaceApproach(null);
    setSpaceShare(1);
    setLockedPowerNorm(null);
    setAngleNorm(0.5);
    setFlightProgress(0);
    setSeed(createReentrySeed());
    powerCycleStartRef.current = performance.now();
    setPowerOscillator(0);
    setPhase("power");
  }, [stopFlightLoop]);

  const lockPower = useCallback(() => {
    if (phase !== "power") return;

    const locked = powerOscillatorNorm(
      performance.now(),
      powerCycleStartRef.current,
    );

    setLockedPowerNorm(locked);
    setPhase("angle");
  }, [phase]);

  const launch = useCallback(() => {
    if (phase !== "angle" || lockedPowerNorm === null) return;

    const simStarted = performance.now();
    const launched = runStage1Launch(
      lockedPowerNorm,
      angleNorm,
      seed,
    );

    if (surfaceRef.current) {
      surfaceRef.current.dataset.simMs = (
        performance.now() - simStarted
      ).toFixed(1);
    }

    beginFlight(launched.result, launched.record, launched.durationMs);
  }, [angleNorm, beginFlight, lockedPowerNorm, phase, seed]);

  const nudgeAngle = useCallback(
    (delta: number) => {
      if (phase !== "angle") return;
      setAngleNorm((n) => wrap01(n + delta));
    },
    [phase],
  );

  /*
   * v6 direction is deliberately button-controlled.
   * Keep the old pointer API as no-ops so ReentryExperience remains compatible,
   * but do not let an invisible whole-screen drag compete with the two arrows.
   */
  const onPointerDown = useCallback(() => {}, []);
  const onPointerMove = useCallback(() => {}, []);
  const onPointerUp = useCallback(() => {}, []);
  const onPointerCancel = useCallback(() => {}, []);

  return {
    phase,
    seed,
    powerOscillator,
    lockedPowerNorm,
    angleNorm,
    result,
    playRecord,
    spaceApproach,
    spaceShare,
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
  };
}

