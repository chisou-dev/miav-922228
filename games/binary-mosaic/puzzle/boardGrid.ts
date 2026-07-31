/**
 * Board grid helpers — thin adapter over core board state.
 */
import {
  buildBitGrid,
  createEmptyBoard,
  flattenActiveBits,
  withPieces,
} from "@/games/binary-mosaic/core/board";
import { buildActiveMask } from "@/games/binary-mosaic/core/rules";
import type { LevelDef, PieceRuntime } from "@/games/binary-mosaic/types";

function toBoard(
  level: Pick<LevelDef, "rows" | "cols" | "solution">,
  pieces: PieceRuntime[],
) {
  return withPieces(
    createEmptyBoard(level.rows, level.cols, buildActiveMask(level.solution)),
    pieces,
  );
}

/** Build row-major bit grid from placed pieces (null = empty). */
export function buildBoardGrid(
  level: Pick<LevelDef, "rows" | "cols" | "solution">,
  pieces: PieceRuntime[],
  options?: { excludePieceId?: string | null },
): ((0 | 1) | null)[][] {
  return buildBitGrid(toBoard(level, pieces), options);
}

/** Flatten active cells to bit array; null if any active cell is empty. */
export function flattenBoardBits(
  level: Pick<LevelDef, "rows" | "cols" | "solution">,
  pieces: PieceRuntime[],
): (0 | 1)[] | null {
  return flattenActiveBits(toBoard(level, pieces));
}
