"use client";

import { useT } from "@/features/shared/i18n";
import { sfSectionClass } from "@/features/shared/SfSection";

export function PrivacyPageContent() {
  const t = useT();
  const paragraphs = [
    t("world.welcomeGoogleIdentify"),
    t("world.privacyBlurbNoInfo"),
    t("world.privacyNoProfileFields"),
    t("world.privacyUidOnlyEdit"),
    t("world.googleNeverAccess"),
    t("world.privacyTraceBelongsToYou"),
    t("world.privacySiteProvidesPlace"),
    t("world.responsibility"),
    t("world.removal"),
    t("world.welcomeClosingNotSocial"),
    t("world.privacyQuietLiterarySpace"),
  ];

  return (
    <article
      className={sfSectionClass(
        "central",
        "mx-auto mt-16 max-w-lg pt-14 sm:mt-20 sm:pt-16",
      )}
    >
      <div className="space-y-8 text-[0.98rem] leading-[2.05] tracking-[0.01em] text-[var(--foreground-muted)] sm:text-[1.02rem] sm:leading-[2.15]">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <p className="mt-16 text-[0.78rem] leading-[1.9] tracking-[0.04em] text-[var(--foreground-muted)]">
        {t("world.privacyStoresOnly")}
      </p>

      <p className="mt-10 flex flex-wrap gap-6 text-[0.85rem] tracking-[0.12em]">
        <a
          href="/site-policy"
          className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em]"
        >
          {t("world.sitePolicy")}
        </a>
        <a
          href="/world-map"
          className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em]"
        >
          {t("world.returnToWorld")}
        </a>
      </p>
    </article>
  );
}
