export type ReadingLanguage = "en";

export type ReadingLevel = 1 | 2 | 3 | 4 | 5;

export type ReadingQuestion = {
  id: string;
  question: string;
  choices: readonly [string, string, string, ...string[]];
  correctAnswer: string;
};

export type ReadingContentType = "short-story" | "series-opening" | "series-chapter";

/** Fields stored with the story. Level is resolved later. */
export type ReadingStoryInput = {
  slug: string;
  title: string;
  author: string;
  authorSlug: string;
  language: ReadingLanguage;
  /** When set, this replaces the automatic level. */
  levelOverride?: ReadingLevel;
  /** Label source for the entry page, e.g. 5 → "About 5 minutes". */
  estimatedMinutes: number;
  body: string;
  questions: readonly ReadingQuestion[];
  /** Series name for a chapter opening. Short stories omit this. */
  seriesTitle?: string;
  contentType?: ReadingContentType;
  /** Existing next-chapter URL with a free chapter body. */
  continueUrl?: string;
};

export type ReadingStory = ReadingStoryInput & {
  level: ReadingLevel;
  levelSource: "automatic" | "override";
};
