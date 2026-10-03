import type { Metadata } from "next";
import { FlashFictionPage } from "@/features/library/LibraryPages";
import { getCategory } from "@/features/library/catalog";
import { libraryPageMetadata } from "@/features/library/pageMetadata";

const category = getCategory("flash-fiction");

export const metadata: Metadata = libraryPageMetadata({
  title: category?.seo.title ?? "Flash Fiction | Takashi Yabe",
  description:
    category?.seo.description ??
    "Short fiction from MIAV-922228 — quiet stories readable in a few minutes.",
  path: "/flash-fiction",
});

export default function FlashFictionRoutePage() {
  return <FlashFictionPage />;
}
