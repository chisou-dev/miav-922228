/**
 * Exact-cover solver for Binary Block levels.
 * Development / Generator / Creator validation only — not wired into play UI.
 *
 * No React / DOM / audio / storage / network.
 * Depends on: board, rules, level, levelData types (does not modify them).
 */
import {
  absoluteCells,
  cellKey,
  rotateShape,
  shapeBounds,
} from "@/games/binary-mosaic/core/board";
import { extractPiecesFromLevel } from "@/games/binary-mosaic/core/level";
import type { LevelData } from "@/games/binary-mosaic/core/levelData";
import { buildActiveMask, canPlaceShape } from "@/games/binary-mosaic/core/rules";
import type { Shape } from "@/games/binary-mosaic/core/types";

/** Matches play rotate quotas (L1–19: 0 · L20–21: 1 · … · L29–30: 5 · L31: 4 · L32: 3 · L33–34: 4 · L35: 4). */
const ROTATABLE_COUNT_BY_LEVEL: Readonly<Record<number, number>> = {
  20: 1,
  21: 1,
  22: 2,
  23: 2,
  24: 2,
  25: 3,
  26: 3,
  27: 3,
  28: 3,
  29: 5,
  30: 5,
  31: 4,
  32: 3,
  33: 4,
  34: 4,
  35: 4,
};

const DEFAULT_SOLUTION_LIMIT = 3;
const DEFAULT_NODE_LIMIT = 2_000_000;

export type SolverStatus = "UNIQUE" | "MULTI" | "NONE" | "TIMEOUT";

export type SolverResult = {
  solvable: boolean;
  unique: boolean;
  /** Solutions found (capped by solutionLimit). */
  solutionCount: number;
  exploredNodes: number;
  elapsedTimeMs: number;
  status: SolverStatus;
  timedOut: boolean;
};

export type SolveLevelOptions = {
  /** Stop after this many solutions (default 3). */
  solutionLimit?: number;
  /** Soft DFS node cap (default 2_000_000). */
  nodeLimit?: number;
  /** Override which piece indices may rotate. */
  rotatablePieceIndices?: readonly number[];
  /** Quota when auto-picking rotatable pieces (default: per-level table). */
  rotateQuota?: number;
};

type SolverPiece = {
  pieceIndex: number;
  baseShape: Shape;
  canRotate: boolean;
};

/** True if 90° CW changes the occupied footprint. */
function shapeNeedsRotation(shape: Shape): boolean {
  const a = shapeBounds(shape);
  const b = shapeBounds(rotateShape(shape, 1));
  if (a.rows !== b.rows || a.cols !== b.cols) return true;
  const keys0 = new Set(shape.map((c) => cellKey(c.row, c.col)));
  const keys1 = new Set(
    rotateShape(shape, 1).map((c) => cellKey(c.row, c.col)),
  );
  if (keys0.size !== keys1.size) return true;
  for (const k of keys0) {
    if (!keys1.has(k)) return true;
  }
  return false;
}

function pickRotatableIndices(
  pieces: readonly { pieceIndex: number; baseShape: Shape }[],
  quota: number,
  explicit?: readonly number[],
): Set<number> {
  if (quota <= 0 || pieces.length === 0) return new Set();
  if (explicit && explicit.length > 0) {
    const allowed = new Set(pieces.map((p) => p.pieceIndex));
    return new Set(
      explicit.filter((id) => allowed.has(id)).slice(0, quota),
    );
  }
  const ranked = [...pieces].sort((a, b) => {
    const aNeed = shapeNeedsRotation(a.baseShape) ? 0 : 1;
    const bNeed = shapeNeedsRotation(b.baseShape) ? 0 : 1;
    return aNeed - bNeed || a.pieceIndex - b.pieceIndex;
  });
  return new Set(
    ranked.slice(0, Math.min(quota, ranked.length)).map((p) => p.pieceIndex),
  );
}

function orientations(base: Shape, canRotate: boolean): Shape[] {
  if (!canRotate) return [base];
  const seen = new Set<string>();
  const out: Shape[] = [];
  for (let t = 0; t < 4; t += 1) {
    const sh = rotateShape(base, t);
    const key = sh.map((c) => `${c.row},${c.col},${c.bit}`).join("|");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(sh);
    }
  }
  return out;
}

function shapeMatchesBits(
  shape: Shape,
  originRow: number,
  originCol: number,
  bits: (0 | 1)[][],
): boolean {
  for (const cell of shape) {
    const r = originRow + cell.row;
    const c = originCol + cell.col;
    if (bits[r][c] !== cell.bit) return false;
  }
  return true;
}

/**
 * Count exact-cover solutions that reconstruct `level.bits` under game
 * rotation rules (`canPlaceShape` + rotate quota).
 */
export function solveLevel(
  level: LevelData,
  options: SolveLevelOptions = {},
): SolverResult {
  const solutionLimit = options.solutionLimit ?? DEFAULT_SOLUTION_LIMIT;
  const nodeLimit = options.nodeLimit ?? DEFAULT_NODE_LIMIT;
  const t0 =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();

  const { rows, cols, bits, solution } = level;
  const activeMask = buildActiveMask(solution);
  const { pieces: packed } = extractPiecesFromLevel({
    rows,
    cols,
    bits,
    solution,
  });

  const quota =
    options.rotateQuota ??
    ROTATABLE_COUNT_BY_LEVEL[level.id] ??
    0;
  const explicit =
    options.rotatablePieceIndices ?? level.rotatablePieceIndices;
  const rotatable = pickRotatableIndices(packed, quota, explicit);

  const pieces: SolverPiece[] = packed.map((p) => ({
    pieceIndex: p.pieceIndex,
    baseShape: p.baseShape,
    canRotate: rotatable.has(p.pieceIndex),
  }));

  const emptyOccupied = new Set<string>();
  const piecePlacements: number[][][] = [];

  for (const p of pieces) {
    const places: number[][] = [];
    for (const shape of orientations(p.baseShape, p.canRotate)) {
      const bounds = shapeBounds(shape);
      for (let orr = 0; orr <= rows - bounds.rows; orr += 1) {
        for (let orc = 0; orc <= cols - bounds.cols; orc += 1) {
          const origin = { row: orr, col: orc };
          if (!shapeMatchesBits(shape, orr, orc, bits)) continue;
          if (
            !canPlaceShape({
              rows,
              cols,
              shape,
              origin,
              occupied: emptyOccupied,
              activeMask,
            })
          ) {
            continue;
          }
          const idxs: number[] = [];
          for (const cell of absoluteCells(shape, origin)) {
            idxs.push(cell.row * cols + cell.col);
          }
          places.push(idxs);
        }
      }
    }
    piecePlacements.push(places);
  }

  // Active cells only (inactive silhouette cells stay -1 forever).
  const activeIndices: number[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const k = cellKey(r, c);
      if (activeMask && !activeMask.has(k)) continue;
      activeIndices.push(r * cols + c);
    }
  }

  const occ = new Int8Array(rows * cols).fill(-1);
  const order = [...pieces.keys()].sort(
    (a, b) => piecePlacements[a].length - piecePlacements[b].length,
  );

  let solutions = 0;
  let nodes = 0;
  let timedOut = false;

  const dfs = (pi: number): void => {
    if (solutions >= solutionLimit || timedOut) return;
    nodes += 1;
    if (nodes > nodeLimit) {
      timedOut = true;
      return;
    }
    if (pi >= order.length) {
      // All pieces placed — active cells must be covered (exact cover).
      for (const idx of activeIndices) {
        if (occ[idx] < 0) return;
      }
      solutions += 1;
      return;
    }

    const pidx = order[pi];
    for (const place of piecePlacements[pidx]) {
      if (place.some((i) => occ[i] >= 0)) continue;
      for (const i of place) occ[i] = pidx;
      dfs(pi + 1);
      for (const i of place) occ[i] = -1;
      if (solutions >= solutionLimit || timedOut) return;
    }
  };

  dfs(0);

  const t1 =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  const elapsedTimeMs = t1 - t0;

  let status: SolverStatus;
  if (solutions >= 2) status = "MULTI";
  else if (solutions === 1 && !timedOut) status = "UNIQUE";
  else if (solutions === 0 && !timedOut) status = "NONE";
  else status = "TIMEOUT";

  return {
    solvable: solutions >= 1,
    unique: solutions === 1 && !timedOut,
    solutionCount: solutions,
    exploredNodes: nodes,
    elapsedTimeMs,
    status,
    timedOut,
  };
}
