"use client";

import { useSyncExternalStore } from "react";
import { readReaderMemoryThroughChapter } from "@/features/stories/miav/readerMemorySync";
import type { MiavChapterNavItem } from "@/features/stories/miav/MiavChapterReader";
import { sfSectionClass, sfSectionVariantAt } from "@/features/shared/SfSection";

type ListStatus = "available" | "read";

function statusLabel(status: ListStatus): string {
  return status === "read" ? "READ" : "AVAILABLE";
}

function listStatus(
  chapterNumber: number,
  readThrough: number,
): ListStatus {
  if (readThrough > 0 && chapterNumber <= readThrough) return "read";
  return "available";
}

function subscribeReaderMemory() {
  return () => {};
}

function useReadThroughChapter(): number {
  return useSyncExternalStore(
    subscribeReaderMemory,
    readReaderMemoryThroughChapter,
    () => 0,
  );
}

type ArchiveProps = {
  chapters: readonly (MiavChapterNavItem & {
    summary: string;
    publishedLabel: string;
    publishedDateTime: string | undefined;
  })[];
};

export function MiavChapterArchiveList({ chapters }: ArchiveProps) {
  const readThrough = useReadThroughChapter();

  return (
    <ol className="list-none">
      {chapters.map((chapter, index) => {
        const status = listStatus(chapter.number, readThrough);
        const href = `/chapters/${chapter.slug}`;

        return (
          <li
            key={chapter.slug}
            className={sfSectionClass(
              sfSectionVariantAt(index),
              "py-24 sm:py-32",
            )}
          >
            <article>
              <p className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
                <span>
                  Chapter {String(chapter.number).padStart(2, "0")}
                </span>
                <span aria-label={`Status: ${statusLabel(status)}`}>
                  {statusLabel(status)}
                </span>
              </p>

              <h2 className="mt-6 text-[1.45rem] font-medium tracking-[0.05em] text-[var(--foreground)] sm:mt-8 sm:text-[1.75rem] sm:tracking-[0.06em]">
                <a
                  href={href}
                  className="transition-opacity duration-300 hover:opacity-80"
                >
                  {chapter.title}
                </a>
              </h2>

              <p className="mt-5 text-[0.78rem] tracking-[0.12em] text-[var(--foreground-muted)] sm:mt-6">
                <time dateTime={chapter.publishedDateTime}>
                  {chapter.publishedLabel}
                </time>
              </p>

              <p className="mt-10 max-w-lg text-[0.95rem] leading-[2.05] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.15]">
                {chapter.summary}
              </p>

              <p className="mt-14 sm:mt-16">
                <a
                  href={href}
                  className="text-[0.78rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
                >
                  Open record
                </a>
              </p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

type SeriesListProps = {
  chapters: readonly MiavChapterNavItem[];
  seriesId: string;
};

export function MiavSeriesChapterList({
  chapters,
  seriesId,
}: SeriesListProps) {
  const readThrough = useReadThroughChapter();

  return (
    <ul className="mt-6">
      {chapters.map((chapter) => {
        const status = listStatus(chapter.number, readThrough);
        const href = `/stories/${seriesId}/${chapter.pathSlug ?? chapter.slug}`;
        const label = statusLabel(status);

        return (
          <li key={chapter.pathSlug ?? chapter.slug}>
            <a
              href={href}
              className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] py-5 text-[0.92rem] tracking-[0.04em] text-[var(--foreground)] transition-colors duration-300 hover:text-[var(--foreground-muted)]"
            >
              <span>
                Chapter {chapter.number}
                <span className="mt-1 block text-[0.8rem] tracking-[0.06em] text-[var(--foreground-muted)] sm:ml-4 sm:mt-0 sm:inline">
                  {chapter.title}
                </span>
              </span>
              <span className="shrink-0 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                {label}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
