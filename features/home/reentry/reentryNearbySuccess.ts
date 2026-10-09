import { wrap01 } from "./reentryLaunchInput";
import { runStage1Launch } from "./reentryLaunchPipeline";
import type { ReentryOutcome } from "./reentryTypes";

export const NEARBY_POWER_OFFSETS = [0, -0.02, 0.02, -0.04, 0.04] as const;
export const NEARBY_DIRECTION_OFFSETS_DEG = [0, -2, 2, -4, 4] as const;
export const NEARBY_SEEDS = [1, 7, 19] as const;

export type NearbySample = {
  powerNorm: number;
  angleNorm: number;
};

export type NearbySuccessStats = {
  reached: number;
  total: number;
  percent: number;
};

export function shouldShowNearbySuccess(
  outcome: ReentryOutcome | null | undefined,
): boolean {
  return (
    outcome === "BURN" ||
    outcome === "BREAK" ||
    outcome === "SKIP"
  );
}

export function nearbyInputGrid(
  powerNorm: number,
  angleNorm: number,
): NearbySample[] {
  const power = Math.min(1, Math.max(0, powerNorm));
  const seen = new Set<string>();
  const samples: NearbySample[] = [];

  for (const powerOffset of NEARBY_POWER_OFFSETS) {
    const nextPower = Math.min(1, Math.max(0, power + powerOffset));
    for (const deg of NEARBY_DIRECTION_OFFSETS_DEG) {
      const nextAngle = wrap01(angleNorm + deg / 360);
      const key = `${nextPower.toFixed(6)}:${nextAngle.toFixed(6)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      samples.push({ powerNorm: nextPower, angleNorm: nextAngle });
    }
  }

  return samples;
}

export function nearbyJobs(
  powerNorm: number,
  angleNorm: number,
): Array<NearbySample & { seed: number }> {
  const jobs: Array<NearbySample & { seed: number }> = [];
  for (const sample of nearbyInputGrid(powerNorm, angleNorm)) {
    for (const seed of NEARBY_SEEDS) {
      jobs.push({ ...sample, seed });
    }
  }
  return jobs;
}

export function evaluateNearbyJob(job: NearbySample & { seed: number }): boolean {
  const launched = runStage1Launch(job.powerNorm, job.angleNorm, job.seed);
  return launched.result.outcome === "EARTH_REACHED";
}

export function nearbySuccessStats(reached: number, total: number): NearbySuccessStats {
  if (total <= 0) {
    return { reached: 0, total: 0, percent: 0 };
  }
  return {
    reached,
    total,
    percent: Math.round((reached / total) * 100),
  };
}

export function evaluateNearbySuccessSync(
  powerNorm: number,
  angleNorm: number,
): NearbySuccessStats {
  const jobs = nearbyJobs(powerNorm, angleNorm);
  let reached = 0;
  for (const job of jobs) {
    if (evaluateNearbyJob(job)) reached += 1;
  }
  return nearbySuccessStats(reached, jobs.length);
}
