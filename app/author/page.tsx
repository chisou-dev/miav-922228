import type { Metadata } from "next";
import { AuthorPage } from "@/features/stories/miav/AuthorPage";

export const metadata: Metadata = {
  title: "Author | Takashi Yabe — MIAV-922228",
  description:
    "Takashi Yabe is a writer of literary science fiction. His work explores memory, artificial intelligence, loneliness, technology, and human existence through quiet speculative fiction.",
};

export default function AuthorRoutePage() {
  return <AuthorPage />;
}
