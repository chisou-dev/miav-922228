/**
 * Binary Block core — UI-free game logic.
 *
 * Dependency direction (do not reverse):
 *   block / levelData / board → rules → level / session (play)
 *   level / rules / board / levelData → solver      (dev · Creator check)
 *   level / rules / board / levelData → generator   (dev · Creator pack)
 *   level / levelData + SolverResult → evaluator    (dev · quality gate)
 *
 * Generator · Solver · Evaluator are siblings — none imports another.
 * Orchestrator (outside core) may call: generate → solveLevel → evaluateLevel.
 *
 * Reserved for later: analyzer.ts
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

export {
  solveLevel,
  type SolveLevelOptions,
  type SolverResult,
  type SolverStatus,
} from "@/games/binary-mosaic/core/solver";

export {
  generateLevel,
  generateLevelCandidates,
  type CreatorIntent,
  type GeneratorCandidate,
  type GeneratorCandidateMetrics,
  type GeneratorError,
  type GeneratorErrorCode,
  type GeneratorInput,
  type GeneratorResult,
} from "@/games/binary-mosaic/core/generator";

export {
  DEFAULT_EVALUATION_PROFILE,
  DEFAULT_THRESHOLDS,
  EvaluationProfile,
  EvaluatorReasonCode,
  PROFILE_THRESHOLD_OVERLAYS,
  USER_LEVEL_MIN_SCORE,
  distinctOrientationCount,
  evaluateLevel,
  isBarPiece,
  isCampaignMultiOk,
  isHardReasonForProfile,
  isIBarPiece,
  type EvaluateLevelOptions,
  type EvaluatorDifficulty,
  type EvaluatorMetrics,
  type EvaluatorResult,
  type EvaluatorThresholds,
} from "@/games/binary-mosaic/core/evaluator";
