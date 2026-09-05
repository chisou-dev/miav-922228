import type { Metadata } from "next";
import {
  SeriesIndexPage,
  allSeriesParams,
} from "@/features/library/LibraryPages";
import { getSeries, seriesHref } from "@/features/library/catalog";
import { libraryPageMetadata } from "@/features/library/pageMetadata";

type Props = {
  params: Promise<{ series: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateStaticParams() {
  return allSeriesParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: seriesId } = await params;
  const series = getSeries(seriesId);
  if (!series) return { title: "Series | Takashi Yabe" };

  return libraryPageMetadata({
    title: series.seo.title,
    description: series.seo.description,
    path: seriesHref(series.id),
  });
}

export default async function SeriesRoutePage({ params }: Props) {
  const { series } = await params;
  return <SeriesIndexPage seriesId={series} />;
}
