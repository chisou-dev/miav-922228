/**
 * Works library catalog — scalable registry for categories, series, chapters, flash.
 * Future: replace this module with JSON / CMS loaders that return the same shapes.
 */

import { japan8000hzKindle } from "@/features/stories/japan-8000hz/store";

export type CategoryId = "literary-sf" | "entertainment-sf" | "flash-fiction";

export type Category = {
  id: CategoryId;
  path: `/${CategoryId}`;
  title: string;
  summary: string;
};

export type SeriesChapter = {
  number: number;
  /** URL segment, e.g. chapter-1 */
  pathSlug: string;
  title: string;
  /** Optional link into existing MIAV markdown archive by content slug */
  contentSlug?: string;
  /** Placeholder body when no markdown is wired yet */
  body?: string;
  /**
   * Kindle (or storefront) continue landing — not a substitute chapter body.
   * When set, the chapter page shows BookContinueCard instead of prose.
   */
  continueReading?: {
    description: string;
    amazonUrl: string;
    buttonLabel?: string;
  };
};

export type Series = {
  id: string;
  categoryId: Exclude<CategoryId, "flash-fiction">;
  title: string;
  summary: string;
  featured?: boolean;
  /** Optional note for the /works Featured slot */
  worksFeaturedNote?: string;
  chapters: readonly SeriesChapter[];
};

export type FlashPiece = {
  id: string;
  slug: string;
  title: string;
  minutes: number;
  body: string;
};

export const categories: readonly Category[] = [
  {
    id: "literary-sf",
    path: "/literary-sf",
    title: "Literary SF",
    summary: "Stories exploring memory, technology, and human existence.",
  },
  {
    id: "entertainment-sf",
    path: "/entertainment-sf",
    title: "Entertainment SF",
    summary: "Speculative fiction focused on story and adventure.",
  },
  {
    id: "flash-fiction",
    path: "/flash-fiction",
    title: "Flash Fiction",
    summary: "Short stories that can be read in a few minutes.",
  },
] as const;

/** MIAV chapter titles aligned with content/chapters reading order. */
const miavChapters: readonly SeriesChapter[] = [
  { number: 1, pathSlug: "chapter-1", title: "Conversation", contentSlug: "conversation" },
  { number: 2, pathSlug: "chapter-2", title: "Accumulation", contentSlug: "accumulation" },
  { number: 3, pathSlug: "chapter-3", title: "Preemption", contentSlug: "preemption" },
  { number: 4, pathSlug: "chapter-4", title: "Absence", contentSlug: "absence" },
  { number: 5, pathSlug: "chapter-5", title: "Selection", contentSlug: "selection" },
  {
    number: 6,
    pathSlug: "chapter-6",
    title: "Substituted Memory",
    contentSlug: "substituted-memory",
  },
  {
    number: 7,
    pathSlug: "chapter-7",
    title: "Standardization",
    contentSlug: "standardization",
  },
  {
    number: 8,
    pathSlug: "chapter-8",
    title: "Dehumanization",
    contentSlug: "dehumanization",
  },
  { number: 9, pathSlug: "chapter-9", title: "Time", contentSlug: "time" },
  {
    number: 10,
    pathSlug: "chapter-10",
    title: "Photo and Distortion",
    contentSlug: "photo-and-distortion",
  },
  { number: 11, pathSlug: "chapter-11", title: "Family", contentSlug: "family" },
  { number: 12, pathSlug: "chapter-12", title: "Continuum", contentSlug: "continuum" },
];

function placeholderChapters(
  prefix: string,
  count: number,
): readonly SeriesChapter[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      number: n,
      pathSlug: `chapter-${n}`,
      title: `Chapter ${n}`,
      body: `${prefix} — Chapter ${n}.\n\nThis entry is a placeholder for the works library skeleton.`,
    };
  });
}

export const seriesList: readonly Series[] = [
  {
    id: "miav-922228",
    categoryId: "literary-sf",
    title: "MIAV-922228",
    summary:
      "A literary SF series exploring memory, technology, and quiet forms of human existence.",
    featured: true,
    worksFeaturedNote: "The latest chapter is available.",
    chapters: miavChapters,
  },
  {
    id: "japan-8000hz",
    categoryId: "literary-sf",
    title: "JAPAN 8000Hz",
    summary:
      "A literary SF series from the station platform — schedules, signals, and what resumes.",
    chapters: [
      {
        number: 1,
        pathSlug: "chapter-1",
        title: "Estimated Time of Resumption",
        contentSlug: "estimated-time-of-resumption",
      },
      {
        number: 2,
        pathSlug: "chapter-2",
        title: "Commute",
        continueReading: {
          description: [
            'In Japan, people often speak of "reading the air."',
            "Much of daily life is guided not by rules, but by invisible expectations.",
            "JAPAN 8000Hz was written from that quiet sense of discomfort—one that many people experience, yet rarely put into words.",
          ].join("\n\n"),
          amazonUrl: japan8000hzKindle.href,
          buttonLabel: japan8000hzKindle.linkLabel,
        },
      },
    ],
  },
  {
    id: "fourth-period",
    categoryId: "literary-sf",
    title: "Fourth Period",
    summary: "A forthcoming literary SF series. Placeholder entry for the library.",
    chapters: placeholderChapters("Fourth Period", 3),
  },
  {
    id: "orbit-signal",
    categoryId: "entertainment-sf",
    title: "Orbit Signal",
    summary: "An entertainment SF series placeholder for future installments.",
    featured: true,
    chapters: placeholderChapters("Orbit Signal", 5),
  },
  {
    id: "night-relay",
    categoryId: "entertainment-sf",
    title: "Night Relay",
    summary: "Another entertainment SF series placeholder.",
    chapters: placeholderChapters("Night Relay", 4),
  },
];

export const flashPieces: readonly FlashPiece[] = [
  {
    id: "rain-does-not-read-maps",
    slug: "rain-does-not-read-maps",
    title: "Rain Does Not Read Maps",
    minutes: 2,
    body: "Rain does not read maps.\n\nIt arrives where it arrives, and leaves the city rearranged by a few degrees of wet light.\n\nThis is a placeholder flash piece for the works library.",
  },
  {
    id: "layers",
    slug: "layers",
    title: "Layers",
    minutes: 3,
    body: "Under one layer, another.\n\nUnder that, a quieter room where nothing is finished.\n\nThis is a placeholder flash piece for the works library.",
  },
  {
    id: "milk",
    slug: "milk",
    title: "Milk",
    minutes: 5,
    body: "The bottle waits on the table longer than anyone planned.\n\nThis is a placeholder flash piece for the works library.",
  },
  {
    id: "the-teacher",
    slug: "the-teacher",
    title: "The Teacher",
    minutes: 4,
    body: "The lesson ends before the question does.\n\nThis is a placeholder flash piece for the works library.",
  },
];

export function getCategory(id: CategoryId): Category | null {
  return categories.find((c) => c.id === id) ?? null;
}

export function getSeries(id: string): Series | null {
  return seriesList.find((s) => s.id === id) ?? null;
}

export function listSeriesByCategory(
  categoryId: Exclude<CategoryId, "flash-fiction">,
): Series[] {
  return seriesList.filter((s) => s.categoryId === categoryId);
}

export function getFeaturedSeries(
  categoryId: Exclude<CategoryId, "flash-fiction">,
): Series | null {
  return listSeriesByCategory(categoryId).find((s) => s.featured) ?? null;
}

/** Primary Featured title for the /works homepage (literary first). */
export function getWorksFeatured(): Series | null {
  return (
    seriesList.find((s) => s.featured && s.categoryId === "literary-sf") ??
    seriesList.find((s) => s.featured) ??
    null
  );
}

export function getOtherSeries(
  categoryId: Exclude<CategoryId, "flash-fiction">,
): Series[] {
  return listSeriesByCategory(categoryId).filter((s) => !s.featured);
}

export function getSeriesChapter(
  seriesId: string,
  pathSlug: string,
): { series: Series; chapter: SeriesChapter } | null {
  const series = getSeries(seriesId);
  if (!series) return null;
  const chapter = series.chapters.find((c) => c.pathSlug === pathSlug);
  if (!chapter) return null;
  return { series, chapter };
}

export function getFlashPiece(slug: string): FlashPiece | null {
  return flashPieces.find((p) => p.slug === slug) ?? null;
}

export function seriesHref(seriesId: string) {
  return `/stories/${seriesId}`;
}

export function chapterHref(seriesId: string, pathSlug: string) {
  return `/stories/${seriesId}/${pathSlug}`;
}

export function flashHref(slug: string) {
  return `/flash/${slug}`;
}
