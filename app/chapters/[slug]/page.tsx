import type { Metadata } from "next";
import {
  getChapterMetaBySlug,
  getMaxChapterNumber,
} from "@/features/stories/miav/chapters";
import { getContentLocale } from "@/features/shared/locale";
import { ChapterPage } from "@/features/stories/miav/ChapterPage";
import {
  isChapterUnlockedServer,
  readUnlockedThrough,
} from "@/features/stories/miav/chapterUnlockCookie";

type Props = {
  params: Promise<{ slug: string }>;
};

const LOCKED_CHAPTER_DESCRIPTION =
  "This chapter is locked. Continue reading MIAV to unlock it.";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = getContentLocale();
  const chapter = getChapterMetaBySlug(slug, locale);
  if (!chapter) return { title: "Chapter | MIAV-922228" };

  const unlockedThrough = await readUnlockedThrough(
    getMaxChapterNumber(locale),
  );
  const unlocked = isChapterUnlockedServer(chapter.number, unlockedThrough);
  const description = unlocked
    ? chapter.summary
    : LOCKED_CHAPTER_DESCRIPTION;

  return {
    title: `Chapter ${chapter.number}｜${chapter.title} | MIAV-922228`,
    description,
    openGraph: {
      description,
    },
    twitter: {
      description,
    },
  };
}

export default async function ChapterRoutePage(props: Props) {
  return <ChapterPage {...props} />;
}
