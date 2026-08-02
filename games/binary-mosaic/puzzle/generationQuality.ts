/**
 * Generation quality assessment (Phase2-17) — post-gen layout variety.
 *
 * Pure / deterministic from LevelData (± optional SolverResult).
 * Does not mutate LevelData, Generator, Evaluator gates, or public catalog.
 * May call solveLevel only for the LOW_ROTATION_USAGE check.
 *
 * No React / DOM / audio / storage / network.
 */

import {
  absoluteCells,
  cellKey,
  rotateShape,
  shapeBounds,
} from "@/games/binary-mosaic/core/board";
import { isBarPiece } from "@/games/binary-mosaic/core/evaluator";
import {
  extractPiecesFromLevel,
  type PackedPiece,
} from "@/games/binary-mosaic/core/level";
import {
  toLevelPackInput,
  type LevelData,
} from "@/games/binary-mosaic/core/levelData";
import { buildActiveMask, canPlaceShape } from "@/games/binary-mosaic/core/rules";
import { solveLevel, type SolverResult } from "@/games/binary-mosaic/core/solver";
import type { Rotation, Shape } from "@/games/binary-mosaic/core/types";
import { initialRotationForRotatable } from "@/games/binary-mosaic/puzzle/rotationPolicy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const GenerationQualityReason = {
  TOO_CLUSTERED: "TOO_CLUSTERED",
  TOO_ORDERED: "TOO_ORDERED",
  TOP_LEFT_BIAS: "TOP_LEFT_BIAS",
  TOO_MANY_BARS: "TOO_MANY_BARS",
  LOW_ROTATION_USAGE: "LOW_ROTATION_USAGE",
  GOOD_DISTRIBUTION: "GOOD_DISTRIBUTION",
} as const;

export type GenerationQualityReason =
  (typeof GenerationQualityReason)[keyof typeof GenerationQualityReason];

export type GenerationQualityMetrics = {
  /** 0–1; high = piece indices packed as adjacent sequential strips. */
  clustering: number;
  /** 0–1; high = piece indices appear in row-major order 0,1,2,… */
  orderBias: number;
  /** 0–1; high = active cells / early pieces concentrate top-left. */
  topLeftConcentration: number;
  /** Bar (1×N / N×1) piece fraction. */
  barRate: number;
  /** True when declared rotatables are unnecessary to clear at play-start orients. */
  rotationOptional: boolean;
};

export type GenerationQualityResult = {
  /** 0–100; higher = more varied / less monotonous layout. */
  score: number;
  metrics: GenerationQualityMetrics;
  reasons: GenerationQualityReason[];
};

/** Soft thresholds (reasons / score penalties — not Evaluator hard gates). */
const ORDER_BIAS_FLAG = 0.82;
const CLUSTERING_FLAG = 0.55;
const TOP_LEFT_FLAG = 0.48;
const BAR_RATE_FLAG = 0.5;
const ROTATION_LOCK_NODE_LIMIT = 80_000;

// ---------------------------------------------------------------------------
// Metric helpers
// ---------------------------------------------------------------------------

/** Kendall-style agreement: fraction of pairs in the same relative order. */
function pairOrderAgreement(
  orderA: readonly number[],
  orderB: readonly number[],
): number {
  const n = orderA.length;
  if (n <= 1) return 0;
  const rankB = new Map<number, number>();
  for (let i = 0; i < orderB.length; i += 1) rankB.set(orderB[i], i);
  let agree = 0;
  let pairs = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      pairs += 1;
      const bi = rankB.get(orderA[i]) ?? 0;
      const bj = rankB.get(orderA[j]) ?? 0;
      if (bi < bj) agree += 1;
    }
  }
  return pairs > 0 ? agree / pairs : 0;
}

/**
 * Piece index order vs row-major first-seen order (and vs target top-left order).
 * High ⇒ “place from top-left in index order”.
 */
function computeOrderBias(
  level: LevelData,
  pieces: readonly PackedPiece[],
): number {
  if (pieces.length <= 1) return 0;

  const firstScan = new Map<number, number>();
  let scan = 0;
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      const id = level.solution[r][c];
      if (id >= 0 && !firstScan.has(id)) firstScan.set(id, scan);
      scan += 1;
    }
  }

  const byIndex = pieces.map((p) => p.pieceIndex);
  const byFirstSeen = [...byIndex].sort(
    (a, b) => (firstScan.get(a) ?? 0) - (firstScan.get(b) ?? 0),
  );
  const byTarget = [...pieces]
    .sort(
      (a, b) =>
        a.target.row - b.target.row ||
        a.target.col - b.target.col ||
        a.pieceIndex - b.pieceIndex,
    )
    .map((p) => p.pieceIndex);

  const seenBias = pairOrderAgreement(byIndex, byFirstSeen);
  const targetBias = pairOrderAgreement(byIndex, byTarget);
  return Math.max(seenBias, targetBias);
}

/**
 * Neighboring distinct pieces with |index diff| === 1 (sequential strip packing).
 */
function computeClustering(level: LevelData): number {
  let borderPairs = 0;
  let consecutive = 0;
  const tryEdge = (a: number, b: number) => {
    if (a < 0 || b < 0 || a === b) return;
    borderPairs += 1;
    if (Math.abs(a - b) === 1) consecutive += 1;
  };
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      const id = level.solution[r][c];
      if (c + 1 < level.cols) tryEdge(id, level.solution[r][c + 1]);
      if (r + 1 < level.rows) tryEdge(id, level.solution[r + 1][c]);
    }
  }
  return borderPairs > 0 ? consecutive / borderPairs : 0;
}

/**
 * Mix of geometric top-left cell share and early-piece mass in the NW half.
 */
function computeTopLeftConcentration(
  level: LevelData,
  pieces: readonly PackedPiece[],
): number {
  const midR = level.rows / 2;
  const midC = level.cols / 2;
  let active = 0;
  let topLeftCells = 0;
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      if (level.solution[r][c] < 0) continue;
      active += 1;
      if (r < midR && c < midC) topLeftCells += 1;
    }
  }
  const cellShare = active > 0 ? topLeftCells / active : 0;
  // Excess over ~1/4 (rect NW quadrant) mapped toward 0–1.
  const cellBias = Math.max(0, Math.min(1, (cellShare - 0.25) / 0.5));

  if (pieces.length === 0) return cellBias;

  const earlyCount = Math.max(1, Math.ceil(pieces.length / 2));
  const early = pieces.slice(0, earlyCount);
  let earlyScore = 0;
  for (const p of early) {
    const rowN = level.rows > 1 ? p.target.row / (level.rows - 1) : 0;
    const colN = level.cols > 1 ? p.target.col / (level.cols - 1) : 0;
    earlyScore += 1 - (rowN + colN) / 2;
  }
  earlyScore /= early.length;

  return Math.max(cellBias, earlyScore * 0.85 + cellBias * 0.15);
}

function computeBarRate(pieces: readonly PackedPiece[]): number {
  if (pieces.length === 0) return 0;
  const bars = pieces.filter((p) => isBarPiece(p.baseShape)).length;
  return bars / pieces.length;
}

// ---------------------------------------------------------------------------
// Rotation optional (play-start lock)
// ---------------------------------------------------------------------------

function shapeKey(shape: Shape): string {
  return shape.map((c) => `${c.row},${c.col},${c.bit}`).join("|");
}

function orientationsForLock(
  base: Shape,
  locked: Rotation | null,
): Shape[] {
  if (locked === null) return [base];
  const sh = rotateShape(base, locked);
  return [sh];
}

/**
 * Exact-cover search with fixed orientations (play-start lock for rotatables).
 * Used only for LOW_ROTATION_USAGE — does not modify solver.ts.
 */
function solvableWithLockedOrientations(
  level: LevelData,
  lockedByPiece: ReadonlyMap<number, Rotation>,
): boolean {
  const { rows, cols, bits, solution } = level;
  const activeMask = buildActiveMask(solution);
  const { pieces } = extractPiecesFromLevel(toLevelPackInput(level));

  const piecePlacements: number[][][] = [];
  for (const p of pieces) {
    const locked = lockedByPiece.get(p.pieceIndex) ?? null;
    const places: number[][] = [];
    const seen = new Set<string>();
    for (const shape of orientationsForLock(p.baseShape, locked)) {
      const key = shapeKey(shape);
      if (seen.has(key)) continue;
      seen.add(key);
      const bounds = shapeBounds(shape);
      for (let orr = 0; orr <= rows - bounds.rows; orr += 1) {
        for (let orc = 0; orc <= cols - bounds.cols; orc += 1) {
          let bitsOk = true;
          for (const cell of shape) {
            if (bits[orr + cell.row][orc + cell.col] !== cell.bit) {
              bitsOk = false;
              break;
            }
          }
          if (!bitsOk) continue;
          if (
            !canPlaceShape({
              rows,
              cols,
              shape,
              origin: { row: orr, col: orc },
              occupied: new Set(),
              activeMask,
            })
          ) {
            continue;
          }
          places.push(
            absoluteCells(shape, { row: orr, col: orc }).map(
              (c) => c.row * cols + c.col,
            ),
          );
        }
      }
    }
    if (places.length === 0) return false;
    piecePlacements.push(places);
  }

  const activeIndices: number[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (activeMask && !activeMask.has(cellKey(r, c))) continue;
      activeIndices.push(r * cols + c);
    }
  }

  const occ = new Int8Array(rows * cols).fill(-1);
  const order = [...pieces.keys()].sort(
    (a, b) => piecePlacements[a].length - piecePlacements[b].length,
  );

  let nodes = 0;
  let found = false;

  const dfs = (pi: number): void => {
    if (found || nodes > ROTATION_LOCK_NODE_LIMIT) return;
    nodes += 1;
    if (pi >= order.length) {
      for (const idx of activeIndices) {
        if (occ[idx] < 0) return;
      }
      found = true;
      return;
    }
    const pidx = order[pi];
    for (const place of piecePlacements[pidx]) {
      if (place.some((i) => occ[i] >= 0)) continue;
      for (const i of place) occ[i] = pidx;
      dfs(pi + 1);
      for (const i of place) occ[i] = -1;
      if (found) return;
    }
  };

  dfs(0);
  return found;
}

/**
 * True when rotatablePieceIndices are present but clearing does not require
 * the player to rotate from play-start orientations (or rotatables are inert).
 *
 * Optional SolverResult is accepted for API symmetry; geometry/lock search
 * is the source of truth. A no-rotation solveLevel call is used only as a
 * cheap inert-rotatable shortcut when shapes have a single orientation.
 */
function computeRotationOptional(
  level: LevelData,
  pieces: readonly PackedPiece[],
  _solverResult?: SolverResult,
): boolean {
  const ids = level.rotatablePieceIndices ?? [];
  if (ids.length === 0) return false;

  const rotSet = new Set(ids);
  const rotatable = pieces.filter((p) => rotSet.has(p.pieceIndex));
  if (rotatable.length === 0) return false;

  const locked = new Map<number, Rotation>();
  let anyAsymmetric = false;
  for (const p of rotatable) {
    const start = initialRotationForRotatable(p.baseShape);
    if (start !== 0) {
      anyAsymmetric = true;
      locked.set(p.pieceIndex, start);
    }
  }

  // Declared rotatables but none change under 90° → unused rotation.
  if (!anyAsymmetric) {
    // Confirm packed solution still solves with rotation disabled (always
    // expected; documents intent and keeps solveLevel in the quality path).
    const noRot = solveLevel(level, {
      rotatablePieceIndices: [],
      rotateQuota: 0,
      solutionLimit: 1,
    });
    return noRot.solvable;
  }

  return solvableWithLockedOrientations(level, locked);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assess post-generation layout variety for candidate ranking.
 * Does **not** replace Evaluator PASS/FAIL — soft score / reasons only.
 */
export function assessGenerationQuality(
  level: LevelData,
  solverResult?: SolverResult,
): GenerationQualityResult {
  const { pieces } = extractPiecesFromLevel(toLevelPackInput(level));

  const clustering = computeClustering(level);
  const orderBias = computeOrderBias(level, pieces);
  const topLeftConcentration = computeTopLeftConcentration(level, pieces);
  const barRate = computeBarRate(pieces);
  const rotationOptional = computeRotationOptional(
    level,
    pieces,
    solverResult,
  );

  const metrics: GenerationQualityMetrics = {
    clustering,
    orderBias,
    topLeftConcentration,
    barRate,
    rotationOptional,
  };

  const reasons: GenerationQualityReason[] = [];
  let score = 100;

  if (orderBias >= ORDER_BIAS_FLAG) {
    reasons.push(GenerationQualityReason.TOO_ORDERED);
  }
  score -= Math.round(orderBias * 28);

  if (clustering >= CLUSTERING_FLAG) {
    reasons.push(GenerationQualityReason.TOO_CLUSTERED);
  }
  score -= Math.round(clustering * 22);

  if (topLeftConcentration >= TOP_LEFT_FLAG) {
    reasons.push(GenerationQualityReason.TOP_LEFT_BIAS);
  }
  score -= Math.round(topLeftConcentration * 18);

  if (barRate >= BAR_RATE_FLAG) {
    reasons.push(GenerationQualityReason.TOO_MANY_BARS);
  }
  score -= Math.round(Math.max(0, barRate - 0.3) * 20);

  if (rotationOptional) {
    reasons.push(GenerationQualityReason.LOW_ROTATION_USAGE);
    score -= 18;
  }

  const bad = reasons.some(
    (r) => r !== GenerationQualityReason.GOOD_DISTRIBUTION,
  );
  if (!bad) {
    reasons.push(GenerationQualityReason.GOOD_DISTRIBUTION);
    score = Math.min(100, score + 6);
  }

  score = Math.max(0, Math.min(100, score));

  return { score, metrics, reasons };
}
