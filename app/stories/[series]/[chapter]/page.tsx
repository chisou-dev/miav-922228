import type { Metadata } from "next";
import {
  SeriesChapterPage,
  allChapterParams,
} from "@/features/library/LibraryPages";
import { chapterSeo, getSeriesChapter } from "@/features/library/catalog";

type Props = {
  params: Promise<{ series: string; chapter: string }>;
};

export function generateStaticParams() {
  return allChapterParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series, chapter } = await params;
  const found = getSeriesChapter(series, chapter);
  if (!found) return { title: "Chapter | Takashi Yabe" };
  return chapterSeo(found.series, found.chapter);
}

export default async function SeriesChapterRoutePage({ params }: Props) {
  const { series, chapter } = await params;
  return <SeriesChapterPage seriesId={series} pathSlug={chapter} />;
}
