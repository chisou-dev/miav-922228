import type { Metadata } from "next";
import { PersonJsonLd } from "@/features/library/jsonLd";
import { libraryPageMetadata } from "@/features/library/pageMetadata";
import { AuthorPage } from "@/features/stories/miav/AuthorPage";

const authorDescription =
  "Takashi Yabe writes quiet, character-driven fiction. His work explores people, memory, relationships, technology, loneliness, and human existence.";

export const metadata: Metadata = libraryPageMetadata({
  title: "Author | Takashi Yabe — MIAV-922228",
  description: authorDescription,
  path: "/author",
});

export default function AuthorRoutePage() {
  return (
    <>
      <PersonJsonLd description={authorDescription} />
      <AuthorPage />
    </>
  );
}
