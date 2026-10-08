/**
 * Loaded only after See Results.
 * Author names only — not the story texts — so this client chunk stays small.
 */
const readingAuthors: Readonly<Record<string, { name: string; slug: string }>> = {
  "the-day-i-couldnt-find-anyone": { name: "Takashi Yabe", slug: "takashi-yabe" },
  "lost-property": { name: "Takashi Yabe", slug: "takashi-yabe" },
  "after-the-rain": { name: "Takashi Yabe", slug: "takashi-yabe" },
  "santas-bells": { name: "Takashi Yabe", slug: "takashi-yabe" },
  "the-silver-thread": { name: "Takashi Yabe", slug: "takashi-yabe" },
  "sample-story": { name: "Takashi Yabe", slug: "takashi-yabe" },
  mia: { name: "Takashi Yabe", slug: "takashi-yabe" },
  wednesday: { name: "Takashi Yabe", slug: "takashi-yabe" },
  "the-tortoise-and-the-hare": { name: "Takashi Yabe", slug: "takashi-yabe" },
  quitting: { name: "Takashi Yabe", slug: "takashi-yabe" },
  "estimated-time-of-resumption": { name: "Takashi Yabe", slug: "takashi-yabe" },
  "the-honest-woodcutter": { name: "Takashi Yabe", slug: "takashi-yabe" },
  "the-ant-and-the-grasshopper": { name: "Takashi Yabe", slug: "takashi-yabe" },
  milk: { name: "Takashi Yabe", slug: "takashi-yabe" },
};

export function revealAuthor(slug: string) {
  return readingAuthors[slug] ?? null;
}
