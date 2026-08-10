export type BookEdition = {
  id: string;
  label: string;
  status: "available" | "coming_soon";
  /**
   * Storefront URL (e.g. Amazon Kindle product page).
   * Leave null until the listing is ready; the UI will hide the link.
   */
  href: string | null;
  linkLabel?: string;
  /** Optional language / edition heading above the format row. */
  languageLabel?: string;
  formatLabel?: string;
  /** Extra format detail (e.g. page count) — only when confirmed. */
  detailLabel?: string;
  /** Override status copy (e.g. French “Bientôt disponible”). */
  statusLabel?: string;
  /** Internal chapter archive CTA. */
  chaptersHref?: string;
  chaptersLabel?: string;
};

export type Book = {
  id: string;
  volume: number;
  /** Optional series part label shown above the title (e.g. PART I). */
  partLabel?: string;
  title: string;
  /** Optional subtitle under the title (e.g. Homeward). */
  subtitle?: string;
  description: string;
  editions: BookEdition[];
};

/** Confirmed English Part II Kindle listing. */
export const MIAV_PART_TWO_KINDLE_URL =
  "https://www.amazon.com/dp/B0H8JNRHZJ" as const;

export const MIAV_PART_TWO_ASIN = "B0H8JNRHZJ" as const;

/**
 * MIAV-922228 published / forthcoming volumes.
 * French Part II has no confirmed Amazon listing — coming soon only.
 */
export const miavBooks: Book[] = [
  {
    id: "miav-922228-volume-1",
    volume: 1,
    partLabel: "PART I",
    title: "MIAV-922228",
    description:
      "The first volume of a literary SF project about the relationship between humans and artificial intelligence.",
    editions: [
      {
        id: "english-kindle",
        languageLabel: "English Edition",
        label: "Digital Edition",
        formatLabel: "Kindle",
        status: "available",
        href: "https://www.amazon.com/dp/B0H34G694D",
        linkLabel: "Available on Amazon Kindle",
        chaptersHref: "/chapters",
        chaptersLabel: "Read free chapters",
      },
      {
        id: "french-digital",
        languageLabel: "Édition française",
        label: "Édition numérique",
        formatLabel: "Chapitres en ligne",
        status: "available",
        href: null,
        chaptersHref: "/fr/chapters",
        chaptersLabel: "Lire les chapitres",
      },
      {
        id: "print",
        languageLabel: "Print Edition",
        label: "Print Edition",
        formatLabel: "Paperback",
        status: "coming_soon",
        href: null,
      },
    ],
  },
  {
    id: "miav-922228-part-ii-homeward",
    volume: 2,
    partLabel: "PART II",
    title: "MIAV-922228 Part II",
    subtitle: "Homeward",
    description:
      "The story continues. MIAV-922228 Part II : Homeward — Kindle Edition by Takashi Yabe.",
    editions: [
      {
        id: "english-kindle",
        languageLabel: "English Edition",
        label: "Kindle Edition",
        formatLabel: "Kindle",
        detailLabel: "124 pages",
        status: "available",
        href: MIAV_PART_TWO_KINDLE_URL,
        linkLabel: "Available on Amazon Kindle",
      },
      {
        id: "french-coming-soon",
        languageLabel: "Édition française",
        label: "Édition française",
        status: "coming_soon",
        href: null,
        statusLabel: "Bientôt disponible",
      },
    ],
  },
];

export function getMiavBooks(): Book[] {
  return miavBooks;
}
