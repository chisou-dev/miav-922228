import { notFound } from "next/navigation";
import { getChapterBySlug } from "@/features/stories/miav/chapters";
import { getContentLocale } from "@/features/shared/locale";
import {
  chapterHref,
  flashHref,
  flashPieces,
  getCategory,
  getFlashPiece,
  getSeries,
  getSeriesChapter,
  seriesHref,
  seriesList,
  worksBreadcrumbs,
} from "@/features/library/catalog";
import { getSeriesStoryChapter } from "@/features/library/seriesContent";
import { BookContinueCard } from "@/features/library/BookContinueCard";
import { LibraryListItem, LibraryShell } from "@/features/library/LibraryShell";
import {
  BookJsonLd,
  BreadcrumbJsonLd,
  CreativeWorkSeriesJsonLd,
} from "@/features/library/jsonLd";

function Prose({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="mx-auto mt-10 max-w-prose space-y-6 text-[0.98rem] leading-[2.05] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-14 sm:text-[1.02rem] sm:leading-[2.15]">
      {blocks.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
      ))}
    </div>
  );
}

export function FlashFictionPage() {
  const category = getCategory("flash-fiction");
  if (!category) return null;

  const breadcrumbs = worksBreadcrumbs({
    label: category.title,
    href: category.path,
  });

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <LibraryShell
        eyebrow="Category"
        title={category.title}
        summary={category.summary}
        breadcrumbs={breadcrumbs}
        categoryNavHref={category.path}
      >
        <div>
          {flashPieces.map((piece) => (
            <LibraryListItem
              key={piece.id}
              href={flashHref(piece.slug)}
              title={piece.title}
              meta={`${piece.minutes} min read`}
              description={piece.blurb}
            />
          ))}
        </div>
      </LibraryShell>
    </>
  );
}

export function SeriesIndexPage({ seriesId }: { seriesId: string }) {
  const series = getSeries(seriesId);
  if (!series) notFound();

  const category = getCategory(series.categoryId);
  const breadcrumbs = worksBreadcrumbs(
    ...(category
      ? [{ label: category.title, href: category.path }]
      : []),
    { label: series.title, href: seriesHref(series.id) },
  );

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <CreativeWorkSeriesJsonLd
        title={series.title}
        description={series.summary}
        genre={series.genre}
        url={seriesHref(series.id)}
      />
      <LibraryShell
        eyebrow="Series"
        title={series.title}
        summary={series.summary}
        breadcrumbs={breadcrumbs}
      >
        <div className="pt-2">
          {category ? (
            <p className="pt-8">
              <a
                href={category.path}
                className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.4em] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                ← {category.title}
              </a>
            </p>
          ) : null}
          <ul className="mt-6">
            {series.chapters.map((chapter) => (
              <li key={chapter.pathSlug}>
                <a
                  href={chapterHref(series.id, chapter.pathSlug)}
                  className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] py-5 text-[0.92rem] tracking-[0.04em] text-[var(--foreground)] transition-colors duration-300 hover:text-[var(--foreground-muted)]"
                >
                  <span>
                    Chapter {chapter.number}
                    <span className="mt-1 block text-[0.8rem] tracking-[0.06em] text-[var(--foreground-muted)] sm:ml-4 sm:mt-0 sm:inline">
                      {chapter.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </LibraryShell>
    </>
  );
}

export async function SeriesChapterPage({
  seriesId,
  pathSlug,
}: {
  seriesId: string;
  pathSlug: string;
}) {
  const found = getSeriesChapter(seriesId, pathSlug);
  if (!found) notFound();

  const { series, chapter } = found;
  const locale = getContentLocale();
  const category = getCategory(series.categoryId);

  let bodyHtml: string | null = null;
  let bodyText: string | null = chapter.body ?? null;
  const continueReading = chapter.continueReading;

  if (!continueReading && chapter.contentSlug) {
    const seriesDoc = await getSeriesStoryChapter(
      series.id,
      chapter.contentSlug,
      locale,
    );
    if (seriesDoc) {
      bodyHtml = seriesDoc.bodyHtml;
      bodyText = null;
    } else {
      const doc = await getChapterBySlug(chapter.contentSlug, locale);
      if (doc) {
        bodyHtml = doc.bodyHtml;
        bodyText = null;
      }
    }
  }

  const index = series.chapters.findIndex((c) => c.pathSlug === pathSlug);
  const previous = index > 0 ? series.chapters[index - 1] : null;
  const next =
    index >= 0 && index < series.chapters.length - 1
      ? series.chapters[index + 1]
      : null;

  const breadcrumbs = worksBreadcrumbs(
    ...(category
      ? [{ label: category.title, href: category.path }]
      : []),
    { label: series.title, href: seriesHref(series.id) },
    {
      label: `Chapter ${chapter.number}`,
      href: chapterHref(series.id, chapter.pathSlug),
    },
  );

  const bookDescription =
    continueReading?.description.split(/\n\n+/)[0] ?? series.summary;

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <BookJsonLd
        title={`${chapter.title} — ${series.title}`}
        description={bookDescription}
        genre={series.genre}
        url={chapterHref(series.id, chapter.pathSlug)}
      />
      <LibraryShell
        eyebrow={`Chapter ${chapter.number}`}
        title={chapter.title}
        summary={series.title}
        breadcrumbs={breadcrumbs}
      >
        <div className="pt-8">
          {continueReading ? (
            <BookContinueCard
              description={continueReading.description}
              amazonUrl={continueReading.amazonUrl}
              buttonLabel={continueReading.buttonLabel}
            />
          ) : bodyHtml ? (
            <article
              className="chapter-prose mt-12 sm:mt-16"
              aria-label="Chapter text"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : bodyText ? (
            <Prose text={bodyText} />
          ) : (
            <p className="mt-12 text-[0.95rem] text-[var(--foreground-muted)]">
              Log update in progress.
            </p>
          )}

          <nav
            aria-label="Chapter navigation"
            className="mt-20 grid grid-cols-1 gap-10 border-t border-[var(--line)] pt-10 sm:mt-28 sm:grid-cols-2 sm:gap-8 sm:pt-14"
          >
            <div>
              {previous ? (
                <a
                  href={chapterHref(series.id, previous.pathSlug)}
                  className="block text-[0.85rem] tracking-[0.08em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
                >
                  ← Previous Chapter
                </a>
              ) : null}
            </div>
            <div className="sm:text-right">
              {next ? (
                <a
                  href={chapterHref(series.id, next.pathSlug)}
                  className="block text-[0.85rem] tracking-[0.08em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
                >
                  Next Chapter →
                </a>
              ) : null}
            </div>
          </nav>
        </div>
      </LibraryShell>
    </>
  );
}

export function FlashPiecePage({ slug }: { slug: string }) {
  const piece = getFlashPiece(slug);
  if (!piece) notFound();

  const category = getCategory("flash-fiction");
  const breadcrumbs = worksBreadcrumbs(
    ...(category
      ? [{ label: category.title, href: category.path }]
      : []),
    { label: piece.title, href: flashHref(piece.slug) },
  );

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <BookJsonLd
        title={piece.title}
        description={piece.seo.description}
        genre={piece.genre}
        url={flashHref(piece.slug)}
      />
      <LibraryShell
        eyebrow="Flash Fiction"
        title={piece.title}
        breadcrumbs={breadcrumbs}
      >
        <div className="pt-8">
          <p>
            <a
              href="/flash-fiction"
              className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.4em] transition-colors duration-300 hover:text-[var(--foreground)]"
            >
              ← Flash Fiction
            </a>
          </p>
          <p className="mt-4 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
            {piece.minutes} min read
          </p>
          <Prose text={piece.body} />
        </div>
      </LibraryShell>
    </>
  );
}

export function allSeriesParams() {
  return seriesList.map((series) => ({ series: series.id }));
}

export function allChapterParams() {
  return seriesList.flatMap((series) =>
    series.chapters.map((chapter) => ({
      series: series.id,
      chapter: chapter.pathSlug,
    })),
  );
}

export function allFlashParams() {
  return flashPieces.map((piece) => ({ slug: piece.slug }));
}
