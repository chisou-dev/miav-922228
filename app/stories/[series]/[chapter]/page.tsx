import type { Metadata } from "next";
import { SeriesChapterPage } from "@/features/library/LibraryPages";
import { chapterSeo, getSeriesChapter } from "@/features/library/catalog";
import { buildChapterMetadata } from "@/features/stories/miav/chapterSeo";
import { miavWorkId } from "@/features/stories/miav/work";
import { getChapterMetaBySlug } from "@/features/stories/miav/chapters";

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

  return chapterSeo(found.series, found.chapter);
}

export default async function SeriesChapterRoutePage({ params }: Props) {
  const { series, chapter } = await params;
  return <SeriesChapterPage seriesId={series} pathSlug={chapter} />;
}
