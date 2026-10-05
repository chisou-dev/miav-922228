export const after50MillionWorkId = "after-50-million";

export const after50MillionSummary =
  "At thirty-eight, he has ¥50 million and no reason to keep working. So he quits.";

export const after50MillionPreviewNote = "Read the first three chapters free.";

/**
 * Amazon product URL for the complete novel.
 * Leave this empty until the URL is final. An empty or invalid value
 * does not render a purchase link.
 */
export const amazonUrl = "";

const CHAPTER_WORDS = ["", "One", "Two", "Three"] as const;

export function after50MillionChapterDocumentTitle(
  number: number,
  title: string,
  author: string,
): string {
  const word = CHAPTER_WORDS[number] ?? String(number);
  return `After ¥50 Million — Chapter ${word}: ${title} | ${author}`;
}

export const after50MillionChapterDescriptions: Record<number, string> = {
  1: "Chapter One: Quitting — a free chapter from After ¥50 Million.",
  2: "Chapter Two: Part-Time Work — a free chapter from After ¥50 Million.",
  3: "Chapter Three: The Introduction — a free chapter from After ¥50 Million.",
};

export const after50MillionChapters = [
  {
    number: 1,
    pathSlug: "chapter-1",
    label: "Chapter One",
    title: "Quitting",
    contentSlug: "chapter-1",
  },
  {
    number: 2,
    pathSlug: "chapter-2",
    label: "Chapter Two",
    title: "Part-Time Work",
    contentSlug: "chapter-2",
  },
  {
    number: 3,
    pathSlug: "chapter-3",
    label: "Chapter Three",
    title: "The Introduction",
    contentSlug: "chapter-3",
  },
] as const;

/** HTTPS/HTTP product URL only. Anything else stays unpublished. */
export function after50MillionAmazonHref(): string | null {
  const trimmed = amazonUrl.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
