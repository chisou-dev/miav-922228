import { chapterHref } from "@/features/library/catalog";
import type { SeriesChapter } from "@/features/library/catalog";
import { seriesChapterNumberLabel } from "@/features/library/seriesChapterLabel";

type Props = {
  seriesId: string;
  chapters: readonly SeriesChapter[];
};

export function SeriesChapterList({ seriesId, chapters }: Props) {
  return (
    <ul className="mt-6">
      {chapters.map((chapter) => (
        <li key={chapter.pathSlug}>
          <a
            href={chapterHref(seriesId, chapter.pathSlug)}
            className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] py-5 text-[0.92rem] tracking-[0.04em] text-[var(--foreground)] transition-colors duration-300 hover:text-[var(--foreground-muted)]"
          >
            <span>
              {seriesChapterNumberLabel(chapter)}
              <span className="mt-1 block text-[0.8rem] tracking-[0.06em] text-[var(--foreground-muted)] sm:ml-4 sm:mt-0 sm:inline">
                {chapter.title}
              </span>
            </span>
            <span className="shrink-0 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
              →
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
