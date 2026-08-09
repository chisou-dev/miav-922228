"use client";

import { isAppLive, type MiavApp } from "@/features/core/apps";
import { useT } from "@/features/shared/i18n";

const linkClassName =
  "text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]";

type Props = {
  app: MiavApp;
  /** Extra classes when stacked in a list */
  className?: string;
  /** When false, omit the APP eyebrow (use a shared APPS heading instead). */
  showEyebrow?: boolean;
};

/**
 * Quiet app listing — same rhythm as FEATURED NOW entries (not a new card style).
 */
export function AppListing({
  app,
  className = "",
  showEyebrow = true,
}: Props) {
  const t = useT();
  const live = isAppLive(app);
  const action = live ? t("apps.openApp") : t("apps.comingSoon");
  const description = app.descriptionKey ? t(app.descriptionKey) : app.description;
  const accentClass =
    app.accent === "deep-sea"
      ? "app-listing app-listing--deep-sea"
      : "app-listing";

  return (
    <div className={`${accentClass} ${className}`.trim()}>
      {showEyebrow ? (
        <p className="text-[0.72rem] tracking-[0.16em] text-[var(--foreground-muted)] uppercase">
          {t("apps.eyebrow")}
        </p>
      ) : null}
      <h3
        className={`${showEyebrow ? "mt-4" : ""} text-lg font-medium tracking-[0.08em] text-[var(--foreground)] sm:text-xl`}
      >
        {app.name}
      </h3>
      <p className="mt-6 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-8 sm:text-base sm:leading-[2.05]">
        {description}
      </p>
      <p className="mt-8 sm:mt-10">
        {live && app.url ? (
          <a
            href={app.url}
            className={linkClassName}
            target="_blank"
            rel="noopener noreferrer"
          >
            {action} →
          </a>
        ) : (
          <span className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground-muted)]">
            {action}
          </span>
        )}
      </p>
    </div>
  );
}
