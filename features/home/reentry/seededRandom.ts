/** Deterministic 32-bit mixing — no Math.random(). */

export function mixU32(seed: number, a: number, b: number, c: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (a >>> 0), 0x9e3779b9);
  h = Math.imul(h ^ (b >>> 0), 0x85ebca6b);
  h = Math.imul(h ^ (c >>> 0), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Uniform [0, 1) from a single u32 draw. */
export function u32ToUnit(h: number): number {
  return (h >>> 0) / 0x1_0000_0000;
}

/** Map unit interval to [min, max]. */
export function lerpFromUnit(unit: number, min: number, max: number): number {
  return min + unit * (max - min);
}
