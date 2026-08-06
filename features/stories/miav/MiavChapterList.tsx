"use client";

import { useEffect, useState } from "react";
import {
  FREE_THROUGH_CHAPTER,
  loadChapterProgress,
  type ChapterProgressState,
} from "@/features/stories/miav/chapterProgress";
import type { MiavChapterNavItem } from "@/features/stories/miav/MiavChapterReader";

type ListStatus = "locked" | "available" | "read";

function statusLabel(status: ListStatus): string {
  switch (status) {
    case "locked":
      return "LOCKED";
    case "read":
      return "READ";
    default:
      return "AVAILABLE";
  }
}

function listStatus(
  chapterNumber: number,
  unlockedThrough: number,
  progress: ChapterProgressState | null,
): ListStatus {
  if (
    chapterNumber > FREE_THROUGH_CHAPTER &&
    chapterNumber > unlockedThrough
  ) {
    return "locked";
  }
  if (progress?.completedChapters.includes(chapterNumber)) {
    return "read";
  }
  return "available";
}

type ArchiveProps = {
  unlockedThrough: number;
  chapters: readonly (MiavChapterNavItem & {
    summary: string;
    publishedLabel: string;
    publishedDateTime: string | undefined;
  })[];
};

export function MiavChapterArchiveList({
  chapters,
  unlockedThrough,
}: ArchiveProps) {
  const [progress, setProgress] = useState<ChapterProgressState | null>(null);

  useEffect(() => {
    setProgress(loadChapterProgress());
  }, []);

  return (
    <ol className="list-none">
      {chapters.map((chapter) => {
        const status = listStatus(chapter.number, unlockedThrough, progress);
        const locked = status === "locked";
        const href = `/chapters/${chapter.slug}`;

        return (
          <li
            key={chapter.slug}
            className="border-t border-[var(--line)] py-24 sm:py-32"
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
                {locked ? (
                  <span>
                    {chapter.title}
                    <span className="mt-2 block text-[0.78rem] tracking-[0.14em] text-[var(--foreground-muted)] sm:mt-0 sm:ml-3 sm:inline">
                      — LOCKED
                    </span>
                  </span>
                ) : (
                  <a
                    href={href}
                    className="transition-opacity duration-300 hover:opacity-80"
                  >
                    {chapter.title}
                  </a>
                )}
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
                {locked ? (
                  <span className="text-[0.78rem] tracking-[0.14em] text-[var(--foreground-muted)]">
                    Locked — read earlier chapters to unlock
                  </span>
                ) : (
                  <a
                    href={href}
                    className="text-[0.78rem] tracking-[0.14em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
                  >
                    Open record
                  </a>
                )}
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
  unlockedThrough: number;
};

export function MiavSeriesChapterList({
  chapters,
  seriesId,
  unlockedThrough,
}: SeriesListProps) {
  const [progress, setProgress] = useState<ChapterProgressState | null>(null);

  useEffect(() => {
    setProgress(loadChapterProgress());
  }, []);

  return (
    <ul className="mt-6">
      {chapters.map((chapter) => {
        const status = listStatus(chapter.number, unlockedThrough, progress);
        const locked = status === "locked";
        const href = `/stories/${seriesId}/${chapter.pathSlug ?? chapter.slug}`;
        const label = statusLabel(status);

        if (locked) {
          return (
            <li
              key={chapter.pathSlug ?? chapter.slug}
              className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] py-5 text-[0.92rem] tracking-[0.04em] text-[var(--foreground-muted)]"
            >
              <span>
                Chapter {chapter.number}
                <span className="mt-1 block text-[0.8rem] tracking-[0.06em] sm:ml-4 sm:mt-0 sm:inline">
                  {chapter.title}
                </span>
              </span>
              <span className="shrink-0 text-[0.72rem] tracking-[0.12em]">
                {label}
              </span>
            </li>
          );
        }

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
