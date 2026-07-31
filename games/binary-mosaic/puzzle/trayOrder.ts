/**
 * Tray display order for Binary Block.
 * L1–10: catalog / packing order (left→top friendly).
 * L11–20: pick one of a few deterministic permutations per play.
 */

export const TRAY_SHUFFLE_FROM_LEVEL = 11;
export const TRAY_SHUFFLE_TO_LEVEL = 20;
export const TRAY_PATTERN_COUNT = 5;

export function shouldShuffleTray(levelId: number): boolean {
  return (
    levelId >= TRAY_SHUFFLE_FROM_LEVEL && levelId <= TRAY_SHUFFLE_TO_LEVEL
  );
}

/** Pick which of the ~5 tray patterns to use this play. */
export function pickTrayPatternIndex(): number {
  return Math.floor(Math.random() * TRAY_PATTERN_COUNT);
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic index permutation for (levelId, pattern). */
export function trayPermutation(
  length: number,
  levelId: number,
  pattern: number,
): number[] {
  const order = Array.from({ length }, (_, i) => i);
  if (length <= 1) return order;
  const rand = mulberry32(
    (levelId * 1009 + (pattern % TRAY_PATTERN_COUNT) * 7919 + length) >>> 0,
  );
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

/** Reorder tray pieces; identity outside L11–20. */
export function applyTrayOrder<T>(
  items: readonly T[],
  levelId: number,
  pattern: number,
): T[] {
  if (!shouldShuffleTray(levelId) || items.length <= 1) {
    return [...items];
  }
  const perm = trayPermutation(items.length, levelId, pattern);
  return perm.map((i) => items[i]);
}
