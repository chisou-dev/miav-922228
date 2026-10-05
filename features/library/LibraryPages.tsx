import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getChapterBySlug,
  getChapterMetaBySlug,
} from "@/features/stories/miav/chapters";
import { getContentLocaleFromRequest } from "@/features/shared/locale";
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
  type Series,
} from "@/features/library/catalog";
import { getSeriesStoryChapter } from "@/features/library/seriesContent";
import { BookContinueCard } from "@/features/library/BookContinueCard";
import { LibraryListItem, LibraryShell } from "@/features/library/LibraryShell";
import { ReadingLayout } from "@/features/library/ReadingLayout";
import {
  BookJsonLd,
  BreadcrumbJsonLd,
  ChapterJsonLd,
  CreativeWorkSeriesJsonLd,
} from "@/features/library/jsonLd";
import { MiavChapterReader } from "@/features/stories/miav/MiavChapterReader";
import { MiavSeriesChapterList } from "@/features/stories/miav/MiavChapterList";
import { chapterCanonicalPath } from "@/features/stories/miav/chapterSeo";
import { MiavEditionLinks } from "@/features/stories/miav/MiavEditionLinks";
import { miavWorkId } from "@/features/stories/miav/work";
import { nextTimeISeeYouWorkId } from "@/features/stories/next-time-i-see-you/work";
import {
  after50MillionChapterDescriptions,
  after50MillionWorkId,
} from "@/features/stories/after-50-million/work";
import { after50MillionHeroAbsoluteUrl } from "@/features/stories/after-50-million/visual";
import { After50MillionClosing } from "@/features/stories/after-50-million/ClosingNote";
import {
  fourthPeriodKindle,
  fourthPeriodWorkId,
} from "@/features/stories/fourth-period/store";
import { SeriesChapterList } from "@/features/library/SeriesChapterList";
import { SeriesChapterReader } from "@/features/library/SeriesChapterReader";
import { seriesChapterNumberLabel } from "@/features/library/seriesChapterLabel";

function SeriesCover({ cover }: { cover: NonNullable<Series["cover"]> }) {
  return (
    <figure>
      <div className="overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--background)]">
        <Image
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          className="h-auto w-full"
          sizes="(max-width: 768px) 100vw, 760px"
          priority
        />
      </div>
    </figure>
  );
}

function Prose({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="story-content">
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

export async function SeriesIndexPage({ seriesId }: { seriesId: string }) {
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
      {series.id === miavWorkId ? (
        <BookJsonLd
          title={series.title}
          description={series.summary}
          genre={series.genre}
          url="/chapters"
          hasPart={series.chapters.flatMap((chapter) =>
            chapter.contentSlug
              ? [
                  {
                    name: chapter.title,
                    position: chapter.number,
                    url: chapterCanonicalPath(chapter.contentSlug),
                  },
                ]
              : [],
          )}
        />
      ) : series.id === nextTimeISeeYouWorkId ||
        series.id === after50MillionWorkId ? (
        <BookJsonLd
          title={series.title}
          description={series.seo.description}
          genre={series.genre}
          url={seriesHref(series.id)}
          image={
            series.id === after50MillionWorkId
              ? after50MillionHeroAbsoluteUrl()
              : undefined
          }
          hasPart={series.chapters.flatMap((chapter) =>
            chapter.contentSlug && !chapter.continueReading
              ? [
                  {
                    name: `${seriesChapterNumberLabel(chapter)} — ${chapter.title}`,
                    position: chapter.number,
                    url: chapterHref(series.id, chapter.pathSlug),
                  },
                ]
              : [],
          )}
        />
      ) : (
        <CreativeWorkSeriesJsonLd
          title={series.title}
          description={series.summary}
          genre={series.genre}
          url={seriesHref(series.id)}
        />
      )}
      <LibraryShell
        eyebrow="Series"
        title={series.title}
        summary={series.summary}
        breadcrumbs={breadcrumbs}
        hero={series.cover ? <SeriesCover cover={series.cover} /> : undefined}
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
          {series.language ? (
            <p className="mt-10 text-center text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)]">
              {series.genre} · {series.language}
            </p>
          ) : null}
          {series.previewNote ? (
            <p className="mt-6 text-center text-[0.95rem] leading-[1.9] tracking-[0.02em] text-[var(--foreground)]">
              {series.previewNote}
            </p>
          ) : null}
          {series.id === nextTimeISeeYouWorkId && series.genre ? (
            <p className="mt-10 text-center text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)]">
              {series.genre}
            </p>
          ) : null}
          {series.id === nextTimeISeeYouWorkId && series.chapters[0] ? (
            <p className="mt-10 text-center sm:mt-12">
              <a
                href={chapterHref(series.id, series.chapters[0].pathSlug)}
                className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
              >
                Start with Chapter 1 →
              </a>
            </p>
          ) : null}
          {series.comingSoon || series.chapters.length === 0 ? (
            <p className="mt-10 text-[0.95rem] tracking-[0.04em] text-[var(--foreground-muted)]">
              Coming Soon.
            </p>
          ) : series.id === miavWorkId ? (
            <>
              <div className="mt-10">
                <MiavEditionLinks />
              </div>
              <MiavSeriesChapterList
              seriesId={series.id}
              chapters={series.chapters.map((chapter) => ({
                number: chapter.number,
                slug: chapter.contentSlug ?? chapter.pathSlug,
                pathSlug: chapter.pathSlug,
                title: chapter.title,
              }))}
            />
            </>
          ) : series.id === nextTimeISeeYouWorkId ||
            series.id === after50MillionWorkId ? (
            <SeriesChapterList seriesId={series.id} chapters={series.chapters} />
          ) : (
            <ul className="mt-6">
              {(series.id === fourthPeriodWorkId
                ? series.chapters.filter((c) => !c.continueReading)
                : series.chapters
              ).map((chapter) => {
                const isContinue = Boolean(chapter.continueReading);
                return (
                  <li key={chapter.pathSlug}>
                    <a
                      href={chapterHref(series.id, chapter.pathSlug)}
                      className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] py-5 text-[0.92rem] tracking-[0.04em] text-[var(--foreground)] transition-colors duration-300 hover:text-[var(--foreground-muted)]"
                    >
                      <span>
                        {isContinue ? (
                          "Continue Reading"
                        ) : (
                          <>
                            Chapter {chapter.number}
                            <span className="mt-1 block text-[0.8rem] tracking-[0.06em] text-[var(--foreground-muted)] sm:ml-4 sm:mt-0 sm:inline">
                              {chapter.title}
                            </span>
                          </>
                        )}
                      </span>
                      <span className="shrink-0 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                        →
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {series.id === fourthPeriodWorkId ? (
            <p className="mt-8 text-center text-[0.72rem] leading-relaxed tracking-[0.06em] text-[var(--foreground-muted)]">
              Read Chapters 1–4 online. Continue the complete story on Kindle.
            </p>
          ) : null}
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
  const locale = await getContentLocaleFromRequest();
  const category = getCategory(series.categoryId);
  const continueReading = chapter.continueReading;
  const isMiavChapter = series.id === miavWorkId && !continueReading;
  const isNtsiyChapter =
    series.id === nextTimeISeeYouWorkId && !continueReading;
  const isAfter50Chapter =
    series.id === after50MillionWorkId && !continueReading;

  let bodyHtml: string | undefined;
  let bodyText: string | null = !isMiavChapter ? (chapter.body ?? null) : null;
  let presentation: "reading" | "threshold" = "reading";

  if (isMiavChapter) {
    const meta = chapter.contentSlug
      ? getChapterMetaBySlug(chapter.contentSlug, locale)
      : null;
    presentation = meta?.presentation ?? "reading";

    if (chapter.contentSlug) {
      const seriesDoc = await getSeriesStoryChapter(
        series.id,
        chapter.contentSlug,
        locale,
      );
      if (seriesDoc) {
        bodyHtml = seriesDoc.bodyHtml;
      } else {
        const doc = await getChapterBySlug(chapter.contentSlug, locale);
        if (doc) {
          presentation = doc.presentation;
          bodyHtml = doc.bodyHtml;
        }
      }
    }
  } else if (!continueReading && chapter.contentSlug) {
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
  const isFourthPeriodWebFinale =
    series.id === fourthPeriodWorkId &&
    chapter.number === 4 &&
    !continueReading;
  const navNext = isFourthPeriodWebFinale ? null : next;

  const toMiavNav = (item: (typeof series.chapters)[number]) => ({
    number: item.number,
    slug: item.contentSlug ?? item.pathSlug,
    pathSlug: item.pathSlug,
    title: item.title,
  });

  const breadcrumbs = worksBreadcrumbs(
    ...(category
      ? [{ label: category.title, href: category.path }]
      : []),
    { label: series.title, href: seriesHref(series.id) },
    {
      label: continueReading
        ? (continueReading.eyebrow ?? "Continue Reading")
        : seriesChapterNumberLabel(chapter),
      href: chapterHref(series.id, chapter.pathSlug),
    },
  );

  const bookDescription =
    continueReading?.description.split(/\n\n+/)[0] ?? series.summary;

  const pageEyebrow = continueReading
    ? (continueReading.eyebrow ?? "Continue Reading")
    : seriesChapterNumberLabel(chapter);
  const pageTitle = continueReading
    ? (continueReading.title ?? series.title)
    : chapter.title;

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      {isMiavChapter && chapter.contentSlug ? (
        <ChapterJsonLd
          name={chapter.title}
          description={bookDescription}
          position={chapter.number}
          url={chapterCanonicalPath(chapter.contentSlug)}
          workName={series.title}
          workUrl="/chapters"
        />
      ) : isNtsiyChapter || isAfter50Chapter ? (
        <ChapterJsonLd
          name={`${seriesChapterNumberLabel(chapter)} — ${chapter.title}`}
          description={
            isAfter50Chapter
              ? (after50MillionChapterDescriptions[chapter.number] ??
                series.seo.description)
              : series.seo.description
          }
          position={chapter.number}
          url={chapterHref(series.id, chapter.pathSlug)}
          workName={series.title}
          workUrl={seriesHref(series.id)}
          image={
            isAfter50Chapter ? after50MillionHeroAbsoluteUrl() : undefined
          }
        />
      ) : (
        <BookJsonLd
          title={`${pageTitle} — ${series.title}`}
          description={bookDescription}
          genre={series.genre}
          url={chapterHref(series.id, chapter.pathSlug)}
        />
      )}
      <LibraryShell
        eyebrow={pageEyebrow}
        title={pageTitle}
        summary={continueReading ? undefined : series.title}
        breadcrumbs={breadcrumbs}
      >
        <div className="pt-8">
          {continueReading ? (
            <BookContinueCard
              description={continueReading.description}
              amazonUrl={continueReading.amazonUrl}
              buttonLabel={continueReading.buttonLabel}
            />
          ) : isMiavChapter ? (
            <MiavChapterReader
              chapter={{
                number: chapter.number,
                slug: chapter.contentSlug ?? chapter.pathSlug,
                pathSlug: chapter.pathSlug,
                title: chapter.title,
                presentation,
              }}
              bodyHtml={bodyHtml ?? ""}
              previous={previous ? toMiavNav(previous) : null}
              next={next ? toMiavNav(next) : null}
              linkMode="library"
              seriesId={series.id}
              listHref={seriesHref(series.id)}
              listLabel="All chapters"
              hideNextOnThreshold
            />
          ) : (isNtsiyChapter || isAfter50Chapter) && bodyHtml ? (
            <SeriesChapterReader
              bodyHtml={bodyHtml}
              previous={previous}
              next={isAfter50Chapter && chapter.pathSlug === "chapter-3" ? null : next}
              seriesId={series.id}
              listHref={seriesHref(series.id)}
              listLabel="All chapters"
              afterBody={
                isAfter50Chapter && chapter.pathSlug === "chapter-3" ? (
                  <After50MillionClosing />
                ) : undefined
              }
            />
          ) : bodyHtml ? (
            <ReadingLayout label="Chapter text">
              <article
                className="chapter-prose"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </ReadingLayout>
          ) : bodyText ? (
            <ReadingLayout label="Chapter text">
              <Prose text={bodyText} />
            </ReadingLayout>
          ) : (
            <p className="mt-12 text-[0.95rem] text-[var(--foreground-muted)]">
              Log update in progress.
            </p>
          )}

          {isFourthPeriodWebFinale ? (
            <div className="mt-16 sm:mt-20">
              <BookContinueCard
                description={fourthPeriodKindle.continueBlurb}
                amazonUrl={fourthPeriodKindle.href}
                buttonLabel={fourthPeriodKindle.linkLabel}
              />
            </div>
          ) : null}

          {!continueReading && !isMiavChapter && !isNtsiyChapter && !isAfter50Chapter ? (
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
                    {previous.continueReading
                      ? "← Continue Reading"
                      : "← Previous Chapter"}
                  </a>
                ) : null}
              </div>
              <div className="sm:text-right">
                {navNext ? (
                  <a
                    href={chapterHref(series.id, navNext.pathSlug)}
                    className="block text-[0.85rem] tracking-[0.08em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
                  >
                    {navNext.continueReading
                      ? "Continue Reading →"
                      : "Next Chapter →"}
                  </a>
                ) : null}
              </div>
            </nav>
          ) : continueReading ? (
            <nav
              aria-label="Chapter navigation"
              className="mt-20 grid grid-cols-1 gap-10 border-t border-[var(--line)] pt-10 sm:mt-28 sm:grid-cols-2 sm:gap-8 sm:pt-14"
            >
              <div>
                {previous && !previous.continueReading ? (
                  <a
                    href={chapterHref(series.id, previous.pathSlug)}
                    className="block text-[0.85rem] tracking-[0.08em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]"
                  >
                    ← Previous Chapter
                  </a>
                ) : null}
              </div>
              <div />
            </nav>
          ) : null}
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
          <ReadingLayout label="Flash fiction text">
            <Prose text={piece.body} />
          </ReadingLayout>
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
