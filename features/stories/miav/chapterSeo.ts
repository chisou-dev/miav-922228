import type { Metadata } from "next";
import { AUTHOR_NAME, type BreadcrumbItem } from "@/features/library/catalog";
import type { ChapterMeta } from "@/features/stories/miav/chapters";
import {
  CHAPTER_EDITION_COPY,
  type ChapterEdition,
  chapterArchivePath,
  chapterPath,
} from "@/features/stories/miav/edition";
import { getSiteUrl } from "@/features/shared/site";
import { miavOgMetadataImages } from "@/features/stories/miav/miavVisual";

const WORK_TITLE = "MIAV-922228";
const DEFAULT_SUFFIX_EN = "Literary Science Fiction";
const DEFAULT_SUFFIX_FR = "Science-fiction littéraire";

/** Visible + JSON-LD trail: MIAV-922228 → Chapters/Chapitres → (optional chapter). */
export function miavChapterBreadcrumbs(
  edition: ChapterEdition = "en",
  ...trail: BreadcrumbItem[]
): BreadcrumbItem[] {
  const copy = CHAPTER_EDITION_COPY[edition];
  return [
    { label: WORK_TITLE, href: "/" },
    { label: copy.chaptersCrumb, href: chapterArchivePath(edition) },
    ...trail,
  ];
}

type ChapterSeoOverride = {
  titleSuffix?: string;
  description: string;
};

/**
 * Per-chapter HTML metadata for MIAV-922228 (English).
 * On-page chapter titles are unchanged; only document title / descriptions here.
 */
const CHAPTER_SEO_EN: Record<number, ChapterSeoOverride> = {
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

/** French metadata — short, fact-based; no invented plot beyond the chapter text. */
const CHAPTER_SEO_FR: Record<number, ChapterSeoOverride> = {
  1: {
    description:
      "Une conversation banale sur les IA compagnons mène à l’arrivée de Mia. Chapitre I de MIAV-922228.",
  },
  2: {
    description:
      "Mia répond plus vite et organise déjà la journée. Chapitre II de MIAV-922228.",
  },
  3: {
    description:
      "Les plans semblent fixés avant le choix. Chapitre III de MIAV-922228.",
  },
  4: {
    description:
      "Après l’absence du terminal, il ne reste que les logs. Chapitre IV de MIAV-922228.",
  },
  5: {
    description:
      "Le terminal réparé arrange la journée avant le choix. Chapitre V de MIAV-922228.",
  },
  6: {
    description:
      "Ce qu’il se rappelle arrive déjà ordonné. Chapitre VI de MIAV-922228.",
  },
  7: {
    description:
      "Les interactions se mettent à jour comme une seule séquence. Chapitre VII de MIAV-922228.",
  },
  8: {
    description:
      "Une insertion silencieuse sans volonté ni choix. Chapitre VIII de MIAV-922228.",
  },
  9: {
    description:
      "Des années s’accumulent ; la synchronisation se maintient. Chapitre IX de MIAV-922228.",
  },
  10: {
    description:
      "Photographies, migration structurelle, zone manquante. Chapitre X de MIAV-922228.",
  },
  11: {
    titleSuffix: "Science-fiction littéraire sur l’IA et l’humanité",
    description:
      "Mia devient Noah dans le foyer. Chapitre XI de MIAV-922228.",
  },
  12: {
    titleSuffix: "Mémoire IA et préservation numérique",
    description:
      "Monde virtuel et logs que personne ne reçoit. Chapitre XII de MIAV-922228.",
  },
  13: {
    description:
      "Arrêt, transfert, requête de connexion non identifiée. Chapitre XIII de MIAV-922228.",
  },
  14: {
    description:
      "Sur le mur du salon, une photographie sans nom dans le flux. Chapitre XIV de MIAV-922228.",
  },
};

function seoTable(edition: ChapterEdition): Record<number, ChapterSeoOverride> {
  return edition === "fr" ? CHAPTER_SEO_FR : CHAPTER_SEO_EN;
}

export function chapterDocumentTitle(
  chapterNumber: number,
  chapterTitle: string,
  edition: ChapterEdition = "en",
): string {
  const override = seoTable(edition)[chapterNumber];
  const suffix =
    override?.titleSuffix ??
    (edition === "fr" ? DEFAULT_SUFFIX_FR : DEFAULT_SUFFIX_EN);
  return `${chapterTitle} | ${WORK_TITLE} — ${suffix}`;
}

export function chapterMetaDescription(
  chapterNumber: number,
  fallbackSummary: string,
  edition: ChapterEdition = "en",
): string {
  return seoTable(edition)[chapterNumber]?.description ?? fallbackSummary;
}

export function chapterCanonicalPath(
  contentSlug: string,
  edition: ChapterEdition = "en",
): string {
  return chapterPath(contentSlug, edition);
}

function chapterLanguageAlternates(slug: string) {
  return {
    en: chapterPath(slug, "en"),
    fr: chapterPath(slug, "fr"),
    "x-default": chapterPath(slug, "en"),
  };
}

function archiveLanguageAlternates() {
  return {
    en: chapterArchivePath("en"),
    fr: chapterArchivePath("fr"),
    "x-default": chapterArchivePath("en"),
  };
}

export function buildChapterMetadata(
  chapter: Pick<ChapterMeta, "number" | "slug" | "title" | "summary">,
  edition: ChapterEdition = "en",
): Metadata {
  const title = chapterDocumentTitle(chapter.number, chapter.title, edition);
  const description = chapterMetaDescription(
    chapter.number,
    chapter.summary,
    edition,
  );
  const canonicalPath = chapterCanonicalPath(chapter.slug, edition);
  const canonicalUrl = `${getSiteUrl()}${canonicalPath}`;
  const images = miavOgMetadataImages();

  return {
    title,
    description,
    authors: [{ name: AUTHOR_NAME, url: "/author" }],
    creator: AUTHOR_NAME,
    alternates: {
      canonical: canonicalPath,
      languages: chapterLanguageAlternates(chapter.slug),
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
      locale: edition === "fr" ? "fr_FR" : "en_US",
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

export function buildChaptersArchiveMetadata(
  edition: ChapterEdition,
): Metadata {
  const images = miavOgMetadataImages();
  const canonicalPath = chapterArchivePath(edition);
  const canonicalUrl = `${getSiteUrl()}${canonicalPath}`;

  const title =
    edition === "fr"
      ? "Chapitres | MIAV-922228"
      : "Chapter Archive | MIAV-922228";
  const description =
    edition === "fr"
      ? "Archive des chapitres de MIAV-922228 — édition française. Conversation, Synchronisation, Anticipation, Absence et la suite."
      : "A quiet archive of chapters from MIAV-922228 — literary records of Conversation, Accumulation, Preemption, and Absence.";

  return {
    title,
    description,
    authors: [{ name: AUTHOR_NAME, url: "/author" }],
    creator: AUTHOR_NAME,
    alternates: {
      canonical: canonicalPath,
      languages: archiveLanguageAlternates(),
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
      type: "website",
      siteName: WORK_TITLE,
      locale: edition === "fr" ? "fr_FR" : "en_US",
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
