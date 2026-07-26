import {
  getCategory,
  getFeaturedSeries,
  getOtherSeries,
  listSeriesByCategory,
  seriesHref,
  worksBreadcrumbs,
  type CategoryId,
} from "@/features/library/catalog";
import { LibraryListItem, LibraryShell } from "@/features/library/LibraryShell";
import { BreadcrumbJsonLd } from "@/features/library/jsonLd";

type Props = {
  categoryId: Exclude<CategoryId, "flash-fiction">;
  /** Literary SF uses Featured + Other; Entertainment lists all series. */
  showFeatured?: boolean;
};

export function SeriesCategoryPage({
  categoryId,
  showFeatured = false,
}: Props) {
  const category = getCategory(categoryId);
  if (!category) return null;

  const featured = showFeatured ? getFeaturedSeries(categoryId) : null;
  const otherSeries = showFeatured
    ? getOtherSeries(categoryId)
    : listSeriesByCategory(categoryId);

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
        {showFeatured && featured ? (
          <div className="pt-2">
            <p className="pt-8 text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
              Featured Series
            </p>
            <LibraryListItem
              href={seriesHref(featured.id)}
              title={featured.title}
              description={featured.summary}
            />
            <p className="pt-10 text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
              Other Series
            </p>
            {otherSeries.length === 0 ? (
              <p className="py-10 text-[0.88rem] text-[var(--foreground-muted)]">
                More series will be entered here.
              </p>
            ) : (
              otherSeries.map((series) => (
                <LibraryListItem
                  key={series.id}
                  href={seriesHref(series.id)}
                  title={series.title}
                  description={series.summary}
                />
              ))
            )}
          </div>
        ) : (
          <div>
            {otherSeries.map((series) => (
              <LibraryListItem
                key={series.id}
                href={seriesHref(series.id)}
                title={series.title}
                description={series.summary}
              />
            ))}
          </div>
        )}
      </LibraryShell>
    </>
  );
}
