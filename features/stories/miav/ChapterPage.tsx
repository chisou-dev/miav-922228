import { notFound } from "next/navigation";
import {
  getAdjacentChapters,
  getChapterBySlug,
  getChapterMetaBySlug,
  type ChapterMeta,
} from "@/features/stories/miav/chapters";
import {
  CHAPTER_EDITION_COPY,
  type ChapterEdition,
  chapterArchivePath,
  chapterNumberLabel,
  chapterPath,
  editionToContentLocale,
} from "@/features/stories/miav/edition";
import { EditionSwitcher } from "@/features/stories/miav/EditionSwitcher";
import { MiavChapterReader } from "@/features/stories/miav/MiavChapterReader";
import { LibraryBreadcrumbs } from "@/features/library/LibraryBreadcrumbs";
import { BreadcrumbJsonLd, ChapterJsonLd } from "@/features/library/jsonLd";
import {
  chapterCanonicalPath,
  miavChapterBreadcrumbs,
} from "@/features/stories/miav/chapterSeo";

type Props = {
  params: Promise<{ slug: string }>;
  edition?: ChapterEdition;
};

function ChapterHeader({
  chapter,
  edition,
}: {
  chapter: ChapterMeta;
  edition: ChapterEdition;
}) {
  return (
    <header className="pt-10 text-center sm:pt-14">
      <p className="text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
        {chapterNumberLabel(chapter.number, edition)}
      </p>

      <h1 className="mt-5 text-[clamp(1.75rem,6vw,2.5rem)] font-medium leading-[1.3] tracking-[0.08em] text-[var(--foreground)] sm:mt-6">
        {chapter.title}
      </h1>

      <EditionSwitcher edition={edition} slug={chapter.slug} />
    </header>
  );
}

function toNavItem(chapter: ChapterMeta) {
  return {
    number: chapter.number,
    slug: chapter.slug,
    title: chapter.title,
  };
}

export async function ChapterPage({ params, edition = "en" }: Props) {
  const { slug } = await params;
  const locale = editionToContentLocale(edition);
  const chapter = await getChapterBySlug(slug, locale);
  if (!chapter) notFound();

  const { previous, next } = getAdjacentChapters(slug, locale);
  const meta = getChapterMetaBySlug(slug, locale) ?? chapter;
  const canonicalPath = chapterCanonicalPath(meta.slug, edition);
  const copy = CHAPTER_EDITION_COPY[edition];
  const breadcrumbs = miavChapterBreadcrumbs(edition, {
    label: meta.title,
    href: canonicalPath,
  });

  return (
    <div className="relative z-10 mx-auto w-full max-w-[760px] px-5 sm:px-8">
      <ChapterJsonLd
        name={meta.title}
        description={meta.summary}
        position={meta.number}
        url={canonicalPath}
        workName="MIAV-922228"
        workUrl={chapterArchivePath(edition)}
        inLanguage={edition}
      />
      <BreadcrumbJsonLd items={breadcrumbs} />
      <main className="pb-24 sm:pb-32">
        <LibraryBreadcrumbs items={breadcrumbs} />
        <ChapterHeader chapter={meta} edition={edition} />

        <MiavChapterReader
          chapter={{
            number: chapter.number,
            slug: chapter.slug,
            title: chapter.title,
            presentation: chapter.presentation,
          }}
          bodyHtml={chapter.bodyHtml}
          previous={previous ? toNavItem(previous) : null}
          next={next ? toNavItem(next) : null}
          linkMode="archive"
          edition={edition}
          listHref={chapterArchivePath(edition)}
          listLabel={copy.allChapters}
          chapterOneHref={chapterPath("conversation", edition)}
          hideNextOnThreshold
        />
      </main>
    </div>
  );
}
