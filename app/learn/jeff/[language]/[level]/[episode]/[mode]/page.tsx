import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadingSession } from "@/features/reading-test/ReadingSession";
import { ListeningSession } from "@/features/listening-test/ListeningSession";
import { JEFF_LANGUAGES, JEFF_LEVELS, getJeffChapter, isJeffLanguage, isJeffLevel, isJeffMode, jeffSessionSlug, jeffChapterHref } from "@/features/jeff/catalog";

type Props = { params: Promise<{ language: string; level: string; episode: string; mode: string }> };
export function generateStaticParams() {
  return JEFF_LANGUAGES.flatMap((language) => JEFF_LEVELS.flatMap((level) =>
    Array.from({ length: 14 }, (_, index) => ["reading", "listening"].map((mode) => ({ language, level, episode: String(index + 1), mode }))).flat()));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { language, level, episode, mode } = await params;
  return { title: `Jeff ${episode} — ${language}/${level} ${mode} | MIAV LEARN` };
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
