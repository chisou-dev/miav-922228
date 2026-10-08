import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getFlashPiece } from "@/features/library/catalog";
import { countEnglishWords, estimatedReadingMinutes } from "@/features/reading-test/measure";
import { analyzeReadability } from "@/features/reading-test/readability";
import { flashTests } from "@/features/reading-test/stories/flash-tests";
import { santasBells } from "@/features/reading-test/stories/santas-bells";
import { sampleStory } from "@/features/reading-test/stories/sample-story";
import { seriesOpenings } from "@/features/reading-test/stories/series-openings";
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
];

function assertStory(story: ReadingStoryInput) {
  if (story.questions.length < 3 || story.questions.length > 5) {
    throw new Error(`${story.slug}: expected 3 to 5 questions`);
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

  for (const question of story.questions) {
    if (
      question.choices.length < 3 ||
      question.choices.length > 4 ||
      !question.choices.includes(question.correctAnswer)
    ) {
      throw new Error(`${story.slug}: invalid choices for ${question.id}`);
    }
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

for (const story of sources) assertStory(story);

const stories: readonly ReadingStory[] = sources.map(resolveStory);

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
