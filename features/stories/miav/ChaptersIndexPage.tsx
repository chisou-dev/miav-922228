import Image from "next/image";
import { SiteShell } from "@/features/shared/SiteShell";
import { SfSection } from "@/features/shared/SfSection";
import { getAllChapters } from "@/features/stories/miav/chapters";
import { getContentLocaleFromRequest } from "@/features/shared/locale";
import { MiavChapterArchiveList } from "@/features/stories/miav/MiavChapterList";
import { MIAV_OG_IMAGE } from "@/features/stories/miav/miavVisual";
import { LibraryBreadcrumbs } from "@/features/library/LibraryBreadcrumbs";
import { BreadcrumbJsonLd } from "@/features/library/jsonLd";
import { miavChapterBreadcrumbs } from "@/features/stories/miav/chapterSeo";

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
  const locale = await getContentLocaleFromRequest();
  const chapters = getAllChapters(locale);
  const breadcrumbs = miavChapterBreadcrumbs();

  return (
    <SiteShell>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <main className="pb-36 sm:pb-48">
        <LibraryBreadcrumbs items={breadcrumbs} />
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

          <figure className="mt-16 sm:mt-20">
            <div className="overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--background)]">
              <Image
                src={MIAV_OG_IMAGE.path}
                alt={MIAV_OG_IMAGE.alt}
                width={MIAV_OG_IMAGE.width}
                height={MIAV_OG_IMAGE.height}
                className="h-auto w-full"
                sizes="(max-width: 768px) 100vw, 760px"
                priority
              />
            </div>
            <figcaption className="sr-only">
              Representative visual for the literary science fiction work
              MIAV-922228.
            </figcaption>
          </figure>
        </section>

        <MiavChapterArchiveList
          chapters={chapters.map((chapter) => ({
            number: chapter.number,
            slug: chapter.slug,
            title: chapter.title,
            summary: chapter.summary,
            publishedLabel: formatArchiveDate(chapter.published),
            publishedDateTime: chapter.published ?? undefined,
          }))}
        />

        <SfSection variant="terminal" className="mt-8 pt-16 sm:pt-20">
          <p className="text-[0.72rem] leading-relaxed tracking-[0.12em] text-[var(--foreground-muted)]">
            End of current archive — further chapters will be entered as they are
            recorded.
          </p>
        </SfSection>
      </main>
    </SiteShell>
  );
}
