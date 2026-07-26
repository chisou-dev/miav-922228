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

export const metadata: Metadata = {
  title: worksLibrary.seo.title,
  description: worksLibrary.seo.description,
};

export default function WorksPage() {
  const featured = getWorksFeatured();
  const breadcrumbs = worksBreadcrumbs({ label: worksLibrary.title, href: "/works" });

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <LibraryShell
        title={worksLibrary.title}
        summary={worksLibrary.summary}
        breadcrumbs={breadcrumbs}
        categoryNavHref="/works"
      >
        <div>
          {featured ? (
            <div className="pt-2">
              <p className="pt-8 text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
                Featured
              </p>
              <LibraryListItem
                href={seriesHref(featured.id)}
                title={featured.title}
                description={
                  featured.worksFeaturedNote || featured.summary
                }
                actionLabel="Read →"
              />
            </div>
          ) : null}

          <p
            className={`text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase ${
              featured ? "pt-10" : "pt-8"
            }`}
          >
            Browse by Category
          </p>
          {categories.map((category) => (
            <LibraryListItem
              key={category.id}
              href={category.path}
              title={category.title}
              description={category.summary}
              actionLabel="→"
            />
          ))}
        </div>
      </LibraryShell>
    </>
  );
}
