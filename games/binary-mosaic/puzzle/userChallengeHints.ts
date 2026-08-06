/**
 * User Challenge hint reveal — random 3 cells per press.
 * Campaign L20+ uses expandHintCells (3 → 2 → 1); L1–19 keep 6 → 12 → all.
 */

import { listSolutionCells, type HintCell } from "@/games/binary-mosaic/puzzle/validation";
import type { LevelDef } from "@/games/binary-mosaic/types";

/** Cells revealed per Hint press on User Challenges. */
export const USER_CHALLENGE_HINT_CELLS_PER_USE = 3;

/**
 * Append up to `count` randomly chosen unrevealed empty solution cells.
 * Fisher–Yates shuffle; never re-picks already revealed or occupied cells.
 * Called only on Hint button press (not during render).
 */
export function revealRandomChallengeHintCells(
  level: LevelDef,
  previouslyRevealed: readonly HintCell[],
  occupiedKeys: ReadonlySet<string>,
  count: number = USER_CHALLENGE_HINT_CELLS_PER_USE,
): HintCell[] {
  if (count <= 0) return [...previouslyRevealed];

  const revealedKeys = new Set(
    previouslyRevealed.map((c) => `${c.row},${c.col}`),
  );
  const candidates: HintCell[] = [];
  for (const cell of listSolutionCells(level)) {
    const key = `${cell.row},${cell.col}`;
    if (revealedKeys.has(key)) continue;
    if (occupiedKeys.has(key)) continue;
    candidates.push(cell);
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i]!;
    candidates[i] = candidates[j]!;
    candidates[j] = tmp;
  }

  const take = Math.min(count, candidates.length);
  if (take === 0) return [...previouslyRevealed];
  return [...previouslyRevealed, ...candidates.slice(0, take)];
}

/** True when another User Challenge hint press cannot reveal any new cell. */
export function userChallengeHintExhausted(
  level: LevelDef,
  previouslyRevealed: readonly HintCell[],
  occupiedKeys: ReadonlySet<string>,
): boolean {
  const revealedKeys = new Set(
    previouslyRevealed.map((c) => `${c.row},${c.col}`),
  );
  for (const cell of listSolutionCells(level)) {
    const key = `${cell.row},${cell.col}`;
    if (revealedKeys.has(key)) continue;
    if (occupiedKeys.has(key)) continue;
    return false;
  }
  return true;
}
