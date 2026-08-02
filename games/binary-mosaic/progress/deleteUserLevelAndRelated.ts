/**
 * Delete a UserLevel and related local indexes (Featured / feedback / share alias).
 * Does not touch Public levels 1–30 or campaign progress.
 */

import { deleteChallengeFeedback } from "@/games/binary-mosaic/progress/challengeFeedback";
import { removeFeatured } from "@/games/binary-mosaic/progress/featuredChallenges";
import { removeLocalShareAliasesForUserLevel } from "@/games/binary-mosaic/progress/shareCode";
import {
  deleteUserLevel,
  notifyUserLevelsChanged,
  type DeleteUserLevelResult,
} from "@/games/binary-mosaic/progress/userLevels";

/**
 * Remove UserLevel record, then best-effort clean Featured refs, Challenge
 * Feedback, and local share-alias index entries for the same id.
 */
export function deleteUserLevelAndRelated(
  userLevelId: string,
): DeleteUserLevelResult {
  const deleted = deleteUserLevel(userLevelId);
  if (!deleted.ok) return deleted;

  // Best-effort related cleanup — level record is already gone.
  try {
    removeFeatured(userLevelId);
  } catch {
    /* ignore */
  }
  try {
    deleteChallengeFeedback(userLevelId);
  } catch {
    /* ignore */
  }
  try {
    removeLocalShareAliasesForUserLevel(userLevelId);
  } catch {
    /* ignore */
  }

  notifyUserLevelsChanged();
  return { ok: true };
}
