import type { Metadata } from "next";
import { SeriesCategoryPage } from "@/features/library/SeriesCategoryPage";
import { getCategory } from "@/features/library/catalog";

const category = getCategory("literary-sf");

export const metadata: Metadata = {
  title: category?.seo.title ?? "Literary SF | Takashi Yabe",
  description: category?.seo.description,
};

export default function LiterarySfPage() {
  return <SeriesCategoryPage categoryId="literary-sf" showFeatured />;
}
