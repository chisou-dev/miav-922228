/**
 * @deprecated Prefer `core/block.ts` (BLOCK_CATALOG, shapeFromBlock, …).
 * Kept as stable aliases — do not delete.
 */
export {
  BLOCK_CATALOG as PIECE_CATALOG,
  BLOCK_IDS as PIECE_CATALOG_IDS,
  getBlockDef as getPieceDef,
  shapeFromBlock as shapeFromCatalog,
  blockRotationShapes,
  blockSize,
  shapeAtRotation,
  type BlockDef,
  type BlockId,
} from "@/games/binary-mosaic/core/block";
