export type RowDecodeStatus = "empty" | "partial" | "correct" | "wrong";

export type RowDecode = {
  status: RowDecodeStatus;
  /** Shown glyph: letter when correct, "?" when wrong, "" otherwise. */
  glyph: string;
};

/**
 * For 8-column boards, each filled row decodes to one ASCII character.
 * Correct match → letter; full but wrong bits → "?"; otherwise blank.
 */
export function decodeBoardRows(options: {
  cols: number;
  rows: number;
  targetBits: (0 | 1)[][];
  /** Current board bits; null cell = empty. */
  board: ((0 | 1) | null)[][];
}): RowDecode[] {
  const { cols, rows, targetBits, board } = options;
  const out: RowDecode[] = [];

  for (let r = 0; r < rows; r += 1) {
    if (cols !== 8) {
      out.push({ status: "empty", glyph: "" });
      continue;
    }

    let filled = 0;
    const bits: (0 | 1)[] = [];
    let matchesTarget = true;

    for (let c = 0; c < cols; c += 1) {
      const bit = board[r][c];
      if (bit == null) {
        matchesTarget = false;
        continue;
      }
      filled += 1;
      bits.push(bit);
      if (bit !== targetBits[r][c]) matchesTarget = false;
    }

    if (filled === 0) {
      out.push({ status: "empty", glyph: "" });
    } else if (filled < cols) {
      out.push({ status: "partial", glyph: "" });
    } else if (matchesTarget) {
      let code = 0;
      for (const b of bits) code = (code << 1) | b;
      out.push({ status: "correct", glyph: String.fromCharCode(code) });
    } else {
      out.push({ status: "wrong", glyph: "?" });
    }
  }

  return out;
}
