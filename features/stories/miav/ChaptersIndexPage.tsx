import Image from "next/image";
import { SiteShell } from "@/features/shared/SiteShell";
import { SfSection } from "@/features/shared/SfSection";
import { getAllChapters } from "@/features/stories/miav/chapters";
import {
  CHAPTER_EDITION_COPY,
  type ChapterEdition,
  editionToContentLocale,
} from "@/features/stories/miav/edition";
import { EditionSwitcher } from "@/features/stories/miav/EditionSwitcher";
import { MiavChapterArchiveList } from "@/features/stories/miav/MiavChapterList";
import { MIAV_OG_IMAGE } from "@/features/stories/miav/miavVisual";
import { LibraryBreadcrumbs } from "@/features/library/LibraryBreadcrumbs";
import { BreadcrumbJsonLd } from "@/features/library/jsonLd";
import { miavChapterBreadcrumbs } from "@/features/stories/miav/chapterSeo";

function formatArchiveDate(
  value: string | null,
  edition: ChapterEdition,
  unrecorded: string,
): string {
  if (!value) return unrecorded;

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(edition === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

type Props = {
  edition?: ChapterEdition;
};

export async function ChaptersIndexPage({ edition = "en" }: Props) {
  const locale = editionToContentLocale(edition);
  const chapters = getAllChapters(locale);
  const breadcrumbs = miavChapterBreadcrumbs(edition);
  const copy = CHAPTER_EDITION_COPY[edition];
  const [lead, ...leadRest] = copy.archiveLead.split("\n");

  return (
    <SiteShell>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <main className="pb-36 sm:pb-48">
        <LibraryBreadcrumbs items={breadcrumbs} />
        <section className="py-28 sm:py-36">
          <p className="text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
            {copy.archiveEyebrow}
          </p>
          <h1 className="mt-10 max-w-xl text-[clamp(1.9rem,5vw,2.85rem)] font-medium leading-[1.25] tracking-[0.06em] text-[var(--foreground)]">
            {copy.archiveTitle}
          </h1>
          <EditionSwitcher edition={edition} />
          <p className="mt-12 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-14 sm:text-base sm:leading-[2.1]">
            {lead}
            {leadRest.length > 0 ? (
              <>
                <br />
                {leadRest.join(" ")}
              </>
            ) : null}
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
          edition={edition}
          openRecordLabel={copy.openRecord}
          chapters={chapters.map((chapter) => ({
            number: chapter.number,
            slug: chapter.slug,
            title: chapter.title,
            summary: chapter.summary,
            publishedLabel: formatArchiveDate(
              chapter.published,
              edition,
              copy.dateUnrecorded,
            ),
            publishedDateTime: chapter.published ?? undefined,
          }))}
        />

        <SfSection variant="terminal" className="mt-8 pt-16 sm:pt-20">
          <p className="text-[0.72rem] leading-relaxed tracking-[0.12em] text-[var(--foreground-muted)]">
            {copy.archiveEnd}
          </p>
        </SfSection>
      </main>
    </SiteShell>
  );
}
