import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadingSession } from "@/features/reading-test/ReadingSession";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import {
  SANTA_LEVELS, SANTA_EPISODE_COUNT, isSantaLevel, santaChapterHref
} from "@/features/santas-shelf/catalog";
import {
  SANTA_TITLES, getSantaTranslatedChapter, santaLocalizedChapterHref,
  santaLocalizedSessionSlug, type SantaTranslatedLanguage
} from "@/features/santas-shelf/localized";

export function santaTranslatedParams() {
  return SANTA_LEVELS.flatMap(level =>
    Array.from({ length: SANTA_EPISODE_COUNT }, (_, i) => ({
      level, episode: String(i + 1)
    }))
  );
}

function validatedChapter(language: SantaTranslatedLanguage, level: string, episode: string) {
  if (!isSantaLevel(level) || !/^[1-6]$/.test(episode)) notFound();
  const chapter = getSantaTranslatedChapter(language, level, Number(episode));
  if (!chapter) notFound();
  return { level, chapter };
}

export function santaTranslatedMetadata(
  language: SantaTranslatedLanguage,
  level: string,
  episode: string
): Metadata {
  const validated = validatedChapter(language, level, episode);
  const { chapter } = validated;
  const name = SANTA_TITLES[language];
  return readingTestMetadata({
    title: chapter.title + " — " + name + " · " + level + " Reading | MIAV LEARN",
    description: name + ": " + chapter.title + ", chapter " + chapter.episode + " of six, " + level + " reading edition. Five comprehension questions.",
    path: santaLocalizedChapterHref(language, validated.level, chapter.episode),
    locale: language === "es" ? "es_ES" : "fr_FR",
    languageAlternates: {
      "en-US": santaChapterHref(validated.level, chapter.episode),
      "es-ES": santaLocalizedChapterHref("es", validated.level, chapter.episode),
      "fr-FR": santaLocalizedChapterHref("fr", validated.level, chapter.episode),
    },
  });
}

export function SantaTranslatedReaderPage({
  language, level, episode
}: {
  language: SantaTranslatedLanguage;
  level: string;
  episode: string;
}) {
  const { level: resolvedLevel, chapter } = validatedChapter(language, level, episode);
  return (
    <ReadingSession
      slug={santaLocalizedSessionSlug(language, resolvedLevel, chapter.episode)}
      title={chapter.title}
      body={chapter.body}
      questions={chapter.questions}
      language={language}
      continueUrl={
        chapter.episode < SANTA_EPISODE_COUNT
          ? santaLocalizedChapterHref(language, resolvedLevel, chapter.episode + 1)
          : undefined
      }
    />
  );
}
