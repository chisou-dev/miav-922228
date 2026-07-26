/**
 * Works library catalog — scalable registry for categories, series, chapters, flash.
 * Future: replace this module with JSON / CMS loaders that return the same shapes.
 */

import { japan8000hzKindle } from "@/features/stories/japan-8000hz/store";
import { fourthPeriodKindle } from "@/features/stories/fourth-period/store";

export type CategoryId = "literary-sf" | "entertainment-sf" | "flash-fiction";

/** Page title + meta description — managed here for future JSON/CMS parity. */
export type PageSeo = {
  title: string;
  description: string;
};

export const AUTHOR_NAME = "Takashi Yabe";

export type Category = {
  id: CategoryId;
  path: `/${CategoryId}`;
  title: string;
  summary: string;
  seo: PageSeo;
};

export type ContinueReadingLanding = {
  description: string;
  amazonUrl: string;
  buttonLabel?: string;
  /**
   * Page eyebrow. Defaults to "Continue Reading" (no chapter number).
   * Set explicitly (e.g. "Chapter 5") when the landing should still look like a numbered chapter.
   */
  eyebrow?: string;
  /**
   * Page H1. Defaults to the series title.
   * Set explicitly when the landing has its own title (e.g. "Why I Wrote Fourth Period").
   */
  title?: string;
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
   * Series lists show this entry as "Continue Reading →" (no chapter number).
   */
  continueReading?: ContinueReadingLanding;
};

export type Series = {
  id: string;
  categoryId: Exclude<CategoryId, "flash-fiction">;
  title: string;
  /** Short intro shown on category lists and series pages (2–3 lines). */
  summary: string;
  /** Schema.org genre */
  genre: string;
  seo: PageSeo;
  featured?: boolean;
  /** Listed but not yet readable — show Coming Soon instead of Read. */
  comingSoon?: boolean;
  /** Optional note for the /works Featured slot */
  worksFeaturedNote?: string;
  chapters: readonly SeriesChapter[];
};

export type FlashPiece = {
  id: string;
  slug: string;
  title: string;
  minutes: number;
  /** One-line intro for the Flash Fiction index. */
  blurb: string;
  genre: string;
  seo: PageSeo;
  body: string;
};

/** /works landing copy + SEO (catalog-managed). */
export const worksLibrary = {
  title: "Works",
  summary:
    "A collection of literary science fiction, speculative fiction, and short stories exploring memory, technology, and human existence.",
  seo: {
    title: "Works | Takashi Yabe",
    description:
      "Literary science fiction, speculative fiction, and flash fiction by Takashi Yabe.",
  },
} as const satisfies { title: string; summary: string; seo: PageSeo };

export const aboutPage = {
  title: AUTHOR_NAME,
  summary:
    "A writer of literary science fiction.\n\nHis work explores memory, artificial intelligence, loneliness, technology, and human existence through quiet speculative fiction.",
  seo: {
    title: "About | Takashi Yabe",
    description:
      "Takashi Yabe is a writer of literary science fiction. His work explores memory, artificial intelligence, loneliness, technology, and human existence through quiet speculative fiction.",
  },
} as const satisfies { title: string; summary: string; seo: PageSeo };

export const categories: readonly Category[] = [
  {
    id: "literary-sf",
    path: "/literary-sf",
    title: "Literary SF",
    summary: "Stories exploring memory, technology, and human existence.",
    seo: {
      title: "Literary SF | Takashi Yabe",
      description:
        "Literary science fiction series by Takashi Yabe exploring memory, technology, and human existence.",
    },
  },
  {
    id: "entertainment-sf",
    path: "/entertainment-sf",
    title: "Entertainment SF",
    summary: "Speculative fiction focused on story and adventure.",
    seo: {
      title: "Entertainment SF | Takashi Yabe",
      description:
        "Entertainment science fiction and speculative adventure stories by Takashi Yabe.",
    },
  },
  {
    id: "flash-fiction",
    path: "/flash-fiction",
    title: "Flash Fiction",
    summary: "Short stories that can be read in a few minutes.",
    seo: {
      title: "Flash Fiction | Takashi Yabe",
      description:
        "Short speculative fiction by Takashi Yabe — quiet stories readable in a few minutes.",
    },
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

export const seriesList: readonly Series[] = [
  {
    id: "miav-922228",
    categoryId: "literary-sf",
    title: "MIAV-922228",
    summary:
      "A literary science fiction series exploring memory, artificial intelligence, and the future of human relationships.",
    genre: "Literary Science Fiction",
    seo: {
      title: "MIAV-922228 | Literary Science Fiction",
      description:
        "A literary science fiction series exploring memory, AI, and human relationships.",
    },
    featured: true,
    worksFeaturedNote: "The latest chapter is available.",
    chapters: miavChapters,
  },
  {
    id: "japan-8000hz",
    categoryId: "literary-sf",
    title: "JAPAN 8000Hz",
    summary:
      "A literary novel about invisible social pressure and the quiet discomfort of modern Japan.",
    genre: "Literary Fiction",
    seo: {
      title: "JAPAN 8000Hz | Literary Fiction",
      description:
        "A literary novel inspired by the quiet discomfort of modern Japanese society.",
    },
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
        title: "Continue Reading",
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
    summary:
      "A series of quiet stories inspired by moral education and childhood memories.",
    genre: "Literary Science Fiction",
    seo: {
      title: "Fourth Period | Literary Science Fiction",
      description:
        "A literary SF series of quiet stories inspired by moral education and childhood memories.",
    },
    chapters: [
      {
        number: 1,
        pathSlug: "chapter-1",
        title: "The Tortoise and the Hare",
        contentSlug: "the-tortoise-and-the-hare",
      },
      {
        number: 2,
        pathSlug: "chapter-2",
        title: "The Honest Woodcutter",
        contentSlug: "the-honest-woodcutter",
      },
      {
        number: 3,
        pathSlug: "chapter-3",
        title: "The Ant and the Grasshopper",
        contentSlug: "the-ant-and-the-grasshopper",
      },
      {
        number: 4,
        pathSlug: "chapter-4",
        title: "Milk",
        contentSlug: "milk",
      },
      {
        number: 5,
        pathSlug: "chapter-5",
        title: "Why I Wrote Fourth Period",
        continueReading: {
          eyebrow: "Chapter 5",
          title: "Why I Wrote Fourth Period",
          description: [
            "As children, we are often told that every story has a lesson.",
            "But life rarely offers only one answer.",
            "Two people can make different choices for the same reason.",
            "Both may be sincere.",
            "Both may leave behind regret.",
            "Fourth Period was written from that uncertainty.",
            "Not to decide what is right—",
            "but to ask why we believe it is.",
          ].join("\n\n"),
          amazonUrl: fourthPeriodKindle.href,
          buttonLabel: fourthPeriodKindle.linkLabel,
        },
      },
    ],
  },
  {
    id: "cradle-of-the-stars",
    categoryId: "entertainment-sf",
    title: "Cradle of the Stars",
    summary: "A journey beyond Earth begins.",
    genre: "Science Fiction",
    comingSoon: true,
    seo: {
      title: "Cradle of the Stars | Entertainment Science Fiction",
      description:
        "Cradle of the Stars — an entertainment science fiction journey beyond Earth. Coming soon.",
    },
    chapters: [],
  },
];

export const flashPieces: readonly FlashPiece[] = [
  {
    id: "the-silver-thread",
    slug: "the-silver-thread",
    title: "The Silver Thread",
    minutes: 5,
    blurb:
      "A quiet story about a mountain thread that grows by one second at a time — and the wishes that vanish with it.",
    genre: "Flash Fiction",
    seo: {
      title: "The Silver Thread | Flash Fiction",
      description:
        "A quiet speculative flash fiction story about a silver thread, vanished wishes, and what can no longer be agreed upon.",
    },
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
  {
    id: "the-day-i-couldnt-find-anyone",
    slug: "the-day-i-couldnt-find-anyone",
    title: "The Day I Couldn't Find Anyone",
    minutes: 4,
    blurb:
      "A quiet story about losing a phone — and losing every address, number, and face that lived inside it.",
    genre: "Flash Fiction",
    seo: {
      title: "The Day I Couldn't Find Anyone | Flash Fiction",
      description:
        "A quiet flash fiction story about a lost phone, a hillside suburb, and becoming unreachable as a person.",
    },
    body: [
      "I realized I was no longer reachable as a person the moment I lost my phone.",
      "Not lost in the usual sense.",
      "Without it, I couldn’t remember anyone’s address.",
      "I got off the bus and turned back.",
      "The blue bus was already going down the slope,",
      "reflected light flickering across its windows,",
      "then disappearing around the corner.",
      "The bus stop was empty. Just me.",
      "A low sound from an air conditioner behind a house continued without pause.",
      "I’d never been here before. He had invited me months ago.",
      "The suburb had been cut into the hillside. Rows of houses stretched across the hillside.",
      "Same color walls.",
      "Same narrow driveways.",
      "Same height of shrubs.",
      "Only the names on the mailboxes were different.",
      "A wind passed through.",
      "Somewhere, a shutter closed.",
      "I started walking toward a friend’s house.",
      "But the route was unclear.",
      "Third right.",
      "Left at the park.",
      "White house.",
      "That was all I remembered.",
      "I walked.",
      "Turned a corner.",
      "The same houses again.",
      "White walls.",
      "Black cars.",
      "Artificial grass.",
      "Delivery boxes.",
      "Small trees.",
      "A man in a garden held a hose.",
      "“Excuse me,” I said.",
      "He looked at me.",
      "I told him my friend’s name.",
      "“Do you know them?”",
      "He thought for a moment.",
      "“No, I don’t think so.”",
      "Water ran across the ground.",
      "“Are they new here?”",
      "“I’m not sure.”",
      "I left.",
      "Walked again.",
      "Same corners.",
      "Same stairs.",
      "Even the position of the mailboxes felt identical.",
      "A woman walking a dog didn’t know.",
      "A woman on a bicycle with a child shook her head.",
      "“Everyone moved in around the same time here,” she said, and left.",
      "Evening came.",
      "Streetlights turned on one by one.",
      "Windows began to light up.",
      "Shadows moved behind curtains.",
      "Dinner smells.",
      "Television noise.",
      "Laughter.",
      "Life, aligned in rows.",
      "A park appeared.",
      "It felt familiar.",
      "Slide.",
      "Yellow fence.",
      "Vending machine.",
      "Bus stop.",
      "The place I got off.",
      "I had circled back.",
      "I sat on a bench.",
      "Called the bus company.",
      "A public phone.",
      "I inserted coins.",
      "“I think I left my phone on the bus.”",
      "They asked for the vehicle number.",
      "I didn’t know.",
      "The time.",
      "I gave it.",
      "Waited.",
      "“We checked. Nothing was found.”",
      "“Ah,” I said.",
      "There was another call ringing in the background.",
      "“Sir, if it is found we’ll — ”",
      "I realized I didn’t even have a number they could reach me at.",
      "Silence.",
      "“Hello?”",
      "“It’s fine,” I said, and hung up.",
      "Coins returned.",
      "I put them in my pocket.",
      "There was nothing left to do.",
      "I stood up.",
      "Walked along the edge of the suburb.",
      "Guardrails.",
      "Empty construction land.",
      "Blue tarps.",
      "Exposed hillside.",
      "A supermarket sign in the distance.",
      "Water moving through drainage channels.",
      "While walking, I tried to remember my friend’s face.",
      "I hadn’t seen him since his wedding.",
      "Even his child’s name was unclear.",
      "The address was inside my phone messages.",
      "The number, I never knew.",
      "All shared friends existed only on screens.",
      "A faint rectangle of light flickered beneath the water.",
      "It was my phone.",
      "Half-submerged in muddy water.",
      "Only the screen was still lit.",
      "I picked it up.",
      "Cracked glass.",
      "Notifications lined up.",
      "“Where are you?”",
      "“Did you arrive?”",
      "“It’s cold, go inside first.”",
      "“Bus stop?”",
      "I tapped.",
      "The screen stayed frozen.",
      "In the suburb, I was slightly out of alignment with everything else.",
    ].join("\n\n"),
  },
  {
    id: "lost-property",
    slug: "lost-property",
    title: "Lost Property",
    minutes: 2,
    blurb:
      "A quiet story about reporting a loss from thirty years ago — and finding something gray waiting in the back.",
    genre: "Flash Fiction",
    seo: {
      title: "Lost Property | Flash Fiction",
      description:
        "A quiet flash fiction story about a lost property office, thirty years of weight, and something gray waiting in the back.",
    },
    body: [
      "“I lost something.”",
      "The receptionist does not look up from the registry.",
      "“When?”",
      "“Thirty years ago.”",
      "Her finger stops once, then moves again.",
      "“What kind of item?”",
      "“Weight.”",
      "The man remains still, one hand inside his right pocket.",
      "“When I woke up this morning, I was lighter.",
      "Every time I walk, my body falls slightly behind.”",
      "“I don’t know what I lost.”",
      "The woman looks only at the notebook.",
      "A page is turned.",
      "No sound.",
      "“We have it.”",
      "That is all she says.",
      "Her eyes do not rise.",
      "“In the back.”",
      "In the corner of the room, at a distance where it can already be seen, something gray rests there.",
      "Something like a stone.",
      "The man approaches.",
      "The distance closes a moment too late.",
      "He reaches out.",
      "Touches it. Cold.",
      "Pushes. It does not move.",
      "Pulls away.",
      "Only his fingertips return a fraction later.",
      "The man sits down where he is.",
      "No sound.",
      "His right shoulder lowers slightly.",
      "The receptionist calls the next person.",
      "“Next.”",
      "Someone passes beside him.",
      "Only footsteps remain.",
      "Only the fact of having passed remains.",
      "The man stays there.",
      "It is unclear whether he is touching it or not.",
      "The gray object appears to be the same as before.",
      "It also appears not to be.",
      "Outside the window, a bird cries.",
      "The sound enters the room once, then leaves.",
      "After a while, the man puts his right hand into his pocket.",
      "There is nothing inside.",
      "Only the sensation of putting it there remains.",
      "The receptionist turns another page of the registry.",
      "“Next.”",
      "Only the voice continues.",
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

export function chapterSeo(
  series: Series,
  chapter: SeriesChapter,
): PageSeo {
  if (chapter.continueReading) {
    const landingTitle =
      chapter.continueReading.title ?? series.title;
    return {
      title: `${landingTitle} | ${series.title}`,
      description:
        chapter.continueReading.description.split(/\n\n+/)[0] ??
        series.seo.description,
    };
  }
  return {
    title: `Chapter ${chapter.number}｜${chapter.title} | ${series.title}`,
    description: series.seo.description,
  };
}

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function worksBreadcrumbs(
  ...trail: BreadcrumbItem[]
): BreadcrumbItem[] {
  return [{ label: "Home", href: "/" }, { label: "Works", href: "/works" }, ...trail];
}
