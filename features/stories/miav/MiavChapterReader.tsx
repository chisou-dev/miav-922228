"use client";

import { useEffect } from "react";
import { ReadingLayout } from "@/features/library/ReadingLayout";
import { PartTwoNotice } from "@/features/stories/miav/PartTwoNotice";
import { syncReaderMemoryOnChapterView } from "@/features/stories/miav/readerMemorySync";

export type MiavChapterNavItem = {
  number: number;
  slug: string;
  title: string;
  pathSlug?: string;
};

type Props = {
  chapter: MiavChapterNavItem & {
    presentation: "reading" | "threshold";
  };
  bodyHtml: string;
  previous: MiavChapterNavItem | null;
  next: MiavChapterNavItem | null;
  linkMode: "archive" | "library";
  seriesId?: string;
  listHref: string;
  listLabel: string;
  hideNextOnThreshold?: boolean;
};

function chapterLink(
  item: MiavChapterNavItem,
  linkMode: "archive" | "library",
  seriesId?: string,
): string {
  if (linkMode === "library") {
    return `/stories/${seriesId ?? "miav-922228"}/${item.pathSlug ?? item.slug}`;
  }
  return `/chapters/${item.slug}`;
}

function ReadingOrderHint({
  chapterNumber,
  chapterOneHref,
}: {
  chapterNumber: number;
  chapterOneHref: string;
}) {
  if (chapterNumber <= 1) return null;

  return (
    <p className="mt-10 text-[0.72rem] leading-relaxed tracking-[0.06em] text-[var(--foreground-muted)] sm:mt-12">
      This is Chapter {chapterNumber} of MIAV-922228.{" "}
      <a
        href={chapterOneHref}
        className="underline decoration-[var(--line)] underline-offset-[0.35em] transition-colors duration-300 hover:text-[var(--foreground)] hover:decoration-[var(--foreground-muted)]"
      >
        Start from Chapter 1 →
      </a>
    </p>
  );
}

export function MiavChapterReader({
  chapter,
  bodyHtml,
  previous,
  next,
  linkMode,
  seriesId,
  listHref,
  listLabel,
  hideNextOnThreshold = true,
}: Props) {
  useEffect(() => {
    syncReaderMemoryOnChapterView(chapter.number);
  }, [chapter.number]);

  const isThreshold = chapter.presentation === "threshold";
  const showNext = Boolean(next) && !(hideNextOnThreshold && isThreshold);
  const showPartTwo = chapter.slug === "photograph";
  const chapterOneHref =
    linkMode === "library"
      ? `/stories/${seriesId ?? "miav-922228"}/chapter-1`
      : "/chapters/conversation";

  return (
    <>
      <ReadingOrderHint
        chapterNumber={chapter.number}
        chapterOneHref={chapterOneHref}
      />

      <div className="mt-10 sm:mt-12">
        <ReadingLayout label="Chapter text">
          <article
            className="chapter-prose"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </ReadingLayout>
      </div>

      {showPartTwo ? <PartTwoNotice /> : null}

      <nav
        aria-label="Chapter navigation"
        className="mt-20 border-t border-[var(--line)] pt-10 sm:mt-28 sm:pt-14"
      >
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8">
          <div className="min-h-[3.5rem]">
            {previous ? (
              <a
                href={chapterLink(previous, linkMode, seriesId)}
                className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                  Previous
                </span>
                <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                  Chapter {previous.number}｜{previous.title}
                </span>
              </a>
            ) : (
              <span className="block text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-35">
                Previous
              </span>
            )}
          </div>

          <div className="min-h-[3.5rem] sm:text-right">
            {showNext && next ? (
              <a
                href={chapterLink(next, linkMode, seriesId)}
                className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                  Next
                </span>
                <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                  Chapter {next.number}｜{next.title}
                </span>
              </a>
            ) : (
              <span className="block text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-35">
                Next
              </span>
            )}
          </div>
        </div>

        <p className="mt-14 text-center sm:mt-16">
          <a
            href={listHref}
            className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:text-[var(--foreground)]"
          >
            {listLabel}
          </a>
        </p>
      </nav>
    </>
  );
}
