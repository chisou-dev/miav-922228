/**
 * Works library — category / series / chapter / flash routing skeleton.
 *
 * Catalog lives in `catalog.ts` (swap later for JSON or CMS with same shapes).
 * App routes under:
 *   /literary-sf, /entertainment-sf, /flash-fiction
 *   /stories/[series], /stories/[series]/[chapter]
 *   /flash/[slug]
 */
export {
  categories,
  seriesList,
  flashPieces,
  getCategory,
  getSeries,
  getFlashPiece,
} from "@/features/library/catalog";
