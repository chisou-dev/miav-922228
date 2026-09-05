import type { Metadata } from "next";
import { SeriesCategoryPage } from "@/features/library/SeriesCategoryPage";
import { getCategory } from "@/features/library/catalog";
import { libraryPageMetadata } from "@/features/library/pageMetadata";

const category = getCategory("entertainment-sf");

export const metadata: Metadata = libraryPageMetadata({
  title: category?.seo.title ?? "Entertainment SF | Takashi Yabe",
  description:
    category?.seo.description ??
    "Entertainment science fiction from MIAV-922228.",
  path: "/entertainment-sf",
});

export default function EntertainmentSfPage() {
  return <SeriesCategoryPage categoryId="entertainment-sf" />;
}
