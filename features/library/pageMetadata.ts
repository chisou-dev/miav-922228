import type { Metadata } from "next";
import { AUTHOR_NAME } from "@/features/library/catalog";
import { getSiteUrl } from "@/features/shared/site";
import { miavOgMetadataImages } from "@/features/stories/miav/miavVisual";

type OgImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  locale?: "en_US" | "fr_FR";
  ogType?: "website" | "article";
  /** Defaults to the shared MIAV image. Pass a work image when the page has its own. */
  images?: readonly OgImage[];
};

const AUTHOR = { name: AUTHOR_NAME, url: "/author" } as const;

/**
 * Page-specific title/description plus matching OG/Twitter/canonical/author.
 * Child openGraph replaces the root layout object, so images must be repeated.
 */
export function libraryPageMetadata({
  title,
  description,
  path,
  locale = "en_US",
  ogType = "website",
  images: imagesInput,
}: PageMetadataInput): Metadata {
  const images: OgImage[] = imagesInput
    ? imagesInput.map((image) => ({ ...image }))
    : miavOgMetadataImages();
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = `${getSiteUrl()}${canonicalPath === "/" ? "/" : canonicalPath}`;

  return {
    title,
    description,
    authors: [AUTHOR],
    creator: AUTHOR_NAME,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: ogType,
      siteName: "MIAV-922228",
      locale,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((image) => image.url),
    },
  };
}
