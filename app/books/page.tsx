import type { Metadata } from "next";
import { libraryPageMetadata } from "@/features/library/pageMetadata";
import { BooksPage } from "@/features/novels/BooksPage";

export const metadata: Metadata = libraryPageMetadata({
  title: "Books | MIAV-922228",
  description:
    "MIAV-922228 Part I and Part II : Homeward — literary science fiction editions exploring AI, memory, emotion, and human existence.",
  path: "/books",
});

export default function BooksRoutePage() {
  return <BooksPage />;
}
