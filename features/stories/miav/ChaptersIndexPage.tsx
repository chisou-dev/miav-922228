import { SiteShell } from "@/features/shared/SiteShell";
import {
  getAllChapters,
  getMaxChapterNumber,
} from "@/features/stories/miav/chapters";
import { getContentLocale } from "@/features/shared/locale";
import { MiavChapterArchiveList } from "@/features/stories/miav/MiavChapterList";
import { readUnlockedThrough } from "@/features/stories/miav/chapterUnlockCookie";

function formatArchiveDate(value: string | null): string {
  if (!value) return "Date unrecorded";

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function ChaptersIndexPage() {
  const locale = getContentLocale();
  const chapters = getAllChapters(locale);
  const unlockedThrough = await readUnlockedThrough(getMaxChapterNumber(locale));

  return (
    <SiteShell>
      <main className="pb-36 sm:pb-48">
        <section className="py-28 sm:py-36">
          <p className="text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
            Record
          </p>
          <h1 className="mt-10 max-w-xl text-[clamp(1.9rem,5vw,2.85rem)] font-medium leading-[1.25] tracking-[0.06em] text-[var(--foreground)]">
            Chapter Archive
          </h1>
          <p className="mt-12 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-14 sm:text-base sm:leading-[2.1]">
            A vault of chapters from MIAV-922228.
            <br />
            Each entry is a record in the work—held apart, readable in its own
            hour.
          </p>
        </section>

        <MiavChapterArchiveList
          unlockedThrough={unlockedThrough}
          chapters={chapters.map((chapter) => ({
            number: chapter.number,
            slug: chapter.slug,
            title: chapter.title,
            summary: chapter.summary,
            publishedLabel: formatArchiveDate(chapter.published),
            publishedDateTime: chapter.published ?? undefined,
          }))}
        />

        <p className="mt-8 border-t border-[var(--line)] pt-16 text-[0.72rem] leading-relaxed tracking-[0.12em] text-[var(--foreground-muted)] sm:pt-20">
          End of current archive — further chapters will be entered as they are
          recorded.
        </p>
      </main>
    </SiteShell>
  );
}
