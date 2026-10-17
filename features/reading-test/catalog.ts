import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getFlashPiece } from "@/features/library/catalog";
import { countEnglishWords, estimatedReadingMinutes } from "@/features/reading-test/measure";
import { analyzeReadability } from "@/features/reading-test/readability";
import { flashTests } from "@/features/reading-test/stories/flash-tests";
import { santasBells } from "@/features/reading-test/stories/santas-bells";
import { desk } from "@/features/reading-test/stories/desk";
import { entrance } from "@/features/reading-test/stories/entrance";
import { layers } from "@/features/reading-test/stories/layers";
import { rust } from "@/features/reading-test/stories/rust";
import { sampleStory } from "@/features/reading-test/stories/sample-story";
import { stillness } from "@/features/reading-test/stories/stillness";
import { theMonsterChapter1 } from "@/features/reading-test/stories/the-monster-chapter-1";
import { tissue } from "@/features/reading-test/stories/tissue";
import { seriesOpenings } from "@/features/reading-test/stories/series-openings";
import { revisedQuestions } from "@/features/reading-test/quality-overrides";
import type {
  ReadingLevel,
  ReadingStory,
  ReadingStoryInput,
} from "@/features/reading-test/types";

/** Reads a published chapter file. The reading test does not keep a second copy. */
function publishedChapterBody(sourcePath: string): string {
  const filePath = path.join(process.cwd(), sourcePath);
  const raw = fs.readFileSync(filePath, "utf8");
  const body = matter(raw).content.trim();
  if (body.length === 0) {
    throw new Error(`${sourcePath}: published English text was not found`);
  }
  return body;
}

const flashSources: readonly ReadingStoryInput[] = flashTests.map((test) => {
  const piece = getFlashPiece(test.slug);
  if (!piece) {
    throw new Error(`${test.slug}: published English text was not found`);
  }

  return {
    slug: piece.slug,
    title: piece.title,
    author: "Takashi Yabe",
    authorSlug: "takashi-yabe",
    language: "en",
    estimatedMinutes: 1,
    body: piece.body,
    questions: test.questions,
  };
});

function flashSource(slug: string): ReadingStoryInput {
  const story = flashSources.find((item) => item.slug === slug);
  if (!story) throw new Error(`${slug}: published English text was not found`);
  return story;
}

const seriesSources: readonly ReadingStoryInput[] = seriesOpenings.map((opening) => ({
  slug: opening.slug,
  title: opening.title,
  seriesTitle: opening.seriesTitle,
  author: "Takashi Yabe",
  authorSlug: "takashi-yabe",
  language: "en",
  estimatedMinutes: 1,
  body: publishedChapterBody(opening.sourcePath),
  questions: opening.questions,
  contentType: opening.contentType,
  ...(opening.continueUrl ? { continueUrl: opening.continueUrl } : {}),
}));

const sources: readonly ReadingStoryInput[] = [
  flashSource("the-day-i-couldnt-find-anyone"),
  flashSource("lost-property"),
  flashSource("after-the-rain"),
  santasBells,
  flashSource("the-silver-thread"),
  sampleStory,
  ...seriesSources,
  tissue,
  rust,
  layers,
  desk,
  entrance,
  stillness,
  theMonsterChapter1,
];

const QUESTION_BANK_MIN = 3;
const QUESTION_BANK_MAX = 100;

function assertQuestion(slug: string, question: ReadingStoryInput["questions"][number]) {
  if (
    question.choices.length < 3 ||
    question.choices.length > 4 ||
    question.choices.filter((choice) => choice === question.correctAnswer).length !== 1
  ) {
    throw new Error(`${slug}: invalid choices for ${question.id}`);
  }
  if (new Set(question.choices).size !== question.choices.length) {
    throw new Error(`${slug}: duplicate choices for ${question.id}`);
  }
}

function assertBank(slug: string, questions: ReadingStoryInput["questions"], label: string) {
  if (questions.length < QUESTION_BANK_MIN || questions.length > QUESTION_BANK_MAX) {
    throw new Error(`${slug}: expected ${QUESTION_BANK_MIN} to ${QUESTION_BANK_MAX} ${label}`);
  }
  if (new Set(questions.map((question) => question.id)).size !== questions.length) {
    throw new Error(`${slug}: duplicate ${label} ids`);
  }
  for (const question of questions) assertQuestion(slug, question);
}

function assertStory(story: ReadingStoryInput) {
  assertBank(story.slug, story.questions, "questions");
  if (story.listeningQuestions) {
    assertBank(story.slug, story.listeningQuestions, "listening questions");
  }

  if (
    story.levelOverride != null &&
    !isReadingLevel(story.levelOverride)
  ) {
    throw new Error(`${story.slug}: levelOverride must be 1 to 5`);
  }

  if (
    story.continueUrl &&
    story.contentType !== "series-opening" &&
    story.contentType !== "series-chapter"
  ) {
    throw new Error(`${story.slug}: a continue URL needs a series chapter`);
  }

}

function isReadingLevel(level: number): level is ReadingLevel {
  return level === 1 || level === 2 || level === 3 || level === 4 || level === 5;
}

function resolveStory(story: ReadingStoryInput): ReadingStory {
  const estimatedMinutes = estimatedReadingMinutes(countEnglishWords(story.body));
  if (story.levelOverride != null) {
    return {
      ...story,
      estimatedMinutes,
      level: story.levelOverride,
      levelSource: "override",
    };
  }

  return {
    ...story,
    estimatedMinutes,
    level: analyzeReadability(story.body).calculatedLevel,
    levelSource: "automatic",
  };
}

const revisedSources = sources.map((story) => ({ ...story, questions: revisedQuestions(story.slug, story.questions) }));
for (const story of revisedSources) assertStory(story);

const stories: readonly ReadingStory[] = revisedSources.map(resolveStory);

export function getReadingStories() {
  return stories;
}

export function getReadingStory(slug: string) {
  return stories.find((story) => story.slug === slug) ?? null;
}

export function getReadingAuthor(slug: string) {
  const works = stories.filter((story) => story.authorSlug === slug);
  const first = works[0];
  if (!first) return null;

  return {
    slug: first.authorSlug,
    name: first.author,
    works: works.map((story) => ({
      slug: story.slug,
      title: story.title,
      seriesTitle: story.seriesTitle,
      href: `/reading-test/${story.slug}`,
    })),
  };
}
