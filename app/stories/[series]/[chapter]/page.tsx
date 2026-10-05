import type { Metadata } from "next";
import { SeriesChapterPage } from "@/features/library/LibraryPages";
import {
  chapterHref,
  chapterSeo,
  getSeriesChapter,
} from "@/features/library/catalog";
import { libraryPageMetadata } from "@/features/library/pageMetadata";
import { buildChapterMetadata } from "@/features/stories/miav/chapterSeo";
import { miavWorkId } from "@/features/stories/miav/work";
import { getChapterMetaBySlug } from "@/features/stories/miav/chapters";
import { nextTimeISeeYouWorkId } from "@/features/stories/next-time-i-see-you/work";
import { fourthPeriodWorkId } from "@/features/stories/fourth-period/store";
import { after50MillionWorkId } from "@/features/stories/after-50-million/work";
import { after50MillionOgMetadataImages } from "@/features/stories/after-50-million/visual";

type Props = {
  params: Promise<{ series: string; chapter: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series, chapter } = await params;
  const found = getSeriesChapter(series, chapter);
  if (!found) return { title: "Chapter | Takashi Yabe" };

  // MIAV library twins share SEO with archive URLs (canonical → /chapters/{slug}).
  if (
    found.series.id === miavWorkId &&
    !found.chapter.continueReading &&
    found.chapter.contentSlug
  ) {
    const meta = getChapterMetaBySlug(found.chapter.contentSlug);
    if (meta) return buildChapterMetadata(meta);
  }

  const seo = chapterSeo(found.series, found.chapter);

  if (
    found.series.id === nextTimeISeeYouWorkId ||
    found.series.id === after50MillionWorkId
  ) {
    return libraryPageMetadata({
      title: seo.title,
      description: seo.description,
      path: chapterHref(found.series.id, found.chapter.pathSlug),
      ogType: "article",
      images:
        found.series.id === after50MillionWorkId
          ? after50MillionOgMetadataImages()
          : undefined,
    });
  }

  if (
    found.series.id === fourthPeriodWorkId &&
    found.chapter.pathSlug === "chapter-5"
  ) {
    return {
      ...libraryPageMetadata({
        title: seo.title,
        description: seo.description,
        path: chapterHref(found.series.id, found.chapter.pathSlug),
        ogType: "article",
      }),
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return seo;
}

export default async function SeriesChapterRoutePage({ params }: Props) {
  const { series, chapter } = await params;
  return <SeriesChapterPage seriesId={series} pathSlug={chapter} />;
}
