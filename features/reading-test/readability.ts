import type { ReadingLevel } from "@/features/reading-test/types";

/**
 * Tune level boundaries here.
 * Each number is the last value that still belongs to that level.
 * Past the Level 4 bound is Level 5.
 *
 * Flesch Reading Ease uses a minimum (higher is easier).
 * Grade and sentence length use an inclusive maximum.
 * Long-word ratio uses an exclusive maximum.
 */
const FLESCH_READING_EASE_MIN = [80, 70, 60, 40] as const;
const FLESCH_KINCAID_GRADE_MAX = [3, 5, 8, 12] as const;
/**
 * Level 3 stops at 15 words, not 16.
 * A 15.5-word expert passage would otherwise stay Level 4 after weighting.
 */
const SENTENCE_LENGTH_MAX = [8, 12, 15, 22] as const;
/** Levels 3 and 4 continue the Level 1 / 2 bounds. This signal weighs 10%. */
const LONG_WORD_RATIO_MAX = [0.1, 0.16, 0.28, 0.45] as const;

const LEVEL_WEIGHTS = {
  fleschReadingEase: 0.3,
  fleschKincaidGrade: 0.3,
  averageSentenceLength: 0.3,
  longWordRatio: 0.1,
} as const;

const LONG_WORD_MIN_LETTERS = 7;
const WORD_PATTERN = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

export type ReadabilitySignals = {
  fleschReadingEase: ReadingLevel;
  fleschKincaidGrade: ReadingLevel;
  averageSentenceLength: ReadingLevel;
  longWordRatio: ReadingLevel;
};

export type ReadabilityAnalysis = {
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  averageWordLength: number;
  longWordRatio: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  /** Weighted mean of the four signal levels, before rounding. */
  weightedScore: number;
  calculatedLevel: ReadingLevel;
  signals: ReadabilitySignals;
};

const LEVEL_LABELS = {
  1: "Easy",
  2: "Basic",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
} as const satisfies Record<ReadingLevel, string>;

export function readingLevelLabel(level: ReadingLevel): string {
  return LEVEL_LABELS[level];
}

/** Local syllable estimate. No dictionary. */
export function estimateSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length === 0) return 1;
  if (cleaned.length <= 3) return 1;

  const withoutSilentE = cleaned.replace(/e$/, "");
  const stem = withoutSilentE.length > 0 ? withoutSilentE : cleaned;
  const groups = stem.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;

  const beforeLe = cleaned.charAt(cleaned.length - 3);
  if (cleaned.endsWith("le") && beforeLe && !/[aeiouy]/.test(beforeLe)) {
    count += 1;
  }

  return Math.max(1, count);
}

export function analyzeReadability(text: string): ReadabilityAnalysis {
  const words = text.match(WORD_PATTERN) ?? [];
  const wordCount = words.length;
  const sentenceCount = countSentences(text, wordCount);

  if (wordCount === 0 || sentenceCount === 0) {
    return emptyAnalysis();
  }

  let letterCount = 0;
  let syllableCount = 0;
  let longWords = 0;

  for (const word of words) {
    const letters = word.replace(/[^A-Za-z]/g, "");
    letterCount += letters.length;
    syllableCount += estimateSyllables(word);
    if (letters.length >= LONG_WORD_MIN_LETTERS) longWords += 1;
  }

  const averageSentenceLength = wordCount / sentenceCount;
  const averageWordLength = letterCount / wordCount;
  const longWordRatio = longWords / wordCount;
  const syllablesPerWord = syllableCount / wordCount;

  const fleschReadingEase =
    206.835 - 1.015 * averageSentenceLength - 84.6 * syllablesPerWord;
  const fleschKincaidGrade =
    0.39 * averageSentenceLength + 11.8 * syllablesPerWord - 15.59;

  const signals: ReadabilitySignals = {
    fleschReadingEase: levelAtLeast(fleschReadingEase, FLESCH_READING_EASE_MIN),
    fleschKincaidGrade: levelAtMost(fleschKincaidGrade, FLESCH_KINCAID_GRADE_MAX),
    averageSentenceLength: levelAtMost(
      averageSentenceLength,
      SENTENCE_LENGTH_MAX,
    ),
    longWordRatio: levelBelow(longWordRatio, LONG_WORD_RATIO_MAX),
  };

  const weightedScore =
    signals.fleschReadingEase * LEVEL_WEIGHTS.fleschReadingEase +
    signals.fleschKincaidGrade * LEVEL_WEIGHTS.fleschKincaidGrade +
    signals.averageSentenceLength * LEVEL_WEIGHTS.averageSentenceLength +
    signals.longWordRatio * LEVEL_WEIGHTS.longWordRatio;

  return {
    wordCount,
    sentenceCount,
    averageSentenceLength: roundTo(averageSentenceLength, 2),
    averageWordLength: roundTo(averageWordLength, 2),
    longWordRatio: roundTo(longWordRatio, 3),
    fleschReadingEase: roundTo(fleschReadingEase, 1),
    fleschKincaidGrade: roundTo(fleschKincaidGrade, 1),
    weightedScore: roundTo(weightedScore, 2),
    calculatedLevel: clampLevel(Math.round(weightedScore)),
    signals,
  };
}

function countSentences(text: string, wordCount: number): number {
  if (wordCount === 0) return 0;
  const withoutInitials = text.replace(/\b([A-Za-z])\./g, "$1");
  const parts = withoutInitials
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter((part) => /[A-Za-z0-9]/.test(part));
  return Math.max(parts.length, 1);
}

type LevelBounds = readonly [number, number, number, number];

/** Higher values are easier. `bounds` are inclusive minimums for levels 1–4. */
function levelAtLeast(value: number, bounds: LevelBounds): ReadingLevel {
  if (!Number.isFinite(value)) return 3;
  if (value >= bounds[0]) return 1;
  if (value >= bounds[1]) return 2;
  if (value >= bounds[2]) return 3;
  if (value >= bounds[3]) return 4;
  return 5;
}

/** Higher values are harder. `bounds` are inclusive maximums for levels 1–4. */
function levelAtMost(value: number, bounds: LevelBounds): ReadingLevel {
  if (!Number.isFinite(value)) return 3;
  if (value <= bounds[0]) return 1;
  if (value <= bounds[1]) return 2;
  if (value <= bounds[2]) return 3;
  if (value <= bounds[3]) return 4;
  return 5;
}

/** Higher values are harder. `bounds` are exclusive maximums for levels 1–4. */
function levelBelow(value: number, bounds: LevelBounds): ReadingLevel {
  if (!Number.isFinite(value)) return 3;
  if (value < bounds[0]) return 1;
  if (value < bounds[1]) return 2;
  if (value < bounds[2]) return 3;
  if (value < bounds[3]) return 4;
  return 5;
}

function clampLevel(level: number): ReadingLevel {
  if (level <= 1) return 1;
  if (level >= 5) return 5;
  if (level === 2 || level === 3 || level === 4) return level;
  return 3;
}

function emptyAnalysis(): ReadabilityAnalysis {
  return {
    wordCount: 0,
    sentenceCount: 0,
    averageSentenceLength: 0,
    averageWordLength: 0,
    longWordRatio: 0,
    fleschReadingEase: 0,
    fleschKincaidGrade: 0,
    weightedScore: 1,
    calculatedLevel: 1,
    signals: {
      fleschReadingEase: 1,
      fleschKincaidGrade: 1,
      averageSentenceLength: 1,
      longWordRatio: 1,
    },
  };
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
