/**
 * Binary Block — pure core types.
 * No React / DOM / audio / storage / network.
 */

export type Cell = {
  row: number;
  col: number;
};

/** One cell of a piece; bit stays glued through rotation. */
export type ShapeCell = Cell & {
  bit: 0 | 1;
};

export type Shape = ShapeCell[];

export type Rotation = 0 | 1 | 2 | 3;

/** Catalog id for named polyominoes (future generator / Creator Mode). */
export type PieceCatalogId = "I" | "L" | "J" | "T" | "S" | "Z" | "O";

export type PieceDef = {
  id: PieceCatalogId;
  /** Relative cells at rotation 0, top-left normalized. Default bits = 0. */
  cells: Cell[];
};

export type BoardPiece = {
  /** Stable runtime id (UI may map this to React keys). */
  id: string;
  /** Index in the level packing / catalog instance. */
  pieceIndex: number;
  baseShape: Shape;
  rotation: Rotation;
  placed: Cell | null;
  /** Optional link to catalog shape for future tools. */
  catalogId?: PieceCatalogId;
  /** Per-piece rotate permission (UI / session). */
  canRotate?: boolean;
};

export type BoardCell = {
  bit: 0 | 1 | null;
  /** Occupying piece id, or null if empty. */
  pieceId: string | null;
};

/**
 * Pure board snapshot — size, occupancy, piece transforms.
 * Active frame: null = full rectangle; Set of "r,c" = silhouette.
 */
export type BoardState = {
  rows: number;
  cols: number;
  activeMask: ReadonlySet<string> | null;
  pieces: readonly BoardPiece[];
};

export type PlaceAttempt = {
  pieceId: string;
  origin: Cell;
  rotation?: Rotation;
};
