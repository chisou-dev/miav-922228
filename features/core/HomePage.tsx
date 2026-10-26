"use client";

import Link from "next/link";
import Image from "next/image";
import { SiteShell } from "@/features/shared/SiteShell";
import { SfSection } from "@/features/shared/SfSection";
import { CosmicMorseDivider } from "@/features/shared/cosmic-morse";
import { gamesLibraryUrl } from "@/features/core/gamesUrl";
import { ReentryErrorBoundary } from "@/features/home/reentry/ReentryErrorBoundary";
import { ReentryExperience } from "@/features/home/reentry/ReentryExperience";
import { ReentryHeroTeaser } from "@/features/home/reentry/reentryShellContext";
import { GalaxyHeading } from "@/features/home/galaxy/GalaxyHeading";
import { useT } from "@/features/shared/i18n";

const primaryLinkClassName =
  "inline-flex min-h-11 items-center py-2 text-[0.85rem] font-medium tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--foreground)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--foreground)]";

const secondaryLinkClassName =
  "inline-flex min-h-11 items-center py-2 text-[0.85rem] tracking-[0.12em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:text-[var(--foreground)] hover:decoration-[var(--foreground-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--foreground)]";

const sectionLinkClassName =
  "inline-flex min-h-11 items-center py-2 text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--foreground)]";

const sectionBase = "scroll-mt-28 py-14 sm:py-24 lg:py-28";

const sectionHeadingClass =
  "text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]";

type FirstRead = {
  href: string;
  title: string;
  minutes: number;
  blurb: string;
  image: { src: string; width: number; height: number; alt: string } | null;
};

export function HomePage({ firstRead }: { firstRead: FirstRead | null }) {
  const t = useT();
  const gameHref = gamesLibraryUrl();

  const heroCopy = (
    <>
      <div className="flex items-start gap-4 sm:gap-5">
        <h1 className="min-w-0 flex-1 text-[clamp(1.75rem,6.2vw,4.25rem)] font-medium leading-[1.15] tracking-[0.04em] text-[var(--foreground)]">
          <GalaxyHeading>{t("home.brand")}</GalaxyHeading>
        </h1>
        <ReentryHeroTeaser />
      </div>
      <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed tracking-[0.02em] text-[var(--foreground-muted)] sm:mt-9 sm:text-lg sm:leading-8">
        {t("home.tagline")}
      </p>
      <p className="mt-7 max-w-md text-[0.95rem] leading-[1.9] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2]">
        {t("home.lead")}
      </p>
      <nav
        aria-label={t("home.ctaStart")}
        className="mt-7 flex flex-col items-start gap-y-1 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2"
      >
        <Link href="/start-here" className={primaryLinkClassName}>
          {t("home.ctaStart")}
        </Link>
        <Link href="/works" className={secondaryLinkClassName}>
          {t("home.ctaStories")}
        </Link>
        <a href={gameHref} className={secondaryLinkClassName}>
          {t("home.ctaGames")}
        </a>
      </nav>
      {firstRead ? (
        <aside
          aria-label={t("works.newHereEyebrow")}
          className="mt-7 max-w-xl border-l border-[var(--line)] pl-4 sm:mt-9 sm:pl-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            {firstRead.image ? (
              <Link href={firstRead.href}
                className="relative block aspect-[16/9] w-full shrink-0 overflow-hidden border border-[var(--line)] sm:w-40"
                aria-label={firstRead.title}>
                <Image src={firstRead.image.src} alt={firstRead.image.alt}
                  fill sizes="(max-width: 639px) 100vw, 160px"
                  className="object-cover"/>
              </Link>
            ) : null}
            <div className="min-w-0">
              <p className="text-[0.78rem] leading-relaxed tracking-[0.05em] text-[var(--foreground-muted)]">
                <span className="font-medium text-[var(--foreground)]">
                  {t("works.newHereEyebrow")}
                </span>{" "}
                {t("works.newHereLead")}
              </p>
              <Link href={firstRead.href} className={primaryLinkClassName}>
                {firstRead.title} <span aria-hidden="true" className="ml-1">→</span>
              </Link>
              <p className="max-w-md text-[0.8rem] leading-[1.75] text-[var(--foreground-muted)]">
                {firstRead.blurb}
              </p>
              <p className="mt-2 text-[0.72rem] tracking-wide text-[var(--foreground-muted)]">
                {t("works.minutesRead", { minutes: firstRead.minutes })}
              </p>
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );

  return (
    <SiteShell>
      <main>
        <section
          aria-label={t("home.introAria")}
          className="flex flex-col justify-center py-12 sm:py-20 lg:min-h-[calc(100vh-8rem)] lg:py-28"
        >
          <ReentryErrorBoundary>
            <ReentryExperience heroCopy={heroCopy} />
          </ReentryErrorBoundary>
        </section>

        <div className="pb-16 sm:pb-28">
          <SfSection id="about" variant="central-offset" className={sectionBase}>
            <h2 className={sectionHeadingClass}>{t("home.aboutTitle")}</h2>
            <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              {t("home.aboutBody")}
            </p>
            <p className="mt-8 sm:mt-12">
              <Link href="/author" className={sectionLinkClassName}>
                {t("home.aboutAuthorCta")}
              </Link>
            </p>
          </SfSection>

          <CosmicMorseDivider
            message={t("home.cosmic.writerMemo")}
            secondaryMessage={t("home.cosmic.handy")}
          />

          <SfSection id="chapters" variant="central" className={sectionBase}>
            <h2 className={sectionHeadingClass}>{t("nav.chapters")}</h2>
            <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              {t("home.readBody")}
            </p>
            <p className="mt-8 flex flex-wrap gap-x-8 gap-y-3 sm:mt-10">
              <Link href="/chapters" className={sectionLinkClassName}>
                {t("home.readChapters")}
              </Link>
              <Link href="/works" className={sectionLinkClassName}>
                {t("home.readEnter")}
              </Link>
              <Link href="/fr/chapters" className={sectionLinkClassName}>
                {t("lang.fr")}
              </Link>
            </p>
          </SfSection>

          <SfSection id="books" variant="split" className={sectionBase}>
            <h2 className={sectionHeadingClass}>{t("nav.books")}</h2>
            <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              {t("home.booksBody")}
            </p>
            <p className="mt-8 sm:mt-10">
              <Link href="/books" className={sectionLinkClassName}>
                {t("home.readBooks")} →
              </Link>
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
              <Link href="/world-map" className={sectionLinkClassName}>
                {t("home.featured.traceCta")}
              </Link>
            </p>
          </SfSection>
        </div>
      </main>
      <p className="mt-4 mb-3 text-center text-[0.65rem] leading-relaxed tracking-wide text-[var(--foreground-muted)] opacity-60">
        Galaxy observations: NASA/JPL-Caltech (M100 and Andromeda/M31, Spitzer). Space travel and planet surfaces are artistic simulations.
      </p>
    </SiteShell>
  );
}
