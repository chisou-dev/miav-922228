import type { Metadata } from "next";
import { SeriesCategoryPage } from "@/features/library/SeriesCategoryPage";
import { getCategory } from "@/features/library/catalog";

const category = getCategory("entertainment-sf");

export const metadata: Metadata = {
  title: category?.seo.title ?? "Entertainment SF | Takashi Yabe",
  description: category?.seo.description,
};

export default function EntertainmentSfPage() {
  return <SeriesCategoryPage categoryId="entertainment-sf" />;
}
