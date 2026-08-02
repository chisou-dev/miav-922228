/**
 * Auto CreatorIntent (Phase2-9) — targetText → full CreatorIntent.
 *
 * Pre-pipeline only:
 *   targetText → createAutoCreatorIntent → runCreateUserLevelPipeline(intent)
 *
 * Does not call Generator / Solver / Evaluator / Pipeline.
 * No React / UI / audio / storage / network.
 */
import type { CreatorIntent } from "@/games/binary-mosaic/core/generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Soft difficulty bias for pieceCount / rotateQuota (optional). */
export type AutoIntentDifficulty = "easy" | "medium" | "hard";

export type AutoCreatorIntentOptions = {
  /** Fixed seed; when omitted uses Date.now() (mulberry-friendly finite number). */
  seed?: number;
  /** Bias pieceCount / rotateQuota. Default: medium. */
  difficulty?: AutoIntentDifficulty;
  /** Override auto title (default `User: ${targetText}`). */
  title?: string;
  /** Override hintAllowed (default true for user levels). */
  hintAllowed?: boolean;
};

// ---------------------------------------------------------------------------
// Heuristics (documented)
// ---------------------------------------------------------------------------
/**
 * Auto-decision rules (from targetText ASCII bit length = length × 8):
 *
 * | Field        | Rule |
 * |--------------|------|
 * | boardSize    | Exact fill: rows×cols === bitLength. Prefer campaign width 8 → rows = bitLength/8, cols = 8. If aspect is extreme (rows > 2×cols), pick factor pair nearest √bitLength (prefer cols ≥ rows). |
 * | pieceCount   | clamp(round(cells / 5), 3, min(20, floor(cells/2))); easy −1, hard +2 (still within clamp). |
 * | rotateQuota  | By char length bands: 1→0, 2–3→1, 4–6→2, 7+→3; easy −1, hard +1; then clamp to [0, pieceCount]. |
 * | hintAllowed  | true (user levels) unless options.hintAllowed set. |
 * | seed         | options.seed ?? Date.now(). |
 * | title        | options.title ?? `User: ${targetText}`. |
 *
 * Validation matches Generator: non-empty ASCII (code points 0–255).
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a full CreatorIntent from targetText alone.
 * @throws Error when targetText is empty or non-ASCII (code points outside 0–255).
 */
export function createAutoCreatorIntent(
  targetText: string,
  options: AutoCreatorIntentOptions = {},
): CreatorIntent {
  const validated = validateTargetText(targetText);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const text = validated.text;
  const bitLength = text.length * 8;
  const boardSize = chooseBoardSize(bitLength);
  const cells = boardSize.rows * boardSize.cols;
  const difficulty = options.difficulty ?? "medium";

  const pieceCount = choosePieceCount(cells, difficulty);
  const rotateQuota = chooseRotateQuota(text.length, pieceCount, difficulty);
  const seed =
    typeof options.seed === "number" && Number.isFinite(options.seed)
      ? options.seed
      : Date.now();
  const hintAllowed =
    typeof options.hintAllowed === "boolean" ? options.hintAllowed : true;
  const title =
    typeof options.title === "string" && options.title.length > 0
      ? options.title
      : `User: ${text}`;

  return {
    targetText: text,
    boardSize,
    pieceCount,
    rotateQuota,
    hintAllowed,
    seed,
    title,
    draftId: 0,
  };
}

/**
 * Result-style wrapper — same decisions as {@link createAutoCreatorIntent}.
 */
export function tryCreateAutoCreatorIntent(
  targetText: string,
  options?: AutoCreatorIntentOptions,
):
  | { ok: true; intent: CreatorIntent }
  | { ok: false; error: string } {
  try {
    return { ok: true, intent: createAutoCreatorIntent(targetText, options) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function validateTargetText(
  targetText: string,
): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof targetText !== "string" || targetText.length === 0) {
    return {
      ok: false,
      error: "targetText must be non-empty ASCII (code points 0–255)",
    };
  }
  for (const ch of targetText) {
    const code = ch.charCodeAt(0);
    if (code < 0 || code > 255) {
      return {
        ok: false,
        error: `targetText must be non-empty ASCII (code points 0–255); got U+${code.toString(16).toUpperCase()}`,
      };
    }
  }
  return { ok: true, text: targetText };
}

/**
 * Exact rectangular fill of bitLength cells.
 * Prefer campaign-style width 8; otherwise factor near √n.
 */
function chooseBoardSize(bitLength: number): { rows: number; cols: number } {
  // ASCII bits are always multiple of 8 → campaign width is exact.
  if (bitLength % 8 === 0) {
    const rows = bitLength / 8;
    const cols = 8;
    // Extreme tall boards: seek a more square factor pair.
    if (rows > cols * 2) {
      return factorNearSqrt(bitLength);
    }
    return { rows, cols };
  }
  return factorNearSqrt(bitLength);
}

function factorNearSqrt(n: number): { rows: number; cols: number } {
  const target = Math.sqrt(n);
  let bestRows = 1;
  let bestCols = n;
  let bestScore = Infinity;

  for (let cols = 1; cols <= n; cols += 1) {
    if (n % cols !== 0) continue;
    const rows = n / cols;
    // Prefer landscape / square (cols ≥ rows), slight bonus for cols === 8.
    const aspectPenalty = cols < rows ? 1.5 : 0;
    const campaignBonus = cols === 8 ? -0.75 : 0;
    const score =
      Math.abs(cols - target) +
      Math.abs(rows - target) * 0.5 +
      aspectPenalty +
      campaignBonus;
    if (score < bestScore) {
      bestScore = score;
      bestRows = rows;
      bestCols = cols;
    }
  }

  return { rows: bestRows, cols: bestCols };
}

function choosePieceCount(
  cells: number,
  difficulty: AutoIntentDifficulty,
): number {
  const maxPieces = Math.floor(cells / 2);
  const upper = Math.min(20, maxPieces);
  const lower = Math.min(3, upper);
  let base = Math.round(cells / 5);
  if (difficulty === "easy") base -= 1;
  if (difficulty === "hard") base += 2;
  return clampInt(base, lower, upper);
}

function chooseRotateQuota(
  charLength: number,
  pieceCount: number,
  difficulty: AutoIntentDifficulty,
): number {
  let quota: number;
  if (charLength <= 1) quota = 0;
  else if (charLength <= 3) quota = 1;
  else if (charLength <= 6) quota = 2;
  else quota = 3;

  if (difficulty === "easy") quota -= 1;
  if (difficulty === "hard") quota += 1;

  return clampInt(quota, 0, pieceCount);
}

function clampInt(n: number, lo: number, hi: number): number {
  if (hi < lo) return lo;
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}
