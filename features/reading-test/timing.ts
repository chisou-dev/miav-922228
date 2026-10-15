/** Fixed challenge lengths. A longer story adds its own suggested length. */
export const CHALLENGE_PRESET_MINUTES = [1, 2, 3, 5, 10, 15] as const;

/**
 * Suggested challenge length at 200 words per minute.
 * A partial minute rounds up so the default is not shorter than the text.
 */
export function recommendedChallengeMinutes(wordCount: number): number {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return 1;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function challengeMinuteOptions(wordCount: number): number[] {
  const recommended = recommendedChallengeMinutes(wordCount);
  const options: number[] = [...CHALLENGE_PRESET_MINUTES];
  const longestPreset = options[options.length - 1] ?? 15;
  if (recommended > longestPreset) options.push(recommended);
  return options;
}

export function defaultChallengeMinutes(wordCount: number): number {
  const recommended = recommendedChallengeMinutes(wordCount);
  const options = challengeMinuteOptions(wordCount);
  return options.find((minutes) => minutes >= recommended) ?? recommended;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
