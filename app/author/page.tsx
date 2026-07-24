import type { Metadata } from "next";
import { AuthorPage } from "@/features/stories/miav/AuthorPage";

export const metadata: Metadata = {
  title: "Author | Takashi Yabe — MIAV-922228",
  description:
    "Takashi Yabe is a literary SF writer and the creator of MIAV-922228, a speculative fiction project exploring AI, memory, emotion, and human existence.",
};

export default function AuthorRoutePage() {
  return <AuthorPage />;
}
