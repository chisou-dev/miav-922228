import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAdjacentChapters,
  getAllChapters,
  getChapterBySlug,
  type ChapterDocument,
  type ChapterMeta,
} from "@/lib/content/chapters";
import { getContentLocale } from "@/lib/locale";

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

function ChapterNav({
  previous,
  next,
}: {
  previous: ChapterMeta | null;
  next: ChapterMeta | null;
}) {
  return (
    <nav
      aria-label="Chapter navigation"
      className="mt-20 border-t border-[var(--line)] pt-10 sm:mt-28 sm:pt-14"
    >
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8">
        <div className="min-h-[3.5rem]">
          {previous ? (
            <a
              href={`/chapters/${previous.slug}`}
              className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
            >
              <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                Previous
              </span>
              <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                Chapter {previous.number}｜{previous.title}
              </span>
            </a>
          ) : (
            <span className="block text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-35">
              Previous
            </span>
          )}
        </div>

        <div className="min-h-[3.5rem] sm:text-right">
          {next ? (
            <a
              href={`/chapters/${next.slug}`}
              className="block text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
            >
              <span className="block text-[0.68rem] tracking-[0.18em] uppercase">
                Next
              </span>
              <span className="mt-3 block text-[0.9rem] leading-relaxed tracking-[0.03em] text-[var(--foreground)]">
                Chapter {next.number}｜{next.title}
              </span>
            </a>
          ) : (
            <span className="block text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-35">
              Next
            </span>
          )}
        </div>
      </div>

      <p className="mt-14 text-center sm:mt-16">
        <a
          href="/chapters"
          className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:text-[var(--foreground)]"
        >
          All chapters
        </a>
      </p>
    </nav>
  );
}

function ThresholdBody() {
  return (
    <div className="mx-auto mt-24 max-w-sm text-center sm:mt-32">
      <p className="text-[1.05rem] leading-[2.4] tracking-[0.02em] text-[var(--foreground)] sm:text-[1.125rem] sm:leading-[2.5]">
        The archive continues.
      </p>

      <p className="mt-20 text-[0.72rem] tracking-[0.22em] text-[var(--foreground-muted)] uppercase sm:mt-24">
        Volume 01
      </p>

      <p className="mt-6 text-[1.35rem] font-medium tracking-[0.08em] text-[var(--foreground)] sm:mt-8 sm:text-[1.5rem]">
        MIAV-922228
      </p>

      <p className="mt-16 sm:mt-20">
        <a
          href="/books"
          className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.55em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
        >
          Available in Books.
        </a>
      </p>
    </div>
  );
}

function ReadingBody({ chapter }: { chapter: ChapterDocument }) {
  return (
    <article
      className="chapter-prose mt-16 sm:mt-24"
      aria-label="Chapter text"
      dangerouslySetInnerHTML={{ __html: chapter.bodyHtml }}
    />
  );
}

export default async function ChapterPage({ params }: Props) {
  const { slug } = await params;
  const locale = getContentLocale();
  const chapter = await getChapterBySlug(slug, locale);
  if (!chapter) notFound();

  const { previous, next } = getAdjacentChapters(slug, locale);
  const isThreshold = chapter.presentation === "threshold";

  return (
    <div className="relative z-10 mx-auto w-full max-w-[700px] px-5 sm:px-8">
      <main className="pb-24 sm:pb-32">
        <ChapterHeader chapter={chapter} />

        {isThreshold ? <ThresholdBody /> : <ReadingBody chapter={chapter} />}

        <ChapterNav previous={previous} next={isThreshold ? null : next} />
      </main>
    </div>
  );
}
