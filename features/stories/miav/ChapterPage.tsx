import { notFound } from "next/navigation";
import {
  getAdjacentChapters,
  getChapterBySlug,
  getChapterMetaBySlug,
  type ChapterMeta,
} from "@/features/stories/miav/chapters";
import { getContentLocaleFromRequest } from "@/features/shared/locale";
import { MiavChapterReader } from "@/features/stories/miav/MiavChapterReader";
import { LibraryBreadcrumbs } from "@/features/library/LibraryBreadcrumbs";
import { BreadcrumbJsonLd, ChapterJsonLd } from "@/features/library/jsonLd";
import {
  chapterCanonicalPath,
  miavChapterBreadcrumbs,
} from "@/features/stories/miav/chapterSeo";

type Props = {
  params: Promise<{ slug: string }>;
};

function ChapterHeader({ chapter }: { chapter: ChapterMeta }) {
  return (
    <header className="pt-10 text-center sm:pt-14">
      <p className="text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
        Chapter {chapter.number}
      </p>

      <h1 className="mt-5 text-[clamp(1.75rem,6vw,2.5rem)] font-medium leading-[1.3] tracking-[0.08em] text-[var(--foreground)] sm:mt-6">
        {chapter.title}
      </h1>
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

export async function ChapterPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getContentLocaleFromRequest();
  const chapter = await getChapterBySlug(slug, locale);
  if (!chapter) notFound();

  const { previous, next } = getAdjacentChapters(slug, locale);
  const meta = getChapterMetaBySlug(slug, locale) ?? chapter;
  const canonicalPath = chapterCanonicalPath(meta.slug);
  const breadcrumbs = miavChapterBreadcrumbs({
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
        workUrl="/chapters"
      />
      <BreadcrumbJsonLd items={breadcrumbs} />
      <main className="pb-24 sm:pb-32">
        <LibraryBreadcrumbs items={breadcrumbs} />
        <ChapterHeader chapter={meta} />

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
          listHref="/chapters"
          listLabel="All chapters"
          hideNextOnThreshold
        />
      </main>
    </div>
  );
}
