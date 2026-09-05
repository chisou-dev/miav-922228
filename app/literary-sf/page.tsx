import type { Metadata } from "next";
import { SeriesCategoryPage } from "@/features/library/SeriesCategoryPage";
import { getCategory } from "@/features/library/catalog";
import { libraryPageMetadata } from "@/features/library/pageMetadata";

const category = getCategory("literary-sf");

export const metadata: Metadata = libraryPageMetadata({
  title: category?.seo.title ?? "Literary SF | Takashi Yabe",
  description:
    category?.seo.description ??
    "Literary science fiction series from MIAV-922228.",
  path: "/literary-sf",
});

export default function LiterarySfPage() {
  return <SeriesCategoryPage categoryId="literary-sf" showFeatured />;
}
