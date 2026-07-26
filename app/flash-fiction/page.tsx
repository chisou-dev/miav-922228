import type { Metadata } from "next";
import { FlashFictionPage } from "@/features/library/LibraryPages";
import { getCategory } from "@/features/library/catalog";

const category = getCategory("flash-fiction");

export const metadata: Metadata = {
  title: category?.seo.title ?? "Flash Fiction | Takashi Yabe",
  description: category?.seo.description,
};

export default function FlashFictionRoutePage() {
  return <FlashFictionPage />;
}
