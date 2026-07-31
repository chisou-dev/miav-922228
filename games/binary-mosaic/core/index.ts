/**
 * Binary Block core — UI-free game logic.
 *
 * Dependency direction (do not reverse):
 *   block / levelData / board → rules → level/session → (future) solver → analyzer → generator
 *
 * Reserved for later phases (do not add yet):
 *   solver.ts · generator.ts · analyzer.ts
 */
export type {
  BoardCell,
  BoardPiece,
  BoardState,
  Cell,
  PieceCatalogId,
  PieceDef,
  PlaceAttempt,
  Rotation,
  Shape,
  ShapeCell,
} from "@/games/binary-mosaic/core/types";

export {
  absoluteCells,
  buildBitGrid,
  cellKey,
  createEmptyBoard,
  findPiece,
  flattenActiveBits,
  nextRotation,
  normalizeShape,
  occupiedKeys,
  rotateShape,
  setPiecePlacement,
  shapeBounds,
  updatePiece,
  withPieces,
} from "@/games/binary-mosaic/core/board";

export {
  allPiecesPlaced,
  buildActiveMask,
  canPlacePiece,
  canPlaceShape,
  canRotatePiece,
  isBoardFilled,
  snapOrigin,
} from "@/games/binary-mosaic/core/rules";

export {
  BLOCK_CATALOG,
  BLOCK_IDS,
  blockRotationShapes,
  blockSize,
  getBlockDef,
  shapeAtRotation,
  shapeFromBlock,
  type BlockDef,
  type BlockId,
} from "@/games/binary-mosaic/core/block";

/** @deprecated Prefer block.ts exports */
export {
  getPieceDef,
  PIECE_CATALOG,
  PIECE_CATALOG_IDS,
  shapeFromCatalog,
} from "@/games/binary-mosaic/core/pieces";

export {
  extractPiecesFromLevel,
  type LevelPackInput,
  type PackedPiece,
} from "@/games/binary-mosaic/core/level";

export {
  getAllLevelData,
  getLevelClearData,
  getLevelData,
  getNextLevelId,
  toLevelPackInput,
  usedPieceCount,
  usedPieceIndices,
  type LevelClearData,
  type LevelData,
  type LevelFrame,
} from "@/games/binary-mosaic/core/levelData";

export {
  boardWithPieces,
  createSessionBoard,
  tryPlacePiece,
  tryRotatePiece,
  type ActionResult,
  type LevelBoardInput,
} from "@/games/binary-mosaic/core/session";
