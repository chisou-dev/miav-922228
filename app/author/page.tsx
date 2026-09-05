import type { Metadata } from "next";
import { PersonJsonLd } from "@/features/library/jsonLd";
import { libraryPageMetadata } from "@/features/library/pageMetadata";
import { AuthorPage } from "@/features/stories/miav/AuthorPage";

const authorDescription =
  "Takashi Yabe is a writer of literary science fiction. His work explores memory, artificial intelligence, loneliness, technology, and human existence through quiet speculative fiction.";

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
