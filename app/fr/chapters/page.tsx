import { ChaptersIndexPage } from "@/features/stories/miav/ChaptersIndexPage";
import { buildChaptersArchiveMetadata } from "@/features/stories/miav/chapterSeo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildChaptersArchiveMetadata("fr");

export default async function FrenchChaptersPage() {
  return <ChaptersIndexPage edition="fr" />;
}
