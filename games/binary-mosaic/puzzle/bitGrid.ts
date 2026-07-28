import { textToBits } from "@/games/binary-mosaic/puzzle/binaryText";

/**
 * Build a rows×cols bit matrix from ASCII text (row-major, 8 bits per char).
 * rows*cols must equal text.length * 8.
 */
export function bitsMatrixFromText(
  text: string,
  rows: number,
  cols: number,
): (0 | 1)[][] {
  const flat = textToBits(text);
  if (flat.length !== rows * cols) {
    throw new Error(
      `Cannot fit "${text}" (${flat.length} bits) into ${rows}x${cols}`,
    );
  }
  const grid: (0 | 1)[][] = [];
  for (let r = 0; r < rows; r += 1) {
    grid.push(flat.slice(r * cols, (r + 1) * cols));
  }
  return grid;
}
