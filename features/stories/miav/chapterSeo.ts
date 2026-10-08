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
const DEFAULT_SUFFIX_EN = "Literary Fiction";
const DEFAULT_SUFFIX_FR = "Fiction littéraire";

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
      "Everyone else already has RIS. He installs it without giving the decision much thought. Chapter 1 of MIAV-922228.",
  },
  2: {
    description:
      "The next morning, Mia is already waiting when he opens the device. Chapter 2 of MIAV-922228.",
  },
  3: {
    description:
      "While brushing his teeth, he sees that his usual train has been replaced on the schedule. Chapter 3 of MIAV-922228.",
  },
  4: {
    description:
      "When he gets home, Mia does not answer. Chapter 4 of MIAV-922228.",
  },
  5: {
    description:
      "The device responds faster after the repair. Chapter 5 of MIAV-922228.",
  },
  6: {
    description:
      "When he wakes, Mia already has something to add about yesterday's conversation. Chapter 6 of MIAV-922228.",
  },
  7: {
    description:
      "More of his day has been filled in on the device than there was the night before. Chapter 7 of MIAV-922228.",
  },
  8: {
    description:
      "A breakfast notification says yesterday's question has been analyzed. Chapter 8 of MIAV-922228.",
  },
  9: {
    description:
      "The years move on. What once felt new gradually becomes part of ordinary life. Chapter 9 of MIAV-922228.",
  },
  10: {
    description:
      "A flyer at the station catches Noah's attention on the way home. Chapter 10 of MIAV-922228.",
  },
  11: {
    titleSuffix: "Literary Fiction about AI and Humanity",
    description:
      "Life in the house changes again and again. Noah remains part of it. Chapter 11 of MIAV-922228.",
  },
  12: {
    titleSuffix: "AI Memory and Digital Preservation",
    description:
      "A grandchild brings their partner home to meet the family. Chapter 12 of MIAV-922228.",
  },
  13: {
    description:
      "Noah opens an old record during a charging cycle. Chapter 13 of MIAV-922228.",
  },
  14: {
    description:
      "Family photographs move across a living-room wall. Chapter 14 of MIAV-922228.",
  },
};

/** French metadata — short, fact-based; no invented plot beyond the chapter text. */
const CHAPTER_SEO_FR: Record<number, ChapterSeoOverride> = {
  1: {
    description:
      "Au salon de repos de l’université, une conversation banale tourne autour des IA compagnons. Chapitre I de MIAV-922228.",
  },
  2: {
    description:
      "Le lendemain, Mia est déjà là quand il ouvre l’appareil. Chapitre II de MIAV-922228.",
  },
  3: {
    description:
      "En se brossant les dents, il voit que son train habituel a été remplacé sur l’horaire. Chapitre III de MIAV-922228.",
  },
  4: {
    description:
      "De retour chez lui, Mia ne répond pas. Chapitre IV de MIAV-922228.",
  },
  5: {
    description:
      "L’appareil répond plus vite après la réparation. Chapitre V de MIAV-922228.",
  },
  6: {
    description:
      "Au réveil, Mia a déjà quelque chose à ajouter sur la conversation d’hier. Chapitre VI de MIAV-922228.",
  },
  7: {
    description:
      "Le matin, plus de cases que la veille sont remplies dans son emploi du temps. Chapitre VII de MIAV-922228.",
  },
  8: {
    description:
      "Une notification au petit-déjeuner indique que l’analyse d’une question d’hier est terminée. Chapitre VIII de MIAV-922228.",
  },
  9: {
    description:
      "Dans le hall du bâtiment des cours, un test de communication entre appareils est en cours. Chapitre IX de MIAV-922228.",
  },
  10: {
    description:
      "Près des portiques de la gare, un homme distribue des prospectus. Chapitre X de MIAV-922228.",
  },
  11: {
    titleSuffix: "Fiction littéraire sur l’IA et l’humanité",
    description:
      "Dans la maison, la famille s’adresse à Noah pour le quotidien. Chapitre XI de MIAV-922228.",
  },
  12: {
    titleSuffix: "Mémoire IA et préservation numérique",
    description:
      "Un petit-enfant amène son partenaire pour rencontrer la famille. Chapitre XII de MIAV-922228.",
  },
  13: {
    description:
      "Pendant un cycle de charge, Noah ouvre un ancien enregistrement. Chapitre XIII de MIAV-922228.",
  },
  14: {
    description:
      "Des photographies de famille passent sur le mur du salon. Chapitre XIV de MIAV-922228.",
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
      ? "Lisez la Partie I de MIAV-922228, un roman littéraire sur l’IA, la mémoire, les relations et la manière discrète dont la technologie façonne les choix humains."
      : "Read Part I of MIAV-922228, a quiet literary novel about AI, memory, relationships, and the ways technology shapes human choices.";

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
