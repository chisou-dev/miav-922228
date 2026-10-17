export type ReadingLanguage = "en";

export type ReadingLevel = 1 | 2 | 3 | 4 | 5;

export type TestChannel = "reading" | "listening";

export type ReadingQuestion = {
  id: string;
  question: string;
  choices: readonly [string, string, string, ...string[]];
  /** Choice text, not a display index. Shuffling must not retarget this. */
  correctAnswer: string;
  /**
   * Where this question may be drawn.
   * Omit it to allow both. Set `["reading"]` when the answer depends on
   * seeing the page rather than hearing the story.
   */
  channels?: readonly TestChannel[];
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
  /** Shared bank. A test draws five questions from this list. */
  questions: readonly ReadingQuestion[];
  /**
   * Optional listening-only bank. When omitted, Listening draws from
   * `questions`, skipping any item limited to reading.
   */
  listeningQuestions?: readonly ReadingQuestion[];
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
