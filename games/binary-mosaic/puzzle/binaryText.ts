/** ASCII ↔ bit-field helpers for Binary Block. */

export function textToBits(text: string): (0 | 1)[] {
  const out: (0 | 1)[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 0 || code > 255) {
      throw new Error(`Unsupported character: ${ch}`);
    }
    for (let i = 7; i >= 0; i -= 1) {
      out.push(((code >> i) & 1) as 0 | 1);
    }
  }
  return out;
}

export function bitsToText(bits: (0 | 1)[]): string {
  if (bits.length % 8 !== 0) return "";
  let text = "";
  for (let i = 0; i < bits.length; i += 8) {
    let code = 0;
    for (let b = 0; b < 8; b += 1) {
      code = (code << 1) | bits[i + b];
    }
    text += String.fromCharCode(code);
  }
  return text;
}

/** Flatten a rectangular (or masked) bit grid row-major, skipping inactive. */
export function flattenBits(
  bits: (0 | 1)[][],
  activeMask: Set<string> | null,
): (0 | 1)[] {
  const out: (0 | 1)[] = [];
  for (let r = 0; r < bits.length; r += 1) {
    for (let c = 0; c < bits[r].length; c += 1) {
      if (activeMask && !activeMask.has(`${r},${c}`)) continue;
      out.push(bits[r][c]);
    }
  }
  return out;
}

export function assertBitsMatchText(
  bits: (0 | 1)[][],
  targetText: string,
  activeMask: Set<string> | null,
) {
  const flat = flattenBits(bits, activeMask);
  const expected = textToBits(targetText);
  if (flat.length !== expected.length) {
    throw new Error(
      `Bit length ${flat.length} !== ASCII length ${expected.length} for "${targetText}"`,
    );
  }
  for (let i = 0; i < flat.length; i += 1) {
    if (flat[i] !== expected[i]) {
      throw new Error(
        `Bit mismatch at ${i} for "${targetText}" (got ${flat[i]}, want ${expected[i]})`,
      );
    }
  }
}
