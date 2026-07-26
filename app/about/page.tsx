import type { Metadata } from "next";
import { aboutPage, categories } from "@/features/library/catalog";
import { LibraryListItem, LibraryShell } from "@/features/library/LibraryShell";
import { BreadcrumbJsonLd } from "@/features/library/jsonLd";

export const metadata: Metadata = {
  title: aboutPage.seo.title,
  description: aboutPage.seo.description,
};

export default function AboutPage() {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <LibraryShell
        title={aboutPage.title}
        summary={aboutPage.summary}
        breadcrumbs={breadcrumbs}
      >
        <div>
          <p className="pt-8 text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
            Works
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
