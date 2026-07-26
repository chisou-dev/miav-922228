import type { Metadata } from "next";
import { SeriesCategoryPage } from "@/features/library/SeriesCategoryPage";

export const metadata: Metadata = {
  title: "Literary SF | MIAV-922228",
  description:
    "Literary SF series exploring memory, technology, and human existence.",
};

export default function LiterarySfPage() {
  return <SeriesCategoryPage categoryId="literary-sf" showFeatured />;
}
