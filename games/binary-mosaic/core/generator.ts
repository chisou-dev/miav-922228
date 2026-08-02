/**
 * Level generator — CreatorIntent → LevelData candidates.
 *
 * Owns packing + rotatablePieceIndices selection under rotateQuota.
 * Does NOT call Solver (sibling module; orchestrator sequences gen → solve).
 *
 * No React / UI / audio / storage / network.
 */
import type { LevelData, LevelFrame } from "@/games/binary-mosaic/core/levelData";
import { extractPiecesFromLevel } from "@/games/binary-mosaic/core/level";

// ---------------------------------------------------------------------------
// Public types (Phase2-2 + rotateQuota correction)
// ---------------------------------------------------------------------------

/**
 * Creator Mode intent (MVP required six + optional draft metadata).
 * `rotateQuota` is a **constraint** only — Generator picks which indices.
 * `seed` stays on Intent / future UserLevel — never written into LevelData.
 */
export type CreatorIntent = {
  targetText: string;
  boardSize: { rows: number; cols: number };
  pieceCount: number;
  /** Constraint: how many pieces may rotate (not a LevelData field). */
  rotateQuota: number;
  hintAllowed: boolean;
  seed: number;
  title?: string;
  frame?: LevelFrame;
  candidateLimit?: number;
  maxAttempts?: number;
  /** LevelData.id draft placeholder (default 0). */
  draftId?: number;
};

/** Normalized / MVP input — same shape as CreatorIntent for Phase2-3. */
export type GeneratorInput = CreatorIntent;

export type GeneratorErrorCode =
  | "INVALID_INTENT"
  | "TEXT_GEOMETRY_MISMATCH"
  | "PACK_FAILED"
  | "CANDIDATE_LIMIT"
  | "INTERNAL";

export type GeneratorError = {
  code: GeneratorErrorCode;
  message: string;
};

export type GeneratorCandidateMetrics = {
  pieceCount: number;
  attemptIndex: number;
  seedUsed: number;
  elapsedMs: number;
};

export type GeneratorCandidate = {
  level: LevelData;
  metrics: GeneratorCandidateMetrics;
};

export type GeneratorResult = {
  ok: boolean;
  candidates: GeneratorCandidate[];
  errors: GeneratorError[];
  metrics: {
    attempts: number;
    elapsedMs: number;
    seed: number;
    rejectedByStructure: number;
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate up to `candidateLimit` LevelData candidates (default 1). */
export function generateLevelCandidates(
  input: GeneratorInput,
): GeneratorResult {
  const t0 = nowMs();
  const validated = validateIntent(input);
  if (!validated.ok) {
    return emptyFail(input.seed, t0, validated.errors);
  }
  const {
    rows,
    cols,
    pieceCount,
    rotateQuota,
    hintAllowed,
    seed,
    targetText,
    title,
    frame,
    candidateLimit,
    maxAttempts,
    draftId,
    bits,
  } = validated.value;

  const candidates: GeneratorCandidate[] = [];
  let attempts = 0;
  let rejectedByStructure = 0;
  const errors: GeneratorError[] = [];

  for (
    let candIdx = 0;
    candIdx < candidateLimit && candidates.length < candidateLimit;
    candIdx += 1
  ) {
    const seedUsed = seed + candIdx * 13;
    const packed = packBoard(rows, cols, pieceCount, seedUsed, maxAttempts);
    attempts += packed.attempts;

    if (!packed.solution) {
      continue;
    }

    const structural = structuralCheck(bits, packed.solution, rows, cols);
    if (!structural.ok) {
      rejectedByStructure += 1;
      continue;
    }

    const used = structural.pieceIndices;
    if (used.length !== pieceCount) {
      rejectedByStructure += 1;
      continue;
    }

    const rotatablePieceIndices = pickRotatableIndices(
      used,
      rotateQuota,
      seedUsed,
    );

    const level: LevelData = {
      id: draftId,
      title,
      rows,
      cols,
      frame,
      targetText,
      bits,
      solution: packed.solution,
      hintAllowed,
    };
    if (rotatablePieceIndices.length > 0) {
      level.rotatablePieceIndices = rotatablePieceIndices;
    }

    candidates.push({
      level,
      metrics: {
        pieceCount: used.length,
        attemptIndex: candIdx,
        seedUsed,
        elapsedMs: nowMs() - t0,
      },
    });
  }

  if (candidates.length === 0) {
    errors.push({
      code: "PACK_FAILED",
      message: `Failed to pack ${pieceCount} pieces on ${rows}×${cols} within budget`,
    });
  } else if (candidates.length < candidateLimit) {
    errors.push({
      code: "CANDIDATE_LIMIT",
      message: `Returned ${candidates.length} of ${candidateLimit} requested candidates`,
    });
  }

  return {
    ok: candidates.length >= 1,
    candidates,
    errors,
    metrics: {
      attempts,
      elapsedMs: nowMs() - t0,
      seed,
      rejectedByStructure,
    },
  };
}

/** Thin wrapper: single candidate (`candidateLimit = 1`). */
export function generateLevel(input: GeneratorInput): GeneratorResult {
  return generateLevelCandidates({ ...input, candidateLimit: 1 });
}

// ---------------------------------------------------------------------------
// Validation / bits
// ---------------------------------------------------------------------------

type Validated = {
  targetText: string;
  rows: number;
  cols: number;
  pieceCount: number;
  rotateQuota: number;
  hintAllowed: boolean;
  seed: number;
  title: string;
  frame: LevelFrame;
  candidateLimit: number;
  maxAttempts: number;
  draftId: number;
  bits: (0 | 1)[][];
};

function validateIntent(
  input: GeneratorInput,
): { ok: true; value: Validated } | { ok: false; errors: GeneratorError[] } {
  const errors: GeneratorError[] = [];
  const targetText =
    typeof input.targetText === "string" ? input.targetText : "";
  const rows = input.boardSize?.rows;
  const cols = input.boardSize?.cols;
  const pieceCount = input.pieceCount;
  const rotateQuota = input.rotateQuota;
  const seed = input.seed;

  if (!targetText || !isAscii(targetText)) {
    errors.push({
      code: "INVALID_INTENT",
      message: "targetText must be non-empty ASCII (code points 0–255)",
    });
  }
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows! < 1 || cols! < 1) {
    errors.push({
      code: "INVALID_INTENT",
      message: "boardSize.rows/cols must be integers ≥ 1",
    });
  }
  if (!Number.isInteger(pieceCount) || pieceCount < 1) {
    errors.push({
      code: "INVALID_INTENT",
      message: "pieceCount must be an integer ≥ 1",
    });
  }
  if (!Number.isInteger(rotateQuota) || rotateQuota < 0) {
    errors.push({
      code: "INVALID_INTENT",
      message: "rotateQuota must be an integer ≥ 0",
    });
  }
  if (typeof input.hintAllowed !== "boolean") {
    errors.push({
      code: "INVALID_INTENT",
      message: "hintAllowed must be boolean",
    });
  }
  if (!Number.isFinite(seed)) {
    errors.push({
      code: "INVALID_INTENT",
      message: "seed must be a finite number",
    });
  }
  if (errors.length) return { ok: false, errors };

  const r = rows!;
  const c = cols!;
  const total = r * c;
  const maxPieces = Math.floor(total / 2);
  if (pieceCount! > maxPieces || total < pieceCount! * 2) {
    return {
      ok: false,
      errors: [
        {
          code: "INVALID_INTENT",
          message: `pieceCount ${pieceCount} not feasible for ${r}×${c} (max ${maxPieces})`,
        },
      ],
    };
  }

  const flat = textToBits(targetText);
  if (flat.length !== total) {
    return {
      ok: false,
      errors: [
        {
          code: "TEXT_GEOMETRY_MISMATCH",
          message: `textToBits("${targetText}").length=${flat.length} !== ${r}×${c}=${total}`,
        },
      ],
    };
  }

  const bits: (0 | 1)[][] = [];
  for (let row = 0; row < r; row += 1) {
    bits.push(flat.slice(row * c, (row + 1) * c));
  }

  const candidateLimit = clampInt(input.candidateLimit ?? 1, 1, 16);
  const maxAttempts = clampInt(input.maxAttempts ?? 400, 1, 10_000);
  const draftId = Number.isInteger(input.draftId) ? (input.draftId as number) : 0;
  const frame: LevelFrame = input.frame === "silhouette" ? "silhouette" : "rect";
  const title =
    typeof input.title === "string" && input.title.length > 0
      ? input.title
      : `User: ${targetText}`;

  return {
    ok: true,
    value: {
      targetText,
      rows: r,
      cols: c,
      pieceCount: pieceCount!,
      rotateQuota: rotateQuota!,
      hintAllowed: input.hintAllowed,
      seed: seed!,
      title,
      frame,
      candidateLimit,
      maxAttempts,
      draftId,
      bits,
    },
  };
}

/** Core-local ASCII → bits (avoid puzzle/ import from core). */
function textToBits(text: string): (0 | 1)[] {
  const out: (0 | 1)[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    for (let i = 7; i >= 0; i -= 1) {
      out.push(((code >> i) & 1) as 0 | 1);
    }
  }
  return out;
}

function isAscii(text: string): boolean {
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 0 || code > 255) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// rotateQuota → rotatablePieceIndices (Generator decision)
// ---------------------------------------------------------------------------

/**
 * Select which piece indices may rotate under the quota constraint.
 * Seeded shuffle; length === min(rotateQuota, pieceCount). Empty if quota=0.
 */
function pickRotatableIndices(
  pieceIndices: readonly number[],
  rotateQuota: number,
  seed: number,
): number[] {
  if (rotateQuota <= 0 || pieceIndices.length === 0) return [];
  const rng = createRng(seed ^ 0x52a7_0000);
  const pool = [...pieceIndices];
  rng.shuffle(pool);
  const n = Math.min(rotateQuota, pool.length);
  return pool.slice(0, n).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Packing (port of scripts/generate-levels-21-30.py)
// ---------------------------------------------------------------------------

type CellKey = number; // r * cols + c

function packBoard(
  rows: number,
  cols: number,
  pieceCount: number,
  seed: number,
  maxAttempts: number,
): { solution: number[][] | null; attempts: number } {
  const total = rows * cols;
  const rng = createRng(seed);
  let attempts = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    attempts += 1;
    const sizes = chooseSizes(total, pieceCount, rng);
    const empty = new Set<CellKey>();
    for (let i = 0; i < total; i += 1) empty.add(i);
    const board: number[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(-1),
    );
    let rects = 0;
    let ok = true;

    for (let pid = 0; pid < pieceCount; pid += 1) {
      const sz = sizes[pid];
      let piece: Set<CellKey> | null;
      if (pid === pieceCount - 1) {
        piece = new Set(empty);
        if (piece.size !== sz || !isConnectedKeys(piece, cols)) {
          ok = false;
          break;
        }
      } else {
        piece = growPiece(empty, sz, rows, cols, rng);
        if (!piece) {
          ok = false;
          break;
        }
      }
      if (isFilledRect(piece, cols)) {
        rects += 1;
        if (rects > 1) {
          ok = false;
          break;
        }
      }
      for (const key of piece) {
        const r = Math.floor(key / cols);
        const c = key % cols;
        board[r][c] = pid;
        empty.delete(key);
      }
    }

    if (ok && empty.size === 0) {
      return { solution: board, attempts };
    }
  }

  return { solution: null, attempts };
}

function growPiece(
  empty: Set<CellKey>,
  size: number,
  rows: number,
  cols: number,
  rng: Rng,
): Set<CellKey> | null {
  if (size <= 0 || size > empty.size) return null;
  const seeds = [...empty];
  rng.shuffle(seeds);

  for (const start of seeds.slice(0, Math.min(40, seeds.length))) {
    const piece = new Set<CellKey>([start]);
    let failed = false;

    while (piece.size < size) {
      const cand: CellKey[] = [];
      for (const p of empty) {
        if (piece.has(p)) continue;
        if (anyNeighborIn(p, piece, rows, cols)) cand.push(p);
      }
      if (cand.length === 0) {
        failed = true;
        break;
      }
      rng.shuffle(cand);
      let chosen: CellKey | null = null;
      for (const cell of cand) {
        const trial = new Set(piece);
        trial.add(cell);
        const rem = diff(empty, trial);
        if (trial.size === size) {
          if (remainingConnected(rem, cols)) {
            chosen = cell;
            break;
          }
        } else if (
          remainingConnected(rem, cols) ||
          rem.size > size - trial.size
        ) {
          chosen = cell;
          break;
        }
      }
      if (chosen === null) chosen = cand[0];
      piece.add(chosen);
    }

    if (failed || piece.size !== size) continue;
    const rem = diff(empty, piece);
    if (!remainingConnected(rem, cols)) continue;
    if (!isConnectedKeys(piece, cols)) continue;
    return piece;
  }
  return null;
}

function chooseSizes(total: number, n: number, rng: Rng): number[] {
  let sizes = Array(n).fill(Math.floor(total / n)) as number[];
  for (let i = 0; i < total % n; i += 1) sizes[i] += 1;

  for (let iter = 0; iter < 2000; iter += 1) {
    if (sizes.every((s) => s >= 2 && s <= 6) && sum(sizes) === total) {
      rng.shuffle(sizes);
      return sizes;
    }
    for (let i = 0; i < n; i += 1) {
      if (sizes[i] > 6) {
        for (let j = 0; j < n; j += 1) {
          if (sizes[j] < 6 && i !== j) {
            sizes[i] -= 1;
            sizes[j] += 1;
            break;
          }
        }
      } else if (sizes[i] < 2) {
        for (let j = 0; j < n; j += 1) {
          if (sizes[j] > 2 && i !== j) {
            sizes[i] += 1;
            sizes[j] -= 1;
            break;
          }
        }
      }
    }
  }

  sizes = [];
  let rem = total;
  for (let left = n; left > 0; left -= 1) {
    if (left === 1) {
      sizes.push(rem);
    } else {
      const lo = Math.max(2, rem - 6 * (left - 1));
      const hi = Math.min(6, rem - 2 * (left - 1));
      const s = rng.int(lo, hi);
      sizes.push(s);
      rem -= s;
    }
  }
  return sizes;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function remainingConnected(empty: Set<CellKey>, cols: number): boolean {
  return empty.size === 0 || isConnectedKeys(empty, cols);
}

function isConnectedKeys(cells: Set<CellKey>, cols: number): boolean {
  if (cells.size === 0) return false;
  const start = cells.values().next().value as CellKey;
  const seen = new Set<CellKey>([start]);
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop()!;
    const r = Math.floor(cur / cols);
    const c = cur % cols;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0) continue;
      const nk = nr * cols + nc;
      if (cells.has(nk) && !seen.has(nk)) {
        seen.add(nk);
        stack.push(nk);
      }
    }
  }
  return seen.size === cells.size;
}

function isFilledRect(cells: Set<CellKey>, cols: number): boolean {
  if (cells.size === 0) return false;
  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (const key of cells) {
    const r = Math.floor(key / cols);
    const c = key % cols;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }
  const h = maxR - minR + 1;
  const w = maxC - minC + 1;
  if (h === 1 || w === 1) return false;
  return cells.size === h * w;
}

function anyNeighborIn(
  key: CellKey,
  piece: Set<CellKey>,
  rows: number,
  cols: number,
): boolean {
  const r = Math.floor(key / cols);
  const c = key % cols;
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    if (piece.has(nr * cols + nc)) return true;
  }
  return false;
}

function structuralCheck(
  bits: (0 | 1)[][],
  solution: number[][],
  rows: number,
  cols: number,
): { ok: true; pieceIndices: number[] } | { ok: false } {
  try {
    const { pieces } = extractPiecesFromLevel({ rows, cols, bits, solution });
    return {
      ok: true,
      pieceIndices: pieces.map((p) => p.pieceIndex),
    };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// RNG / misc
// ---------------------------------------------------------------------------

type Rng = {
  next: () => number;
  int: (lo: number, hi: number) => number;
  shuffle: <T>(arr: T[]) => void;
};

/** Mulberry32 — deterministic under seed (TS-local; not Python-parity). */
function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(lo, hi) {
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
    },
  };
}

function diff(a: Set<CellKey>, b: Set<CellKey>): Set<CellKey> {
  const out = new Set<CellKey>();
  for (const x of a) if (!b.has(x)) out.add(x);
  return out;
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.trunc(n)));
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function emptyFail(
  seed: number,
  t0: number,
  errors: GeneratorError[],
): GeneratorResult {
  return {
    ok: false,
    candidates: [],
    errors,
    metrics: {
      attempts: 0,
      elapsedMs: nowMs() - t0,
      seed: Number.isFinite(seed) ? seed : 0,
      rejectedByStructure: 0,
    },
  };
}
