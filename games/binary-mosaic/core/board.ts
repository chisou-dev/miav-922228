/**
 * Board state — data only.
 * No React / DOM / audio / storage / network.
 */
import type {
  BoardPiece,
  BoardState,
  Cell,
  Rotation,
  Shape,
  ShapeCell,
} from "@/games/binary-mosaic/core/types";

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function normalizeShape(cells: Shape): Shape {
  const minRow = Math.min(...cells.map((c) => c.row));
  const minCol = Math.min(...cells.map((c) => c.col));
  return cells
    .map((c) => ({
      row: c.row - minRow,
      col: c.col - minCol,
      bit: c.bit,
    }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

/** Rotate 90° clockwise; bits stay glued to their cells. */
export function rotateShape(shape: Shape, times = 1): Shape {
  let next = shape;
  const n = ((times % 4) + 4) % 4;
  for (let i = 0; i < n; i += 1) {
    next = normalizeShape(
      next.map((c) => ({ row: c.col, col: -c.row, bit: c.bit })),
    );
  }
  return next;
}

export function shapeBounds(shape: Shape): { rows: number; cols: number } {
  return {
    rows: Math.max(...shape.map((c) => c.row)) + 1,
    cols: Math.max(...shape.map((c) => c.col)) + 1,
  };
}

export function absoluteCells(shape: Shape, origin: Cell): ShapeCell[] {
  return shape.map((c) => ({
    row: origin.row + c.row,
    col: origin.col + c.col,
    bit: c.bit,
  }));
}

export function createEmptyBoard(
  rows: number,
  cols: number,
  activeMask: ReadonlySet<string> | null = null,
): BoardState {
  return { rows, cols, activeMask, pieces: [] };
}

export function withPieces(
  board: BoardState,
  pieces: readonly BoardPiece[],
): BoardState {
  return { ...board, pieces };
}

export function findPiece(
  board: BoardState,
  pieceId: string,
): BoardPiece | undefined {
  return board.pieces.find((p) => p.id === pieceId);
}

/** Occupied cells except an optional piece (for drag preview). */
export function occupiedKeys(
  board: BoardState,
  exceptPieceId?: string | null,
): Set<string> {
  const set = new Set<string>();
  for (const piece of board.pieces) {
    if (!piece.placed || piece.id === exceptPieceId) continue;
    const shape = rotateShape(piece.baseShape, piece.rotation);
    for (const cell of absoluteCells(shape, piece.placed)) {
      set.add(cellKey(cell.row, cell.col));
    }
  }
  return set;
}

/** Row-major bit grid from placed pieces (null = empty). */
export function buildBitGrid(
  board: BoardState,
  options?: { excludePieceId?: string | null },
): ((0 | 1) | null)[][] {
  const grid: ((0 | 1) | null)[][] = Array.from({ length: board.rows }, () =>
    Array.from({ length: board.cols }, () => null),
  );
  for (const piece of board.pieces) {
    if (!piece.placed || piece.id === options?.excludePieceId) continue;
    const shape = rotateShape(piece.baseShape, piece.rotation);
    for (const cell of absoluteCells(shape, piece.placed)) {
      if (
        cell.row >= 0 &&
        cell.row < board.rows &&
        cell.col >= 0 &&
        cell.col < board.cols
      ) {
        grid[cell.row][cell.col] = cell.bit;
      }
    }
  }
  return grid;
}

/** Flatten active cells; null if any active cell is empty. */
export function flattenActiveBits(board: BoardState): (0 | 1)[] | null {
  const grid = buildBitGrid(board);
  const flat: (0 | 1)[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const key = cellKey(r, c);
      if (board.activeMask && !board.activeMask.has(key)) continue;
      const bit = grid[r][c];
      if (bit == null) return null;
      flat.push(bit);
    }
  }
  return flat;
}

export function updatePiece(
  board: BoardState,
  pieceId: string,
  patch: Partial<Pick<BoardPiece, "placed" | "rotation" | "baseShape">>,
): BoardState {
  return {
    ...board,
    pieces: board.pieces.map((p) =>
      p.id === pieceId ? { ...p, ...patch } : p,
    ),
  };
}

export function setPiecePlacement(
  board: BoardState,
  pieceId: string,
  placed: Cell | null,
  rotation?: Rotation,
): BoardState {
  return updatePiece(board, pieceId, {
    placed,
    ...(rotation !== undefined ? { rotation } : {}),
  });
}

export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 1) % 4) as Rotation;
}
