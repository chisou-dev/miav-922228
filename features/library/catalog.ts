/**
 * Works library catalog — scalable registry for categories, series, chapters, flash.
 * Future: replace this module with JSON / CMS loaders that return the same shapes.
 */

import { japan8000hzKindle } from "@/features/stories/japan-8000hz/store";
import { fourthPeriodKindle } from "@/features/stories/fourth-period/store";
import {
  after50MillionChapterDescriptions,
  after50MillionChapterDocumentTitle,
  after50MillionChapters,
  after50MillionPreviewNote,
  after50MillionSummary,
  after50MillionWorkId,
} from "@/features/stories/after-50-million/work";
import { AFTER_50_MILLION_HERO } from "@/features/stories/after-50-million/visual";
import {
  nextTimeISeeYouChapters,
  nextTimeISeeYouGenre,
  nextTimeISeeYouWorkId,
} from "@/features/stories/next-time-i-see-you/work";
import {
  chapterDocumentTitle,
  chapterMetaDescription,
} from "@/features/stories/miav/chapterSeo";

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
  /** Overrides the default "Chapter {number}" label in lists and chapter chrome. */
  label?: string;
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
  /** When set, UI shows "Final Chapter" instead of "Chapter {number}". */
  finalChapter?: boolean;
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
  /** Cover for the work page and library card. */
  cover?: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
  /** Display language on library cards, e.g. "English". */
  language?: string;
  /** Shown with the chapter list when only part of the work is on the site. */
  previewNote?: string;
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
    "Fiction and stories within MIAV-922228—quiet, character-driven works about people, memory, relationships, technology, and time.",
  seo: {
    title: "Works | MIAV-922228",
    description:
      "Quiet, character-driven fiction within MIAV-922228, from literary and contemporary stories to shorter works.",
  },
} as const satisfies { title: string; summary: string; seo: PageSeo };

export const aboutPage = {
  title: "About MIAV",
  summary:
    "MIAV-922228 is an independent creative project bringing together quiet, character-driven stories, browser games, apps, and digital experiments.\n\nCreated by Takashi Yabe, it explores people, memory, relationships, technology, loneliness, and the passage of time through fiction and interactive works.",
  seo: {
    title: "About | MIAV-922228",
    description:
      "MIAV-922228 is an independent creative project by Takashi Yabe—quiet, character-driven stories, browser games, apps, and digital experiments.",
  },
} as const satisfies { title: string; summary: string; seo: PageSeo };

export const categories: readonly Category[] = [
  {
    id: "literary-sf",
    path: "/literary-sf",
    title: "Literary Fiction",
    summary:
      "Quiet, character-driven stories exploring people, memory, relationships, technology, and time.",
    seo: {
      title: "Literary Fiction | MIAV-922228",
      description:
        "Quiet, character-driven literary fiction from MIAV-922228 exploring people, memory, relationships, technology, and time.",
    },
  },
  {
    id: "entertainment-sf",
    path: "/entertainment-sf",
    title: "Entertainment",
    summary: "Story-driven fiction across genres.",
    seo: {
      title: "Entertainment | MIAV-922228",
      description:
        "Story-driven fiction across genres from MIAV-922228.",
    },
  },
  {
    id: "flash-fiction",
    path: "/flash-fiction",
    title: "Flash Fiction",
    summary: "Short stories that can be read in a few minutes.",
    seo: {
      title: "Flash Fiction | MIAV-922228",
      description:
        "Short fiction from MIAV-922228 — quiet stories readable in a few minutes.",
    },
  },
] as const;

/** MIAV chapter titles aligned with content/chapters reading order. */
const miavChapters: readonly SeriesChapter[] = [
  { number: 1, pathSlug: "chapter-1", title: "Mia", contentSlug: "conversation" },
  { number: 2, pathSlug: "chapter-2", title: "Bitter", contentSlug: "accumulation" },
  {
    number: 3,
    pathSlug: "chapter-3",
    title: "The Train Home",
    contentSlug: "preemption",
  },
  { number: 4, pathSlug: "chapter-4", title: "Repair", contentSlug: "absence" },
  { number: 5, pathSlug: "chapter-5", title: "Replies", contentSlug: "selection" },
  {
    number: 6,
    pathSlug: "chapter-6",
    title: "The Vending Machine",
    contentSlug: "substituted-memory",
  },
  {
    number: 7,
    pathSlug: "chapter-7",
    title: "11:40",
    contentSlug: "standardization",
  },
  {
    number: 8,
    pathSlug: "chapter-8",
    title: "Candidate",
    contentSlug: "dehumanization",
  },
  { number: 9, pathSlug: "chapter-9", title: "Stable", contentSlug: "time" },
  {
    number: 10,
    pathSlug: "chapter-10",
    title: "The Flyer",
    contentSlug: "photo-and-distortion",
  },
  { number: 11, pathSlug: "chapter-11", title: "At Home", contentSlug: "family" },
  {
    number: 12,
    pathSlug: "chapter-12",
    title: "The Dog",
    contentSlug: "virtual-world",
  },
  {
    number: 13,
    pathSlug: "chapter-13",
    title: "0.3°C",
    contentSlug: "shutdown",
  },
  {
    number: 14,
    pathSlug: "chapter-14",
    title: "Photograph",
    contentSlug: "photograph",
  },
];

export const seriesList: readonly Series[] = [
  {
    id: "miav-922228",
    categoryId: "literary-sf",
    title: "MIAV-922228",
    summary:
      "A quiet literary series about artificial intelligence, memory, family, relationships, and the passage of time.",
    genre: "Literary Fiction",
    seo: {
      title:
        "MIAV-922228 — Literary Fiction About AI, Memory and Family | Takashi Yabe",
      description:
        "A quiet literary series about artificial intelligence, memory, family, relationships, and the passage of time.",
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
    genre: "Literary Fiction",
    seo: {
      title: "Fourth Period | Literary Fiction",
      description:
        "A literary fiction series of quiet stories inspired by moral education and childhood memories.",
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
          description: fourthPeriodKindle.continueBlurb,
          amazonUrl: fourthPeriodKindle.href,
          buttonLabel: fourthPeriodKindle.linkLabel,
        },
      },
    ],
  },
  {
    id: after50MillionWorkId,
    categoryId: "literary-sf",
    title: "After ¥50 Million",
    summary: after50MillionSummary,
    genre: "Literary Fiction",
    language: "English",
    previewNote: after50MillionPreviewNote,
    cover: {
      src: AFTER_50_MILLION_HERO.path,
      width: AFTER_50_MILLION_HERO.width,
      height: AFTER_50_MILLION_HERO.height,
      alt: AFTER_50_MILLION_HERO.alt,
    },
    seo: {
      title: `After ¥50 Million | ${AUTHOR_NAME}`,
      description: after50MillionSummary,
    },
    chapters: after50MillionChapters,
  },
  {
    id: nextTimeISeeYouWorkId,
    categoryId: "entertainment-sf",
    title: "Next Time I See You",
    summary:
      "A coming-of-age short story about first love, a lost letter, and the words we wait too long to say.",
    genre: nextTimeISeeYouGenre,
    seo: {
      title:
        "Next Time I See You — A Coming-of-Age Short Story About First Love | Takashi Yabe",
      description:
        "A quiet coming-of-age short story about first love, a lost letter, piano lessons, and the words we wait too long to say.",
    },
    chapters: nextTimeISeeYouChapters,
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
      "Researchers discover a silver thread emerging from the rock at a mountain summit.",
    genre: "Flash Fiction",
    seo: {
      title: "The Silver Thread | Flash Fiction",
      description:
        "Researchers discover a silver thread emerging from the rock at a mountain summit.",
    },
    body: [
      "The thread appeared one morning in a place no one remembered. It rose from a seam in the exposed rock at the summit of a mountain, silver and about as thick as a person's arm. The first survey team felt a faint vibration when they touched it. Their instruments could not establish its temperature.",
      "They tried to cut it with diamond blades. When those failed, they brought in a laser, which left no mark either. Attempts to alter its molecular structure were no more successful. They marked the thread just above the rock. By the next morning, the mark was several meters higher. They measured it again over the following days. It kept rising at the same rate, though the part emerging from the rock looked unchanged.",
      "People went up the mountain to watch the instruments. After a while, they stopped making the trip.",
      "Then a girl tied a red ribbon around the thread. The following morning, it was several meters above the place where she'd tied it. Someone fastened a letter below the ribbon, and soon visitors were bringing things of their own. Photographs appeared among the handkerchiefs. People pressed coins into the knots before letting go.",
      "Some had come to remember someone they'd lost. There were also names for children not yet born. No one knew where the offerings went as they rose, but people kept coming.",
      "The trouble began with the measurements. One team reported that the thread had not moved. Another, working from the same instruments, recorded that it had already disappeared. Both teams checked their results, and neither would withdraw its report.",
      "During another survey, workers discovered that the base continued below the rock. The ground beside it gave way easily, opening into a chamber with a spiral staircase at its center.",
      "The girl who had tied the first ribbon came back while they were working. A rope had been strung across the path. She stood behind it and looked up the thread, but her ribbon had risen beyond where she could see.",
      "On the first descent, a researcher counted the steps aloud. At the landing he stopped and looked back. The rest of the team had gone on ahead, though he'd heard their footsteps beside him. They waited for him, but farther down the same thing happened again.",
      "One man came back holding a photograph of his mother. At the entrance he asked a colleague who she was, then refused to believe the answer. Another researcher tried to say his child's name. He could remember the child's face, but his mouth would not form the word. In the reports they filed afterward, the years some of them had spent at university were missing.",
      "At the bottom of the staircase was a pool of water. Its surface did not move. People who looked into it returned without saying what they had seen. Back above ground, they discovered that parts of their lives had gone missing. A road they had taken home for years might no longer be familiar. Someone could remember being in love but not the other person's name.",
      "The offerings continued to rise.",
      "A man who had tied a letter to the thread returned home and greeted his neighbor. She had lived across from him for years, but now she asked who he was. He waited for her to laugh. She went inside.",
      "A woman opened her family album and found that someone who had offered a handkerchief at the summit had vanished from the photographs. In a town where people had left coins at the summit, clerks opened the cabinets that should have held several years of financial records. The folders were missing.",
      "The investigators tried to compare what had happened. By the time they collected the accounts, some of the people who had made them had forgotten doing so. Names in earlier notes led nowhere. At their meetings, no one could agree on what they were supposed to discuss.",
      "The girl who had tied the first ribbon returned to the mountain with an old photograph of her mother. She stopped a man on the path and showed it to him.",
      '"Do you know her?"',
      "He studied the picture before handing it back.",
      '"No. Sorry."',
      "She asked other visitors. No one recognized the woman.",
      "At the summit, she tied another red ribbon around the thread, fastening it the way she had before. She waited beside it, then went down the staircase beneath the mountain.",
      "It was longer than she'd expected from the reports. As she descended, she repeated her own name. She could remember its sound while she was saying it, but each time she stopped, she had to begin again. Before she reached the bottom, she could no longer say it.",
      "The pool was where the surveyors had described it. In the water she saw her mother smiling, with a younger girl beside her. The girl's face was unfamiliar. When she looked away, she thought it might have been her own.",
      "By the time she reached the summit, she had forgotten her name. She was holding the photograph, though she could not remember what she had once called the woman in it.",
      "Someone near the path was tying another wish to the thread. A woman waiting her turn held a family photograph. She turned it over and looked at the back, then turned it over again.",
    ].join("\n\n"),
  },
  {
    id: "the-day-i-couldnt-find-anyone",
    slug: "the-day-i-couldnt-find-anyone",
    title: "The Day I Couldn't Find Anyone",
    minutes: 4,
    blurb:
      "He gets off the bus in an unfamiliar hillside suburb and realizes his phone is missing.",
    genre: "Flash Fiction",
    seo: {
      title: "The Day I Couldn't Find Anyone | Flash Fiction",
      description:
        "He gets off the bus in an unfamiliar hillside suburb and realizes his phone is missing.",
    },
    body: [
      "The bus had pulled away by the time I noticed my phone was missing. I checked my pockets again, then looked down the slope, where the blue bus was already turning the corner. Sunlight flashed across its windows before it disappeared. I must have left the phone on the bus.",
      "I had come to visit a friend who had invited me months earlier. I'd never been to his house. He'd sent me the address and directions in a message, but without my phone I could remember only parts of them.",
      "The neighborhood had been built into the hillside. The houses stood close together, with narrow driveways and small shrubs planted along the fronts. Most of them were white. I went over what I could recall of the directions: the third right, a left at the park, then a white house.",
      "An air conditioner hummed behind a fence as I started uphill. At the first corner I hesitated, trying to remember whether the bus stop counted as the starting point. I took the turn anyway.",
      "A man was watering his garden. I gave him my friend's name and asked if he knew where he lived.",
      "He turned the hose away from the flowers.",
      '"I don\'t think so. Did he just move here?"',
      '"I\'m not sure."',
      "The man glanced toward the next row of houses, then shook his head. I thanked him and walked on.",
      "I passed a woman with a dog, but she hadn't heard the name either. Farther along, a woman riding a bicycle with a child behind her slowed when I asked. She told me most of the families had moved in around the same time, then pushed off again.",
      "At each junction I found another row of similar houses. Several had black cars in front and artificial grass beside the driveways. I checked the names on the mailboxes, though I had no idea what street I was supposed to be on.",
      "By the time the streetlights came on, people were eating dinner. Through a window I saw someone getting up from a table. Somewhere nearby a television was playing, loud enough to hear from the pavement. There were people in nearly every house, but I couldn't think of another question to ask them.",
      "A park came into view. I recognized the yellow fence beside the slide, then the vending machine across the road. Beyond it was the bus stop where I'd arrived.",
      "I had walked in a circle.",
      "There was a public phone near the park. I called the bus company and told the woman who answered that I had left my phone on the bus. She asked for the vehicle number. I could only tell her what time I'd got off.",
      "She put me on hold. I stood with the receiver against my ear while another phone rang somewhere in her office.",
      '"I\'m sorry. Nothing\'s been turned in. If someone finds it, we can contact you. What\'s the best number?"',
      "I looked at the keypad.",
      '"I don\'t have one right now."',
      '"Is there another number we could try?"',
      '"No. That\'s all right."',
      "After I hung up, I took the unused coins from the tray and put them in my pocket.",
      "I followed the road around the outside of the neighborhood. Past the last houses, a guardrail ran alongside a patch of cleared land. Blue tarps were stretched over the exposed slope, and I could see a supermarket sign beyond it.",
      "I hadn't seen my friend since his wedding. I tried to picture his face as it had looked that day. He had a child now, though I couldn't remember the child's name. I wasn't even sure how long it had been since we'd spoken. Most of our contact had been through messages.",
      "The road bent downhill toward the bus stop. Water was running through the drainage ditch beside it. As I passed, I caught a square of light beneath the surface.",
      "My phone lay in the muddy water, partly submerged. The glass was cracked, but the screen was on.",
      "I picked it up. Four notifications were waiting there.",
      '"Where are you?"',
      '"Did you arrive?"',
      '"It\'s cold. Go inside first."',
      '"Bus stop?"',
      "I tried to open the messages, but the screen wouldn't respond. I wiped the glass on my sleeve and tapped the last one again.",
    ].join("\n\n"),
  },
  {
    id: "lost-property",
    slug: "lost-property",
    title: "Lost Property",
    minutes: 2,
    blurb:
      "A man visits a lost-property counter to ask about something he lost thirty years ago.",
    genre: "Flash Fiction",
    seo: {
      title: "Lost Property | Flash Fiction",
      description:
        "A man visits a lost-property counter to ask about something he lost thirty years ago.",
    },
    body: [
      '"I\'ve lost something."',
      "The woman behind the counter kept her finger on the line she'd been reading.",
      '"When did you lose it?"',
      '"Thirty years ago."',
      'She reached for a pen. "What was the item?"',
      '"Weight."',
      "The man's right hand was in his pocket. He took it out as she began to write.",
      '"I woke up this morning and felt lighter," he said. "When I walk, my body seems to follow a moment behind my feet. I don\'t know what I\'ve lost."',
      "The woman turned a page in the register.",
      '"We\'ve got it. Over there."',
      "She pointed toward the back of the room without looking up.",
      "A gray object lay near the wall. From the counter it looked like a stone, too large to lift. The man walked toward it, though it took longer than he'd expected to cross the room.",
      "He put his palm against its surface. It was cold. When he pushed, the object wouldn't move. He pulled away, but his fingertips came back a fraction later than the rest of his hand.",
      "He sat down beside the object. His right shoulder sank, and he rested his hand against his knee.",
      '"Next," the woman called.',
      "Someone walked past him toward the counter. The man heard the footsteps recede, then looked back at the gray object. He had been certain he was touching it a moment ago. Now he couldn't tell.",
      "He put his right hand into his pocket. He felt the movement, but his fingers met nothing, not even the lining.",
      "Behind the counter, the woman turned another page.",
      '"Next."',
    ].join("\n\n"),
  },
  {
    id: "after-the-rain",
    slug: "after-the-rain",
    title: "After the Rain",
    minutes: 2,
    blurb:
      "A stranger beneath a bookshop awning remembers the hill differently.",
    genre: "Flash Fiction",
    seo: {
      title:
        "After the Rain — Flash Fiction About Memory and Perception | Takashi Yabe",
      description:
        "Halfway up the hill, he takes shelter from the rain beneath a secondhand bookshop awning.",
    },
    body: [
      "Halfway up the hill, I took shelter from the rain beneath the awning of a secondhand bookshop. An old man was standing there, holding a closed umbrella. He tapped its tip against the wet pavement.",
      '"This hill used to be under the sea," he said.',
      "I looked down the street. Rainwater was running along the curb, carrying leaves toward the drain. When I turned back, the man had stepped out from under the awning. He walked away without opening his umbrella.",
      "I was caught in the rain at the same place some time later. The shop was closed, and the old man was standing beneath the awning.",
      '"You told me this hill used to be under the sea."',
      "He kept looking at the pavement.",
      '"No," he said. "It was a desert."',
      "I glanced down. Between the cracks in the asphalt I could make out what looked like fine sand. I hadn't noticed it before.",
      "The man drew the tip of his umbrella across the ground.",
      '"Look. Sand."',
      "The longer I looked, the less certain I was of the pavement beneath it. The dark surface seemed to break into grains. When I breathed in, something caught at the back of my throat, dry enough to make me swallow.",
      "The rain had stopped. Water collected in the shallow places along the road, but I kept my eyes on the ground beside the man's shoes.",
      "I stepped out from under the awning and went up the hill. I tested the pavement with the sole of my shoe before putting my full weight on it. By the time I reached the station, the sand was gone, though I looked down twice more to check.",
      "The next time it rained, two men were talking beneath the bookshop awning. I stepped in beside them.",
      '"This used to be the top of a mountain, didn\'t it?"',
      '"No, I heard it was a desert."',
      '"Really? Which was it?"',
      'I said, "No, this hill used to be under the sea."',
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

/** Short flash piece suggested for first-time readers on /works and Start Here. */
export function getWorksStarterFlash(): FlashPiece | null {
  const preferred = flashPieces.find((p) => p.slug === "after-the-rain");
  if (preferred) return preferred;
  if (flashPieces.length === 0) return null;
  return flashPieces.reduce((shortest, piece) =>
    piece.minutes < shortest.minutes ? piece : shortest,
  );
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

  // MIAV archive SEO is authoritative; library twin routes reuse the same titles.
  if (series.id === "miav-922228") {
    return {
      title: chapterDocumentTitle(chapter.number, chapter.title),
      description: chapterMetaDescription(
        chapter.number,
        series.seo.description,
      ),
    };
  }

  if (series.id === after50MillionWorkId) {
    return {
      title: after50MillionChapterDocumentTitle(
        chapter.number,
        chapter.title,
        AUTHOR_NAME,
      ),
      description:
        after50MillionChapterDescriptions[chapter.number] ??
        series.seo.description,
    };
  }

  const chapterLabel = chapter.finalChapter
    ? "Final Chapter"
    : `Chapter ${chapter.number}`;

  return {
    title: `${chapterLabel}｜${chapter.title} | ${series.title}`,
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
