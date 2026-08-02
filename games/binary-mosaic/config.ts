import {
  getAllLevelData,
  getLevelData,
  getNextLevelId as nextLevelIdFromData,
  toLevelPackInput,
} from "@/games/binary-mosaic/core/levelData";
import {
  assertBitsMatchText,
} from "@/games/binary-mosaic/puzzle/binaryText";
import {
  buildActiveMask,
  extractPiecesFromLevel,
} from "@/games/binary-mosaic/puzzle/geometry";
import type { LevelDef } from "@/games/binary-mosaic/types";

export const binaryMosaicConfig = {
  slug: "binary-mosaic",
  title: "Binary Block",
  /** Board cell size in px — keep compact so more pieces stay readable. */
  cellPx: 34,
  maxDesignedLevels: 30,
  /** Silhouette picture levels are intended from around Level 10. */
  silhouetteFromLevel: 10,
  /**
   * Rotation quota starts at this level.
   * Counts: L20–21 → 1 · L22–24 → 2 · L25–28 → 3 · L29–30 → 5
   */
  rotateFromLevel: 20,
} as const;

/** Levels from `core/levelData` (backed by `levels/levels.json`). */
const levels = getAllLevelData() as LevelDef[];

for (const level of levels) {
  if (level.bits.length !== level.rows || level.solution.length !== level.rows) {
    throw new Error(`Level ${level.id}: rows mismatch`);
  }
  const mask = buildActiveMask(level.solution);
  assertBitsMatchText(level.bits, level.targetText, mask);
  const { pieces } = extractPiecesFromLevel(toLevelPackInput(level));
  if (level.id <= 3) {
    const expectedCount = level.id + 2; // L1=3, L2=4, L3=5
    if (pieces.length !== expectedCount) {
      throw new Error(
        `Level ${level.id}: expected ${expectedCount} pieces, got ${pieces.length}`,
      );
    }
  }
}

let prevPieceCount = 0;
for (const level of [...levels].sort((a, b) => a.id - b.id)) {
  const { pieces } = extractPiecesFromLevel(toLevelPackInput(level));
  if (pieces.length < prevPieceCount) {
    throw new Error(
      `Level ${level.id}: piece count ${pieces.length} < previous ${prevPieceCount}`,
    );
  }
  prevPieceCount = pieces.length;

  let filledRects = 0;
  for (const piece of pieces) {
    const rows = Math.max(...piece.baseShape.map((c) => c.row)) + 1;
    const cols = Math.max(...piece.baseShape.map((c) => c.col)) + 1;
    const isBar = rows === 1 || cols === 1;
    const isFilledRect = !isBar && piece.baseShape.length === rows * cols;
    if (isFilledRect) filledRects += 1;
  }
  if (filledRects > 1) {
    throw new Error(
      `Level ${level.id}: too many solid rectangles (${filledRects}); keep 0–1`,
    );
  }
}

export function getAllLevels(): LevelDef[] {
  return levels;
}

export function getLevel(id: number): LevelDef | undefined {
  return getLevelData(id) as LevelDef | undefined;
}

export function getNextLevelId(currentId: number): number | null {
  return nextLevelIdFromData(currentId);
}
