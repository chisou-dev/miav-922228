/**
 * Future silhouette frames (from ~Level 10).
 * Active cells form a picture outline; completed bits can reveal an image overlay.
 * Not used by Level 1–3 (rect frames only).
 */
export type SilhouetteDef = {
  id: string;
  label: string;
  rows: number;
  cols: number;
  /** 1 = playable cell, 0 = outside the silhouette */
  mask: (0 | 1)[][];
  /** Optional art shown after a correct clear */
  revealImage?: string;
};

export const SILHOUETTES: Record<string, SilhouetteDef> = {
  dog: {
    id: "dog",
    label: "Dog",
    rows: 8,
    cols: 10,
    // Placeholder mask — replace with a real dog outline when designing Level 10+.
    mask: [
      [0, 0, 1, 1, 0, 0, 0, 1, 1, 0],
      [0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
    ],
    revealImage: "/silhouettes/dog.svg",
  },
};

export function silhouetteActiveSet(id: string): Set<string> {
  const def = SILHOUETTES[id];
  if (!def) throw new Error(`Unknown silhouette: ${id}`);
  const active = new Set<string>();
  for (let r = 0; r < def.rows; r += 1) {
    for (let c = 0; c < def.cols; c += 1) {
      if (def.mask[r][c] === 1) active.add(`${r},${c}`);
    }
  }
  return active;
}
