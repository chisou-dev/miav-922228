import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadingSession } from "@/features/reading-test/ReadingSession";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { santaChapterSeo } from "@/features/santas-shelf/seo";
import { SANTA_LEVELS, SANTA_EPISODE_COUNT, isSantaLevel, getSantaChapter, santaChapterHref, santaSessionSlug } from "@/features/santas-shelf/catalog";
import { santaLocalizedChapterHref } from "@/features/santas-shelf/localized";

type Props = { params: Promise<{ level: string; episode: string }> };

export function generateStaticParams() {
  return SANTA_LEVELS.flatMap(level =>
    Array.from({length: SANTA_EPISODE_COUNT}, (_, i) => ({level, episode: String(i+1)}))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { level, episode } = await params;
  if (!isSantaLevel(level) || !/^[1-6]$/.test(episode)) notFound();
  const chapter = getSantaChapter(level, Number(episode));
  if (!chapter) notFound();
  const seo = santaChapterSeo("en", level, chapter.episode, chapter.title);
  return readingTestMetadata({
    title: seo.title,
    description: seo.description,
    path: santaChapterHref(level, chapter.episode),
    languageAlternates: {
      "en-US": santaChapterHref(level, chapter.episode),
      "es-ES": santaLocalizedChapterHref("es", level, chapter.episode),
      "fr-FR": santaLocalizedChapterHref("fr", level, chapter.episode),
    },
  });
}

export default async function SantaReadingPage({ params }: Props) {
  const { level, episode } = await params;
  if (!isSantaLevel(level) || !/^[1-6]$/.test(episode)) notFound();
  const chapter = getSantaChapter(level, Number(episode));
  if (!chapter) notFound();
  return (
    <ReadingSession
      slug={santaSessionSlug(level, chapter.episode)}
      title={chapter.title}
      body={chapter.body}
      questions={chapter.questions}
      language="en"
      continueUrl={chapter.episode < SANTA_EPISODE_COUNT ? santaChapterHref(level, chapter.episode+1) : undefined}
    />
  );
}
