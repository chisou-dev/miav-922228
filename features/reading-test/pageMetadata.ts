import type { Metadata } from "next";
import { miavOgMetadataImages } from "@/features/stories/miav/miavVisual";
import { getSiteUrl } from "@/features/shared/site";

/**
 * Reading Test pages hide the byline until the result step.
 * Null authors/creator replace the site-wide head fields for this route only.
 */
export function readingTestMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = `${getSiteUrl()}${canonicalPath}`;
  const images = miavOgMetadataImages();

  return {
    title,
    description,
    authors: null,
    creator: null,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "MIAV-922228",
      locale: "en_US",
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
