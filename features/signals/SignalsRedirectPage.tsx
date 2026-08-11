"use client";

import { useEffect } from "react";
import { useT } from "@/features/shared/i18n";

/**
 * Compatibility shim — Signals live on My MIAV.
 * Keeps /signals bookmarks working (hash may be applied client-side).
 */
export function SignalsRedirectPage() {
  const t = useT();

  useEffect(() => {
    window.location.replace("/my-miav#signals");
  }, []);

  return (
    <div className="trace-map-shell mx-auto max-w-lg px-5 py-16 sm:px-8">
      <p className="text-[0.72rem] tracking-[0.16em] text-[var(--map-muted)] uppercase">
        {t("signals.eyebrow")}
      </p>
      <h1 className="mt-3 text-[1.4rem] font-medium tracking-[0.06em] text-[var(--map-ink)]">
        {t("signals.movedTitle")}
      </h1>
      <p className="mt-4 text-[0.9rem] leading-[1.8] text-[var(--map-muted)]">
        {t("signals.movedBody")}
      </p>
      <a
        href="/my-miav#signals"
        className="mt-8 inline-flex min-h-[44px] items-center border border-[#9bb0c2] bg-[#e8eef4] px-5 text-[0.75rem] tracking-[0.12em] text-[var(--map-ink)]"
      >
        {t("signals.openMyMiav")}
      </a>
    </div>
  );
}
