import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdjacentChapters,
  getChapterBySlug,
  getChapterMetaBySlug,
  type ChapterMeta,
} from "@/features/stories/miav/chapters";
import { getContentLocaleFromRequest } from "@/features/shared/locale";
import { MiavChapterReader } from "@/features/stories/miav/MiavChapterReader";
import { ChapterJsonLd } from "@/features/library/jsonLd";
import { chapterCanonicalPath } from "@/features/stories/miav/chapterSeo";

type Props = {
  params: Promise<{ slug: string }>;
};

function ChapterHeader({ chapter }: { chapter: ChapterMeta }) {
  return (
    <header className="pt-14 text-center sm:pt-20">
      <p>
        <Link
          href="/"
          className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
        >
          MIAV-922228
        </Link>
      </p>

      <p className="mt-14 text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase sm:mt-16">
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

  return (
    <div className="relative z-10 mx-auto w-full max-w-[760px] px-5 sm:px-8">
      <ChapterJsonLd
        name={meta.title}
        description={meta.summary}
        position={meta.number}
        url={chapterCanonicalPath(meta.slug)}
        workName="MIAV-922228"
        workUrl="/chapters"
      />
      <main className="pb-24 sm:pb-32">
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
