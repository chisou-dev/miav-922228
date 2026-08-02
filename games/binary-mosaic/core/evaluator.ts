/**
 * Level quality evaluator (Phase2-4 / Phase2-4.1 EvaluationProfile).
 * Development / Generator / Creator validation only — not wired into play UI.
 *
 * No React / DOM / audio / storage / network.
 * Does not call Generator or Solver; receives precomputed SolverResult.
 * Does not mutate LevelData or regenerate levels.
 *
 * Depends on: levelData types, SolverResult type, board/level helpers for metrics.
 *
 * Metrics extraction is shared across profiles; only judgment (hard/soft gates
 * and thresholds) switches by EvaluationProfile.
 */
import { rotateShape, shapeBounds } from "@/games/binary-mosaic/core/board";
import { extractPiecesFromLevel } from "@/games/binary-mosaic/core/level";
import type { LevelData } from "@/games/binary-mosaic/core/levelData";
import type { SolverResult } from "@/games/binary-mosaic/core/solver";
import type { Shape } from "@/games/binary-mosaic/core/types";

// ---------------------------------------------------------------------------
// Evaluation profiles (Phase2-4.1)
// ---------------------------------------------------------------------------

/**
 * Judgment profile — same metrics, different pass/fail criteria.
 *
 * - PUBLIC_CAMPAIGN — shipped L1–30 campaign gate (default; backward-compatible).
 * - USER_LEVEL — Creator / user-submitted levels (stricter).
 * - GENERATOR_TEST — generator inspection: full reasons; hard gates only
 *   UNIQUE + solvable (+ timeout); all other issues soft.
 */
export enum EvaluationProfile {
  PUBLIC_CAMPAIGN = "PUBLIC_CAMPAIGN",
  USER_LEVEL = "USER_LEVEL",
  GENERATOR_TEST = "GENERATOR_TEST",
}

/** Default profile: campaign evaluation of shipped levels. */
export const DEFAULT_EVALUATION_PROFILE = EvaluationProfile.PUBLIC_CAMPAIGN;

/**
 * PUBLIC_CAMPAIGN uniqueness policy by level id:
 * - id 1–20: MULTI allowed (NOT_UNIQUE is soft — Phase1 policy)
 * - id >= 21 (incl. >30): UNIQUE required (NOT_UNIQUE hard)
 * - id < 1: UNIQUE required (conservative; not a campaign slot)
 */
export function isCampaignMultiOk(levelId: number): boolean {
  return levelId >= 1 && levelId <= 20;
}

/** USER_LEVEL minimum quality score (hard SCORE_TOO_LOW below this). */
export const USER_LEVEL_MIN_SCORE = 60;

// ---------------------------------------------------------------------------
// Reason codes (enum-like constants — not free-form strings)
// ---------------------------------------------------------------------------

export enum EvaluatorReasonCode {
  NOT_UNIQUE = "NOT_UNIQUE",
  UNSOLVABLE = "UNSOLVABLE",
  SOLVER_TIMEOUT = "SOLVER_TIMEOUT",
  TOO_EASY = "TOO_EASY",
  TOO_HARD = "TOO_HARD",
  TOO_MANY_BAR_PIECES = "TOO_MANY_BAR_PIECES",
  ROTATION_NOT_MEANINGFUL = "ROTATION_NOT_MEANINGFUL",
  PIECE_COUNT_LOW = "PIECE_COUNT_LOW",
  PIECE_COUNT_HIGH = "PIECE_COUNT_HIGH",
  MAX_PIECE_TOO_LARGE = "MAX_PIECE_TOO_LARGE",
  SCORE_TOO_LOW = "SCORE_TOO_LOW",
}
export type EvaluatorDifficulty = "easy" | "medium" | "hard";

export type EvaluatorMetrics = {
  unique: boolean;
  solvable: boolean;
  solverStatus: SolverResult["status"];
  pieceCount: number;
  maxPieceSize: number;
  /** Fraction of pieces whose footprint is a straight bar (1×N or N×1). */
  barPieceRate: number;
  barPieceCount: number;
  /** Count of I-length bars (exactly 4 cells, straight). */
  iBarCount: number;
  exploredNodes: number;
  elapsedTimeMs: number;
  activeCellCount: number;
  rotatablePieceCount: number;
  /** How many declared rotatable pieces have ≥2 distinct orientations. */
  meaningfulRotatableCount: number;
  rotationMeaningful: boolean;
};

export type EvaluatorResult = {
  passed: boolean;
  /** Soft quality score 0–100 (hard fails still report a reduced score). */
  score: number;
  difficulty: EvaluatorDifficulty;
  metrics: EvaluatorMetrics;
  reasons: EvaluatorReasonCode[];
  /** Profile used for hard/soft judgment. */
  profile: EvaluationProfile;
};

export type EvaluateLevelOptions = {
  /**
   * Judgment profile (default PUBLIC_CAMPAIGN).
   * Metrics are always computed the same; only gates / thresholds change.
   */
  profile?: EvaluationProfile;
  /**
   * Override profile / default thresholds (all optional).
   * Applied after profile defaults.
   */
  thresholds?: Partial<EvaluatorThresholds>;
};

export type EvaluatorThresholds = {
  /** Fail / soft when barPieceRate > this (profile-dependent hardness). */
  maxBarPieceRate: number;
  /** Hard fail when max piece cells > this (default 12). */
  maxPieceSize: number;
  /** Hard fail when pieceCount < this (default 2). */
  minPieceCount: number;
  /** Soft reason PIECE_COUNT_HIGH when pieceCount > this (default 24). */
  softMaxPieceCount: number;
  /** Soft TOO_EASY when unique and exploredNodes ≤ this (default 12). */
  softEasyMaxNodes: number;
  /** Soft TOO_HARD when exploredNodes ≥ this (default 50_000). */
  softHardMinNodes: number;
  /** Soft TOO_HARD / difficulty hard when exploredNodes ≥ this (default 5_000). */
  mediumMinNodes: number;
};

/**
 * Baseline numeric thresholds (pre-profile). Profiles overlay bar-rate etc.
 *
 * Soft reasons (TOO_EASY / TOO_HARD / PIECE_COUNT_HIGH) always lower score only.
 * Which of the remaining reasons are hard depends on EvaluationProfile — see
 * `isHardReasonForProfile`.
 */
export const DEFAULT_THRESHOLDS: Readonly<EvaluatorThresholds> = {
  maxBarPieceRate: 0.6,
  maxPieceSize: 12,
  minPieceCount: 2,
  softMaxPieceCount: 24,
  softEasyMaxNodes: 12,
  softHardMinNodes: 50_000,
  mediumMinNodes: 5_000,
};

/**
 * Per-profile threshold overlays (merged onto DEFAULT_THRESHOLDS).
 *
 * PUBLIC_CAMPAIGN: looser bar rate (0.75).
 * USER_LEVEL: stricter bar rate (0.50).
 * GENERATOR_TEST: keep baseline numbers; hardness is soft-all except unique/solvable.
 */
export const PROFILE_THRESHOLD_OVERLAYS: Readonly<
  Record<EvaluationProfile, Partial<EvaluatorThresholds>>
> = {
  [EvaluationProfile.PUBLIC_CAMPAIGN]: { maxBarPieceRate: 0.75 },
  [EvaluationProfile.USER_LEVEL]: { maxBarPieceRate: 0.5 },
  [EvaluationProfile.GENERATOR_TEST]: {},
};

/** Reasons that are hard under the strictest (USER_LEVEL) policy. */
const STRICT_HARD_REASONS: ReadonlySet<EvaluatorReasonCode> = new Set([
  EvaluatorReasonCode.NOT_UNIQUE,
  EvaluatorReasonCode.UNSOLVABLE,
  EvaluatorReasonCode.SOLVER_TIMEOUT,
  EvaluatorReasonCode.TOO_MANY_BAR_PIECES,
  EvaluatorReasonCode.ROTATION_NOT_MEANINGFUL,
  EvaluatorReasonCode.PIECE_COUNT_LOW,
  EvaluatorReasonCode.MAX_PIECE_TOO_LARGE,
  EvaluatorReasonCode.SCORE_TOO_LOW,
]);

/**
 * Whether a reason is a hard fail under the given profile.
 *
 * PUBLIC_CAMPAIGN:
 *   - NOT_UNIQUE hard only when id not in 1–20 (UNIQUE required for id ≥ 21)
 *   - ROTATION_NOT_MEANINGFUL soft (score penalty only)
 *   - bar / piece-size / piece-count / unsolvable / timeout remain hard
 *
 * USER_LEVEL:
 *   - UNIQUE always hard; rotation meaningful hard; bar/size/count hard;
 *     SCORE_TOO_LOW hard
 *
 * GENERATOR_TEST:
 *   - Hard only: NOT_UNIQUE / UNSOLVABLE / SOLVER_TIMEOUT
 *   - Everything else soft (informational); passed ≈ unique + solvable
 */
export function isHardReasonForProfile(
  reason: EvaluatorReasonCode,
  profile: EvaluationProfile,
  levelId: number,
): boolean {
  switch (profile) {
    case EvaluationProfile.GENERATOR_TEST:
      return (
        reason === EvaluatorReasonCode.NOT_UNIQUE ||
        reason === EvaluatorReasonCode.UNSOLVABLE ||
        reason === EvaluatorReasonCode.SOLVER_TIMEOUT
      );
    case EvaluationProfile.USER_LEVEL:
      return STRICT_HARD_REASONS.has(reason);
    case EvaluationProfile.PUBLIC_CAMPAIGN:
      if (reason === EvaluatorReasonCode.NOT_UNIQUE) {
        return !isCampaignMultiOk(levelId);
      }
      if (reason === EvaluatorReasonCode.ROTATION_NOT_MEANINGFUL) {
        return false;
      }
      if (reason === EvaluatorReasonCode.SCORE_TOO_LOW) {
        return false;
      }
      return STRICT_HARD_REASONS.has(reason);
    default: {
      const _exhaustive: never = profile;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Shape helpers (deterministic, documented)
// ---------------------------------------------------------------------------

/**
 * Straight bar = bounding box is 1×N or N×1 and every cell of the box is filled
 * (domino, straight tromino, I-tetromino, longer rods). Matches config.ts bar check.
 */
export function isBarPiece(shape: Shape): boolean {
  const { rows, cols } = shapeBounds(shape);
  if (rows !== 1 && cols !== 1) return false;
  return shape.length === rows * cols;
}

/** I-tetromino bar: straight bar of exactly 4 cells. */
export function isIBarPiece(shape: Shape): boolean {
  return isBarPiece(shape) && shape.length === 4;
}

/**
 * Distinct orientations under 0–3 CW rotations (geometry + bits).
 * Same keying idea as solver `orientations` — rotation is meaningful iff >1.
 */
export function distinctOrientationCount(shape: Shape): number {
  const seen = new Set<string>();
  for (let t = 0; t < 4; t += 1) {
    const sh = rotateShape(shape, t);
    const key = sh.map((c) => `${c.row},${c.col},${c.bit}`).join("|");
    seen.add(key);
  }
  return seen.size;
}

function activeCellCount(level: LevelData): number {
  let n = 0;
  for (const row of level.solution) {
    for (const v of row) {
      if (v >= 0) n += 1;
    }
  }
  return n;
}

function scoreFromReasons(
  reasons: readonly EvaluatorReasonCode[],
  metrics: EvaluatorMetrics,
  thresholds: EvaluatorThresholds,
): number {
  let score = 100;
  for (const r of reasons) {
    switch (r) {
      case EvaluatorReasonCode.NOT_UNIQUE:
      case EvaluatorReasonCode.UNSOLVABLE:
        score -= 40;
        break;
      case EvaluatorReasonCode.SOLVER_TIMEOUT:
        score -= 35;
        break;
      case EvaluatorReasonCode.TOO_MANY_BAR_PIECES:
      case EvaluatorReasonCode.MAX_PIECE_TOO_LARGE:
      case EvaluatorReasonCode.ROTATION_NOT_MEANINGFUL:
        score -= 25;
        break;
      case EvaluatorReasonCode.PIECE_COUNT_LOW:
        score -= 30;
        break;
      case EvaluatorReasonCode.SCORE_TOO_LOW:
        score -= 15;
        break;
      case EvaluatorReasonCode.TOO_EASY:
        score -= 8;
        break;
      case EvaluatorReasonCode.TOO_HARD:
        score -= 12;
        break;
      case EvaluatorReasonCode.PIECE_COUNT_HIGH:
        score -= 6;
        break;
      default:
        score -= 5;
    }
  }
  // Mild bonus for non-trivial search among unique solvable packs.
  if (
    metrics.unique &&
    metrics.exploredNodes > thresholds.softEasyMaxNodes &&
    metrics.exploredNodes < thresholds.softHardMinNodes
  ) {
    score += 2;
  }
  return Math.max(0, Math.min(100, score));
}

function difficultyBand(
  metrics: EvaluatorMetrics,
  thresholds: EvaluatorThresholds,
): EvaluatorDifficulty {
  if (
    metrics.exploredNodes >= thresholds.softHardMinNodes ||
    metrics.pieceCount >= 12
  ) {
    return "hard";
  }
  if (
    metrics.exploredNodes >= thresholds.mediumMinNodes ||
    metrics.pieceCount >= 8
  ) {
    return "medium";
  }
  return "easy";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate LevelData quality using a precomputed SolverResult.
 * Pure / deterministic for a given (level, solverResult, options).
 *
 * Metrics computation is identical for all profiles; `profile` only changes
 * which reasons are hard fails and which numeric thresholds apply.
 */
export function evaluateLevel(
  level: LevelData,
  solverResult: SolverResult,
  options: EvaluateLevelOptions = {},
): EvaluatorResult {
  const profile = options.profile ?? DEFAULT_EVALUATION_PROFILE;
  const thresholds: EvaluatorThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...PROFILE_THRESHOLD_OVERLAYS[profile],
    ...options.thresholds,
  };

  const { pieces } = extractPiecesFromLevel({
    rows: level.rows,
    cols: level.cols,
    bits: level.bits,
    solution: level.solution,
  });

  const pieceCount = pieces.length;
  const sizes = pieces.map((p) => p.baseShape.length);
  const maxPieceSize = sizes.length > 0 ? Math.max(...sizes) : 0;
  const barPieceCount = pieces.filter((p) => isBarPiece(p.baseShape)).length;
  const iBarCount = pieces.filter((p) => isIBarPiece(p.baseShape)).length;
  const barPieceRate = pieceCount > 0 ? barPieceCount / pieceCount : 0;
  const cells = activeCellCount(level);

  const rotatableIds = level.rotatablePieceIndices ?? [];
  const rotatableSet = new Set(rotatableIds);
  const rotatablePieces = pieces.filter((p) => rotatableSet.has(p.pieceIndex));
  const meaningfulRotatableCount = rotatablePieces.filter(
    (p) => distinctOrientationCount(p.baseShape) > 1,
  ).length;
  // No declared rotatables → N/A treated as meaningful (no rotation gate).
  const rotationMeaningful =
    rotatablePieces.length === 0 ||
    meaningfulRotatableCount === rotatablePieces.length;

  const metrics: EvaluatorMetrics = {
    unique: solverResult.unique,
    solvable: solverResult.solvable,
    solverStatus: solverResult.status,
    pieceCount,
    maxPieceSize,
    barPieceRate,
    barPieceCount,
    iBarCount,
    exploredNodes: solverResult.exploredNodes,
    elapsedTimeMs: solverResult.elapsedTimeMs,
    activeCellCount: cells,
    rotatablePieceCount: rotatablePieces.length,
    meaningfulRotatableCount,
    rotationMeaningful,
  };

  const reasons: EvaluatorReasonCode[] = [];

  if (solverResult.status === "TIMEOUT" || solverResult.timedOut) {
    reasons.push(EvaluatorReasonCode.SOLVER_TIMEOUT);
  }
  if (solverResult.status === "NONE" || !solverResult.solvable) {
    reasons.push(EvaluatorReasonCode.UNSOLVABLE);
  } else if (!solverResult.unique) {
    reasons.push(EvaluatorReasonCode.NOT_UNIQUE);
  }

  if (pieceCount < thresholds.minPieceCount) {
    reasons.push(EvaluatorReasonCode.PIECE_COUNT_LOW);
  } else if (pieceCount > thresholds.softMaxPieceCount) {
    reasons.push(EvaluatorReasonCode.PIECE_COUNT_HIGH);
  }

  if (maxPieceSize > thresholds.maxPieceSize) {
    reasons.push(EvaluatorReasonCode.MAX_PIECE_TOO_LARGE);
  }

  if (barPieceRate > thresholds.maxBarPieceRate) {
    reasons.push(EvaluatorReasonCode.TOO_MANY_BAR_PIECES);
  }

  if (rotatablePieces.length > 0 && !rotationMeaningful) {
    reasons.push(EvaluatorReasonCode.ROTATION_NOT_MEANINGFUL);
  }

  if (
    solverResult.unique &&
    solverResult.exploredNodes <= thresholds.softEasyMaxNodes
  ) {
    reasons.push(EvaluatorReasonCode.TOO_EASY);
  } else if (solverResult.exploredNodes >= thresholds.softHardMinNodes) {
    reasons.push(EvaluatorReasonCode.TOO_HARD);
  }

  let score = scoreFromReasons(reasons, metrics, thresholds);

  // USER_LEVEL: quality floor (hard). Applied after base score so the floor
  // reflects other soft/hard penalties already present.
  if (profile === EvaluationProfile.USER_LEVEL && score < USER_LEVEL_MIN_SCORE) {
    reasons.push(EvaluatorReasonCode.SCORE_TOO_LOW);
    score = scoreFromReasons(reasons, metrics, thresholds);
  }

  const hardFail = reasons.some((r) =>
    isHardReasonForProfile(r, profile, level.id),
  );
  // passed = no hard reasons under this profile (UNIQUE handled via NOT_UNIQUE hardness).
  const passed = !hardFail;

  return {
    passed,
    score,
    difficulty: difficultyBand(metrics, thresholds),
    metrics,
    reasons,
    profile,
  };
}
