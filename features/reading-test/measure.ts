/** Clicks faster than this are treated as mistakes, not a real reading time. */
export const MIN_READING_MS = 5_000;

/** Speeds above this are not shown as a reliable reading score. */
export const MAX_RELIABLE_WPM = 1_000;

const WORD_PATTERN = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

export function countEnglishWords(text: string): number {
  const matches = text.match(WORD_PATTERN);
  return matches ? matches.length : 0;
}

/** Quiet reading time at 200 words per minute, rounded, at least one minute. */
export function estimatedReadingMinutes(wordCount: number): number {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return 1;
  return Math.max(1, Math.round(wordCount / 200));
}

/**
 * Rounded words per minute before the reliability cap.
 * Null when the clock cannot produce a finite speed.
 */
function finiteReadingWpm(wordCount: number, elapsedMs: number): number | null {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return null;
  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_READING_MS) return null;

  const minutes = elapsedMs / 60_000;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  const wpm = Math.round(wordCount / minutes);
  if (!Number.isFinite(wpm) || wpm < 0) return null;
  return wpm;
}

/**
 * Words per minute. Returns null when the duration is under 5 seconds,
 * the clock is not finite, or the speed is above MAX_RELIABLE_WPM.
 */
export function readingWpm(wordCount: number, elapsedMs: number): number | null {
  const wpm = finiteReadingWpm(wordCount, elapsedMs);
  if (wpm == null || wpm > MAX_RELIABLE_WPM) return null;
  return wpm;
}

/** Why a speed is withheld. Null when readingWpm returns a number. */
export function readingSpeedCaution(
  wordCount: number,
  elapsedMs: number,
): "too-short" | "too-fast" | null {
  const wpm = finiteReadingWpm(wordCount, elapsedMs);
  if (wpm == null) return "too-short";
  if (wpm > MAX_RELIABLE_WPM) return "too-fast";
  return null;
}

export function scoreComprehension(
  questions: readonly { id: string; correctAnswer: string }[],
  answers: Readonly<Record<string, string>>,
): { correct: number; total: number; percent: number } {
  const total = questions.length;
  const correct = questions.filter(
    (question) => answers[question.id] === question.correctAnswer,
  ).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percent };
}

export function formatReadingDuration(elapsedMs: number): string {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return "—";
  const totalSeconds = Math.round(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} sec`;
  return `${minutes} min ${seconds} sec`;
}
