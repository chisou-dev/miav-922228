import type { Metadata } from "next";
import {
  SeriesIndexPage,
  allSeriesParams,
} from "@/features/library/LibraryPages";
import { getSeries } from "@/features/library/catalog";

type Props = {
  params: Promise<{ series: string }>;
};

export function generateStaticParams() {
  return allSeriesParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series: seriesId } = await params;
  const series = getSeries(seriesId);
  return {
    title: series
      ? `${series.title} | MIAV-922228`
      : "Series | MIAV-922228",
    description: series?.summary,
  };
}

export default async function SeriesRoutePage({ params }: Props) {
  const { series } = await params;
  return <SeriesIndexPage seriesId={series} />;
}
