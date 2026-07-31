/**
 * Block definitions — kinds, shapes, rotations, size.
 * Data-only; add a new block by extending BLOCK_CATALOG (no switch sprawl).
 *
 * No React / UI / audio / storage / network.
 * Does not own placement rules (rules.ts) or session actions (session.ts).
 */
import {
  normalizeShape,
  rotateShape,
  shapeBounds,
} from "@/games/binary-mosaic/core/board";
import type {
  Cell,
  PieceCatalogId,
  PieceDef,
  Rotation,
  Shape,
} from "@/games/binary-mosaic/core/types";

export type BlockId = PieceCatalogId;

export type BlockDef = PieceDef;

const cell = (row: number, col: number): Cell => ({ row, col });

/**
 * Canonical catalog — rotation 0 layouts, top-left normalized.
 * Bits are assigned by levels / future generator.
 */
export const BLOCK_CATALOG: Record<BlockId, BlockDef> = {
  I: {
    id: "I",
    cells: [cell(0, 0), cell(0, 1), cell(0, 2), cell(0, 3)],
  },
  O: {
    id: "O",
    cells: [cell(0, 0), cell(0, 1), cell(1, 0), cell(1, 1)],
  },
  T: {
    id: "T",
    cells: [cell(0, 0), cell(0, 1), cell(0, 2), cell(1, 1)],
  },
  L: {
    id: "L",
    cells: [cell(0, 0), cell(1, 0), cell(2, 0), cell(2, 1)],
  },
  J: {
    id: "J",
    cells: [cell(0, 1), cell(1, 1), cell(2, 0), cell(2, 1)],
  },
  S: {
    id: "S",
    cells: [cell(0, 1), cell(0, 2), cell(1, 0), cell(1, 1)],
  },
  Z: {
    id: "Z",
    cells: [cell(0, 0), cell(0, 1), cell(1, 1), cell(1, 2)],
  },
};

export const BLOCK_IDS = Object.keys(BLOCK_CATALOG) as BlockId[];

export function getBlockDef(id: BlockId): BlockDef {
  return BLOCK_CATALOG[id];
}

/** Shape at rotation 0 (bits default to 0). */
export function shapeFromBlock(id: BlockId, bits?: (0 | 1)[]): Shape {
  const def = BLOCK_CATALOG[id];
  return normalizeShape(
    def.cells.map((c, i) => ({
      row: c.row,
      col: c.col,
      bit: bits?.[i] ?? 0,
    })),
  );
}

/** All four rotations as normalized shapes (data table, no per-kind switch). */
export function blockRotationShapes(
  id: BlockId,
  bits?: (0 | 1)[],
): Record<Rotation, Shape> {
  const base = shapeFromBlock(id, bits);
  return {
    0: base,
    1: rotateShape(base, 1),
    2: rotateShape(base, 2),
    3: rotateShape(base, 3),
  };
}

export function shapeAtRotation(
  id: BlockId,
  rotation: Rotation,
  bits?: (0 | 1)[],
): Shape {
  return blockRotationShapes(id, bits)[rotation];
}

/** Bounding box for a catalog block at a given rotation. */
export function blockSize(
  id: BlockId,
  rotation: Rotation = 0,
): { rows: number; cols: number } {
  return shapeBounds(shapeAtRotation(id, rotation));
}
