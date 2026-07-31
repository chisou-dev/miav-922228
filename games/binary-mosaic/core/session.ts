/**
 * Pure gameplay session actions — place / rotate / board bootstrap.
 * UI calls these; no React / SE / storage here.
 *
 * Depends on: board → rules (and level packing).
 * Must not import ui/, features/audio, or progress/.
 */
import {
  createEmptyBoard,
  findPiece,
  nextRotation,
  setPiecePlacement,
  updatePiece,
  withPieces,
} from "@/games/binary-mosaic/core/board";
import { extractPiecesFromLevel } from "@/games/binary-mosaic/core/level";
import {
  buildActiveMask,
  canPlacePiece,
} from "@/games/binary-mosaic/core/rules";
import type {
  BoardPiece,
  BoardState,
  Cell,
} from "@/games/binary-mosaic/core/types";

export type LevelBoardInput = {
  rows: number;
  cols: number;
  bits: (0 | 1)[][];
  solution: number[][];
};

export type ActionResult = {
  board: BoardState;
  ok: boolean;
};

/** Build an empty board + runtime pieces from packed level data. */
export function createSessionBoard(level: LevelBoardInput): BoardState {
  const { pieces: packed } = extractPiecesFromLevel(level);
  const pieces: BoardPiece[] = packed.map((p) => ({
    id: `p${p.pieceIndex}`,
    pieceIndex: p.pieceIndex,
    baseShape: p.baseShape,
    rotation: p.targetRotation,
    placed: null,
  }));
  return withPieces(
    createEmptyBoard(level.rows, level.cols, buildActiveMask(level.solution)),
    pieces,
  );
}

/** Replace piece list on an existing board frame (e.g. React state sync). */
export function boardWithPieces(
  rows: number,
  cols: number,
  solution: number[][],
  pieces: readonly BoardPiece[],
): BoardState {
  return withPieces(
    createEmptyBoard(rows, cols, buildActiveMask(solution)),
    pieces,
  );
}

export function tryPlacePiece(
  board: BoardState,
  pieceId: string,
  origin: Cell,
): ActionResult {
  if (!canPlacePiece(board, pieceId, origin)) {
    return { board, ok: false };
  }
  return {
    board: setPiecePlacement(board, pieceId, origin),
    ok: true,
  };
}

/**
 * Rotate 90° CW.
 * Unplaced: always ok.
 * Placed + illegal: apply rotation and eject (placed → null) — matches current play feel.
 */
export function tryRotatePiece(
  board: BoardState,
  pieceId: string,
): ActionResult {
  const piece = findPiece(board, pieceId);
  if (!piece) return { board, ok: false };

  const rotation = nextRotation(piece.rotation);
  if (!piece.placed) {
    return {
      board: updatePiece(board, pieceId, { rotation }),
      ok: true,
    };
  }

  if (canPlacePiece(board, pieceId, piece.placed, rotation)) {
    return {
      board: updatePiece(board, pieceId, { rotation }),
      ok: true,
    };
  }

  return {
    board: updatePiece(board, pieceId, { rotation, placed: null }),
    ok: true,
  };
}
