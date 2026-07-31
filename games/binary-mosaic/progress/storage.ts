import type { PatternResult } from "@/games/binary-mosaic/types";

export const BINARY_BLOCK_PROGRESS_KEY = "binary_block_progress";

export type BinaryBlockProgress = {
  clearedLevels: number[];
  bestScores: Record<string, number>;
  bestTimes: Record<string, number>;
};

function emptyProgress(): BinaryBlockProgress {
  return { clearedLevels: [], bestScores: {}, bestTimes: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidProgress(value: unknown): value is BinaryBlockProgress {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.clearedLevels)) return false;
  if (
    !value.clearedLevels.every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 1,
    )
  ) {
    return false;
  }
  if (!isRecord(value.bestScores) || !isRecord(value.bestTimes)) return false;

  for (const score of Object.values(value.bestScores)) {
    if (typeof score !== "number" || !Number.isFinite(score)) return false;
    if (score < 0 || score > 100) return false;
  }
  for (const time of Object.values(value.bestTimes)) {
    if (typeof time !== "number" || !Number.isFinite(time) || time < 0) return false;
  }
  return true;
}

/** Sanitize loaded or in-memory progress before save/display. */
export function normalizeProgress(raw: BinaryBlockProgress): BinaryBlockProgress {
  const clearedLevels = [
    ...new Set(raw.clearedLevels.map((n) => Math.floor(n)).filter((n) => n >= 1)),
  ].sort((a, b) => a - b);

  const bestScores: Record<string, number> = {};
  for (const [key, score] of Object.entries(raw.bestScores)) {
    if (!/^\d+$/.test(key)) continue;
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    bestScores[key] = clamped;
  }

  const bestTimes: Record<string, number> = {};
  for (const [key, time] of Object.entries(raw.bestTimes)) {
    if (!/^\d+$/.test(key)) continue;
    if (time >= 0 && Number.isFinite(time)) bestTimes[key] = time;
  }

  return { clearedLevels, bestScores, bestTimes };
}

/** Read progress from localStorage. Returns empty defaults if missing or corrupt. */
export function loadProgress(): BinaryBlockProgress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = localStorage.getItem(BINARY_BLOCK_PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!isValidProgress(parsed)) {
      localStorage.removeItem(BINARY_BLOCK_PROGRESS_KEY);
      return emptyProgress();
    }
    return normalizeProgress(parsed);
  } catch {
    try {
      localStorage.removeItem(BINARY_BLOCK_PROGRESS_KEY);
    } catch {
      /* ignore quota / privacy mode */
    }
    return emptyProgress();
  }
}

export function saveProgress(progress: BinaryBlockProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      BINARY_BLOCK_PROGRESS_KEY,
      JSON.stringify(normalizeProgress(progress)),
    );
  } catch {
    /* quota exceeded or storage disabled */
  }
}

/** Persist clear result; keeps best score (higher) and best time (lower). */
export function recordLevelClear(
  levelId: number,
  result: PatternResult,
): BinaryBlockProgress {
  const current = loadProgress();
  const key = String(levelId);
  const next = normalizeProgress({
    clearedLevels: current.clearedLevels.includes(levelId)
      ? current.clearedLevels
      : [...current.clearedLevels, levelId],
    bestScores: { ...current.bestScores },
    bestTimes: { ...current.bestTimes },
  });

  const prevScore = next.bestScores[key];
  if (prevScore === undefined || result.patternScore > prevScore) {
    next.bestScores[key] = result.patternScore;
  }

  const prevTime = next.bestTimes[key];
  if (prevTime === undefined || result.completionTimeSec < prevTime) {
    next.bestTimes[key] = result.completionTimeSec;
  }

  saveProgress(next);
  return next;
}

export function isLevelCleared(
  progress: BinaryBlockProgress,
  levelId: number,
): boolean {
  return progress.clearedLevels.includes(levelId);
}

/** Highest level number the player may open (1 + max cleared). */
export function highestUnlockedLevel(progress: BinaryBlockProgress): number {
  if (progress.clearedLevels.length === 0) return 1;
  return Math.max(...progress.clearedLevels) + 1;
}

/** Level 1 always open; clear N unlocks N+1. */
export function isLevelUnlocked(
  progress: BinaryBlockProgress,
  levelId: number,
): boolean {
  return levelId <= highestUnlockedLevel(progress);
}
