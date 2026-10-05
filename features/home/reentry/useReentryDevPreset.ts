"use client";

import { useEffect, useRef, type RefObject } from "react";
import { simulateReentry } from "./reentryPhysics";
import type { ReentryPlayRecord, ReentryResult } from "./reentryTypes";

type BeginFlight = (
  simResult: ReentryResult,
  record: ReentryPlayRecord,
) => void;

/**
 * Reads `?reentryPreset=` once on mount (development only) and replays physics.
 */
export function useReentryDevPreset(
  surfaceRef: RefObject<HTMLDivElement | null>,
  beginFlight: BeginFlight,
  setSeed: (seed: number) => void,
): void {
  const ran = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (ran.current) return;
    ran.current = true;

    const raw = new URLSearchParams(window.location.search).get(
      "reentryPreset",
    );
    if (!raw || raw.toLowerCase() === "ready") return;

    void import("./reentryDevPresets").then(({ resolveDevPreset }) => {
      const preset = resolveDevPreset(raw);
      if (!preset) return;

      const t0 = performance.now();
      const simResult = simulateReentry(preset.input);
      const simMs = performance.now() - t0;

      if (simResult.outcome !== preset.expectOutcome) {
        console.warn(
          "[reentry dev preset] physics outcome mismatch",
          preset.key,
          "expected",
          preset.expectOutcome,
          "got",
          simResult.outcome,
        );
      }

      const el = surfaceRef.current;
      if (el) {
        el.dataset.simMs = simMs.toFixed(1);
        el.dataset.devPreset = preset.key;
      }

      setSeed(preset.input.seed);
      beginFlight(simResult, {
        input: preset.input,
        seed: preset.input.seed,
        version: simResult.version,
      });
    });
  }, [beginFlight, setSeed, surfaceRef]);
}
