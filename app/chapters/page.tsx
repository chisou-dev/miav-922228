import type { Metadata } from "next";
import { ChaptersIndexPage } from "@/features/stories/miav/ChaptersIndexPage";
import { getSiteUrl } from "@/features/shared/site";
import { miavOgMetadataImages } from "@/features/stories/miav/miavVisual";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const title = "Chapter Archive | MIAV-922228";
const description =
  "A quiet archive of chapters from MIAV-922228 — literary records of Conversation, Accumulation, Preemption, and Absence.";
const images = miavOgMetadataImages();

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/chapters",
  },
  openGraph: {
    title,
    description,
    url: `${getSiteUrl()}/chapters`,
    type: "website",
    siteName: "MIAV-922228",
    images,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: images.map((image) => image.url),
  },
};

export default async function ChaptersPage() {
  return <ChaptersIndexPage />;
}
