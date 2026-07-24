import {
  miavChapterSlugs,
  miavWorkId,
  miavWorkTitle,
} from "@/features/stories/miav/work";

/**
 * Central literary-works registry.
 * Register each future project here once — Reader Memory resolves title and
 * ordered chapters from this list by workId alone.
 */
export type LiteraryWork = {
  id: string;
  title: string;
  /** Reading-order chapter slugs for this work. */
  chapterSlugs: readonly string[];
};

export const literaryWorks: readonly LiteraryWork[] = [
  {
    id: miavWorkId,
    title: miavWorkTitle,
    chapterSlugs: miavChapterSlugs,
  },
];

export function getLiteraryWork(workId: string): LiteraryWork | null {
  return literaryWorks.find((work) => work.id === workId) ?? null;
}
