"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { simulateReentry } from "./reentryPhysics";
import { flightDurationMs } from "./reentryPlayback";
import { mapLaunchToInput } from "./reentryLaunchInput";
import { useReentryDevPreset } from "./useReentryDevPreset";
import type {
  ReentryPhase,
  ReentryPlayRecord,
  ReentryResult,
} from "./reentryTypes";

const POWER_CYCLE_MS = 4400;
const POWER_STEPS = 52;

export function powerOscillatorNorm(now: number, cycleStartMs: number): number {
  const t = ((now - cycleStartMs) % POWER_CYCLE_MS) / POWER_CYCLE_MS;
  const tri = t < 0.5 ? t * 2 : 2 - t * 2;
  const stepped = Math.round(tri * (POWER_STEPS - 1)) / (POWER_STEPS - 1);
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
  const [angleNorm, setAngleNorm] = useState(0.5);
  const [result, setResult] = useState<ReentryResult | null>(null);
  const [playRecord, setPlayRecord] = useState<ReentryPlayRecord | null>(
    null,
  );
  const [flightProgress, setFlightProgress] = useState(0);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const powerCycleStartRef = useRef(0);
  const angleDragRef = useRef<{ startY: number; startNorm: number } | null>(
    null,
  );
  const activePointerId = useRef<number | null>(null);
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
      setPowerOscillator(powerOscillatorNorm(now, powerCycleStartRef.current));
      powerRafRef.current = requestAnimationFrame(tick);
    };
    powerRafRef.current = requestAnimationFrame(tick);
    return () => stopPowerLoop();
  }, [phase, stopPowerLoop]);

  const setSeedState = useCallback((next: number) => setSeed(next), []);

  const beginFlight = useCallback(
    (simResult: ReentryResult, record: ReentryPlayRecord) => {
      options?.onFlightStart?.();
      setResult(simResult);
      setPlayRecord(record);
      setFlightProgress(0);
      setPhase("flight");
      flightStartRef.current = performance.now();
      const duration = flightDurationMs(simResult.outcome);
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
    const input = mapLaunchToInput(lockedPowerNorm, angleNorm, seed);
    const simStarted = performance.now();
    const simResult = simulateReentry(input);
    if (surfaceRef.current) {
      surfaceRef.current.dataset.simMs = (
        performance.now() - simStarted
      ).toFixed(1);
    }
    const record: ReentryPlayRecord = {
      input,
      seed,
      version: simResult.version,
    };
    beginFlight(simResult, record);
  }, [angleNorm, beginFlight, lockedPowerNorm, phase, seed]);

  const nudgeAngle = useCallback((delta: number) => {
    if (phase !== "angle") return;
    setAngleNorm((n) => Math.min(1, Math.max(0, n + delta)));
  }, [phase]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (phase !== "angle") return;
      if (activePointerId.current !== null) return;
      activePointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      angleDragRef.current = {
        startY: event.clientY,
        startNorm: angleNorm,
      };
    },
    [angleNorm, phase],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== event.pointerId) return;
      const drag = angleDragRef.current;
      if (!drag || phase !== "angle") return;
      const dy = event.clientY - drag.startY;
      const span = Math.max(120, window.innerHeight * 0.22);
      setAngleNorm(
        Math.min(1, Math.max(0, drag.startNorm + dy / span)),
      );
    },
    [phase],
  );

  const releasePointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== event.pointerId) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      activePointerId.current = null;
      angleDragRef.current = null;
    },
    [],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      releasePointer(event);
    },
    [releasePointer],
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      releasePointer(event);
    },
    [releasePointer],
  );

  return {
    phase,
    seed,
    powerOscillator,
    lockedPowerNorm,
    angleNorm,
    result,
    playRecord,
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
