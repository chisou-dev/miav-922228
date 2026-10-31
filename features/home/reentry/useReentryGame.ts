"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  findGuaranteedStage1Clear,
  runStage1Launch,
  stage1AssistedDirectionNorm,
} from "./reentryLaunchPipeline";
import { launchAnchorPx } from "./reentryCraftProjection";
import {
  applyStage1DailyDrift,
  stage1DailyWeatherSeed,
  stage1JstDayKey,
} from "./reentryDailyChallenge";
import { launchEarthView } from "./reentryEarthCamera";
import { useReentryDevPreset } from "./useReentryDevPreset";
import type {
  ReentryPhase,
  ReentryPlayRecord,
  ReentryResult,
} from "./reentryTypes";
import {
  screenMatchedStartAltitudeM,
  type SpaceApproachResult,
} from "./reentrySpaceApproach";

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

export function useReentryGame(options?: {
  onFlightStart?: () => void;
  guaranteedClear?: boolean;
  canLaunch?: boolean;
  onAttemptResult?: (outcome: ReentryResult["outcome"]) => boolean;
}) {
  const [phase, setPhase] = useState<ReentryPhase>("power");
  const [seed, setSeed] = useState(() => createReentrySeed());
  const [powerOscillator, setPowerOscillator] = useState(0);
  const [lockedPowerNorm, setLockedPowerNorm] = useState<number | null>(null);

  // 0.5 = nominal reentry direction. Unlike v5, this wraps instead of clamping.
  // Start facing upper right. Angle is still freely adjustable before LAUNCH.
  const [angleNorm, setAngleNorm] = useState(0.8);

  const [result, setResult] = useState<ReentryResult | null>(null);
  const [playRecord, setPlayRecord] =
    useState<ReentryPlayRecord | null>(null);
  const [spaceApproach, setSpaceApproach] =
    useState<SpaceApproachResult | null>(null);
  const [spaceShare, setSpaceShare] = useState(1);
  const [flightProgress, setFlightProgress] = useState(0);
  // Per-frame presentation clock, independent of React re-renders.
  const flightProgressRef = useRef(0);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const powerCycleStartRef = useRef(0);
  const flightStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const powerRafRef = useRef<number | null>(null);
  const launchingRef = useRef(false);
  // Record a failed ship only when its cinematic outcome is confirmed.
  // Keeping this separate from LAUNCH prevents a 24h timer starting early.
  const pendingOutcomeRef = useRef<ReentryResult["outcome"] | null>(null);

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
      flightProgressRef.current = 0;
      setPhase("flight");
      const flightStart = performance.now();
      flightStartRef.current = flightStart;

      const duration = durationMs ?? 12000;
      // An overloaded graphics frame MUST NOT fast-forward the story.
      // Advance visual time by the lesser of elapsed wall time and 50ms.
      // This only changes cinematic playback; Physics v1.1 was computed
      // at launch and remains exactly as before.
      let lastFrameAt = flightStart;
      let elapsedVisualMs = 0;
      let lastReactPublishedAt = flightStart;

      const tick = (now: number) => {
        if (flightStartRef.current === null) return;
        if (typeof document !== "undefined" && document.hidden) {
          lastFrameAt = now;
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const deltaMs = Math.min(50, Math.max(0, now - lastFrameAt));
        lastFrameAt = now;
        elapsedVisualMs = Math.min(duration, elapsedVisualMs + deltaMs);
        const p = Math.min(1, elapsedVisualMs / duration);

        // The canvas reads this REF every frame. React updates at 10Hz,
        // keeping the UI responsive without rebuilding the page at 60Hz.
        flightProgressRef.current = p;
        if (now - lastReactPublishedAt >= 100 || p >= 1) {
          setFlightProgress(p);
          lastReactPublishedAt = now;
        }

        if (p >= 1) {
          const completedOutcome = pendingOutcomeRef.current;
          pendingOutcomeRef.current = null;
          if (completedOutcome !== null) {
            options?.onAttemptResult?.(completedOutcome);
          }
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
    launchingRef.current = false;
    pendingOutcomeRef.current = null;
    stopFlightLoop();
    setResult(null);
    setPlayRecord(null);
    setSpaceApproach(null);
    setSpaceShare(1);
    setLockedPowerNorm(null);
    setAngleNorm(0.8);
    setFlightProgress(0);
    flightProgressRef.current = 0;
    setSeed(createReentrySeed());
    powerCycleStartRef.current = performance.now();
    setPowerOscillator(0);
    setPhase("power");
  }, [stopFlightLoop]);

  const lockPower = useCallback(() => {
    if (phase !== "power" || !options?.canLaunch) return;

    const locked = powerOscillatorNorm(
      performance.now(),
      powerCycleStartRef.current,
    );

    setLockedPowerNorm(locked);
    setPhase("angle");
  }, [phase, options?.canLaunch]);

  const launch = useCallback(() => {
    if (
      phase !== "angle" ||
      lockedPowerNorm === null ||
      !options?.canLaunch ||
      launchingRef.current
    ) return;
    launchingRef.current = true;

    const rect =
      surfaceRef.current?.getBoundingClientRect();

    const viewportW =
      Math.max(
        1,
        rect?.width ??
          window.innerWidth,
      );

    const viewportH =
      Math.max(
        1,
        rect?.height ??
          window.innerHeight,
      );

    const launchPoint =
      launchAnchorPx(
        viewportW,
        viewportH,
      );

    const earthAtLaunch =
      launchEarthView(
        viewportW,
        viewportH,
      );

    const earthBearingScreenRad =
      Math.atan2(
        earthAtLaunch.y -
          launchPoint.y,
        earthAtLaunch.x -
          launchPoint.x,
      );
    const centerDistancePx = Math.hypot(
      earthAtLaunch.x - launchPoint.x,
      earthAtLaunch.y - launchPoint.y,
    );

    const spaceStartAltitudeM = screenMatchedStartAltitudeM(
      earthAtLaunch.r,
      centerDistancePx,
    );
    const simStarted = performance.now();

    const day = stage1JstDayKey();
    const assistedDirection = applyStage1DailyDrift(
      stage1AssistedDirectionNorm(angleNorm, earthBearingScreenRad),
      day,
    );
    const challengeSeed = stage1DailyWeatherSeed(seed, day);
    const guaranteed =
      options?.guaranteedClear
        ? findGuaranteedStage1Clear(
            lockedPowerNorm,
            seed,
            earthBearingScreenRad,
            spaceStartAltitudeM,
          )
        : null;

    const launched =
      guaranteed?.launched ??
      runStage1Launch(
        lockedPowerNorm,
        assistedDirection,
        challengeSeed,
        earthBearingScreenRad,
        spaceStartAltitudeM,
      );

    // No countdown or life loss yet: the result must finish playing first.
    // Only this normal launch path queues an attempt (not development presets).
    pendingOutcomeRef.current = launched.result.outcome;

    if (guaranteed) {
      setAngleNorm(
        guaranteed.angleNorm,
      );
      setSeed(
        guaranteed.seed,
      );

      if (
        guaranteed.powerNorm !==
        lockedPowerNorm
      ) {
        setLockedPowerNorm(
          guaranteed.powerNorm,
        );
      }
    }

    if (!guaranteed) setSeed(challengeSeed);

    if (surfaceRef.current) {
      surfaceRef.current.dataset.simMs = (
        performance.now() - simStarted
      ).toFixed(1);
    }

    // Commit the assisted heading before playback. SPACE thereafter remains LOCKed.
    if (!guaranteed && assistedDirection !== angleNorm) {
      setAngleNorm(assistedDirection);
    }
    beginFlight(launched.result, launched.record, launched.durationMs);
  }, [
    angleNorm,
    beginFlight,
    lockedPowerNorm,
    options?.canLaunch,
    options?.guaranteedClear,
    phase,
    seed,
  ]);

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
    flightProgressRef,
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

