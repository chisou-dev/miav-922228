/**
 * Game rules only — no UI / SE / storage / network.
 * Depends on board.ts (and types). Must not import game/ UI.
 */
import {
  absoluteCells,
  cellKey,
  flattenActiveBits,
  nextRotation,
  occupiedKeys,
  rotateShape,
  shapeBounds,
} from "@/games/binary-mosaic/core/board";
import type {
  BoardPiece,
  BoardState,
  Cell,
  Rotation,
  Shape,
} from "@/games/binary-mosaic/core/types";

export function canPlaceShape(options: {
  rows: number;
  cols: number;
  shape: Shape;
  origin: Cell;
  occupied: ReadonlySet<string>;
  activeMask: ReadonlySet<string> | null;
}): boolean {
  const { rows, cols, shape, origin, occupied, activeMask } = options;
  for (const cell of absoluteCells(shape, origin)) {
    if (cell.row < 0 || cell.col < 0 || cell.row >= rows || cell.col >= cols) {
      return false;
    }
    const k = cellKey(cell.row, cell.col);
    if (activeMask && !activeMask.has(k)) return false;
    if (occupied.has(k)) return false;
  }
  return true;
}

export function canPlacePiece(
  board: BoardState,
  pieceId: string,
  origin: Cell,
  rotation?: Rotation,
): boolean {
  const piece = board.pieces.find((p) => p.id === pieceId);
  if (!piece) return false;
  const rot = rotation ?? piece.rotation;
  const shape = rotateShape(piece.baseShape, rot);
  return canPlaceShape({
    rows: board.rows,
    cols: board.cols,
    shape,
    origin,
    occupied: occupiedKeys(board, pieceId),
    activeMask: board.activeMask,
  });
}

/** Whether rotating in place (or unplaced) is allowed under board rules. */
export function canRotatePiece(
  board: BoardState,
  pieceId: string,
): boolean {
  const piece = board.pieces.find((p) => p.id === pieceId);
  if (!piece) return false;
  const next = nextRotation(piece.rotation);
  const shape = rotateShape(piece.baseShape, next);
  if (!piece.placed) return true;
  return canPlaceShape({
    rows: board.rows,
    cols: board.cols,
    shape,
    origin: piece.placed,
    occupied: occupiedKeys(board, pieceId),
    activeMask: board.activeMask,
  });
}

export function snapOrigin(
  shape: Shape,
  rows: number,
  cols: number,
  pointerBoardRow: number,
  pointerBoardCol: number,
): Cell {
  const bounds = shapeBounds(shape);
  return {
    row: Math.max(
      0,
      Math.min(rows - bounds.rows, Math.round(pointerBoardRow)),
    ),
    col: Math.max(
      0,
      Math.min(cols - bounds.cols, Math.round(pointerBoardCol)),
    ),
  };
}

export function allPiecesPlaced(pieces: readonly BoardPiece[]): boolean {
  return pieces.length > 0 && pieces.every((p) => p.placed != null);
}

/**
 * Minimal clear check: every active cell is filled.
 * (Decoded ASCII match stays in puzzle/binaryText — not required for Phase1-1.)
 */
export function isBoardFilled(board: BoardState): boolean {
  if (!allPiecesPlaced(board.pieces)) return false;
  return flattenActiveBits(board) != null;
}

export function buildActiveMask(
  solution: number[][],
): Set<string> | null {
  let hasInactive = false;
  const active = new Set<string>();
  for (let r = 0; r < solution.length; r += 1) {
    for (let c = 0; c < solution[r].length; c += 1) {
      if (solution[r][c] >= 0) active.add(cellKey(r, c));
      else hasInactive = true;
    }
  }
  return hasInactive ? active : null;
}
