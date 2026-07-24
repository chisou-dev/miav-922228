/**
 * MIAV-922228 work metadata for the central literary-works registry.
 * Chapter slugs must stay in reading order (same sequence as the site archive).
 */
export const miavWorkId = "miav-922228" as const;

export const miavWorkTitle = "MIAV-922228";

/** Ordered chapter slugs for Reader Memory progress calculation. */
export const miavChapterSlugs = [
  "conversation",
  "accumulation",
  "preemption",
  "absence",
  "selection",
] as const;
