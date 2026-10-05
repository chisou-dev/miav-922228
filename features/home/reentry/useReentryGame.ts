"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { simulateReentry } from "./reentryPhysics";
import { flightDurationMs } from "./reentryPlayback";
import {
  mapPullToInput,
  pullTowardEarthPx,
  type AimingPull,
} from "./reentryAimInput";
import { useReentryDevPreset } from "./useReentryDevPreset";
import type {
  ReentryPhase,
  ReentryPlayRecord,
  ReentryResult,
} from "./reentryTypes";
import {
  craftAnchorClient,
  isPointerOnCraft,
} from "./reentrySceneLayout";

export type { AimingPull } from "./reentryAimInput";

const MIN_PULL_PX = 24;
const MIN_TOWARD_EARTH_PX = 14;

export function createReentrySeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  return (Date.now() * 2654435761) >>> 0;
}

export function useReentryGame(options?: { onFlightStart?: () => void }) {
  const [phase, setPhase] = useState<ReentryPhase>("ready");
  const [seed, setSeed] = useState(() => createReentrySeed());
  const [aimingPull, setAimingPull] = useState<AimingPull | null>(null);
  const [result, setResult] = useState<ReentryResult | null>(null);
  const [playRecord, setPlayRecord] = useState<ReentryPlayRecord | null>(
    null,
  );
  const [flightProgress, setFlightProgress] = useState(0);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const aimingPullRef = useRef<AimingPull | null>(null);
  const flightStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopFlightLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    flightStartRef.current = null;
  }, []);

  useEffect(() => () => stopFlightLoop(), [stopFlightLoop]);

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
    setAimingPull(null);
    setFlightProgress(0);
    setSeed(createReentrySeed());
    setPhase("ready");
  }, [stopFlightLoop]);

  const getSurfaceSize = useCallback(() => {
    const el = surfaceRef.current;
    if (!el) return { width: 1, height: 1 };
    const rect = el.getBoundingClientRect();
    return {
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
    };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (phase !== "ready" && phase !== "aiming") return;
      if (activePointerId.current !== null) return;

      const el = surfaceRef.current;
      const rect = el?.getBoundingClientRect();
      if (!rect || !isPointerOnCraft(event.clientX, event.clientY, rect)) {
        return;
      }

      activePointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      const anchor = craftAnchorClient(rect);
      const pull = {
        startX: anchor.x,
        startY: anchor.y,
        currentX: anchor.x,
        currentY: anchor.y,
      };
      aimingPullRef.current = pull;
      setAimingPull(pull);
      setPhase("aiming");
    },
    [phase],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== event.pointerId) return;
      const prev = aimingPullRef.current;
      if (phase !== "aiming" || !prev) return;
      const next = {
        ...prev,
        currentX: event.clientX,
        currentY: event.clientY,
      };
      aimingPullRef.current = next;
      setAimingPull(next);
    },
    [phase],
  );

  const finishAiming = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== event.pointerId) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      activePointerId.current = null;

      const pull = aimingPullRef.current;
      aimingPullRef.current = null;
      setAimingPull(null);

      if (!pull || phase !== "aiming") {
        setPhase("ready");
        return;
      }

      const length = Math.hypot(
        pull.currentX - pull.startX,
        pull.currentY - pull.startY,
      );
      const toward = pullTowardEarthPx(pull);
      if (length < MIN_PULL_PX || toward < MIN_TOWARD_EARTH_PX) {
        setPhase("ready");
        return;
      }

      const { width, height } = getSurfaceSize();
      const input = mapPullToInput(pull, seed, width, height);
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
    },
    [beginFlight, getSurfaceSize, phase, seed],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      finishAiming(event);
    },
    [finishAiming],
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current === event.pointerId) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* already released */
        }
        activePointerId.current = null;
      }
      aimingPullRef.current = null;
      setAimingPull(null);
      if (phase === "aiming") setPhase("ready");
    },
    [phase],
  );

  return {
    phase,
    seed,
    aimingPull,
    result,
    playRecord,
    flightProgress,
    surfaceRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    retry,
  };
}
