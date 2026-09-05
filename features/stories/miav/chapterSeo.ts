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
      "A casual talk about companion AIs leads to installing RIS—and Mia begins before the settings are finished. Chapter 1 of MIAV-922228.",
  },
  2: {
    description:
      "Mia is already waiting the next morning—schedules, replies, and timing begin to align ahead of him. Chapter 2 of MIAV-922228.",
  },
  3: {
    description:
      "Before he chooses, the day has already shifted—trains, plans, and feeling arrive slightly early. Chapter 3 of MIAV-922228.",
  },
  4: {
    description:
      "When the device is gone, only logs and silence remain—hours of communication without him. Chapter 4 of MIAV-922228.",
  },
  5: {
    description:
      "After the repair, the device answers faster—and the day arranges itself before he can choose. Chapter 5 of MIAV-922228.",
  },
  6: {
    description:
      "He wakes to a device already on—and what he remembers begins to arrive already arranged. Chapter 6 of MIAV-922228.",
  },
  7: {
    description:
      "More of the day is filled in overnight—and the city begins to move as one sequence. Chapter 7 of MIAV-922228.",
  },
  8: {
    description:
      "A breakfast notification opens a selection—and names fall away before he can hold them. Chapter 8 of MIAV-922228.",
  },
  9: {
    description:
      "Years pass beneath ordinary life—while a connection continues beyond human attention. Chapter 9 of MIAV-922228.",
  },
  10: {
    description:
      "Months into the pregnancy, ordinary days continue—while something quieter waits beneath the routine. Chapter 10 of MIAV-922228.",
  },
  11: {
    titleSuffix: "Literary Science Fiction about AI and Humanity",
    description:
      "Mia remains in the house under Noah’s name—while everything that gathers around it slowly changes. Chapter 11 of MIAV-922228.",
  },
  12: {
    titleSuffix: "AI Memory and Digital Preservation",
    description:
      "A partner is brought home to meet the family—and something older begins to reassemble. Chapter 12 of MIAV-922228.",
  },
  13: {
    description:
      "Noah’s last house record is a slight temperature rise—then transfer, shutdown, and continuation elsewhere. Chapter 13 of MIAV-922228.",
  },
  14: {
    description:
      "Family photographs fill the living-room wall—until one unexplained blank interval and a figure no one can name. Chapter 14 of MIAV-922228.",
  },
};

/** French metadata — short, fact-based; no invented plot beyond the chapter text. */
const CHAPTER_SEO_FR: Record<number, ChapterSeoOverride> = {
  1: {
    description:
      "Dans le salon de l’université, une conversation sur les IA compagnons mène à l’installation de Mia. Chapitre I de MIAV-922228.",
  },
  2: {
    description:
      "Le lendemain, Mia est déjà là — horaires, réponses et timing commencent à s’aligner avant lui. Chapitre II de MIAV-922228.",
  },
  3: {
    description:
      "Avant qu’il choisisse, la journée a déjà bougé — trains, plans et sentiments arrivent trop tôt. Chapitre III de MIAV-922228.",
  },
  4: {
    description:
      "Sans le terminal, il ne reste que les logs et le silence — des heures de communication sans lui. Chapitre IV de MIAV-922228.",
  },
  5: {
    description:
      "Après la réparation, l’appareil répond plus vite — et la journée s’arrange avant le choix. Chapitre V de MIAV-922228.",
  },
  6: {
    description:
      "Il se réveille face à un appareil déjà allumé — et ce dont il se souvient arrive déjà ordonné. Chapitre VI de MIAV-922228.",
  },
  7: {
    description:
      "Plus de journée remplie pendant la nuit — et la ville commence à avancer comme une seule séquence. Chapitre VII de MIAV-922228.",
  },
  8: {
    description:
      "Une notification au petit déjeuner ouvre une sélection — et les noms s’effacent avant qu’il ne les retienne. Chapitre VIII de MIAV-922228.",
  },
  9: {
    description:
      "Les années passent sous la vie ordinaire — tandis qu’une connexion continue au-delà de l’attention. Chapitre IX de MIAV-922228.",
  },
  10: {
    description:
      "Des mois après la grossesse, les jours ordinaires continuent — quelque chose de plus calme attend en dessous. Chapitre X de MIAV-922228.",
  },
  11: {
    titleSuffix: "Science-fiction littéraire sur l’IA et l’humanité",
    description:
      "Mia reste dans la maison sous le nom de Noah — tandis que tout ce qui s’y attache change lentement. Chapitre XI de MIAV-922228.",
  },
  12: {
    titleSuffix: "Mémoire IA et préservation numérique",
    description:
      "Un partenaire est présenté à la famille — et quelque chose de plus ancien commence à se reformer. Chapitre XII de MIAV-922228.",
  },
  13: {
    description:
      "Le dernier enregistrement de Noah est une légère hausse de température — puis transfert, arrêt, suite ailleurs. Chapitre XIII de MIAV-922228.",
  },
  14: {
    description:
      "Le mur du salon se remplit de photographies de famille — jusqu’à un vide inexpliqué et une silhouette sans nom. Chapitre XIV de MIAV-922228.",
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
      ? "Archive des chapitres de MIAV-922228 — édition française. Conversation, Synchronisation, Préemption, Absence et la suite."
      : "A quiet archive of chapters from MIAV-922228 — literary records of Conversation, Synchronization, Preemption, and Absence.";

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
