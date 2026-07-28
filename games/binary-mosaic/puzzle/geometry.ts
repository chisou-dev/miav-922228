import type { Cell, Shape, ShapeCell } from "@/games/binary-mosaic/types";

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

export function extractPiecesFromLevel(options: {
  rows: number;
  cols: number;
  bits: (0 | 1)[][];
  solution: number[][];
}): {
  pieces: {
    pieceIndex: number;
    baseShape: Shape;
    target: Cell;
  }[];
} {
  const { rows, cols, bits, solution } = options;
  if (bits.length !== rows || solution.length !== rows) {
    throw new Error("Binary Mosaic: row count mismatch");
  }
  if (
    bits.some((r) => r.length !== cols) ||
    solution.some((r) => r.length !== cols)
  ) {
    throw new Error("Binary Mosaic: col count mismatch");
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
        throw new Error(`Binary Mosaic: empty piece ${pieceIndex}`);
      }
      if (!isConnected(cells)) {
        throw new Error(`Binary Mosaic: piece ${pieceIndex} is disconnected`);
      }
      const minRow = Math.min(...cells.map((c) => c.row));
      const minCol = Math.min(...cells.map((c) => c.col));
      return {
        pieceIndex,
        baseShape: normalizeShape(cells),
        target: { row: minRow, col: minCol },
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

export function canPlaceOnBoard(options: {
  rows: number;
  cols: number;
  shape: Shape;
  origin: Cell;
  occupied: Set<string>;
  /** Active frame cells; null = full rectangle. */
  activeMask: Set<string> | null;
}): boolean {
  const { rows, cols, shape, origin, occupied, activeMask } = options;
  for (const cell of absoluteCells(shape, origin)) {
    if (cell.row < 0 || cell.col < 0 || cell.row >= rows || cell.col >= cols) {
      return false;
    }
    const k = `${cell.row},${cell.col}`;
    if (activeMask && !activeMask.has(k)) return false;
    if (occupied.has(k)) return false;
  }
  return true;
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

export function buildActiveMask(
  solution: number[][],
): Set<string> | null {
  let hasInactive = false;
  const active = new Set<string>();
  for (let r = 0; r < solution.length; r += 1) {
    for (let c = 0; c < solution[r].length; c += 1) {
      if (solution[r][c] >= 0) active.add(`${r},${c}`);
      else hasInactive = true;
    }
  }
  return hasInactive ? active : null;
}
