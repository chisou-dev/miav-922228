/**
 * Per-level how many pieces may rotate (data table — not if(level===N) sprawl).
 * L1–39: none · L40: Rotation intro (1) · L41+: gradual increase.
 * Prefer level.rotatablePieceIndices when set (L40+ / UserLevels).
 */
import {
  normalizeShape,
  rotateShape,
  shapeBounds,
} from "@/games/binary-mosaic/core/board";
import type { Shape } from "@/games/binary-mosaic/types";

/** Campaign rotation quotas. Ids below {@link rotationFeatureStartsAt} are 0. */
const ROTATABLE_COUNT_BY_LEVEL: Readonly<Record<number, number>> = {
  40: 1,
  41: 2,
  42: 2,
  43: 2,
  44: 3,
  45: 3,
  46: 2,
  47: 2,
  48: 3,
  49: 4,
  50: 7,
};

export function rotatableCountForLevel(levelId: number): number {
  if (levelId < rotationFeatureStartsAt()) return 0;
  return ROTATABLE_COUNT_BY_LEVEL[levelId] ?? 0;
}

/** First campaign level that may require / offer piece rotation. */
export function rotationFeatureStartsAt(): number {
  return 40;
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
