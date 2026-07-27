/** "GAME" glyph in 0/1 — 10 columns × 5 rows. */
export const GAME_PATTERN: readonly (readonly ("0" | "1")[])[] = [
  "0011111000".split("") as ("0" | "1")[],
  "0100000100".split("") as ("0" | "1")[],
  "0111111100".split("") as ("0" | "1")[],
  "0100000100".split("") as ("0" | "1")[],
  "0100000100".split("") as ("0" | "1")[],
];

export const GAME_PATTERN_ROWS = GAME_PATTERN.length;
export const GAME_PATTERN_COLS = GAME_PATTERN[0]?.length ?? 10;

/** Where the Data Node rests after GAME forms (center of the glyph). */
export const GAME_NODE_CELL = { row: 2, col: 4 } as const;
