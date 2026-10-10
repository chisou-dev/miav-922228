"use client";

import { useEffect, useState } from "react";
import type { ReentryOutcome } from "./reentryTypes";
import {
  evaluateNearbyJob,
  nearbyJobs,
  nearbySuccessStats,
  shouldShowNearbySuccess,
  type NearbySuccessStats,
} from "./reentryNearbySuccess";

const BATCH_SIZE = 3;

export function useNearbySuccess({
  enabled,
  outcome,
  powerNorm,
  angleNorm,
  earthBearingScreenRad,
}: {
  enabled: boolean;
  outcome: ReentryOutcome | null | undefined;
  powerNorm: number | null;
  angleNorm: number;
  earthBearingScreenRad?: number;
}): NearbySuccessStats | null {
  const show =
    enabled &&
    powerNorm !== null &&
    shouldShowNearbySuccess(outcome);
  const token = `${powerNorm ?? "none"}:${angleNorm}:${outcome ?? "none"}:${earthBearingScreenRad ?? "default"}`;
  const [bundle, setBundle] = useState<{
    token: string;
    stats: NearbySuccessStats;
  } | null>(null);

  useEffect(() => {
    if (!show || powerNorm === null) {
      return;
    }

    const currentToken = token;
    let cancelled = false;
    let timeout = 0;
    const jobs = nearbyJobs(powerNorm, angleNorm);
    let index = 0;
    let reached = 0;

    const step = () => {
      if (cancelled) return;

      const end = Math.min(index + BATCH_SIZE, jobs.length);
      for (; index < end; index += 1) {
        if (
          evaluateNearbyJob(
            jobs[index],
            earthBearingScreenRad,
          )
        ) {
          reached += 1;
        }
      }

      if (index >= jobs.length) {
        if (!cancelled) {
          setBundle({
            token: currentToken,
            stats: nearbySuccessStats(reached, jobs.length),
          });
        }
        return;
      }

      timeout = window.setTimeout(step, 0);
    };

    timeout = window.setTimeout(step, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [angleNorm, earthBearingScreenRad, powerNorm, show, token]);

  if (!show) return null;
  if (bundle?.token !== token) return null;
  return bundle.stats;
}
