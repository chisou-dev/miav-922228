/**
 * Puzzle geometry helpers — thin adapter over core.
 */
export {
  absoluteCells,
  normalizeShape,
  rotateShape,
  shapeBounds,
} from "@/games/binary-mosaic/core/board";
export { buildActiveMask, snapOrigin } from "@/games/binary-mosaic/core/rules";
export { extractPiecesFromLevel } from "@/games/binary-mosaic/core/level";

import { canPlaceShape } from "@/games/binary-mosaic/core/rules";
import type { Cell, Shape } from "@/games/binary-mosaic/types";

/** Call-site compatible alias for core canPlaceShape. */
export function canPlaceOnBoard(options: {
  rows: number;
  cols: number;
  shape: Shape;
  origin: Cell;
  occupied: Set<string>;
  activeMask: Set<string> | null;
}): boolean {
  return canPlaceShape(options);
}
