import type { Metadata } from "next";
import { readingTestMetadata } from "@/features/reading-test/pageMetadata";
import { SantaLanguageIndex } from "@/features/santas-shelf/LanguageIndex";
import { SANTA_LANGUAGE_SEO } from "@/features/santas-shelf/seo";

export const metadata: Metadata = readingTestMetadata({
  title: SANTA_LANGUAGE_SEO.es.title,
  description: SANTA_LANGUAGE_SEO.es.description,
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
