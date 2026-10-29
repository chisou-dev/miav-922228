import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadingSession } from "@/features/reading-test/ReadingSession";
import { ListeningSession } from "@/features/listening-test/ListeningSession";
import { JEFF_LANGUAGES, JEFF_LEVELS, getJeffChapter, isJeffLanguage, isJeffLevel, isJeffMode, jeffSessionSlug, jeffChapterHref } from "@/features/jeff/catalog";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";

type Props = { params: Promise<{ language: string; level: string; episode: string; mode: string }> };
export function generateStaticParams() {
  return JEFF_LANGUAGES.flatMap((language) => JEFF_LEVELS.flatMap((level) =>
    Array.from({ length: 14 }, (_, index) => ["reading", "listening"].map((mode) => ({ language, level, episode: String(index + 1), mode }))).flat()));
}
const searchLanguage = {
  en: { name: "English", locale: "en_US" },
  es: { name: "Spanish", locale: "es_ES" },
  fr: { name: "French", locale: "fr_FR" },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { language, level, episode, mode } = await params;
  if (!isJeffLanguage(language) || !isJeffLevel(level) || !isJeffMode(mode) || !/^[0-9]{1,2}$/.test(episode)) notFound();
  const chapter = getJeffChapter(language, level, Number(episode));
  if (!chapter) notFound();

  const label = mode === "reading" ? "Read" : "Listen to";
  const action = mode === "reading" ? "Read the story" : "Listen to the story";
  const description = `${label} "${chapter.title}", episode ${chapter.episode} of Jeff, a 14-part original fiction series in ${searchLanguage[language].name} (${level} edition). ${action}, then answer five comprehension questions.`;
  return readingTestMetadata({
    title: `${chapter.title} — Jeff Episode ${chapter.episode} · ${searchLanguage[language].name} ${level} ${mode} | MIAV LEARN`,
    description,
    path: jeffChapterHref(language, level, chapter.episode, mode),
    locale: searchLanguage[language].locale,
    languageAlternates: {
      "en-US": jeffChapterHref("en", level, chapter.episode, mode),
      "es-ES": jeffChapterHref("es", level, chapter.episode, mode),
      "fr-FR": jeffChapterHref("fr", level, chapter.episode, mode),
      "x-default": jeffChapterHref("en", level, chapter.episode, mode),
    },
  });
}
export default async function JeffEpisodePage({ params }: Props) {
  const { language, level, episode, mode } = await params;
  if (!isJeffLanguage(language) || !isJeffLevel(level) || !isJeffMode(mode)) notFound();
  if (!/^\d{1,2}$/.test(episode)) notFound();
  const chapter = getJeffChapter(language, level, Number(episode));
  if (!chapter) notFound();
  const slug = jeffSessionSlug(language, level, chapter.episode);
  const nextChapter = chapter.episode < 14 ? jeffChapterHref(language, level, chapter.episode + 1, mode) : undefined;
  if (mode === "reading") return <ReadingSession slug={slug} title={chapter.title} body={chapter.body} questions={chapter.questions} continueUrl={nextChapter} language={language} />;
  return <ListeningSession slug={slug} title={chapter.title} body={chapter.body} questions={chapter.questions} continueUrl={nextChapter} language={language} />;
}
