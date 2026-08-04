/**
 * Per-level how many pieces may rotate (data table — not if(level===N) sprawl).
 * L1–19: none · L20–21: 1 · L22–24: 2 · L25–28: 3 · L29–30: 5 · L31: 4 · L32: 3 · L33–34: 4 · L35: 4
 */
import {
  normalizeShape,
  rotateShape,
  shapeBounds,
} from "@/games/binary-mosaic/core/board";
import type { Shape } from "@/games/binary-mosaic/types";

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

export function rotatableCountForLevel(levelId: number): number {
  return ROTATABLE_COUNT_BY_LEVEL[levelId] ?? 0;
}

export function rotationFeatureStartsAt(): number {
  return 20;
}

/** True if 90° CW changes the occupied footprint (worth rotating). */
export function shapeNeedsRotation(shape: Shape): boolean {
  const a = shapeBounds(normalizeShape(shape));
  const b = shapeBounds(rotateShape(shape, 1));
  if (a.rows !== b.rows || a.cols !== b.cols) return true;
  const keys0 = new Set(
    normalizeShape(shape).map((c) => `${c.row},${c.col}`),
  );
  const keys1 = new Set(
    normalizeShape(rotateShape(shape, 1)).map((c) => `${c.row},${c.col}`),
  );
  if (keys0.size !== keys1.size) return true;
  for (const k of keys0) {
    if (!keys1.has(k)) return true;
  }
  return false;
}

/**
 * Pick which piece indices can rotate.
 * Prefers shapes that change under 90°, then stable index order.
 */
export function pickRotatablePieceIndices(
  pieces: readonly { pieceIndex: number; baseShape: Shape }[],
  count: number,
  explicit?: readonly number[],
): number[] {
  if (count <= 0 || pieces.length === 0) return [];
  if (explicit && explicit.length > 0) {
    const allowed = new Set(pieces.map((p) => p.pieceIndex));
    return explicit.filter((id) => allowed.has(id)).slice(0, count);
  }
  const ranked = [...pieces].sort((a, b) => {
    const aNeed = shapeNeedsRotation(a.baseShape) ? 0 : 1;
    const bNeed = shapeNeedsRotation(b.baseShape) ? 0 : 1;
    return aNeed - bNeed || a.pieceIndex - b.pieceIndex;
  });
  return ranked.slice(0, Math.min(count, ranked.length)).map((p) => p.pieceIndex);
}

/** Start orientation for a rotatable piece so the player must rotate to solve. */
export function initialRotationForRotatable(shape: Shape): 0 | 1 | 2 | 3 {
  if (!shapeNeedsRotation(shape)) return 0;
  return 1;
}
