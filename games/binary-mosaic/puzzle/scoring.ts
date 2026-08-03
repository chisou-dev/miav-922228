import type { PatternResult } from "@/games/binary-mosaic/types";

/** Penalty subtracted from Pattern Score per Hint button press. */
export const HINT_PENALTY_PER_USE = 10;

/**
 * Campaign level-select thresholds (best Pattern Score).
 * Reused for Challenge Result star display — do not invent a separate scale.
 */
export const PATTERN_SCORE_HIGH = 90;
export const PATTERN_SCORE_PERFECT = 100;

export function calcPatternScore(input: {
  completionTimeSec: number;
  moves: number;
  hintUses: number;
  pieceCount: number;
}): number {
  const { completionTimeSec, moves, hintUses, pieceCount } = input;
  const expectedMoves = pieceCount * 3;
  /** First 60s free; after that, same −3 per 12s as before. */
  const billableTimeSec = Math.max(0, completionTimeSec - 60);
  const timePenalty = Math.floor(billableTimeSec / 12) * 3;
  const movePenalty = Math.max(0, moves - expectedMoves) * 2;
  const hintPenalty = Math.max(0, hintUses) * HINT_PENALTY_PER_USE;
  return Math.max(
    0,
    Math.min(100, 100 - timePenalty - movePenalty - hintPenalty),
  );
}

/**
 * Map Pattern Score → 1–3 stars using campaign thresholds only.
 * ≥100 → ★★★ · ≥90 → ★★☆ · cleared below 90 → ★☆☆
 */
export function patternStarsFromScore(score: number): 1 | 2 | 3 {
  if (score >= PATTERN_SCORE_PERFECT) return 3;
  if (score >= PATTERN_SCORE_HIGH) return 2;
  return 1;
}

export function formatPatternStars(stars: 1 | 2 | 3): string {
  return `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`;
}

export function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function buildPatternResult(input: {
  completionTimeSec: number;
  moves: number;
  hintUses: number;
  pieceCount: number;
  decodedText: string;
}): PatternResult {
  return {
    completionTimeSec: input.completionTimeSec,
    moves: input.moves,
    hintUses: input.hintUses,
    patternScore: calcPatternScore(input),
    decodedText: input.decodedText,
  };
}
