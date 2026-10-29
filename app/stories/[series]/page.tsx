import type { Metadata } from "next";
import {
  SeriesIndexPage,
  allSeriesParams,
} from "@/features/library/LibraryPages";
import { getSeries, seriesHref } from "@/features/library/catalog";
import { libraryPageMetadata } from "@/features/library/pageMetadata";
import { after50MillionWorkId } from "@/features/stories/after-50-million/work";
import { after50MillionOgMetadataImages } from "@/features/stories/after-50-million/visual";
import { EDITORIAL_ART } from "@/features/library/editorialArt";
import { getSiteUrl } from "@/features/shared/site";

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
    images:
      series.id === after50MillionWorkId
        ? after50MillionOgMetadataImages()
        : series.id === "jeff"
          ? [{ url: `${getSiteUrl()}${EDITORIAL_ART.jeff.src}`, width: EDITORIAL_ART.jeff.width, height: EDITORIAL_ART.jeff.height, alt: EDITORIAL_ART.jeff.alt }]
          : undefined,
  });
}

export default async function SeriesRoutePage({ params }: Props) {
  const { series } = await params;
  return <SeriesIndexPage seriesId={series} />;
}
