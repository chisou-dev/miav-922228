/** Binary Mosaic — glass binary packing (no other games). */

export type Cell = {
  row: number;
  col: number;
};

/** One cell of a piece, carrying a fixed bit through rotation. */
export type ShapeCell = Cell & {
  bit: 0 | 1;
};

export type Shape = ShapeCell[];

export type PieceId = string;

/** Playable frame. Silhouettes unlock around Level 10+. */
export type FrameKind = "rect" | "silhouette";

export type LevelDef = {
  id: number;
  title: string;
  rows: number;
  cols: number;
  frame: FrameKind;
  /** Silhouette id when frame === "silhouette" (e.g. "dog"). */
  silhouette?: string;
  /**
   * Target plaintext decoded from the completed bit field (ASCII, 8 bits/char).
   * Example: "HELLO"
   */
  targetText: string;
  /**
   * Bit field (0|1), row-major. Must equal ASCII binary of targetText
   * for every active frame cell.
   */
  bits: (0 | 1)[][];
  /**
   * Piece packing map. Same size as bits. Values are piece indices 0..n-1.
   * Inactive silhouette cells use -1.
   */
  solution: number[][];
  hintAllowed: boolean;
};

export type PieceRuntime = {
  id: PieceId;
  pieceIndex: number;
  baseShape: Shape;
  rotation: 0 | 1 | 2 | 3;
  placed: Cell | null;
};

export type ClearPhase =
  | "idle"
  | "reveal"
  | "fireworks"
  | "victory"
  | "glow"
  | "dissolve"
  | "stream"
  | "done";

export type PatternResult = {
  completionTimeSec: number;
  moves: number;
  hintUsed: boolean;
  patternScore: number;
  /** Decoded from the assembled board bits. */
  decodedText: string;
};
