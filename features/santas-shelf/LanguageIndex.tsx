import Link from "next/link";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { countEnglishWords } from "@/features/reading-test/measure";
import { countWords } from "@/features/jeff/words";
import { getSantaChapters, SANTA_LEVELS, santaChapterHref } from "@/features/santas-shelf/catalog";
import {
  SANTA_LANGUAGE_LABELS, SANTA_LOCAL_LEVEL_LABELS, SANTA_TITLES,
  isSantaTranslatedLanguage, getSantaTranslatedChapters,
  santaLocalizedChapterHref, type SantaLanguage
} from "@/features/santas-shelf/localized";

const summaries = {
  en: "Six connected stories. Choose a level and read at your own pace, then answer five questions.",
  es: "Seis capítulos relacionados. Elige tu nivel, lee y responde a cinco preguntas de comprensión.",
  fr: "Six chapitres liés. Choisissez votre niveau, lisez et répondez à cinq questions de compréhension.",
} as const;

export function SantaLanguageIndex({language}: {language: SantaLanguage}) {
  return (
    <ReadingTestFrame
      eyebrow={"MIAV LEARN · READING · " + SANTA_LANGUAGE_LABELS[language]}
      title={SANTA_TITLES[language]}
      summary={summaries[language]}
    >
      <p className="mt-5 text-center text-sm">
        <Link className="underline underline-offset-4" href="/learn/santas-shelf">Change language</Link>
      </p>
      <div className="mx-auto mt-12 max-w-3xl space-y-12">
        {SANTA_LEVELS.map(level => {
          const chapters = isSantaTranslatedLanguage(language)
            ? getSantaTranslatedChapters(language, level)
            : getSantaChapters(level);
          return (
            <section key={level} id={level}>
              <h2 className="text-xl font-medium">{SANTA_LOCAL_LEVEL_LABELS[language][level]}</h2>
              <ol className="mt-5 space-y-4">
                {chapters.map(chapter => (
                  <li key={chapter.episode} className="border-b border-[var(--line)] pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{String(chapter.episode).padStart(2, "0")} · {chapter.title}</h3>
                        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                          {language === "en" ? countEnglishWords(chapter.body) : countWords(chapter.body)} words
                        </p>
                      </div>
                      <Link className="underline underline-offset-4" href={
                        isSantaTranslatedLanguage(language)
                          ? santaLocalizedChapterHref(language, level, chapter.episode)
                          : santaChapterHref(level, chapter.episode)
                      }>Reading</Link>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
        <p className="text-center text-sm text-[var(--foreground-muted)]">
          Levels are editorial guides, not formal language assessments.
        </p>
      </div>
    </ReadingTestFrame>
  );
}
