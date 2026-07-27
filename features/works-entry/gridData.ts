/** Fixed 0/1 pattern for the entry grid — node position is managed separately. */
export const GRID_COLS = 12;
export const GRID_ROWS = 12;

const SEED_PATTERN = [
  "010010101011",
  "011101001110",
  "010101110100",
  "011001010110",
  "010010110100",
  "011101100101",
  "010011010110",
  "011010101101",
  "010110010101",
  "011001101010",
  "010101001011",
  "011010110100",
] as const;

export function buildBitGrid(): readonly (readonly ("0" | "1")[])[] {
  return SEED_PATTERN.map((row) =>
    row.padEnd(GRID_COLS, "0").slice(0, GRID_COLS).split("") as ("0" | "1")[],
  );
}

export type GridPosition = { row: number; col: number };

export const GRID_CENTER: GridPosition = {
  row: Math.floor(GRID_ROWS / 2),
  col: Math.floor(GRID_COLS / 2),
};

const NEIGHBOR_DELTAS: readonly GridPosition[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

export function randomNeighbor(pos: GridPosition): GridPosition {
  const options = NEIGHBOR_DELTAS.map((delta) => ({
    row: pos.row + delta.row,
    col: pos.col + delta.col,
  })).filter(
    (next) =>
      next.row >= 0 &&
      next.row < GRID_ROWS &&
      next.col >= 0 &&
      next.col < GRID_COLS,
  );

  if (options.length === 0) return pos;
  return options[Math.floor(Math.random() * options.length)]!;
}

export function randomMoveDelayMs(): number {
  return 150 + Math.floor(Math.random() * 101);
}

export function positionsEqual(a: GridPosition, b: GridPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

export function vortexOffset(
  row: number,
  col: number,
): { x: string; y: string } {
  const dx = (GRID_CENTER.col - col) * 14;
  const dy = (GRID_CENTER.row - row) * 14;
  return { x: `${dx}px`, y: `${dy}px` };
}
