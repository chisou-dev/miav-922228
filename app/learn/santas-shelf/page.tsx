import Link from "next/link";
import type { Metadata } from "next";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { SANTA_LANGUAGES, SANTA_LANGUAGE_LABELS, SANTA_TITLES } from "@/features/santas-shelf/localized";
import { SANTA_SITE_DESCRIPTION } from "@/features/santas-shelf/seo";

export const metadata: Metadata = readingTestMetadata({
  title: "Santa's Shelf — Six Stories in English, Spanish & French | MIAV LEARN",
  description: SANTA_SITE_DESCRIPTION,
  path: "/learn/santas-shelf",
  languageAlternates: {
    "en-US": "/learn/santas-shelf/en",
    "es-ES": "/learn/santas-shelf/es",
    "fr-FR": "/learn/santas-shelf/fr",
    "x-default": "/learn/santas-shelf",
  },
});

export default function SantasShelfIndex() {
  return (
    <ReadingTestFrame
      eyebrow="MIAV LEARN · READING"
      title="Santa's Shelf"
      summary="Six connected stories about Santa, the toys he finds, and a shelf where each toy has a place."
    >
      <section className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-center text-lg">Choose a language</h2>
        <ul className="mt-7 grid gap-4 sm:grid-cols-3">
          {SANTA_LANGUAGES.map(language => (
            <li key={language}>
              <Link href={"/learn/santas-shelf/" + language}
                className="block border border-[var(--line)] px-5 py-8 text-center transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]">
                <span className="block text-lg">{SANTA_LANGUAGE_LABELS[language]}</span>
                <span className="mt-2 block text-sm text-[var(--foreground-muted)]">{SANTA_TITLES[language]}</span>
                <span className="mt-3 block text-sm text-[var(--foreground-muted)]">3 levels · 6 chapters</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-sm text-[var(--foreground-muted)]">
          Choose a level, read at your pace, then answer five questions for each chapter.
        </p>
      </section>
    </ReadingTestFrame>
  );
}
