"use client";

import { SiteShell } from "@/features/shared/SiteShell";
import { SfSection } from "@/features/shared/SfSection";
import { ReaderMemory } from "@/features/core/ReaderMemory";
import { AppListing } from "@/features/core/AppListing";
import { MIAV_APPS } from "@/features/core/apps";
import { getGamesBaseUrl, gamesLibraryUrl } from "@/features/core/gamesUrl";
import { flashHref } from "@/features/library/catalog";
import { useT } from "@/features/shared/i18n";

const linkClassName =
  "text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]";

const sectionBase = "scroll-mt-28 py-24 sm:py-32";

export function HomePage() {
  const t = useT();
  const gameHref = gamesLibraryUrl();
  const binaryBlockHref = `${getGamesBaseUrl()}/game/binary-mosaic`;
  const afterTheRainHref = flashHref("after-the-rain");
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
            <a href="#start-here" className={linkClassName}>
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
          <SfSection id="start-here" variant="central" className={sectionBase}>
            <h2 className="text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
              {t("home.startTitle")}
            </h2>

            <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
              <div>
                <h3 className="text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  {t("home.readTitle")}
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  {t("home.readBody")}
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href="/works" className={linkClassName}>
                    {t("home.readEnter")}
                  </a>
                </p>
                <p className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                  <a href="/chapters" className={linkClassName}>
                    {t("home.readChapters")}
                  </a>
                  <a href="/books" className={linkClassName}>
                    {t("home.readBooks")}
                  </a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  {t("home.playTitle")}
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  {t("home.playBody")}
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href={gameHref} className={linkClassName}>
                    {t("home.playEnter")}
                  </a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  {t("home.appsTitle")}
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  {t("home.appsBody")}
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href="#apps" className={linkClassName}>
                    {t("home.appsView")}
                  </a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  {t("home.traceTitle")}
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  {t("home.traceBody")}
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href="/world-map" className={linkClassName}>
                    {t("home.traceOpen")}
                  </a>
                </p>
              </div>
            </div>
          </SfSection>

          <SfSection id="featured-now" variant="split" className={sectionBase}>
            <h2 className="text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
              {t("home.featuredTitle")}
            </h2>

            <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
              <div>
                <p className="text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
                  {t("home.featured.readEyebrow")}
                </p>
                <h3 className="mt-4 text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  {t("home.featured.afterRainTitle")}
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  {t("home.featured.afterRainBody")}
                </p>
                <p className="mt-4 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                  {t("home.featured.afterRainMeta")}
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href={afterTheRainHref} className={linkClassName}>
                    {t("home.featured.readCta")}
                  </a>
                </p>
              </div>

              <div>
                <p className="text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
                  {t("home.featured.playEyebrow")}
                </p>
                <h3 className="mt-4 text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  {t("home.featured.binaryTitle")}
                </h3>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
                  {t("home.featured.binaryBody")}
                </p>
                <p className="mt-4 text-[0.72rem] tracking-[0.12em] text-[var(--foreground-muted)]">
                  {t("home.featured.binaryMeta")}
                </p>
                <p className="mt-8 sm:mt-10">
                  <a href={binaryBlockHref} className={linkClassName}>
                    {t("home.featured.playCta")}
                  </a>
                </p>
              </div>

              <div id="apps" className="scroll-mt-28">
                <p className="text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
                  {t("home.featured.appsEyebrow")}
                </p>
                <div className="mt-10 space-y-16 sm:mt-12 sm:space-y-20">
                  {MIAV_APPS.map((app) => (
                    <AppListing key={app.id} app={app} showEyebrow={false} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
                  {t("home.featured.traceEyebrow")}
                </p>
                <h3 className="mt-4 text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl">
                  {t("home.featured.worldTitle")}
                </h3>
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
              </div>
            </div>
          </SfSection>

          <SfSection
            aria-label="Reader memory"
            variant="trace"
            className={sectionBase}
          >
            <ReaderMemory workId="miav-922228" />
          </SfSection>

          <SfSection id="about" variant="central-offset" className={sectionBase}>
            <h2 className="text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
              {t("home.aboutTitle")}
            </h2>
            <p className="mt-10 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              {t("home.aboutBody")}
            </p>
          </SfSection>

          <SfSection id="contact" variant="terminal" className={sectionBase}>
            <h2 className="text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
              {t("home.contactTitle")}
            </h2>
            <p className="mt-10 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
              {t("home.contactBody")}
            </p>
            <p className="mt-12 sm:mt-14">
              <a href="/contact" className={linkClassName}>
                {t("home.contactCta")}
              </a>
            </p>
          </SfSection>
        </div>
      </main>
    </SiteShell>
  );
}
