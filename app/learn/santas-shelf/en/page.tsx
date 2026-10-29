import type { Metadata } from "next";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { SantaLanguageIndex } from "@/features/santas-shelf/LanguageIndex";

export const metadata: Metadata = readingTestMetadata({
  title: "Santa's Shelf — 6 Chapters in 3 Levels | MIAV LEARN",
  description: "Read six English stories in beginner, intermediate, or advanced editions, with five comprehension questions per chapter.",
  path: "/learn/santas-shelf/en",
  locale: "en_US",
  languageAlternates: {
    "en-US": "/learn/santas-shelf/en",
    "es-ES": "/learn/santas-shelf/es",
    "fr-FR": "/learn/santas-shelf/fr",
    "x-default": "/learn/santas-shelf",
  },
});

export default function Page() {
  return <SantaLanguageIndex language="en" />;
}
