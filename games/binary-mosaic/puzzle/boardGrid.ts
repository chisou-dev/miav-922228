import type { LevelDef, PieceRuntime } from "@/games/binary-mosaic/types";
import {
  absoluteCells,
  buildActiveMask,
  rotateShape,
} from "@/games/binary-mosaic/puzzle/geometry";

/** Build row-major bit grid from placed pieces (null = empty). */
export function buildBoardGrid(
  level: Pick<LevelDef, "rows" | "cols" | "solution">,
  pieces: PieceRuntime[],
  options?: { excludePieceId?: string | null },
): ((0 | 1) | null)[][] {
  const grid: ((0 | 1) | null)[][] = Array.from({ length: level.rows }, () =>
    Array.from({ length: level.cols }, () => null),
  );
  for (const piece of pieces) {
    if (!piece.placed || piece.id === options?.excludePieceId) continue;
    const shape = rotateShape(piece.baseShape, piece.rotation);
    for (const cell of absoluteCells(shape, piece.placed)) {
      if (
        cell.row >= 0 &&
        cell.row < level.rows &&
        cell.col >= 0 &&
        cell.col < level.cols
      ) {
        grid[cell.row][cell.col] = cell.bit;
      }
    }
  }
  return grid;
}

/** Flatten active cells to bit array; null if any active cell is empty. */
export function flattenBoardBits(
  level: Pick<LevelDef, "rows" | "cols" | "solution">,
  pieces: PieceRuntime[],
): (0 | 1)[] | null {
  const mask = buildActiveMask(level.solution);
  const grid = buildBoardGrid(level, pieces);
  const flat: (0 | 1)[] = [];
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      const key = `${r},${c}`;
      if (mask && !mask.has(key)) continue;
      const bit = grid[r][c];
      if (bit == null) return null;
      flat.push(bit);
    }
  }
  return flat;
}
