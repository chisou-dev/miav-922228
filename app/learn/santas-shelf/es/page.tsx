import type { Metadata } from "next";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { SantaLanguageIndex } from "@/features/santas-shelf/LanguageIndex";

export const metadata: Metadata = readingTestMetadata({
  title: "La estantería de Papá Noel — 6 Chapters in 3 Levels | MIAV LEARN",
  description: "Lee seis capítulos en español de España, en tres niveles, con cinco preguntas de comprensión por capítulo.",
  path: "/learn/santas-shelf/es",
  locale: "es_ES",
  languageAlternates: {
    "en-US": "/learn/santas-shelf/en",
    "es-ES": "/learn/santas-shelf/es",
    "fr-FR": "/learn/santas-shelf/fr",
    "x-default": "/learn/santas-shelf",
  },
});

export default function Page() {
  return <SantaLanguageIndex language="es" />;
}
