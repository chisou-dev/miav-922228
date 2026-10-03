import { ReadingLayout } from "@/features/library/ReadingLayout";
import { chapterHref } from "@/features/library/catalog";
import { seriesChapterNumberLabel } from "@/features/library/seriesChapterLabel";
import type { SeriesChapter } from "@/features/library/catalog";

export type SeriesChapterNavItem = Pick<
  SeriesChapter,
  "number" | "title" | "pathSlug" | "finalChapter"
>;

type Props = {
  bodyHtml: string;
  previous: SeriesChapterNavItem | null;
  next: SeriesChapterNavItem | null;
  seriesId: string;
  listHref: string;
  listLabel: string;
};

function navLabel(chapter: SeriesChapterNavItem): string {
  return `${seriesChapterNumberLabel(chapter)}｜${chapter.title}`;
}

export function SeriesChapterReader({
  bodyHtml,
  previous,
  next,
  seriesId,
  listHref,
  listLabel,
}: Props) {
  return (
    <>
      <div className="mt-10 sm:mt-12">
        <ReadingLayout label="Chapter text">
          <article
            className="chapter-prose"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </ReadingLayout>
      </div>

      <nav
        aria-label="Chapter navigation"
        className="mt-20 border-t border-[var(--line)] pt-10 sm:mt-28 sm:pt-14"
      >
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8">
          <div className="min-h-[3.5rem]">
            {previous ? (
              <a
                href={chapterHref(seriesId, previous.pathSlug)}
                className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                  Previous
                </span>
                <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                  {navLabel(previous)}
                </span>
              </a>
            ) : (
              <span className="block text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-35">
                Previous
              </span>
            )}
          </div>

          <div className="min-h-[3.5rem] sm:text-right">
            {next ? (
              <a
                href={chapterHref(seriesId, next.pathSlug)}
                className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                  Next
                </span>
                <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                  {navLabel(next)}
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
