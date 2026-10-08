"use client";

import Link from "next/link";
import { AppListing } from "@/features/core/AppListing";
import { MIAV_APPS } from "@/features/core/apps";
import { SfDivider } from "@/features/shared/SfSection";
import { useT } from "@/features/shared/i18n";

const linkClassName =
  "text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] transition-colors duration-300 hover:text-[var(--foreground)]";

export function AppsPage() {
  const t = useT();

  return (
    <div className="relative z-10 mx-auto w-full max-w-[700px] px-5 sm:px-8">
      <main className="pb-28 sm:pb-36">
        <header className="pt-14 text-center sm:pt-20">
          <p>
            <a href="/" className={linkClassName}>
              MIAV-922228
            </a>
          </p>

          <h1 className="mt-14 text-[clamp(1.85rem,6vw,2.6rem)] font-medium leading-[1.3] tracking-[0.12em] text-[var(--foreground)] uppercase sm:mt-16">
            {t("home.appsTitle")}
          </h1>

          <p className="mx-auto mt-10 max-w-md text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.1]">
            {t("home.appsBody")}
          </p>
        </header>

        <div className="mt-20 space-y-20 sm:mt-28 sm:space-y-28 [&_h3]:uppercase">
          {MIAV_APPS.map((app) => (
            <AppListing key={app.id} app={app} showEyebrow={false} />
          ))}
        </div>

        <SfDivider variant="trace" className="my-20 sm:my-28" />

        <p className="text-center">
          <Link
            href="/reading-test"
            className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.5em] transition-colors duration-300 hover:text-[var(--foreground)]"
          >
            {t("apps.readingTestLink")}
          </Link>
        </p>

        <div
          className="mt-16 border-t border-[var(--line)] pt-16 text-center sm:mt-20 sm:pt-20"
          aria-label={t("apps.nextAppAria")}
        >
          <p className="text-[0.68rem] tracking-[0.18em] text-[var(--foreground-muted)] uppercase opacity-80">
            {t("apps.nextAppEyebrow")}
          </p>
          <p className="mt-5 text-[0.8rem] tracking-[0.14em] text-[var(--foreground-muted)] opacity-70">
            {t("apps.comingSoon")}
          </p>
        </div>
      </main>
    </div>
  );
}
