import type { Metadata } from "next";
import Link from "next/link";
import {
  categories,
  flashHref,
  getWorksFeatured,
  getWorksStarterFlash,
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
import { t } from "@/features/shared/i18n";

export const metadata: Metadata = libraryPageMetadata({
  title: worksLibrary.seo.title,
  description: worksLibrary.seo.description,
  path: "/works",
});

/** Category-to-category separators on /works (not the section start line). */
const CATEGORY_DIVIDERS: readonly SfSectionVariant[] = ["split", "trace"];

export default function WorksPage() {
  const featured = getWorksFeatured();
  const starterFlash = getWorksStarterFlash();
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
        {starterFlash ? (
          <div className="pt-2">
            <p className="pt-8 text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase">
              {t("works.newHereEyebrow")}
            </p>
            <p className="mt-3 text-[0.88rem] leading-[1.85] text-[var(--foreground-muted)]">
              {t("works.newHereLead")}
            </p>
            <LibraryListItem
              href={flashHref(starterFlash.slug)}
              title={starterFlash.title}
              meta={t("works.minutesRead", { minutes: starterFlash.minutes })}
              actionLabel={t("home.featured.readCta")}
            />
            <p className="mt-6 text-center sm:mt-8">
              <Link
                href="/reading-test"
                className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:text-[var(--foreground)]"
              >
                {t("works.readingTestLink")}
              </Link>
            </p>
          </div>
        ) : null}

        {featured ? (
          <div className={starterFlash ? undefined : "pt-2"}>
            <p
              className={`text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase ${
                starterFlash ? "pt-10" : "pt-8"
              }`}
            >
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
