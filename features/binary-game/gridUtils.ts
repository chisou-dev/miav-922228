import {
  GAME_NODE_CELL,
  GAME_PATTERN,
  GAME_PATTERN_COLS,
  GAME_PATTERN_ROWS,
} from "@/features/binary-game/gamePattern";

export const PREVIEW_COLS = 12;
export const PREVIEW_ROWS = 7;

export type GridPos = { row: number; col: number };

export type BitGrid = ("0" | "1")[][];

const IDLE_SEED = [
  "010101010101",
  "011001010101",
  "010110101011",
  "011010101010",
  "010101001011",
  "011010011010",
  "010101101001",
] as const;

export function randomBit(): "0" | "1" {
  return Math.random() < 0.5 ? "0" : "1";
}

export function buildIdleGrid(): BitGrid {
  return IDLE_SEED.map((row) =>
    row
      .padEnd(PREVIEW_COLS, "0")
      .slice(0, PREVIEW_COLS)
      .split("") as ("0" | "1")[],
  );
}

export function gridCenter(): GridPos {
  return {
    row: Math.floor(PREVIEW_ROWS / 2),
    col: Math.floor(PREVIEW_COLS / 2),
  };
}

export function randomNeighbor(
  pos: GridPos,
  exclude?: GridPos,
): GridPos | null {
  const deltas: GridPos[] = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  const options = deltas
    .map((d) => ({ row: pos.row + d.row, col: pos.col + d.col }))
    .filter(
      (next) =>
        next.row >= 0 &&
        next.row < PREVIEW_ROWS &&
        next.col >= 0 &&
        next.col < PREVIEW_COLS &&
        !(exclude && next.row === exclude.row && next.col === exclude.col),
    );

  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)]!;
}

export function randomMoveDelayMs(): number {
  return 200 + Math.floor(Math.random() * 201);
}

export function posKey(pos: GridPos): string {
  return `${pos.row},${pos.col}`;
}

export function pickMoverPositions(
  count: number,
  exclude: GridPos,
): GridPos[] {
  const pool: GridPos[] = [];
  for (let row = 0; row < PREVIEW_ROWS; row += 1) {
    for (let col = 0; col < PREVIEW_COLS; col += 1) {
      if (row === exclude.row && col === exclude.col) continue;
      pool.push({ row, col });
    }
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function initialMoverCount(): number {
  return 5 + Math.floor(Math.random() * 6);
}

export function swapCells(grid: BitGrid, a: GridPos, b: GridPos): void {
  const tmp = grid[a.row]![a.col]!;
  grid[a.row]![a.col] = grid[b.row]![b.col]!;
  grid[b.row]![b.col] = tmp;
}

export function buildGameGrid(): BitGrid {
  const grid = buildIdleGrid();
  const rowOffset = Math.floor((PREVIEW_ROWS - GAME_PATTERN_ROWS) / 2);
  const colOffset = Math.floor((PREVIEW_COLS - GAME_PATTERN_COLS) / 2);

  for (let row = 0; row < GAME_PATTERN_ROWS; row += 1) {
    for (let col = 0; col < GAME_PATTERN_COLS; col += 1) {
      grid[rowOffset + row]![colOffset + col] = GAME_PATTERN[row]![col]!;
    }
  }

  return grid;
}

export function gameNodePosition(): GridPos {
  const rowOffset = Math.floor((PREVIEW_ROWS - GAME_PATTERN_ROWS) / 2);
  const colOffset = Math.floor((PREVIEW_COLS - GAME_PATTERN_COLS) / 2);
  return {
    row: rowOffset + GAME_NODE_CELL.row,
    col: colOffset + GAME_NODE_CELL.col,
  };
}

export function vortexOffset(row: number, col: number): { x: string; y: string } {
  const center = gridCenter();
  const dx = (center.col - col) * 10;
  const dy = (center.row - row) * 10;
  return { x: `${dx}px`, y: `${dy}px` };
}
