import type { Locale } from "@/features/shared/locale";

/** Story / edition language for MIAV-922228 chapter text (not UI locale). */
export type ChapterEdition = "en" | "fr";

export function isChapterEdition(value: string): value is ChapterEdition {
  return value === "en" || value === "fr";
}

export function editionToContentLocale(edition: ChapterEdition): Locale {
  return edition;
}

export function chapterArchivePath(edition: ChapterEdition): string {
  return edition === "fr" ? "/fr/chapters" : "/chapters";
}

export function chapterPath(slug: string, edition: ChapterEdition): string {
  return `${chapterArchivePath(edition)}/${slug}`;
}

const ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
] as const;

export function chapterRoman(number: number): string {
  return ROMAN[number - 1] ?? String(number);
}

export function chapterNumberLabel(
  number: number,
  edition: ChapterEdition,
): string {
  if (edition === "fr") {
    return `Chapitre ${chapterRoman(number)}`;
  }
  return `Chapter ${number}`;
}

export type ChapterEditionCopy = {
  archiveEyebrow: string;
  archiveTitle: string;
  archiveLead: string;
  archiveEnd: string;
  chaptersCrumb: string;
  previous: string;
  next: string;
  allChapters: string;
  openRecord: string;
  readingOrder: (n: number) => string;
  startFromChapterOne: string;
  dateUnrecorded: string;
  chapterTextLabel: string;
  bookCtaLabel: string;
};

export const CHAPTER_EDITION_COPY: Record<
  ChapterEdition,
  ChapterEditionCopy
> = {
  en: {
    archiveEyebrow: "Record",
    archiveTitle: "Chapter Archive",
    archiveLead:
      "A vault of chapters from MIAV-922228.\nEach entry is a record in the work—held apart, readable in its own hour.",
    archiveEnd:
      "End of current archive — further chapters will be entered as they are recorded.",
    chaptersCrumb: "Chapters",
    previous: "Previous",
    next: "Next",
    allChapters: "All chapters",
    openRecord: "Open record",
    readingOrder: (n) => `This is Chapter ${n} of MIAV-922228.`,
    startFromChapterOne: "Start from Chapter 1 →",
    dateUnrecorded: "Date unrecorded",
    chapterTextLabel: "Chapter text",
    bookCtaLabel: "Read free chapters",
  },
  fr: {
    archiveEyebrow: "Registre",
    archiveTitle: "Chapitres",
    archiveLead:
      "Les chapitres de MIAV-922228 — édition française.\nChaque entrée est un enregistrement de l’œuvre, lisible pour elle-même.",
    archiveEnd:
      "Fin de l’archive actuelle — d’autres chapitres seront inscrits au fur et à mesure.",
    chaptersCrumb: "Chapitres",
    previous: "Chapitre précédent",
    next: "Chapitre suivant",
    allChapters: "Tous les chapitres",
    openRecord: "Ouvrir",
    readingOrder: (n) => `Ceci est le chapitre ${n} de MIAV-922228.`,
    startFromChapterOne: "Commencer au chapitre I →",
    dateUnrecorded: "Date non enregistrée",
    chapterTextLabel: "Texte du chapitre",
    bookCtaLabel: "Lire les chapitres",
  },
};
