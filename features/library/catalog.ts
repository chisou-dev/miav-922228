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
    id: "the-silver-thread",
    slug: "the-silver-thread",
    title: "The Silver Thread",
    minutes: 5,
    body: [
      "The thread appeared one morning in a place no one remembered.",
      "It rose through the exposed rock of a mountain summit, a silver fiber as thick as a human arm. Its surface vibrated faintly. It was neither warm nor cold to the touch.",
      "The first survey team attempted to cut it. Lasers scattered. Diamond blades failed to leave even a scratch. Molecular interference produced no measurable effect.",
      "Only one fact could be confirmed.",
      "The thread grew at a perfectly constant rate.",
      "Every second, it grew by exactly one second.",
      "No one knew why.",
      "No one knew how to stop it.",
      "In time, people stopped observing it and simply lived with it.",
      "The thread became another feature of the mountain. Some spoke of it as a tourist attraction. Others kept their distance, as though it belonged to a religion they did not share.",
      "The first change was almost too small to notice.",
      "A young girl tied a red ribbon around the thread.",
      "The next day, it had moved several meters higher.",
      "“It was carried upward.”",
      "Someone said.",
      "The following day, someone else tied a letter. The day after that, a handkerchief.",
      "Then came coins.",
      "Photographs.",
      "Flowers.",
      "Whatever was tied to the thread was always found a little higher the next day.",
      "No one understood why.",
      "Still, people kept tying things to it.",
      "Before long, the mountain became a place for wishes.",
      "The names of those who had been lost.",
      "The names of children not yet born.",
      "Prayers addressed to a future that had not arrived.",
      "The thread offered nothing in return.",
      "It simply continued to grow.",
      "One second at a time.",
      "Then the records began to disagree.",
      "One observation stated:",
      "“Nothing is moving.”",
      "Another concluded:",
      "“It had already disappeared.”",
      "Neither record could be verified.",
      "It became clear that the thread was not extending upward alone.",
      "As the investigation continued, researchers discovered that the circular base of the thread extended into a hollow space beneath the mountain. Excavation beside the base proved unexpectedly easy. Several meters below the surface, the earth gave way to a uniform chamber.",
      "At its center was a spiral staircase descending farther into the darkness.",
      "The deeper they went, the less reliable time became. On one step, a second seemed to last longer than it should. On the next, it passed too quickly to measure. Heartbeats fell out of rhythm with the world around them. Even those walking side by side could no longer keep the same pace.",
      "The reports left by those who reached the deepest levels were all remarkably brief.",
      "“The moment I tried to say my child’s name, my tongue refused to move.”",
      "“My mother’s face no longer matches the photographs.”",
      "“I can remember everything except those ten years.”",
      "No report continued beyond that.",
      "At the bottom of the staircase was water.",
      "It did not ripple.",
      "It did not flow.",
      "It was simply there.",
      "What appeared on its surface differed from one observer to another. Everyone who looked into it returned in silence. No record described what had been seen.",
      "Those who came back to the surface were each found to be missing something different.",
      "The memory of attending university.",
      "The name of a lover.",
      "The road that had once led home.",
      "No pattern could be found.",
      "Meanwhile, offerings continued to gather on the mountain.",
      "One day, the neighbor of a person who had tied a letter to the thread claimed never to have known them.",
      "Someone who had tied a handkerchief found their own presence fading from family photographs.",
      "In a town where coins had been offered, several years of financial records vanished without explanation.",
      "No one connected these events.",
      "The reason to connect them had already disappeared.",
      "The world remained consistent.",
      "Only what had been lost was rewritten as though it had never existed.",
      "Still, the thread continued to grow.",
      "One second at a time.",
      "And little by little, even the records that spoke of people trying to stop it began to disappear.",
      "One day, the girl returned to the mountain.",
      "She was the same girl who had tied the first red ribbon.",
      "She carried an old photograph.",
      "Her mother was in it.",
      "She was smiling.",
      "The girl stopped a passerby and held out the photograph.",
      "“Do you know this woman?”",
      "The stranger studied it for a moment.",
      "“Who is she?”",
      "It was not the only answer.",
      "Everyone she asked replied the same way.",
      "That was when she understood.",
      "It was not that she alone had lost something.",
      "What had disappeared no longer remained in anyone’s world.",
      "Only the world itself had grown smaller.",
      "She tied another red ribbon to the thread.",
      "The same place.",
      "The same knot.",
      "Nothing happened.",
      "The thread simply grew by another second.",
      "Then she descended into the mountain.",
      "The spiral staircase reached deeper than before.",
      "With every step, the sound of her own name seemed to drift farther away.",
      "She repeated it to herself.",
      "Again.",
      "And again.",
      "Before she reached the bottom, she could no longer say it.",
      "The water was still there.",
      "It did not ripple.",
      "It did not flow.",
      "It simply was.",
      "On its surface, she saw her mother.",
      "She smiled with the calm expression of someone who should no longer have been alive.",
      "Beside her stood a young girl.",
      "The face was unfamiliar.",
      "Yet the moment she looked away, it seemed it might have been her own.",
      "There was no way left to know.",
      "Long ago, someone had said,",
      "“Wishes always come true.”",
      "They were wrong.",
      "Wishes do not come true.",
      "Only what has been lost can no longer be agreed upon.",
      "When she returned to the surface, she could no longer remember her own name.",
      "The photograph remained in her hands.",
      "The woman in it was still smiling.",
      "She no longer knew what to call her.",
      "On the mountain, someone was tying another wish to the thread.",
      "Nearby, someone else was forgetting the face of their family.",
      "The thread continued to grow.",
      "One second at a time.",
    ].join("\n\n"),
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
