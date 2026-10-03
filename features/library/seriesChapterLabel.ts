import type { SeriesChapter } from "@/features/library/catalog";

export function seriesChapterNumberLabel(chapter: SeriesChapter): string {
  if (chapter.finalChapter) return "Final Chapter";
  return `Chapter ${chapter.number}`;
}
