import type { Metadata } from "next";
import { ChaptersIndexPage } from "@/features/stories/miav/ChaptersIndexPage";

export const metadata: Metadata = {
  title: "Chapter Archive | MIAV-922228",
  description:
    "A quiet archive of chapters from MIAV-922228 — literary records of Conversation, Accumulation, Preemption, and Absence.",
};

export default function ChaptersPage() {
  return <ChaptersIndexPage />;
}
