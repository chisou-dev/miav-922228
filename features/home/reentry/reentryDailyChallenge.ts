import { wrap01 } from "./reentryLaunchInput";

/**
 * Daily stage tuning in JST: never use one permanent winning heading.
 * This does NOT roll a random 1% win: the launch must still intersect Earth
 * and pass the unchanged physics simulation at the selected POWER.
 */
export function stage1JstDayKey(epochMs = Date.now()): string {
  return new Date(epochMs + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function hashDay(day: string): number {
  let hash = 2166136261;
  for (let i = 0; i < day.length; i++) {
    hash = Math.imul(hash ^ day.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

/** Shifts the fine-aim corridor a small amount (-0.85°..+0.85°) each JST day. */
export function stage1DailyDriftDeg(day: string): number {
  const mixed = hashDay(day);
  return ((mixed % 1701) - 850) / 1000;
}

export function applyStage1DailyDrift(
  assistedAngleNorm: number,
  day: string,
): number {
  return wrap01(assistedAngleNorm + stage1DailyDriftDeg(day) / 360);
}

/** Day-dependent atmospheric conditions, varying again with each launch. */
export function stage1DailyWeatherSeed(randomSeed: number, day: string): number {
  const dayHash = hashDay(day);
  const mixed = (Math.imul(dayHash ^ (randomSeed >>> 0), 2246822519) ^ 0x9e3779b9);
  return (mixed ^ (mixed >>> 13)) >>> 0;
}
