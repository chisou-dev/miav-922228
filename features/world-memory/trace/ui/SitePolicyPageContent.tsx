"use client";

import { useT } from "@/features/shared/i18n";
import { sfSectionClass } from "@/features/shared/SfSection";

export function SitePolicyPageContent() {
  const t = useT();
  const paragraphs = [
    t("world.sitePolicyTraceBelongsToOwner"),
    t("world.sitePolicyProvidesPlace"),
    t("world.responsibility"),
  ];
  const removeReasons = [
    t("world.sitePolicyReasonLaw"),
    t("world.sitePolicyReasonSpam"),
    t("world.sitePolicyReasonPolicy"),
  ];
  const closing = [t("world.welcomeClosingNotSocial"), t("world.privacyQuietLiterarySpace")];

  return (
    <article
      className={sfSectionClass(
        "central",
        "mx-auto mt-16 max-w-lg pt-14 sm:mt-20 sm:pt-16",
      )}
    >
      <div className="space-y-8 text-[0.98rem] leading-[2.05] tracking-[0.01em] text-[var(--foreground-muted)] sm:text-[1.02rem] sm:leading-[2.15]">
        <p>{t("world.sitePolicyIntro")}</p>
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <div>
          <p>{t("world.sitePolicyRemoveHeading")}</p>
          <ul className="mt-4 list-none space-y-2">
            {removeReasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>

        <p>{t("world.welcomeGoogleIdentify")}</p>
        <p>{t("world.privacyBlurbNoInfo")}</p>
        <p>{t("world.sitePolicyNoGoogleProfile")}</p>
        <p>{t("world.privacyUidOnlyEdit")}</p>
        {closing.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <p className="mt-12 flex flex-wrap gap-6 text-[0.85rem] tracking-[0.12em]">
        <a
          href="/privacy"
          className="text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em]"
        >
          {t("world.privacy")}
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
