import type { Metadata } from "next";
import { SeriesCategoryPage } from "@/features/library/SeriesCategoryPage";

export const metadata: Metadata = {
  title: "Entertainment SF | MIAV-922228",
  description: "Entertainment science fiction series from MIAV-922228.",
};

export default function EntertainmentSfPage() {
  return <SeriesCategoryPage categoryId="entertainment-sf" />;
}
