import type { Metadata } from "next";
import {
  getAllChapters,
  getChapterBySlug,
} from "@/features/stories/miav/chapters";
import { getContentLocale } from "@/features/shared/locale";
import { ChapterPage } from "@/features/stories/miav/ChapterPage";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  const locale = getContentLocale();
  return getAllChapters(locale).map((chapter) => ({ slug: chapter.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = getContentLocale();
  const chapter = await getChapterBySlug(slug, locale);
  if (!chapter) return { title: "Chapter | MIAV-922228" };

  return {
    title: `Chapter ${chapter.number}｜${chapter.title} | MIAV-922228`,
    description: chapter.summary,
  };
}

export default async function ChapterRoutePage(props: Props) {
  return <ChapterPage {...props} />;
}
