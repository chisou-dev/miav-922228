import {
  absoluteCells,
  rotateShape,
} from "@/games/binary-mosaic/puzzle/geometry";
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
  return pieces.length > 0 && pieces.every((p) => p.placed != null);
}
