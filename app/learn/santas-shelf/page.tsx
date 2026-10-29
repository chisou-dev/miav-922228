import type { Metadata } from "next";
import Link from "next/link";
import { ReadingTestFrame } from "@/features/reading-test/ReadingTestFrame";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { countEnglishWords } from "@/features/reading-test/measure";
import { getSantaChapters, SANTA_LEVELS, SANTA_LEVEL_LABELS, santaChapterHref } from "@/features/santas-shelf/catalog";

export const metadata: Metadata = readingTestMetadata({
  title: "Santa's Shelf — Six Stories, Three English Levels | MIAV LEARN",
  description: "Read Santa's Shelf, six connected stories in American English at beginner, intermediate, or advanced level. Read each chapter and try five comprehension questions.",
  path: "/learn/santas-shelf",
});

export default function SantasShelfIndex() {
  return (
    <ReadingTestFrame
      eyebrow="MIAV LEARN · READING"
      title="Santa's Shelf"
      summary="Six connected stories about Santa, the toys he finds, and a shelf where each toy has a place."
    >
      <div className="mx-auto mt-12 max-w-3xl space-y-12">
        {SANTA_LEVELS.map((level) => (
          <section key={level} id={level}>
            <h2 className="text-xl font-medium">{SANTA_LEVEL_LABELS[level]}</h2>
            <ol className="mt-5 space-y-4">
              {getSantaChapters(level).map((chapter) => (
                <li key={chapter.episode} className="border-b border-[var(--line)] pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{String(chapter.episode).padStart(2,"0")} · {chapter.title}</h3>
                      <p className="mt-1 text-sm text-[var(--foreground-muted)]">{countEnglishWords(chapter.body)} words</p>
                    </div>
                    <Link className="underline underline-offset-4" href={santaChapterHref(level, chapter.episode)}>
                      Reading
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
        <p className="text-center text-sm text-[var(--foreground-muted)]">
          Levels are editorial guides, not formal language assessments.
        </p>
      </div>
    </ReadingTestFrame>
  );
}
