import type { Metadata } from "next";
import {
  categories,
  getWorksFeatured,
  seriesHref,
  worksBreadcrumbs,
  worksLibrary,
} from "@/features/library/catalog";
import { LibraryListItem, LibraryShell } from "@/features/library/LibraryShell";
import { BreadcrumbJsonLd } from "@/features/library/jsonLd";
import { libraryPageMetadata } from "@/features/library/pageMetadata";
import {
  SfDivider,
  SfSection,
  type SfSectionVariant,
} from "@/features/shared/SfSection";
import { MiavEditionLinks } from "@/features/stories/miav/MiavEditionLinks";

export const metadata: Metadata = libraryPageMetadata({
  title: worksLibrary.seo.title,
  description: worksLibrary.seo.description,
  path: "/works",
});

/** Category-to-category separators on /works (not the section start line). */
const CATEGORY_DIVIDERS: readonly SfSectionVariant[] = ["split", "trace"];

export default function WorksPage() {
  const featured = getWorksFeatured();
  const breadcrumbs = worksBreadcrumbs({
    label: worksLibrary.title,
    href: "/works",
  });

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <LibraryShell
        title={worksLibrary.title}
        summary={worksLibrary.summary}
        breadcrumbs={breadcrumbs}
        categoryNavHref="/works"
      >
        {featured ? (
          <div className="pt-2">
            <p className="pt-8 text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
              Featured
            </p>
            <LibraryListItem
              href={seriesHref(featured.id)}
              title={featured.title}
              meta={featured.genre}
              description={
                featured.worksFeaturedNote || featured.summary
              }
              actionLabel="Explore →"
            />
            {featured.id === "miav-922228" ? <MiavEditionLinks /> : null}
          </div>
        ) : null}

        <SfSection
          variant="split"
          className={featured ? undefined : "pt-2"}
          aria-label="Browse by Category"
        >
          <p
            className={`text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase ${
              featured ? "pt-10" : "pt-8"
            }`}
          >
            Browse by Category
          </p>
          {categories.map((category, index) => (
            <div key={category.id}>
              {index > 0 ? (
                <SfDivider variant={CATEGORY_DIVIDERS[index - 1] ?? "trace"} />
              ) : null}
              <LibraryListItem
                href={category.path}
                title={category.title}
                description={category.summary}
                actionLabel="→"
                showBorder={false}
              />
            </div>
          ))}
        </SfSection>
      </LibraryShell>
    </>
  );
}
