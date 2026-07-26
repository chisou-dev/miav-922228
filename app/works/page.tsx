import type { Metadata } from "next";
import {
  categories,
  getWorksFeatured,
  seriesHref,
} from "@/features/library/catalog";
import { LibraryListItem, LibraryShell } from "@/features/library/LibraryShell";

export const metadata: Metadata = {
  title: "Works | MIAV-922228",
  description: "A collection of stories from MIAV-922228.",
};

export default function WorksPage() {
  const featured = getWorksFeatured();

  return (
    <LibraryShell title="Works" summary="A collection of stories.">
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
  );
}
