/**
 * Free Creator limits (UI + Free generation path only).
 *
 * Does not constrain Generator capacity (still 3–20 / flexible rotateQuota)
 * or loading/playing existing UserLevels / Challenge / Share imports.
 */
export const FREE_CREATOR_MIN_PIECES = 3;
export const FREE_CREATOR_MAX_PIECES = 8;
/** Free Creator always generates with exactly one rotatable piece. */
export const FREE_CREATOR_ROTATABLE_COUNT = 1;

/** Piece counts shown in the Free Creator UI (inclusive range). */
export const FREE_CREATOR_PIECE_OPTIONS: readonly number[] = [
  3, 4, 5, 6, 7, 8,
] as const;

export function isFreeCreatorPieceCount(n: number): boolean {
  return (
    Number.isInteger(n) &&
    n >= FREE_CREATOR_MIN_PIECES &&
    n <= FREE_CREATOR_MAX_PIECES
  );
}

/** Clamp a requested Free piece count into the Free band. */
export function clampFreeCreatorPieceCount(n: number): number {
  if (!Number.isFinite(n)) return FREE_CREATOR_MIN_PIECES;
  const t = Math.trunc(n);
  if (t < FREE_CREATOR_MIN_PIECES) return FREE_CREATOR_MIN_PIECES;
  if (t > FREE_CREATOR_MAX_PIECES) return FREE_CREATOR_MAX_PIECES;
  return t;
}
