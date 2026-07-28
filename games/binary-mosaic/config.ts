import levelsJson from "@/games/binary-mosaic/levels/levels.json";
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
  title: "Binary Mosaic",
  cellPx: 40,
  maxDesignedLevels: 30,
  /** Silhouette picture levels are intended from around Level 10. */
  silhouetteFromLevel: 10,
} as const;

const levels = levelsJson as LevelDef[];

for (const level of levels) {
  if (level.bits.length !== level.rows || level.solution.length !== level.rows) {
    throw new Error(`Level ${level.id}: rows mismatch`);
  }
  const mask = buildActiveMask(level.solution);
  assertBitsMatchText(level.bits, level.targetText, mask);
  const { pieces } = extractPiecesFromLevel(level);
  const expectedCount =
    level.id <= 3 ? level.id + 2 : pieces.length; // L1=3, L2=4, L3=5
  if (level.id <= 3 && pieces.length !== expectedCount) {
    throw new Error(
      `Level ${level.id}: expected ${expectedCount} pieces, got ${pieces.length}`,
    );
  }
}

export function getAllLevels(): LevelDef[] {
  return levels;
}

export function getLevel(id: number): LevelDef | undefined {
  return levels.find((level) => level.id === id);
}

export function getNextLevelId(currentId: number): number | null {
  const sorted = [...levels].sort((a, b) => a.id - b.id);
  const idx = sorted.findIndex((level) => level.id === currentId);
  if (idx < 0 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1].id;
}
