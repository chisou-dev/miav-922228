import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { JEFF_LANGUAGES, JEFF_LEVELS, JEFF_LEVEL_LABELS, JEFF_LANGUAGE_LABELS, isJeffLanguage, getJeffChapters, jeffChapterHref } from "@/features/jeff/catalog";
import { countWords } from "@/features/jeff/words";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";

type Props = { params: Promise<{ language: string }> };
export function generateStaticParams() { return JEFF_LANGUAGES.map((language) => ({ language })); }
const languageSeo = {
  en: {
    title: "Jeff — 14 English Story Episodes, Three Levels | MIAV LEARN",
    description: "Read Jeff, a 14-episode original story in American English at beginner, intermediate, or advanced level. Read or listen and answer five comprehension questions per episode.",
    locale: "en_US",
  },
  es: {
    title: "Jeff — 14 episodios en español, tres niveles | MIAV LEARN",
    description: "Lee Jeff, una historia original de 14 episodios en español de España. Tres niveles: inicial, intermedio y avanzado. Lee o escucha y responde a cinco preguntas de comprensión.",
    locale: "es_ES",
  },
  fr: {
    title: "Jeff — 14 épisodes en français, trois niveaux | MIAV LEARN",
    description: "Lisez Jeff, une fiction originale en 14 épisodes en français de France. Trois niveaux : débutant, intermédiaire et avancé. Lisez ou écoutez, puis répondez à cinq questions de compréhension.",
    locale: "fr_FR",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { language } = await params;
  if (!isJeffLanguage(language)) notFound();
  const seo = languageSeo[language];
  return readingTestMetadata({
    title: seo.title,
    description: seo.description,
    path: `/learn/jeff/${language}`,
    locale: seo.locale,
    languageAlternates: {
      "en-US": "/learn/jeff/en",
      "es-ES": "/learn/jeff/es",
      "fr-FR": "/learn/jeff/fr",
      "x-default": "/learn/jeff",
    },
  });
}
export default async function JeffLanguagePage({ params }: Props) {
  const { language } = await params;
  if (!isJeffLanguage(language)) notFound();
  return (
    <ReadingTestFrame eyebrow="MIAV LEARN · Jeff" title={JEFF_LANGUAGE_LABELS[language]} summary="Choose your level and episode. Read or listen, then answer five questions.">
      <p className="mt-5 text-center text-sm"><Link className="underline underline-offset-4" href="/learn/jeff">Change language</Link></p>
      <div className="mx-auto mt-12 max-w-3xl space-y-12">
        {JEFF_LEVELS.map((level) => (
          <section key={level} id={level}>
            <h2 className="text-xl font-medium">{JEFF_LEVEL_LABELS[language][level]}</h2>
            <ol className="mt-5 space-y-4">
              {getJeffChapters(language, level).map((chapter) => (
                <li key={chapter.episode} className="border-b border-[var(--line)] pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{String(chapter.episode).padStart(2,"0")} · {chapter.title}</h3>
                      <p className="mt-1 text-sm text-[var(--foreground-muted)]">{countWords(chapter.body)} words</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <a className="underline underline-offset-4" href={jeffChapterHref(language,level,chapter.episode,"reading")}>Reading</a>
                      <a className="underline underline-offset-4" href={jeffChapterHref(language,level,chapter.episode,"listening")}>Listening</a>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </ReadingTestFrame>
  );
}
