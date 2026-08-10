/**
 * Advances shared Reader Memory for MIAV-922228 without clearing other fields.
 * Unlock/progress cookies are no longer used; this only supports continue-reading UI.
 */

import { miavChapterSlugs, miavWorkId } from "@/features/stories/miav/work";

function nowIso(): string {
  return new Date().toISOString();
}

export function syncReaderMemoryOnChapterView(chapterNumber: number): void {
  if (typeof window === "undefined") return;
  const slug = miavChapterSlugs[chapterNumber - 1];
  if (!slug) return;

  try {
    const raw = localStorage.getItem("reader_memory");
    const parsed = raw
      ? (JSON.parse(raw) as {
          firstVisit?: string;
          lastVisit?: string;
          works?: Record<
            string,
            { lastChapter?: string | null; traceLeft?: boolean; finished?: boolean }
          >;
        })
      : null;

    const firstVisit =
      parsed?.firstVisit && typeof parsed.firstVisit === "string"
        ? parsed.firstVisit
        : nowIso();
    const works = { ...(parsed?.works ?? {}) };
    const existing = works[miavWorkId] ?? {
      lastChapter: null,
      traceLeft: false,
      finished: false,
    };

    const currentIndex = existing.lastChapter
      ? miavChapterSlugs.indexOf(
          existing.lastChapter as (typeof miavChapterSlugs)[number],
        )
      : -1;
    const nextIndex = chapterNumber - 1;
    const advanced = nextIndex > currentIndex;
    const finished =
      existing.finished === true || chapterNumber >= miavChapterSlugs.length;

    works[miavWorkId] = {
      lastChapter: advanced || !existing.lastChapter ? slug : existing.lastChapter,
      traceLeft: existing.traceLeft === true,
      finished,
    };

    localStorage.setItem(
      "reader_memory",
      JSON.stringify({
        firstVisit,
        lastVisit: nowIso(),
        works,
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

/** Highest chapter number reached in Reader Memory (0 if none). */
export function readReaderMemoryThroughChapter(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("reader_memory");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as {
      works?: Record<string, { lastChapter?: string | null; finished?: boolean }>;
    };
    const work = parsed.works?.[miavWorkId];
    if (!work) return 0;
    if (work.finished === true) return miavChapterSlugs.length;
    if (!work.lastChapter) return 0;
    const index = miavChapterSlugs.indexOf(
      work.lastChapter as (typeof miavChapterSlugs)[number],
    );
    return index === -1 ? 0 : index + 1;
  } catch {
    return 0;
  }
}
