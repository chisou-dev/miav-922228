/**
 * Development-only visual QA presets.
 * Each entry is a fixed ReentryInput + seed that physics v1.1 resolves naturally.
 * Do not import from production UI paths without guarding NODE_ENV.
 */
import type { ReentryInput, ReentryOutcome } from "./reentryTypes";

export type ReentryDevPresetKey = "skip" | "burn" | "break" | "earth";

export interface ReentryDevPreset {
  key: ReentryDevPresetKey;
  /** Expected outcome from simulateReentry — for dev console warnings only. */
  expectOutcome: ReentryOutcome;
  input: ReentryInput;
}

/** Verified against simulateReentry on reentry-physics-v1.1. */
const PRESETS: Record<ReentryDevPresetKey, ReentryDevPreset> = {
  skip: {
    key: "skip",
    expectOutcome: "SKIP",
    input: {
      seed: 1,
      entryAngleDeg: 0.5,
      headingDeg: 0,
      initialSpeedMps: 8800,
    },
  },
  burn: {
    key: "burn",
    expectOutcome: "BURN",
    input: {
      seed: 1,
      entryAngleDeg: 14,
      headingDeg: 0,
      initialSpeedMps: 9000,
    },
  },
  break: {
    key: "break",
    expectOutcome: "BREAK",
    input: {
      seed: 1,
      entryAngleDeg: 6,
      headingDeg: 0,
      initialSpeedMps: 7500,
    },
  },
  earth: {
    key: "earth",
    expectOutcome: "EARTH_REACHED",
    input: {
      seed: 1,
      entryAngleDeg: 3.5,
      headingDeg: 0,
      initialSpeedMps: 7200,
    },
  },
};

export function resolveDevPreset(
  raw: string | null | undefined,
): ReentryDevPreset | null {
  if (!raw) return null;
  const key = raw.toLowerCase() as ReentryDevPresetKey;
  return PRESETS[key] ?? null;
}

export function listDevPresetKeys(): ReentryDevPresetKey[] {
  return Object.keys(PRESETS) as ReentryDevPresetKey[];
}
