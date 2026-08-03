/**
 * Challenge Result share — client-only text + original Challenge Link.
 * Does not change Challenge Link / Share Code format or persist results to a server.
 */

import {
  buildChallengeLink,
  canUseWebShare,
  copyTextToClipboard,
} from "@/games/binary-mosaic/progress/challengeLink";
import {
  formatPatternStars,
  formatTime,
  patternStarsFromScore,
} from "@/games/binary-mosaic/puzzle/scoring";
import type { PatternResult } from "@/games/binary-mosaic/types";
import type { UserLevelRecord } from "@/games/binary-mosaic/progress/userLevels";

export const CHALLENGE_RESULT_SHARE_TITLE =
  "Binary Block Challenge Result" as const;

export const CHALLENGE_RESULT_COPIED_MESSAGE =
  "Result copied.\nPaste it into LINE, X, Reddit, or another app." as const;

export const CHALLENGE_RESULT_SHARE_FAILED_MESSAGE =
  "Could not share the result.\nPlease copy it manually." as const;

export function buildChallengeResultShareText(input: {
  result: PatternResult;
  rotations: number;
  challengeUrl: string;
}): string {
  const stars = formatPatternStars(
    patternStarsFromScore(input.result.patternScore),
  );
  return [
    "I cleared your Binary Block challenge!",
    `Score: ${input.result.patternScore}`,
    `Stars: ${stars}`,
    `Time: ${formatTime(input.result.completionTimeSec)}`,
    `Rotations: ${input.rotations}`,
    "Can you beat my score?",
    input.challengeUrl,
  ].join("\n");
}

export type ShareChallengeResultOutcome =
  | { status: "shared" }
  | { status: "copied" }
  | { status: "aborted" }
  | { status: "failed"; error: string };

/**
 * Share via navigator.share when available; else copy body + Challenge Link.
 * Abort/cancel → aborted (no error UI).
 */
export async function shareOrCopyChallengeResult(input: {
  result: PatternResult;
  rotations: number;
  record: UserLevelRecord;
}): Promise<ShareChallengeResultOutcome> {
  const built = buildChallengeLink(input.record);
  if (!built.ok) {
    return {
      status: "failed",
      error: CHALLENGE_RESULT_SHARE_FAILED_MESSAGE,
    };
  }

  const text = buildChallengeResultShareText({
    result: input.result,
    rotations: input.rotations,
    challengeUrl: built.url,
  });

  if (canUseWebShare()) {
    try {
      await navigator.share({
        title: CHALLENGE_RESULT_SHARE_TITLE,
        text,
        url: built.url,
      });
      return { status: "shared" };
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name?: string }).name === "AbortError"
      ) {
        return { status: "aborted" };
      }
      // Fall through to clipboard
    }
  }

  const copied = await copyTextToClipboard(text);
  if (copied) return { status: "copied" };
  return {
    status: "failed",
    error: CHALLENGE_RESULT_SHARE_FAILED_MESSAGE,
  };
}
