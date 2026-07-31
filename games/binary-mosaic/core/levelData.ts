/**
 * Level data catalog — numbers, boards, pieces map, clear targets.
 * Add / edit levels in `levels/levels.json`; this module exposes them as pure data.
 *
 * No React / UI / audio / storage / network.
 * No per-level `if (level === N)` branches — look up by id from the table.
 *
 * Packing algorithm stays in `level.ts`; session actions stay in `session.ts`.
 */
import levelsJson from "@/games/binary-mosaic/levels/levels.json";
import type { LevelPackInput } from "@/games/binary-mosaic/core/level";

/** Frame shape for the playable board. */
export type LevelFrame = "rect" | "silhouette";

/**
 * One designed level record.
 * Clear condition: assemble `bits` so decoded ASCII matches `targetText`
 * on every active cell (`solution[r][c] >= 0`).
 */
export type LevelData = {
  id: number;
  title: string;
  rows: number;
  cols: number;
  frame: LevelFrame;
  silhouette?: string;
  /** Target plaintext for clear (ASCII). */
  targetText: string;
  /** Target bit field (row-major). */
  bits: (0 | 1)[][];
  /**
   * Piece packing map (same size as bits).
   * Values are piece indices 0..n-1; inactive silhouette cells use -1.
   */
  solution: number[][];
  hintAllowed: boolean;
  /** Optional explicit rotatable piece indices (else auto-picked by quota). */
  rotatablePieceIndices?: number[];
};

/** Clear-condition slice (solver / scoring / Creator Mode). */
export type LevelClearData = {
  id: number;
  targetText: string;
  bits: (0 | 1)[][];
  rows: number;
  cols: number;
  solution: number[][];
};

const LEVELS: readonly LevelData[] = levelsJson as LevelData[];

const BY_ID: ReadonlyMap<number, LevelData> = new Map(
  LEVELS.map((level) => [level.id, level]),
);

/** All designed levels (catalog order as in JSON). */
export function getAllLevelData(): readonly LevelData[] {
  return LEVELS;
}

/** Look up by level number — data table only, no switch. */
export function getLevelData(id: number): LevelData | undefined {
  return BY_ID.get(id);
}

export function getNextLevelId(currentId: number): number | null {
  const sorted = [...LEVELS].sort((a, b) => a.id - b.id);
  const idx = sorted.findIndex((level) => level.id === currentId);
  if (idx < 0 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1].id;
}

/** Initial board + packing fields for `extractPiecesFromLevel` / `createSessionBoard`. */
export function toLevelPackInput(level: LevelData): LevelPackInput {
  return {
    rows: level.rows,
    cols: level.cols,
    bits: level.bits,
    solution: level.solution,
  };
}

/** Piece indices used on this level (from solution map; excludes -1). */
export function usedPieceIndices(level: LevelData): number[] {
  const set = new Set<number>();
  for (const row of level.solution) {
    for (const v of row) {
      if (v >= 0) set.add(v);
    }
  }
  return [...set].sort((a, b) => a - b);
}

export function usedPieceCount(level: LevelData): number {
  return usedPieceIndices(level).length;
}

export function getLevelClearData(level: LevelData): LevelClearData {
  return {
    id: level.id,
    targetText: level.targetText,
    bits: level.bits,
    rows: level.rows,
    cols: level.cols,
    solution: level.solution,
  };
}
