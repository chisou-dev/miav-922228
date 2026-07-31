import type { PatternResult } from "@/games/binary-mosaic/types";

/** Penalty subtracted from Pattern Score per Hint button press. */
export const HINT_PENALTY_PER_USE = 10;

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
