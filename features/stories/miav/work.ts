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
  "substituted-memory",
  "standardization",
  "dehumanization",
  "time",
  "photo-and-distortion",
  "family",
  "virtual-world",
  "shutdown",
  "photograph",
] as const;

/** Part II Kindle landing — set kindleUrl when the listing is ready. */
export const miavPartTwo = {
  eyebrow: "PART II",
  title: "THE WAY HOME",
  description: "The story continues on Kindle.",
  linkLabel: "Read on Kindle ↗",
  comingSoonLabel: "Coming soon",
  kindleUrl: null as string | null,
} as const;
