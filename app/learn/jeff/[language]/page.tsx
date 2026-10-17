import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { JEFF_LANGUAGES, JEFF_LEVELS, JEFF_LEVEL_LABELS, JEFF_LANGUAGE_LABELS, isJeffLanguage, getJeffChapters, jeffChapterHref } from "@/features/jeff/catalog";
import { countWords } from "@/features/jeff/words";

type Props = { params: Promise<{ language: string }> };
export function generateStaticParams() { return JEFF_LANGUAGES.map((language) => ({ language })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { language } = await params;
  return { title: `Jeff — ${isJeffLanguage(language) ? JEFF_LANGUAGE_LABELS[language] : "Language"} | MIAV LEARN` };
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
