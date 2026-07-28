import type { PatternResult } from "@/games/binary-mosaic/types";

export function calcPatternScore(input: {
  completionTimeSec: number;
  moves: number;
  hintUsed: boolean;
  pieceCount: number;
}): number {
  const { completionTimeSec, moves, hintUsed, pieceCount } = input;
  const expectedMoves = pieceCount * 3;
  const timePenalty = Math.floor(completionTimeSec / 12) * 3;
  const movePenalty = Math.max(0, moves - expectedMoves) * 2;
  const hintPenalty = hintUsed ? 18 : 0;
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
  hintUsed: boolean;
  pieceCount: number;
  decodedText: string;
}): PatternResult {
  return {
    completionTimeSec: input.completionTimeSec,
    moves: input.moves,
    hintUsed: input.hintUsed,
    patternScore: calcPatternScore(input),
    decodedText: input.decodedText,
  };
}
