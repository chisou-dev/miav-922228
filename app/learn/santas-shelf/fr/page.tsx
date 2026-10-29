import type { Metadata } from "next";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { SantaLanguageIndex } from "@/features/santas-shelf/LanguageIndex";

export const metadata: Metadata = readingTestMetadata({
  title: "L’étagère du Père Noël — 6 Chapters in 3 Levels | MIAV LEARN",
  description: "Lisez six chapitres en français de France, en trois niveaux et avec cinq questions de compréhension par chapitre.",
  path: "/learn/santas-shelf/fr",
  locale: "fr_FR",
  languageAlternates: {
    "en-US": "/learn/santas-shelf/en",
    "es-ES": "/learn/santas-shelf/es",
    "fr-FR": "/learn/santas-shelf/fr",
    "x-default": "/learn/santas-shelf",
  },
});

export default function Page() {
  return <SantaLanguageIndex language="fr" />;
}
