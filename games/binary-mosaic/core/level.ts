/**
 * Level packing → piece shapes (pure data).
 * Future generator / Creator Mode feed the same shape.
 * No React / audio / storage.
 */
import { normalizeShape } from "@/games/binary-mosaic/core/board";
import type {
  Cell,
  Rotation,
  Shape,
  ShapeCell,
} from "@/games/binary-mosaic/core/types";

export type PackedPiece = {
  pieceIndex: number;
  baseShape: Shape;
  target: Cell;
  targetRotation: Rotation;
};

export type LevelPackInput = {
  rows: number;
  cols: number;
  bits: (0 | 1)[][];
  solution: number[][];
};

/** Extract connected pieces from a packed solution map. */
export function extractPiecesFromLevel(
  options: LevelPackInput,
): { pieces: PackedPiece[] } {
  const { rows, cols, bits, solution } = options;
  if (bits.length !== rows || solution.length !== rows) {
    throw new Error("Binary Block: row count mismatch");
  }
  if (
    bits.some((r) => r.length !== cols) ||
    solution.some((r) => r.length !== cols)
  ) {
    throw new Error("Binary Block: col count mismatch");
  }

  const indices = new Set<number>();
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const id = solution[r][c];
      if (id >= 0) indices.add(id);
    }
  }

  const pieces = [...indices]
    .sort((a, b) => a - b)
    .map((pieceIndex) => {
      const cells: ShapeCell[] = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          if (solution[row][col] === pieceIndex) {
            cells.push({ row, col, bit: bits[row][col] });
          }
        }
      }
      if (cells.length === 0) {
        throw new Error(`Binary Block: empty piece ${pieceIndex}`);
      }
      if (!isConnected(cells)) {
        throw new Error(`Binary Block: piece ${pieceIndex} is disconnected`);
      }
      const minRow = Math.min(...cells.map((c) => c.row));
      const minCol = Math.min(...cells.map((c) => c.col));
      return {
        pieceIndex,
        baseShape: normalizeShape(cells),
        target: { row: minRow, col: minCol },
        targetRotation: 0 as Rotation,
      };
    });

  return { pieces };
}

function isConnected(cells: Cell[]): boolean {
  const key = (c: Cell) => `${c.row},${c.col}`;
  const set = new Set(cells.map(key));
  const seen = new Set<string>();
  const stack = [cells[0]];
  while (stack.length) {
    const cur = stack.pop()!;
    const k = key(cur);
    if (seen.has(k)) continue;
    seen.add(k);
    for (const n of [
      { row: cur.row - 1, col: cur.col },
      { row: cur.row + 1, col: cur.col },
      { row: cur.row, col: cur.col - 1 },
      { row: cur.row, col: cur.col + 1 },
    ]) {
      if (set.has(key(n)) && !seen.has(key(n))) stack.push(n);
    }
  }
  return seen.size === cells.length;
}
