import type { Metadata } from "next";
import {
  SeriesIndexPage,
  allSeriesParams,
} from "@/features/library/LibraryPages";
import { getSeries } from "@/features/library/catalog";
import { miavWorkId } from "@/features/stories/miav/work";
import { miavOgMetadataImages } from "@/features/stories/miav/miavVisual";

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

  const base: Metadata = {
    title: series.seo.title,
    description: series.seo.description,
  };

  if (series.id !== miavWorkId) return base;

  const images = miavOgMetadataImages();
  return {
    ...base,
    openGraph: {
      title: series.seo.title,
      description: series.seo.description,
      type: "website",
      siteName: "MIAV-922228",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: series.seo.title,
      description: series.seo.description,
      images: images.map((image) => image.url),
    },
  };
}

export default async function SeriesRoutePage({ params }: Props) {
  const { series } = await params;
  return <SeriesIndexPage seriesId={series} />;
}
