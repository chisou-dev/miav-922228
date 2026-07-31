import {
  absoluteCells,
  rotateShape,
} from "@/games/binary-mosaic/core/board";
import { allPiecesPlaced as coreAllPlaced } from "@/games/binary-mosaic/core/rules";
import type { LevelDef, PieceRuntime } from "@/games/binary-mosaic/types";

export type PieceExpectation = {
  pieceIndex: number;
  cells: Set<string>;
  /** First cell (row-major) for rejection hint marker. */
  anchor: { row: number; col: number; bit: 0 | 1 };
};

export function buildPieceExpectations(level: LevelDef): PieceExpectation[] {
  const map = new Map<number, { row: number; col: number; bit: 0 | 1 }[]>();

  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      const id = level.solution[r][c];
      if (id < 0) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push({ row: r, col: c, bit: level.bits[r][c] });
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pieceIndex, cells]) => {
      cells.sort((a, b) => a.row - b.row || a.col - b.col);
      const anchor = cells[0];
      return {
        pieceIndex,
        cells: new Set(cells.map((cell) => `${cell.row},${cell.col}`)),
        anchor,
      };
    });
}

export function isPieceCorrectlyPlaced(
  piece: PieceRuntime,
  expectation: PieceExpectation,
): boolean {
  if (!piece.placed) return false;
  const shape = rotateShape(piece.baseShape, piece.rotation);
  const placed = new Set(
    absoluteCells(shape, piece.placed).map((c) => `${c.row},${c.col}`),
  );
  if (placed.size !== expectation.cells.size) return false;
  for (const key of expectation.cells) {
    if (!placed.has(key)) return false;
  }
  return true;
}

export function findWrongPlacedPieces(
  pieces: PieceRuntime[],
  expectations: PieceExpectation[],
): PieceRuntime[] {
  const byIndex = new Map(expectations.map((e) => [e.pieceIndex, e]));
  return pieces.filter((piece) => {
    if (!piece.placed) return false;
    const exp = byIndex.get(piece.pieceIndex);
    if (!exp) return true;
    return !isPieceCorrectlyPlaced(piece, exp);
  });
}

export function allPiecesPlaced(pieces: PieceRuntime[]): boolean {
  return coreAllPlaced(pieces);
}

/** Next unrevealed solution cell for a piece (row-major within the piece). */
export function nextHintCellForPiece(
  level: LevelDef,
  pieceIndex: number,
  revealedKeys: Set<string>,
): { row: number; col: number; bit: 0 | 1; pieceIndex: number } | null {
  const cells: { row: number; col: number; bit: 0 | 1 }[] = [];
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      if (level.solution[r][c] !== pieceIndex) continue;
      cells.push({ row: r, col: c, bit: level.bits[r][c] });
    }
  }
  cells.sort((a, b) => a.row - b.row || a.col - b.col);
  for (const cell of cells) {
    const key = `${cell.row},${cell.col}`;
    if (!revealedKeys.has(key)) {
      return { ...cell, pieceIndex };
    }
  }
  return null;
}

/** Fallback: any unrevealed board cell. */
export function nextHintCellAnywhere(
  level: LevelDef,
  revealedKeys: Set<string>,
): { row: number; col: number; bit: 0 | 1; pieceIndex: number } | null {
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      const pieceIndex = level.solution[r][c];
      if (pieceIndex < 0) continue;
      const key = `${r},${c}`;
      if (!revealedKeys.has(key)) {
        return { row: r, col: c, bit: level.bits[r][c], pieceIndex };
      }
    }
  }
  return null;
}

/** All active solution cells in row-major order. */
export function listSolutionCells(
  level: LevelDef,
): { row: number; col: number; bit: 0 | 1; pieceIndex: number }[] {
  const cells: { row: number; col: number; bit: 0 | 1; pieceIndex: number }[] =
    [];
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      const pieceIndex = level.solution[r][c];
      if (pieceIndex < 0) continue;
      cells.push({ row: r, col: c, bit: level.bits[r][c], pieceIndex });
    }
  }
  return cells;
}

export const HINT_MAX_USES = 3;

/** Cells revealed after N hint presses: 6 → 12 → all. */
export function hintRevealCount(uses: number, totalCells: number): number {
  if (uses <= 0 || totalCells <= 0) return 0;
  if (uses === 1) return Math.min(6, totalCells);
  if (uses === 2) return Math.min(12, totalCells);
  return totalCells;
}

export function cellsForHintUses(level: LevelDef, uses: number) {
  const all = listSolutionCells(level);
  return all.slice(0, hintRevealCount(uses, all.length));
}
