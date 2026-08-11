"use client";

import { useEffect } from "react";
import { ReadingLayout } from "@/features/library/ReadingLayout";
import { PartTwoNotice } from "@/features/stories/miav/PartTwoNotice";
import { MIAV_PART_TWO_KINDLE_URL } from "@/features/stories/miav/books";
import {
  CHAPTER_EDITION_COPY,
  type ChapterEdition,
  chapterNumberLabel,
  chapterPath,
} from "@/features/stories/miav/edition";
import { syncReaderMemoryOnChapterView } from "@/features/stories/miav/readerMemorySync";
import { ReceiveChapter14Signal } from "@/features/signals/ReceiveChapter14Signal";

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
  edition?: ChapterEdition;
  chapterOneHref?: string;
};

function chapterLink(
  item: MiavChapterNavItem,
  linkMode: "archive" | "library",
  seriesId: string | undefined,
  edition: ChapterEdition,
): string {
  if (linkMode === "library") {
    return `/stories/${seriesId ?? "miav-922228"}/${item.pathSlug ?? item.slug}`;
  }
  return chapterPath(item.slug, edition);
}

function ReadingOrderHint({
  chapterNumber,
  chapterOneHref,
  edition,
}: {
  chapterNumber: number;
  chapterOneHref: string;
  edition: ChapterEdition;
}) {
  if (chapterNumber <= 1) return null;
  const copy = CHAPTER_EDITION_COPY[edition];

  return (
    <p className="mt-10 text-[0.72rem] leading-relaxed tracking-[0.06em] text-[var(--foreground-muted)] sm:mt-12">
      {copy.readingOrder(chapterNumber)}{" "}
      <a
        href={chapterOneHref}
        className="underline decoration-[var(--line)] underline-offset-[0.35em] transition-colors duration-300 hover:text-[var(--foreground)] hover:decoration-[var(--foreground-muted)]"
      >
        {copy.startFromChapterOne}
      </a>
    </p>
  );
}

/** French Chapter XIV — Part II continues; French edition not yet on sale. */
function FrenchPartTwoNotice() {
  return (
    <aside
      className="mt-16 border-t border-[var(--line)] pt-10 sm:mt-20 sm:pt-12"
      aria-label="Partie II"
    >
      <p className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
        L’histoire continue
      </p>
      <p className="mt-5 text-[0.72rem] tracking-[0.18em] text-[var(--foreground-muted)]">
        MIAV-922228
      </p>
      <h2 className="mt-3 text-[1.15rem] font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-[1.25rem]">
        PARTIE II · HOMEWARD
      </h2>
      <p className="mt-5 max-w-md text-[0.95rem] leading-[1.9] tracking-[0.01em] text-[var(--foreground-muted)]">
        Édition française bientôt disponible.
      </p>
      <p className="mt-8">
        <a
          href={MIAV_PART_TWO_KINDLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
        >
          English Edition available on Kindle →
        </a>
      </p>
    </aside>
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
  edition = "en",
  chapterOneHref,
}: Props) {
  useEffect(() => {
    syncReaderMemoryOnChapterView(chapter.number);
  }, [chapter.number]);

  const copy = CHAPTER_EDITION_COPY[edition];
  const isThreshold = chapter.presentation === "threshold";
  const showNext = Boolean(next) && !(hideNextOnThreshold && isThreshold);
  const showPartTwo = chapter.slug === "photograph" && edition === "en";
  const showFrenchPartTwo = chapter.slug === "photograph" && edition === "fr";
  const resolvedChapterOneHref =
    chapterOneHref ??
    (linkMode === "library"
      ? `/stories/${seriesId ?? "miav-922228"}/chapter-1`
      : chapterPath("conversation", edition));

  return (
    <>
      <ReadingOrderHint
        chapterNumber={chapter.number}
        chapterOneHref={resolvedChapterOneHref}
        edition={edition}
      />

      <div className="mt-10 sm:mt-12">
        <ReadingLayout label={copy.chapterTextLabel}>
          <article
            className="chapter-prose"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </ReadingLayout>
      </div>

      {chapter.slug === "photograph" ? <ReceiveChapter14Signal /> : null}

      {showPartTwo ? <PartTwoNotice /> : null}
      {showFrenchPartTwo ? <FrenchPartTwoNotice /> : null}

      <nav
        aria-label={
          edition === "fr" ? "Navigation des chapitres" : "Chapter navigation"
        }
        className="mt-20 border-t border-[var(--line)] pt-10 sm:mt-28 sm:pt-14"
      >
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8">
          <div className="min-h-[3.5rem]">
            {previous ? (
              <a
                href={chapterLink(previous, linkMode, seriesId, edition)}
                className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                  {copy.previous}
                </span>
                <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                  {chapterNumberLabel(previous.number, edition)}｜
                  {previous.title}
                </span>
              </a>
            ) : (
              <span className="block text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-35">
                {copy.previous}
              </span>
            )}
          </div>

          <div className="min-h-[3.5rem] sm:text-right">
            {showNext && next ? (
              <a
                href={chapterLink(next, linkMode, seriesId, edition)}
                className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                  {copy.next}
                </span>
                <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                  {chapterNumberLabel(next.number, edition)}｜{next.title}
                </span>
              </a>
            ) : (
              <span className="block text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-35">
                {copy.next}
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
