import Link from "next/link";
import { gamesLibraryUrl } from "@/features/core/gamesUrl";
import {
  flashHref,
  getWorksStarterFlash,
} from "@/features/library/catalog";
import { LibraryShell } from "@/features/library/LibraryShell";
import { SfDivider } from "@/features/shared/SfSection";
import { t } from "@/features/shared/i18n";

const linkClassName =
  "text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]";

type PathwayProps = {
  id: string;
  heading: string;
  body: string;
  href: string;
  cta: string;
};

function StartHerePathway({ id, heading, body, href, cta }: PathwayProps) {
  return (
    <section aria-labelledby={id} className="py-8 sm:py-10">
      <h2
        id={id}
        className="text-[0.72rem] tracking-[0.2em] text-[var(--foreground-muted)] uppercase"
      >
        {heading}
      </h2>
      <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:text-base sm:leading-[2.05]">
        {body}
      </p>
      <p className="mt-8 sm:mt-10">
        <Link href={href} className={linkClassName}>
          {cta}
        </Link>
      </p>
      {id === "start-here-read" ? (
        <p className="mt-5">
          <Link
            href="/reading-test"
            className="text-[0.72rem] tracking-[0.14em] text-[var(--foreground-muted)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:text-[var(--foreground)]"
          >
            {t("startHere.readingTestLink")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

export function StartHerePage() {
  const starterFlash = getWorksStarterFlash();
  const readHref = starterFlash
    ? flashHref(starterFlash.slug)
    : "/works";
  const gameHref = gamesLibraryUrl();

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: t("startHere.pageTitle"), href: "/start-here" },
  ];

  return (
    <LibraryShell
      title={t("startHere.pageTitle")}
      summary={t("startHere.lead")}
      breadcrumbs={breadcrumbs}
    >
      <div className="pt-2">
        <StartHerePathway
          id="start-here-read"
          heading={t("startHere.readHeading")}
          body={t("startHere.readBody")}
          href={readHref}
          cta={t("startHere.readCta")}
        />
        <SfDivider variant="split" />
        <StartHerePathway
          id="start-here-play"
          heading={t("startHere.playHeading")}
          body={t("startHere.playBody")}
          href={gameHref}
          cta={t("startHere.playCta")}
        />
        <SfDivider variant="trace" />
        <StartHerePathway
          id="start-here-trace"
          heading={t("startHere.traceHeading")}
          body={t("startHere.traceBody")}
          href="/world-map"
          cta={t("startHere.traceCta")}
        />
      </div>
    </LibraryShell>
  );
}
