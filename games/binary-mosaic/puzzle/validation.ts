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

/**
 * From this level: campaign hints reveal 3 → 2 → 1 cells per press (max 3).
 * Earlier levels: 6 → 12 → all.
 */
export const HINT_ONE_PER_USE_FROM_LEVEL = 20;

/** Cells added by the nth campaign hint press at L20+ (1-based index). */
const HINT_CELLS_PER_USE_FROM_L20: readonly number[] = [0, 3, 2, 1];

export type HintCell = {
  row: number;
  col: number;
  bit: 0 | 1;
  pieceIndex: number;
};

/** How many hint cells should be unlocked after `uses` presses. */
export function hintRevealCount(
  uses: number,
  totalCells: number,
  levelId: number,
): number {
  if (uses <= 0 || totalCells <= 0) return 0;
  if (levelId >= HINT_ONE_PER_USE_FROM_LEVEL) {
    const capped = Math.min(uses, HINT_MAX_USES);
    let sum = 0;
    for (let i = 1; i <= capped; i += 1) {
      sum += HINT_CELLS_PER_USE_FROM_L20[i] ?? 0;
    }
    return Math.min(sum, totalCells);
  }
  if (uses === 1) return Math.min(6, totalCells);
  if (uses === 2) return Math.min(12, totalCells);
  return totalCells;
}

/**
 * Grow the revealed hint list up to the quota for `uses`.
 * Skips cells that currently have a placed block (hints only on empty cells).
 * From L20+: each new reveal picks random empty eligible cells (not row-major).
 */
export function expandHintCells(
  level: LevelDef,
  uses: number,
  previouslyRevealed: readonly HintCell[],
  occupiedKeys: ReadonlySet<string>,
): HintCell[] {
  const all = listSolutionCells(level);
  const target = hintRevealCount(uses, all.length, level.id);
  const byKey = new Map<string, HintCell>(
    previouslyRevealed.map((c) => [`${c.row},${c.col}`, c]),
  );
  const next = [...previouslyRevealed];
  const need = target - next.length;
  if (need <= 0) return next;

  if (level.id >= HINT_ONE_PER_USE_FROM_LEVEL) {
    const candidates: HintCell[] = [];
    for (const cell of all) {
      const key = `${cell.row},${cell.col}`;
      if (byKey.has(key) || occupiedKeys.has(key)) continue;
      candidates.push(cell);
    }
    for (let n = 0; n < need && candidates.length > 0; n += 1) {
      const i = Math.floor(Math.random() * candidates.length);
      const [picked] = candidates.splice(i, 1);
      const key = `${picked.row},${picked.col}`;
      next.push(picked);
      byKey.set(key, picked);
    }
    return next;
  }

  for (const cell of all) {
    if (next.length >= target) break;
    const key = `${cell.row},${cell.col}`;
    if (byKey.has(key)) continue;
    if (occupiedKeys.has(key)) continue;
    next.push(cell);
    byKey.set(key, cell);
  }
  return next;
}

/** @deprecated Prefer expandHintCells — kept for scripts / callers. */
export function cellsForHintUses(
  level: LevelDef,
  uses: number,
  occupiedKeys: ReadonlySet<string> = new Set(),
): HintCell[] {
  return expandHintCells(level, uses, [], occupiedKeys);
}
