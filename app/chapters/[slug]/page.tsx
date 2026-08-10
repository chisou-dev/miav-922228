import type { Metadata } from "next";
import { getChapterMetaBySlug } from "@/features/stories/miav/chapters";
import { getContentLocaleFromRequest } from "@/features/shared/locale";
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
  const locale = await getContentLocaleFromRequest();
  const chapter = getChapterMetaBySlug(slug, locale);
  if (!chapter) return { title: "Chapter | MIAV-922228" };
  return buildChapterMetadata(chapter);
}

export default async function ChapterRoutePage(props: Props) {
  return <ChapterPage {...props} />;
}
