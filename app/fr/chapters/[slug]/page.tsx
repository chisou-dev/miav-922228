import type { Metadata } from "next";
import { getChapterMetaBySlug } from "@/features/stories/miav/chapters";
import { ChapterPage } from "@/features/stories/miav/ChapterPage";
import { buildChapterMetadata } from "@/features/stories/miav/chapterSeo";
import { miavChapterSlugs } from "@/features/stories/miav/work";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateStaticParams() {
  return miavChapterSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const chapter = getChapterMetaBySlug(slug, "fr");
  if (!chapter) return { title: "Chapitre | MIAV-922228" };
  return buildChapterMetadata(chapter, "fr");
}

export default async function FrenchChapterRoutePage(props: Props) {
  return <ChapterPage {...props} edition="fr" />;
}
