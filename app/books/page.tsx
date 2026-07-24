import type { Metadata } from "next";
import { BooksPage } from "@/features/novels/BooksPage";

export const metadata: Metadata = {
  title: "Books | MIAV-922228",
  description:
    "Books and editions from MIAV-922228, a literary science fiction project exploring AI, memory, emotion, and human existence.",
};

export default function BooksRoutePage() {
  return <BooksPage />;
}
