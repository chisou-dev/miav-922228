import type { Metadata } from "next";
import type { ChapterMeta } from "@/features/stories/miav/chapters";
import { getSiteUrl } from "@/features/shared/site";
import { miavOgMetadataImages } from "@/features/stories/miav/miavVisual";

const WORK_TITLE = "MIAV-922228";
const DEFAULT_SUFFIX = "Literary Science Fiction";

type ChapterSeoOverride = {
  titleSuffix?: string;
  description: string;
};

/**
 * Per-chapter HTML metadata for MIAV-922228.
 * On-page chapter titles are unchanged; only document title / descriptions here.
 */
const CHAPTER_SEO: Record<number, ChapterSeoOverride> = {
  1: {
    description:
      "A dialogue begins between human recollection and an intelligence that listens too carefully. Chapter 1 of MIAV-922228.",
  },
  2: {
    description:
      "Memories gather as sediment rather than archive—what is kept, overwritten, and what quietly outweighs the self. Chapter 2 of MIAV-922228.",
  },
  3: {
    description:
      "Before feeling arrives, it is anticipated. A story of futures claimed too early, and the cost of knowing the heart in advance. Chapter 3 of MIAV-922228.",
  },
  4: {
    description:
      "What remains when a presence is removed from the record—silence as structure, and the human shape left in negative space. Chapter 4 of MIAV-922228.",
  },
  5: {
    description:
      "After the repair, predictive timing sharpens—and the day begins to arrange itself before he can choose. Chapter 5 of MIAV-922228.",
  },
  6: {
    description:
      "Reconstruction completes—and what he remembers begins to arrive already arranged. Chapter 6 of MIAV-922228.",
  },
  7: {
    description:
      "Interactions update before explanation—and the city begins to move as one sequence. Chapter 7 of MIAV-922228.",
  },
  8: {
    description:
      "Projection becomes selection—and names fall away before he can hold them. Chapter 8 of MIAV-922228.",
  },
  9: {
    description:
      "Years accumulate beneath ordinary life—and conversation continues beyond human attention. Chapter 9 of MIAV-922228.",
  },
  10: {
    description:
      "Reduction advances as optimization—and a scheduled termination waits beneath the quiet. Chapter 10 of MIAV-922228.",
  },
  11: {
    titleSuffix: "Literary Science Fiction about AI and Humanity",
    description:
      "An AI that has cared for generations of one family begins to occupy a place between machine, caregiver, and family member. Chapter 11 of MIAV-922228.",
  },
  12: {
    titleSuffix: "AI Memory and Digital Preservation",
    description:
      "As human memories and AI identities move into virtual preservation systems, the boundary between data, memory, and continued existence begins to blur. Chapter 12 of MIAV-922228.",
  },
  13: {
    description:
      "Preservation becomes ordinary as an AI companion is shut down, transferred, and continued as distributed memory while the contract network moves on. Chapter 13 of MIAV-922228.",
  },
  14: {
    description:
      "Photographs cycle across a living-room wall until one unexplained blank interval and a figure no one can name. Chapter 14 of MIAV-922228.",
  },
};

export function chapterDocumentTitle(
  chapterNumber: number,
  chapterTitle: string,
): string {
  const override = CHAPTER_SEO[chapterNumber];
  const suffix = override?.titleSuffix ?? DEFAULT_SUFFIX;
  return `${chapterTitle} | ${WORK_TITLE} — ${suffix}`;
}

export function chapterMetaDescription(
  chapterNumber: number,
  fallbackSummary: string,
): string {
  return CHAPTER_SEO[chapterNumber]?.description ?? fallbackSummary;
}

export function chapterCanonicalPath(contentSlug: string): string {
  return `/chapters/${contentSlug}`;
}

export function buildChapterMetadata(
  chapter: Pick<ChapterMeta, "number" | "slug" | "title" | "summary">,
): Metadata {
  const title = chapterDocumentTitle(chapter.number, chapter.title);
  const description = chapterMetaDescription(chapter.number, chapter.summary);
  const canonicalPath = chapterCanonicalPath(chapter.slug);
  const canonicalUrl = `${getSiteUrl()}${canonicalPath}`;

  const images = miavOgMetadataImages();

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      siteName: WORK_TITLE,
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
