import { notFound } from "next/navigation";
import {
  getAdjacentChapters,
  getAllChapters,
  getChapterBySlug,
  getChapterMetaBySlug,
  getMaxChapterNumber,
} from "@/features/stories/miav/chapters";
import { getContentLocale } from "@/features/shared/locale";
import { MiavChapterReader } from "@/features/stories/miav/MiavChapterReader";
import {
  isChapterUnlockedServer,
  readUnlockedThrough,
} from "@/features/stories/miav/chapterUnlockCookie";
import type { ChapterMeta } from "@/features/stories/miav/chapters";

type Props = {
  params: Promise<{ slug: string }>;
};

function ChapterHeader({ chapter }: { chapter: ChapterMeta }) {
  return (
    <header className="pt-14 text-center sm:pt-20">
      <p>
        <a
          href="/"
          className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
        >
          MIAV-922228
        </a>
      </p>

      <p className="mt-14 text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase sm:mt-16">
        Chapter {chapter.number}
      </p>

      <h1 className="mt-5 text-[clamp(1.75rem,6vw,2.5rem)] font-medium leading-[1.3] tracking-[0.08em] text-[var(--foreground)] sm:mt-6">
        {chapter.title}
      </h1>
    </header>
  );
}

function toNavItem(chapter: ChapterMeta) {
  return {
    number: chapter.number,
    slug: chapter.slug,
    title: chapter.title,
  };
}

export async function ChapterPage({ params }: Props) {
  const { slug } = await params;
  const locale = getContentLocale();
  const meta = getChapterMetaBySlug(slug, locale);
  if (!meta) notFound();

  const all = getAllChapters(locale);
  const maxChapterNumber = getMaxChapterNumber(locale);
  const unlockedThrough = await readUnlockedThrough(maxChapterNumber);
  const unlocked = isChapterUnlockedServer(meta.number, unlockedThrough);
  const { previous, next } = getAdjacentChapters(slug, locale);

  let bodyHtml: string | undefined;

  if (unlocked) {
    const chapter = await getChapterBySlug(slug, locale);
    if (!chapter) notFound();
    // Threshold finals (e.g. Photograph) still use full prose HTML;
    // presentation only controls Next / Part II behavior.
    bodyHtml = chapter.bodyHtml;
  }

  const readerProps = {
    chapter: {
      number: meta.number,
      slug: meta.slug,
      title: meta.title,
      presentation: meta.presentation,
    },
    previous: previous ? toNavItem(previous) : null,
    next: next ? toNavItem(next) : null,
    allChapters: all.map(toNavItem),
    maxChapterNumber,
    serverUnlockedThrough: unlockedThrough,
    linkMode: "archive" as const,
    listHref: "/chapters",
    listLabel: "All chapters",
    hideNextOnThreshold: true,
  };

  return (
    <div className="relative z-10 mx-auto w-full max-w-[760px] px-5 sm:px-8">
      <main className="pb-24 sm:pb-32">
        <ChapterHeader chapter={meta} />

        {unlocked ? (
          <MiavChapterReader {...readerProps} bodyHtml={bodyHtml ?? ""} />
        ) : (
          <MiavChapterReader {...readerProps} />
        )}
      </main>
    </div>
  );
}
