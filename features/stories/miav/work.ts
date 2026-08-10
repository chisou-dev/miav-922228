import { MIAV_PART_TWO_KINDLE_URL } from "@/features/stories/miav/books";

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

/** Part II Kindle landing — English edition only (confirmed ASIN B0H8JNRHZJ). */
export const miavPartTwo = {
  eyebrow: "THE STORY CONTINUES",
  workTitle: "MIAV-922228",
  title: "PART II · HOMEWARD",
  description: "Continue with Part II.",
  linkLabel: "Available on Amazon Kindle →",
  comingSoonLabel: "Coming soon",
  kindleUrl: MIAV_PART_TWO_KINDLE_URL as string,
} as const;
