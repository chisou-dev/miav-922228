"use client";

import { SiteShell } from "@/features/shared/SiteShell";
import { SfSection } from "@/features/shared/SfSection";
import { CosmicMorseDivider } from "@/features/shared/cosmic-morse";
import { gamesLibraryUrl } from "@/features/core/gamesUrl";
import { useT } from "@/features/shared/i18n";

const linkClassName =
  "text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]";

const sectionBase = "scroll-mt-28 py-24 sm:py-32";

const sectionHeadingClass =
  "text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]";

export function HomePage() {
  const t = useT();
  const gameHref = gamesLibraryUrl();

  return (
    <SiteShell>
      <main>
        <section
          aria-label={t("home.introAria")}
          className="flex min-h-[calc(100vh-8rem)] flex-col justify-center py-24 sm:py-32"
        >
          <h1 className="text-[clamp(1.75rem,6.2vw,4.25rem)] font-medium leading-[1.15] tracking-[0.04em] text-[var(--foreground)]">
            {t("home.brand")}
          </h1>
          <p className="mt-10 max-w-xl text-[1.05rem] leading-relaxed tracking-[0.02em] text-[var(--foreground-muted)] sm:text-lg sm:leading-8">
            {t("home.tagline")}
          </p>
          <p className="mt-16 max-w-md text-[0.95rem] leading-[1.9] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-20 sm:text-base sm:leading-[2]">
            {t("home.lead")}
          </p>
          <p className="mt-12 flex flex-wrap gap-x-8 gap-y-4 sm:mt-14">
            <a href="#chapters" className={linkClassName}>
              {t("home.ctaStart")}
            </a>
            <a href="/works" className={linkClassName}>
              {t("home.ctaStories")}
            </a>
            <a href={gameHref} className={linkClassName}>
              {t("home.ctaGames")}
            </a>
          </p>
        </section>

        <div className="pb-32 sm:pb-40">
          <SfSection id="chapters" variant="central" className={sectionBase}>
            <h2 className={sectionHeadingClass}>{t("nav.chapters")}</h2>
            <p className="mt-10 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              {t("home.readBody")}
            </p>
            <p className="mt-8 flex flex-wrap gap-x-8 gap-y-3 sm:mt-10">
              <a href="/chapters" className={linkClassName}>
                {t("home.readChapters")}
              </a>
              <a href="/fr/chapters" className={linkClassName}>
                {t("lang.fr")}
              </a>
            </p>
          </SfSection>

          <CosmicMorseDivider
            message={t("home.cosmic.writerMemo")}
            secondaryMessage={t("home.cosmic.handy")}
          />

          <SfSection id="books" variant="split" className={sectionBase}>
            <h2 className={sectionHeadingClass}>{t("nav.books")}</h2>
            <p className="mt-10 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              {t("home.booksBody")}
            </p>
            <p className="mt-8 sm:mt-10">
              <a href="/books" className={linkClassName}>
                {t("home.readBooks")} →
              </a>
            </p>
          </SfSection>

          <CosmicMorseDivider
            message={t("home.cosmic.miavWorld")}
            secondaryMessage={t("home.featured.traceEyebrow")}
          />

          <SfSection id="world" variant="trace" className={sectionBase}>
            <p className="text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
              {t("home.featured.traceEyebrow")}
            </p>
            <h2 className="mt-4 text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
              {t("home.featured.worldTitle")}
            </h2>
            <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
              {t("home.featured.worldBody")}
            </p>
            <p className="mt-4 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
              {t("home.featured.worldMeta")}
            </p>
            <p className="mt-8 sm:mt-10">
              <a href="/world-map" className={linkClassName}>
                {t("home.featured.traceCta")}
              </a>
            </p>
          </SfSection>

          <SfSection id="about" variant="central-offset" className={sectionBase}>
            <h2 className={sectionHeadingClass}>{t("home.aboutTitle")}</h2>
            <p className="mt-10 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              {t("home.aboutBody")}
            </p>
            <p className="mt-12 sm:mt-14">
              <a href="/author" className={linkClassName}>
                {t("home.aboutAuthorCta")}
              </a>
            </p>
          </SfSection>
        </div>
      </main>
    </SiteShell>
  );
}
